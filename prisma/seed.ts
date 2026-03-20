import "dotenv/config";

import { FulfillmentMode, PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/crypto";
import { env } from "../src/lib/env";

const prisma = new PrismaClient();

async function upsertProductWithOptions(input: {
  categoryId: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  supportPolicy: string;
  deliveryFormat: string;
  badge: string;
  sortOrder: number;
  isFeatured?: boolean;
  fulfillmentMode: FulfillmentMode;
  options: Array<{ label: string; priceCents: number; sortOrder: number }>;
}) {
  const product = await prisma.product.upsert({
    where: { slug: input.slug },
    update: {
      categoryId: input.categoryId,
      name: input.name,
      summary: input.summary,
      description: input.description,
      supportPolicy: input.supportPolicy,
      deliveryFormat: input.deliveryFormat,
      badge: input.badge,
      sortOrder: input.sortOrder,
      isActive: true,
      isFeatured: input.isFeatured ?? false,
      fulfillmentMode: input.fulfillmentMode,
    },
    create: {
      categoryId: input.categoryId,
      name: input.name,
      slug: input.slug,
      summary: input.summary,
      description: input.description,
      supportPolicy: input.supportPolicy,
      deliveryFormat: input.deliveryFormat,
      badge: input.badge,
      sortOrder: input.sortOrder,
      isActive: true,
      isFeatured: input.isFeatured ?? false,
      fulfillmentMode: input.fulfillmentMode,
    },
  });

  await prisma.productOption.deleteMany({
    where: { productId: product.id },
  });

  await prisma.productOption.createMany({
    data: input.options.map((option) => ({
      productId: product.id,
      label: option.label,
      priceCents: option.priceCents,
      sortOrder: option.sortOrder,
      isActive: true,
    })),
  });

  return product;
}

async function main() {
  const adminPasswordHash = await hashPassword(env.DEFAULT_ADMIN_PASSWORD);

  await prisma.adminUser.upsert({
    where: { email: env.DEFAULT_ADMIN_EMAIL },
    update: {
      name: "Store Admin",
      passwordHash: adminPasswordHash,
    },
    create: {
      email: env.DEFAULT_ADMIN_EMAIL,
      name: "Store Admin",
      passwordHash: adminPasswordHash,
    },
  });

  const category = await prisma.category.upsert({
    where: { slug: "family-groups-and-tokens" },
    update: {
      name: "家庭组与令牌",
      description: "面向家庭组、订阅资格与 API 令牌的人工交付商品。",
      sortOrder: 1,
    },
    create: {
      name: "家庭组与令牌",
      slug: "family-groups-and-tokens",
      description: "面向家庭组、订阅资格与 API 令牌的人工交付商品。",
      sortOrder: 1,
    },
  });

  const existingAnnouncement = await prisma.announcement.findFirst({
    where: {
      title: "上线说明",
    },
  });

  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        title: "上线说明",
        body: "当前站点默认启用 mock 支付，便于先在本机验证下单与人工发货流程。正式对外访问时，请部署到公网服务器并绑定域名，再接入真实支付宝与微信支付。",
        isActive: true,
        pinned: true,
      },
    });
  }

  await upsertProductWithOptions({
    categoryId: category.id,
    slug: "gemini-pro-family-group",
    name: "Gemini Pro家庭组（20XX年XX月XX日到期）",
    summary: "手动交付的 Gemini Pro 家庭组资格商品，标题日期可在后台直接维护。",
    description:
      "付款成功后进入人工发货流程。交付内容以店铺说明和售后约定为准，后台可录入最终交付文本供买家在订单查询页查看。",
    supportPolicy:
      "首期按人工交付处理。请在正式售卖前把交付范围、售后窗口和退款条件写清楚；商品标题中的到期日期由后台手动维护。",
    deliveryFormat:
      "发货形式：人工录入交付内容并同步到订单查询页。可填写家庭组资格说明、账号信息、注意事项等。",
    badge: "人工发货",
    sortOrder: 1,
    isFeatured: true,
    fulfillmentMode: FulfillmentMode.MANUAL,
    options: [{ label: "标准版", priceCents: 1000, sortOrder: 1 }],
  });

  await upsertProductWithOptions({
    categoryId: category.id,
    slug: "anyrouter-api-token",
    name: "AnyRouter API令牌",
    summary: "以人工发货方式交付，价格说明为 12r=100刀。",
    description:
      "付款成功后由后台人工录入最终交付内容。商品说明中保留 12r=100刀 的额度含义，便于前台直接展示给买家。",
    supportPolicy:
      "请在正式上线前补充额度换算、有效期、使用限制与售后范围。当前流程为已支付后等待人工发货。",
    deliveryFormat:
      "发货形式：人工录入 API 令牌、调用说明、额度备注或相关链接。",
    badge: "人工发货",
    sortOrder: 2,
    fulfillmentMode: FulfillmentMode.MANUAL,
    options: [{ label: "100刀额度", priceCents: 1200, sortOrder: 1 }],
  });

  await upsertProductWithOptions({
    categoryId: category.id,
    slug: "antigravity-pro-family-group",
    name: "Antigravity Pro家庭组",
    summary:
      "纯现场手搓 1 主号 + 5 副号的 Pro 家庭组，包含中间过程处理，最终交付 6 个可直接登录使用的 Pro 资格账号。",
    description:
      "纯现场手搓 1 主号 + 5 副号的 Pro 家庭组，可用 Antigravity，额度堪比 Ultra，价格实惠。获取账号、Pro 充值、拉家庭组、Antigravity 手机号验证等中间过程全包。最终到手可直接登录使用的一个家庭组的 6 个 Pro 资格账号。",
    supportPolicy:
      "首期按照人工服务交付。支付成功后订单会进入待人工发货状态，由后台录入最终账号内容。建议你上线前把交付时效、登录注意事项和售后边界写入说明。",
    deliveryFormat:
      "发货形式：人工录入一组家庭组的 6 个 Pro 资格账号及必要说明。",
    badge: "人工发货",
    sortOrder: 3,
    isFeatured: true,
    fulfillmentMode: FulfillmentMode.MANUAL,
    options: [
      { label: "1个月有效期", priceCents: 5000, sortOrder: 1 },
      { label: "4个月有效期", priceCents: 8800, sortOrder: 2 },
      { label: "1年有效期", priceCents: 15000, sortOrder: 3 },
    ],
  });

  await prisma.product.updateMany({
    where: {
      slug: "starter-license-bundle",
    },
    data: {
      isActive: false,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
