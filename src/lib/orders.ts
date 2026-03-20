import {
  FulfillmentMode,
  InventoryStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { decryptSecret, encryptSecret, hashPassword, verifyPassword } from "./crypto";
import { prisma } from "./db";
import { env } from "./env";
import { AppError } from "./errors";
import { resolvePaymentProvider } from "./payments";
import { consumeRateLimit } from "./rate-limit";
import { createOrderNo, ensureSlug, getClientIp, isMobileUserAgent } from "./utils";

const checkoutSchema = z.object({
  productOptionId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
  buyerContact: z.string().trim().min(3).max(120),
  queryPassword: z.string().min(6).max(64),
  paymentProvider: z.enum([PaymentProvider.ALIPAY, PaymentProvider.WECHAT]),
});

const querySchema = z.object({
  buyerContact: z.string().trim().min(3).max(120),
  queryPassword: z.string().min(6).max(64),
  ipAddress: z.string().min(3),
});

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(64),
  slug: z.string().trim().optional(),
  description: z.string().trim().max(400).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

const productSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().optional(),
  summary: z.string().trim().min(8).max(180),
  description: z.string().trim().min(20),
  supportPolicy: z.string().trim().min(10),
  deliveryFormat: z.string().trim().min(6),
  badge: z.string().trim().max(24).optional(),
  fulfillmentMode: z.enum([FulfillmentMode.MANUAL, FulfillmentMode.AUTO_STOCK]),
  optionsText: z.string().trim().min(1, "至少需要一个规格"),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

const announcementSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(6).max(2000),
  isActive: z.boolean().default(true),
  pinned: z.boolean().default(false),
});

const inventoryImportSchema = z.object({
  productId: z.string().min(1),
  rawItems: z.string().trim().min(1),
});

const manualFulfillmentSchema = z.object({
  orderId: z.string().min(1),
  deliveryContent: z.string().trim().min(1),
});

type TxClient = Prisma.TransactionClient;

function buildOrderExpiry() {
  return new Date(Date.now() + env.ORDER_TTL_MINUTES * 60 * 1000);
}

function orderStatusLabel(status: OrderStatus, fulfillmentMode: FulfillmentMode) {
  switch (status) {
    case OrderStatus.PENDING:
      return "待支付";
    case OrderStatus.PAID:
      return fulfillmentMode === FulfillmentMode.MANUAL
        ? "已支付，等待人工发货"
        : "已支付";
    case OrderStatus.FULFILLED:
      return "已发货";
    case OrderStatus.EXPIRED:
      return "已过期";
    case OrderStatus.FAILED:
      return "失败";
    case OrderStatus.REFUNDED:
      return "已退款";
    default:
      return status;
  }
}

function parseOptionLines(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new AppError("PRODUCT_OPTIONS_EMPTY", "至少需要配置一个规格。", 400);
  }

  return lines.map((line, index) => {
    const segments = line.split("|").map((part) => part.trim());
    if (segments.length < 2) {
      throw new AppError(
        "PRODUCT_OPTIONS_INVALID",
        "规格格式必须是“规格名称|价格”。",
        400,
      );
    }

    const [label, priceRaw] = segments;
    const price = Number(priceRaw);

    if (!label || !Number.isFinite(price) || price <= 0) {
      throw new AppError(
        "PRODUCT_OPTIONS_INVALID",
        "规格名称不能为空，价格必须是大于 0 的数字。",
        400,
      );
    }

    return {
      label,
      priceCents: Math.round(price * 100),
      sortOrder: index + 1,
      isActive: true,
    };
  });
}

function serializeOptions(
  options: Array<{ label: string; priceCents: number }>,
) {
  return options.map((option) => `${option.label}|${(option.priceCents / 100).toFixed(2)}`).join("\n");
}

function getProductStockCount(product: {
  fulfillmentMode: FulfillmentMode;
  inventoryItems: Array<{ id: string }>;
}) {
  return product.fulfillmentMode === FulfillmentMode.AUTO_STOCK
    ? product.inventoryItems.length
    : null;
}

function mapProductCard(
  product: {
    id: string;
    slug: string;
    name: string;
    summary: string;
    badge: string | null;
    fulfillmentMode: FulfillmentMode;
    isFeatured: boolean;
    category: { name: string; slug: string };
    options: Array<{ id: string; label: string; priceCents: number; isActive: boolean }>;
    inventoryItems: Array<{ id: string }>;
  },
) {
  const activeOptions = product.options.filter((option) => option.isActive);
  const startingPriceCents =
    activeOptions.length > 0
      ? Math.min(...activeOptions.map((option) => option.priceCents))
      : 0;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    summary: product.summary,
    badge: product.badge,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    startingPriceCents,
    optionCount: activeOptions.length,
    optionLabels: activeOptions.map((option) => option.label),
    stockCount: getProductStockCount(product),
    fulfillmentMode: product.fulfillmentMode,
    isFeatured: product.isFeatured,
  };
}

async function reserveInventory(tx: TxClient, productId: string, quantity: number) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "InventoryItem"
    WHERE "productId" = ${productId}
      AND status = CAST(${InventoryStatus.AVAILABLE} AS "InventoryStatus")
    ORDER BY "createdAt" ASC
    LIMIT ${quantity}
    FOR UPDATE SKIP LOCKED
  `;

  if (rows.length < quantity) {
    throw new AppError("OUT_OF_STOCK", "当前库存不足，请减少数量或稍后再试。", 409);
  }

  return rows.map((row) => row.id);
}

async function releaseOrdersInTransaction(tx: TxClient, orderIds: string[]) {
  if (orderIds.length === 0) {
    return 0;
  }

  await tx.inventoryItem.updateMany({
    where: {
      orderId: { in: orderIds },
      status: InventoryStatus.RESERVED,
    },
    data: {
      status: InventoryStatus.AVAILABLE,
      orderId: null,
      reservedAt: null,
      reservationExpiresAt: null,
    },
  });

  const result = await tx.order.updateMany({
    where: {
      id: { in: orderIds },
      status: OrderStatus.PENDING,
    },
    data: {
      status: OrderStatus.EXPIRED,
    },
  });

  return result.count;
}

async function readDeliveredPayloads(order: {
  fulfillmentRecord: { encryptedSnapshot: string } | null;
  inventoryItems: Array<{ encryptedPayload: string; status: InventoryStatus }>;
}) {
  if (order.fulfillmentRecord) {
    return JSON.parse(decryptSecret(order.fulfillmentRecord.encryptedSnapshot)) as string[];
  }

  return order.inventoryItems
    .filter((item) => item.status === InventoryStatus.DELIVERED)
    .map((item) => decryptSecret(item.encryptedPayload));
}

async function toPublicOrder(order: {
  orderNo: string;
  status: OrderStatus;
  amountCents: number;
  unitPriceCents: number;
  quantity: number;
  paymentProvider: PaymentProvider;
  fulfillmentMode: FulfillmentMode;
  productOptionLabel: string;
  providerTransaction: string | null;
  createdAt: Date;
  paidAt: Date | null;
  fulfilledAt: Date | null;
  product: { name: string; slug: string };
  fulfillmentRecord: { encryptedSnapshot: string } | null;
  inventoryItems: Array<{ encryptedPayload: string; status: InventoryStatus }>;
}) {
  const items = await readDeliveredPayloads(order);

  return {
    orderNo: order.orderNo,
    status: order.status,
    statusLabel: orderStatusLabel(order.status, order.fulfillmentMode),
    amountCents: order.amountCents,
    unitPriceCents: order.unitPriceCents,
    quantity: order.quantity,
    paymentProvider: order.paymentProvider,
    fulfillmentMode: order.fulfillmentMode,
    productOptionLabel: order.productOptionLabel,
    providerTransaction: order.providerTransaction,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    fulfilledAt: order.fulfilledAt,
    productName: order.product.name,
    productSlug: order.product.slug,
    deliveredItems: items,
  };
}

export async function cleanupExpiredReservations() {
  const now = new Date();
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING,
      fulfillmentMode: FulfillmentMode.AUTO_STOCK,
      expiresAt: { lt: now },
    },
    select: { id: true },
  });

  if (expiredOrders.length === 0) {
    return 0;
  }

  return prisma.$transaction((tx) =>
    releaseOrdersInTransaction(
      tx,
      expiredOrders.map((order) => order.id),
    ),
  );
}

export async function getStorefrontData() {
  await cleanupExpiredReservations();

  const [announcements, categories, products] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        products: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        category: true,
        options: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        inventoryItems: {
          where: { status: InventoryStatus.AVAILABLE },
          select: { id: true },
        },
      },
    }),
  ]);

  return {
    announcements,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      productCount: category.products.length,
    })),
    products: products.map(mapProductCard),
  };
}

export async function getProductPageData(slug: string) {
  await cleanupExpiredReservations();

  const [product, announcements, relatedProducts] = await prisma.$transaction([
    prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        options: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        inventoryItems: {
          where: { status: InventoryStatus.AVAILABLE },
          select: { id: true },
        },
      },
    }),
    prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        NOT: { slug },
      },
      take: 4,
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        category: true,
        options: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        inventoryItems: {
          where: { status: InventoryStatus.AVAILABLE },
          select: { id: true },
        },
      },
    }),
  ]);

  if (!product || !product.isActive) {
    throw new AppError("PRODUCT_NOT_FOUND", "商品不存在或已下架。", 404);
  }

  if (product.options.length === 0) {
    throw new AppError("PRODUCT_OPTIONS_EMPTY", "商品尚未配置可售规格。", 409);
  }

  const productCard = mapProductCard(product);

  return {
    product: {
      ...productCard,
      description: product.description,
      supportPolicy: product.supportPolicy,
      deliveryFormat: product.deliveryFormat,
      options: product.options.map((option) => ({
        id: option.id,
        label: option.label,
        priceCents: option.priceCents,
      })),
    },
    announcements,
    relatedProducts: relatedProducts.map(mapProductCard),
  };
}

export async function getOrderPageData(orderNo: string) {
  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: {
      product: true,
      fulfillmentRecord: true,
      inventoryItems: {
        select: {
          encryptedPayload: true,
          status: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError("ORDER_NOT_FOUND", "订单不存在。", 404);
  }

  return toPublicOrder(order);
}

export async function createPendingOrder(input: z.input<typeof checkoutSchema>) {
  await cleanupExpiredReservations();

  const parsed = checkoutSchema.parse(input);
  const expiresAt = buildOrderExpiry();
  const now = new Date();
  const queryPasswordHash = await hashPassword(parsed.queryPassword);

  const order = await prisma.$transaction(async (tx) => {
    const productOption = await tx.productOption.findUnique({
      where: { id: parsed.productOptionId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            summary: true,
            isActive: true,
            fulfillmentMode: true,
          },
        },
      },
    });

    if (!productOption || !productOption.isActive || !productOption.product.isActive) {
      throw new AppError("PRODUCT_NOT_FOUND", "商品或规格不存在，无法下单。", 404);
    }

    let reservedIds: string[] = [];
    if (productOption.product.fulfillmentMode === FulfillmentMode.AUTO_STOCK) {
      reservedIds = await reserveInventory(tx, productOption.product.id, parsed.quantity);
    }

    const orderNo = createOrderNo();

    const createdOrder = await tx.order.create({
      data: {
        orderNo,
        productId: productOption.product.id,
        productOptionId: productOption.id,
        productOptionLabel: productOption.label,
        unitPriceCents: productOption.priceCents,
        quantity: parsed.quantity,
        amountCents: parsed.quantity * productOption.priceCents,
        buyerContact: parsed.buyerContact,
        queryPasswordHash,
        paymentProvider: parsed.paymentProvider,
        fulfillmentMode: productOption.product.fulfillmentMode,
        expiresAt,
      },
    });

    if (reservedIds.length > 0) {
      await tx.inventoryItem.updateMany({
        where: { id: { in: reservedIds } },
        data: {
          status: InventoryStatus.RESERVED,
          orderId: createdOrder.id,
          reservedAt: now,
          reservationExpiresAt: expiresAt,
        },
      });
    }

    await tx.paymentRecord.create({
      data: {
        orderId: createdOrder.id,
        provider: parsed.paymentProvider,
        status: PaymentStatus.CREATED,
        eventType: "ORDER_CREATED",
        requestPayload: {
          buyerContact: parsed.buyerContact,
          quantity: parsed.quantity,
          productOptionId: parsed.productOptionId,
        },
      },
    });

    return createdOrder;
  });

  return {
    orderNo: order.orderNo,
    expiresAt: order.expiresAt.toISOString(),
    paymentProvider: order.paymentProvider,
  };
}

export async function createPaymentForOrder(
  orderNo: string,
  providerSlug: string,
  request: Request,
) {
  await cleanupExpiredReservations();

  const adapter = resolvePaymentProvider(providerSlug);
  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { product: true },
  });

  if (!order) {
    throw new AppError("ORDER_NOT_FOUND", "订单不存在。", 404);
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new AppError("ORDER_NOT_PENDING", "该订单当前不可继续支付。", 409);
  }

  if (order.paymentProvider !== adapter.provider) {
    throw new AppError("PAYMENT_PROVIDER_MISMATCH", "订单支付方式与请求不一致。", 409);
  }

  if (order.expiresAt.getTime() <= Date.now()) {
    if (order.fulfillmentMode === FulfillmentMode.AUTO_STOCK) {
      await prisma.$transaction((tx) => releaseOrdersInTransaction(tx, [order.id]));
    }

    throw new AppError("ORDER_EXPIRED", "订单已过期，请重新下单。", 409);
  }

  const result = await adapter.createPayment({
    orderNo: order.orderNo,
    amountCents: order.amountCents,
    subject: `${order.product.name} · ${order.productOptionLabel} x${order.quantity}`,
    description: order.product.summary,
    returnUrl: `${env.APP_URL}/order/${order.orderNo}`,
    notifyUrl:
      adapter.provider === PaymentProvider.ALIPAY
        ? env.ALIPAY_NOTIFY_URL || `${env.APP_URL}/api/payments/alipay/notify`
        : env.WECHAT_NOTIFY_URL || `${env.APP_URL}/api/payments/wechat/notify`,
    clientIp: getClientIp(request),
    userAgent: request.headers.get("user-agent") || "",
    isMobile: isMobileUserAgent(request.headers.get("user-agent") || ""),
  });

  await prisma.paymentRecord.create({
    data: {
      orderId: order.id,
      provider: order.paymentProvider,
      status: PaymentStatus.PENDING,
      eventType: "PAYMENT_CREATED",
      requestPayload: {
        userAgent: request.headers.get("user-agent"),
        clientIp: getClientIp(request),
      },
      responsePayload: result as Prisma.InputJsonValue,
    },
  });

  return result;
}

export async function applySuccessfulPayment(result: {
  provider: PaymentProvider;
  orderNo: string;
  providerTransactionId: string;
  amountCents: number;
  raw: unknown;
}) {
  const finalized = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { orderNo: result.orderNo },
      include: {
        product: true,
        fulfillmentRecord: true,
        inventoryItems: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            encryptedPayload: true,
            status: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError("ORDER_NOT_FOUND", "订单不存在。", 404);
    }

    if (order.amountCents !== result.amountCents) {
      throw new AppError("PAYMENT_AMOUNT_MISMATCH", "支付金额与订单金额不一致。", 409);
    }

    await tx.paymentRecord.create({
      data: {
        orderId: order.id,
        provider: result.provider,
        status: PaymentStatus.VERIFIED,
        eventType: "PAYMENT_NOTIFY",
        providerTransaction: result.providerTransactionId,
        notifiedAt: new Date(),
        responsePayload: result.raw as Prisma.InputJsonValue,
      },
    });

    if (order.fulfillmentMode === FulfillmentMode.MANUAL) {
      if (order.status === OrderStatus.FULFILLED || order.status === OrderStatus.PAID) {
        return toPublicOrder(order);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new AppError("ORDER_STATUS_INVALID", "订单状态不允许更新为已支付。", 409);
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paymentProvider: result.provider,
          providerTransaction: result.providerTransactionId,
          paidAt: order.paidAt ?? new Date(),
        },
        include: {
          product: true,
          fulfillmentRecord: true,
          inventoryItems: {
            select: {
              encryptedPayload: true,
              status: true,
            },
          },
        },
      });

      return toPublicOrder(updatedOrder);
    }

    if (order.status === OrderStatus.FULFILLED && order.fulfillmentRecord) {
      return toPublicOrder(order);
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new AppError("ORDER_STATUS_INVALID", "订单状态不允许重复发货。", 409);
    }

    const deliverableItems = order.inventoryItems.filter(
      (item) =>
        item.status === InventoryStatus.RESERVED ||
        item.status === InventoryStatus.DELIVERED,
    );

    if (deliverableItems.length < order.quantity) {
      throw new AppError("FULFILLMENT_SHORTAGE", "预留库存不足，无法完成发货。", 409);
    }

    const deliveredPayloads = deliverableItems
      .slice(0, order.quantity)
      .map((item) => decryptSecret(item.encryptedPayload));

    await tx.inventoryItem.updateMany({
      where: {
        id: {
          in: deliverableItems.slice(0, order.quantity).map((item) => item.id),
        },
      },
      data: {
        status: InventoryStatus.DELIVERED,
        deliveredAt: new Date(),
        reservationExpiresAt: null,
      },
    });

    await tx.fulfillmentRecord.upsert({
      where: { orderId: order.id },
      update: {
        deliveredCount: deliveredPayloads.length,
        encryptedSnapshot: encryptSecret(JSON.stringify(deliveredPayloads)),
      },
      create: {
        orderId: order.id,
        deliveredCount: deliveredPayloads.length,
        encryptedSnapshot: encryptSecret(JSON.stringify(deliveredPayloads)),
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.FULFILLED,
        paymentProvider: result.provider,
        providerTransaction: result.providerTransactionId,
        paidAt: order.paidAt ?? new Date(),
        fulfilledAt: new Date(),
      },
      include: {
        product: true,
        fulfillmentRecord: true,
        inventoryItems: {
          select: {
            encryptedPayload: true,
            status: true,
          },
        },
      },
    });

    return toPublicOrder(updatedOrder);
  });

  revalidatePath("/");
  revalidatePath(`/order/${result.orderNo}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");

  return finalized;
}

export async function lookupOrdersByCredentials(input: z.input<typeof querySchema>) {
  const parsed = querySchema.parse(input);
  const limit = consumeRateLimit({
    key: `${parsed.ipAddress}:${parsed.buyerContact}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!limit.allowed) {
    throw new AppError("QUERY_RATE_LIMITED", "查询过于频繁，请稍后重试。", 429);
  }

  const orders = await prisma.order.findMany({
    where: {
      buyerContact: parsed.buyerContact,
      status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      product: true,
      fulfillmentRecord: true,
      inventoryItems: {
        select: {
          encryptedPayload: true,
          status: true,
        },
      },
    },
  });

  const matched = [];
  for (const order of orders) {
    const isValid = await verifyPassword(parsed.queryPassword, order.queryPasswordHash);
    if (isValid) {
      matched.push(await toPublicOrder(order));
    }
  }

  if (matched.length === 0) {
    throw new AppError("QUERY_NOT_FOUND", "联系方式或查询密码不正确。", 404);
  }

  return matched;
}

export async function getAdminOverviewData() {
  await cleanupExpiredReservations();

  const [products, orders, inventory, announcements, recentOrders] = await prisma.$transaction([
    prisma.product.count(),
    prisma.order.count(),
    prisma.inventoryItem.count({
      where: { status: InventoryStatus.AVAILABLE },
    }),
    prisma.announcement.count({
      where: { isActive: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { product: true },
    }),
  ]);

  return {
    metrics: {
      products,
      orders,
      inventory,
      announcements,
    },
    recentOrders,
  };
}

export async function getAdminProductsPageData(editId?: string) {
  const [categories, products] = await prisma.$transaction([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        products: {
          select: { id: true },
        },
      },
    }),
    prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        category: true,
        options: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        inventoryItems: {
          where: { status: InventoryStatus.AVAILABLE },
          select: { id: true },
        },
      },
    }),
  ]);

  return {
    categories,
    products: products.map((product) => ({
      ...product,
      stockCount: product.inventoryItems.length,
      optionsText: serializeOptions(product.options),
    })),
    editingProduct: editId
      ? (() => {
          const product = products.find((item) => item.id === editId);
          return product
            ? {
                ...product,
                optionsText: serializeOptions(product.options),
              }
            : null;
        })()
      : null,
    editingCategory: editId
      ? categories.find((category) => category.id === editId) ?? null
      : null,
  };
}

export async function getAdminInventoryPageData() {
  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      category: true,
      options: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const grouped = await prisma.inventoryItem.groupBy({
    by: ["productId", "status"],
    _count: { _all: true },
  });

  const summary = new Map<string, Record<InventoryStatus, number>>();

  for (const row of grouped) {
    if (!summary.has(row.productId)) {
      summary.set(row.productId, {
        AVAILABLE: 0,
        RESERVED: 0,
        DELIVERED: 0,
        DISABLED: 0,
      });
    }

    summary.get(row.productId)![row.status] = row._count._all;
  }

  const normalizedProducts = products.map((product) => ({
    ...product,
    counts:
      summary.get(product.id) ?? {
        AVAILABLE: 0,
        RESERVED: 0,
        DELIVERED: 0,
        DISABLED: 0,
      },
  }));

  return {
    importableProducts: normalizedProducts.filter(
      (product) => product.fulfillmentMode === FulfillmentMode.AUTO_STOCK,
    ),
    products: normalizedProducts,
  };
}

export async function getAdminOrdersPageData() {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      product: true,
      fulfillmentRecord: true,
      paymentRecords: {
        take: 3,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getAdminAnnouncementsPageData(editId?: string) {
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return {
    announcements,
    editingAnnouncement: editId
      ? announcements.find((item) => item.id === editId) ?? null
      : null,
  };
}

export async function saveCategory(input: z.input<typeof categorySchema>) {
  const parsed = categorySchema.parse(input);

  await prisma.category.upsert({
    where: { id: parsed.id ?? "__new__" },
    update: {
      name: parsed.name,
      slug: ensureSlug(parsed.slug || parsed.name, "category"),
      description: parsed.description,
      sortOrder: parsed.sortOrder,
    },
    create: {
      name: parsed.name,
      slug: ensureSlug(parsed.slug || parsed.name, "category"),
      description: parsed.description,
      sortOrder: parsed.sortOrder,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function deleteCategory(categoryId: string) {
  const linkedProducts = await prisma.product.count({
    where: { categoryId },
  });

  if (linkedProducts > 0) {
    throw new AppError("CATEGORY_NOT_EMPTY", "该分类下仍有商品，不能直接删除。", 409);
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function saveProduct(input: z.input<typeof productSchema>) {
  const parsed = productSchema.parse(input);
  const options = parseOptionLines(parsed.optionsText);

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.upsert({
      where: { id: parsed.id ?? "__new__" },
      update: {
        categoryId: parsed.categoryId,
        name: parsed.name,
        slug: ensureSlug(parsed.slug || parsed.name, "product"),
        summary: parsed.summary,
        description: parsed.description,
        supportPolicy: parsed.supportPolicy,
        deliveryFormat: parsed.deliveryFormat,
        badge: parsed.badge || null,
        fulfillmentMode: parsed.fulfillmentMode,
        isActive: parsed.isActive,
        isFeatured: parsed.isFeatured,
        sortOrder: parsed.sortOrder,
      },
      create: {
        categoryId: parsed.categoryId,
        name: parsed.name,
        slug: ensureSlug(parsed.slug || parsed.name, "product"),
        summary: parsed.summary,
        description: parsed.description,
        supportPolicy: parsed.supportPolicy,
        deliveryFormat: parsed.deliveryFormat,
        badge: parsed.badge || null,
        fulfillmentMode: parsed.fulfillmentMode,
        isActive: parsed.isActive,
        isFeatured: parsed.isFeatured,
        sortOrder: parsed.sortOrder,
      },
    });

    await tx.productOption.deleteMany({
      where: { productId: product.id },
    });

    await tx.productOption.createMany({
      data: options.map((option) => ({
        productId: product.id,
        label: option.label,
        priceCents: option.priceCents,
        sortOrder: option.sortOrder,
        isActive: true,
      })),
    });
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function deleteProduct(productId: string) {
  const orderCount = await prisma.order.count({
    where: { productId },
  });

  if (orderCount > 0) {
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
  } else {
    await prisma.product.delete({
      where: { id: productId },
    });
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function saveAnnouncement(input: z.input<typeof announcementSchema>) {
  const parsed = announcementSchema.parse(input);

  await prisma.announcement.upsert({
    where: { id: parsed.id ?? "__new__" },
    update: {
      title: parsed.title,
      body: parsed.body,
      isActive: parsed.isActive,
      pinned: parsed.pinned,
    },
    create: {
      title: parsed.title,
      body: parsed.body,
      isActive: parsed.isActive,
      pinned: parsed.pinned,
    },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/");
}

export async function deleteAnnouncement(id: string) {
  await prisma.announcement.delete({
    where: { id },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/");
}

export async function importInventoryBatch(input: z.input<typeof inventoryImportSchema>) {
  const parsed = inventoryImportSchema.parse(input);
  const lines = parsed.rawItems
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new AppError("INVENTORY_EMPTY", "没有可导入的库存内容。", 400);
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.productId },
    select: {
      id: true,
      fulfillmentMode: true,
    },
  });

  if (!product) {
    throw new AppError("PRODUCT_NOT_FOUND", "目标商品不存在。", 404);
  }

  if (product.fulfillmentMode !== FulfillmentMode.AUTO_STOCK) {
    throw new AppError("INVENTORY_MODE_INVALID", "手动发货商品不需要导入库存。", 409);
  }

  const result = await prisma.inventoryItem.createMany({
    data: lines.map((line) => ({
      productId: parsed.productId,
      encryptedPayload: encryptSecret(line),
      payloadPreview: line.slice(0, 4) ? `${line.slice(0, 4)}****` : "****",
    })),
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/");

  return {
    imported: result.count,
  };
}

export async function fulfillManualOrder(input: z.input<typeof manualFulfillmentSchema>) {
  const parsed = manualFulfillmentSchema.parse(input);
  const lines = parsed.deliveryContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new AppError("FULFILLMENT_EMPTY", "请至少录入一行发货内容。", 400);
  }

  const fulfilledOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: parsed.orderId },
      include: {
        product: true,
        fulfillmentRecord: true,
        inventoryItems: {
          select: {
            encryptedPayload: true,
            status: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError("ORDER_NOT_FOUND", "订单不存在。", 404);
    }

    if (order.fulfillmentMode !== FulfillmentMode.MANUAL) {
      throw new AppError("FULFILLMENT_MODE_INVALID", "该订单不是人工发货订单。", 409);
    }

    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.FULFILLED) {
      throw new AppError("ORDER_NOT_READY", "订单尚未支付，不能人工发货。", 409);
    }

    await tx.fulfillmentRecord.upsert({
      where: { orderId: order.id },
      update: {
        deliveredCount: lines.length,
        encryptedSnapshot: encryptSecret(JSON.stringify(lines)),
      },
      create: {
        orderId: order.id,
        deliveredCount: lines.length,
        encryptedSnapshot: encryptSecret(JSON.stringify(lines)),
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.FULFILLED,
        fulfilledAt: new Date(),
      },
      include: {
        product: true,
        fulfillmentRecord: true,
        inventoryItems: {
          select: {
            encryptedPayload: true,
            status: true,
          },
        },
      },
    });

    return toPublicOrder(updatedOrder);
  });

  revalidatePath(`/order/${fulfilledOrder.orderNo}`);
  revalidatePath("/query");
  revalidatePath("/admin/orders");

  return fulfilledOrder;
}

export function parseInventoryImportPayload(body: unknown) {
  return inventoryImportSchema.parse(body);
}
