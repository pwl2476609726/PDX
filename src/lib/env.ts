import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/pwl_shop?schema=public"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().min(1).default("Pulse Works Market"),
  ADMIN_SESSION_SECRET: z
    .string()
    .min(16)
    .default("dev-admin-session-secret-change-me"),
  DATA_ENCRYPTION_SECRET: z
    .string()
    .min(16)
    .default("dev-data-encryption-secret-change-me"),
  CRON_SECRET: z.string().min(8).default("dev-cron-secret"),
  PAYMENT_MODE: z.enum(["mock", "official"]).default("mock"),
  ORDER_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  DEFAULT_ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  ALIPAY_APP_ID: z.string().default(""),
  ALIPAY_GATEWAY_URL: z
    .string()
    .url()
    .default("https://openapi.alipay.com/gateway.do"),
  ALIPAY_NOTIFY_URL: z.string().default(""),
  ALIPAY_RETURN_URL: z.string().default(""),
  ALIPAY_PRIVATE_KEY: z.string().default(""),
  ALIPAY_PUBLIC_KEY: z.string().default(""),
  WECHAT_APPID: z.string().default(""),
  WECHAT_MCH_ID: z.string().default(""),
  WECHAT_SERIAL_NO: z.string().default(""),
  WECHAT_PRIVATE_KEY: z.string().default(""),
  WECHAT_PLATFORM_PUBLIC_KEY: z.string().default(""),
  WECHAT_API_V3_KEY: z.string().default(""),
  WECHAT_NOTIFY_URL: z.string().default(""),
});

export const env = schema.parse(process.env);
