import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { AppError } from "./errors";
import { storeConfigSchema, type StoreConfig } from "./site-content-schema";

const docsRoot = path.join(process.cwd(), "docs");
const dataDir = path.join(docsRoot, "data");
const payDir = path.join(docsRoot, "assets", "pay");
const productsDir = path.join(docsRoot, "assets", "products");
const configPath = path.join(dataDir, "store-config.json");

export type PendingUploadPayload = {
  dataUrl: string;
  name: string;
  type?: string;
};

export function assertLocalEditorEnabled() {
  if (process.env.NODE_ENV !== "development") {
    throw new AppError(
      "LOCAL_EDITOR_DISABLED",
      "本地静态页编辑器仅在开发环境可用。",
      403,
    );
  }
}

export async function ensureSiteContentDirs() {
  await Promise.all([
    mkdir(dataDir, { recursive: true }),
    mkdir(payDir, { recursive: true }),
    mkdir(productsDir, { recursive: true }),
  ]);
}

export async function readStoreConfig() {
  await ensureSiteContentDirs();
  const raw = await readFile(configPath, "utf8");
  return storeConfigSchema.parse(JSON.parse(raw)) satisfies StoreConfig;
}

export async function writeStoreConfig(config: StoreConfig) {
  await ensureSiteContentDirs();
  const parsed = storeConfigSchema.parse(config);
  await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferExtension(file: File) {
  const extension = path.extname(file.name).toLowerCase();
  if (extension) {
    return extension;
  }

  if (file.type === "image/png") {
    return ".png";
  }

  if (file.type === "image/webp") {
    return ".webp";
  }

  if (file.type === "image/jpeg") {
    return ".jpg";
  }

  return ".bin";
}

function inferExtensionFromUpload(upload: PendingUploadPayload) {
  const extension = path.extname(upload.name).toLowerCase();
  if (extension) {
    return extension;
  }

  if (upload.type === "image/png") {
    return ".png";
  }

  if (upload.type === "image/webp") {
    return ".webp";
  }

  if (upload.type === "image/jpeg") {
    return ".jpg";
  }

  return ".bin";
}

function decodeDataUrl(dataUrl: string) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new AppError("SITE_CONTENT_IMAGE_INVALID", "图片数据格式不正确。", 400);
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function savePaymentImage(slot: "alipay" | "wechat", file: File) {
  await ensureSiteContentDirs();
  const extension = inferExtension(file);
  const fileName = slot === "alipay" ? `alipay${extension}` : `wechat${extension}`;
  const targetPath = path.join(payDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(targetPath, buffer);

  return `./assets/pay/${fileName}`;
}

export async function saveProductImage(productId: string, file: File) {
  await ensureSiteContentDirs();
  const extension = inferExtension(file);
  const fileName = `${sanitizeSegment(productId)}${extension}`;
  const targetPath = path.join(productsDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(targetPath, buffer);

  return `./assets/products/${fileName}`;
}

async function savePendingPaymentImage(
  slot: "alipay" | "wechat",
  upload: PendingUploadPayload,
) {
  await ensureSiteContentDirs();
  const extension = inferExtensionFromUpload({
    ...upload,
    type: upload.type || decodeDataUrl(upload.dataUrl).mimeType,
  });
  const fileName = slot === "alipay" ? `alipay${extension}` : `wechat${extension}`;
  const targetPath = path.join(payDir, fileName);
  const { buffer } = decodeDataUrl(upload.dataUrl);

  await writeFile(targetPath, buffer);

  return `./assets/pay/${fileName}`;
}

async function savePendingProductImage(productId: string, upload: PendingUploadPayload) {
  await ensureSiteContentDirs();
  const extension = inferExtensionFromUpload({
    ...upload,
    type: upload.type || decodeDataUrl(upload.dataUrl).mimeType,
  });
  const fileName = `${sanitizeSegment(productId)}${extension}`;
  const targetPath = path.join(productsDir, fileName);
  const { buffer } = decodeDataUrl(upload.dataUrl);

  await writeFile(targetPath, buffer);

  return `./assets/products/${fileName}`;
}

export async function saveStoreContent(params: {
  config: StoreConfig;
  pendingPaymentImages?: Partial<Record<"alipay" | "wechat", PendingUploadPayload>>;
  pendingProductImages?: Record<string, PendingUploadPayload>;
}) {
  const normalized = storeConfigSchema.parse(params.config);
  const nextConfig: StoreConfig = {
    ...normalized,
    paymentChannels: {
      ...normalized.paymentChannels,
    },
    products: normalized.products.map((product) => ({ ...product })),
  };

  if (params.pendingPaymentImages?.alipay) {
    nextConfig.paymentChannels.alipay.image = await savePendingPaymentImage(
      "alipay",
      params.pendingPaymentImages.alipay,
    );
  }

  if (params.pendingPaymentImages?.wechat) {
    nextConfig.paymentChannels.wechat.image = await savePendingPaymentImage(
      "wechat",
      params.pendingPaymentImages.wechat,
    );
  }

  if (params.pendingProductImages) {
    for (const product of nextConfig.products) {
      const pending = params.pendingProductImages[product.id];
      if (pending) {
        product.image = await savePendingProductImage(product.id, pending);
      }
    }
  }

  await writeStoreConfig(nextConfig);
  return nextConfig;
}

export function resolveDocsRelativePath(relativePath: string) {
  const normalized = relativePath.replace(/^\.\//, "");
  const resolved = path.resolve(docsRoot, normalized);

  if (!resolved.startsWith(docsRoot)) {
    throw new AppError("SITE_CONTENT_PATH_INVALID", "文件路径非法。", 400);
  }

  return resolved;
}
