import { z } from "zod";

export const paymentChannelSchema = z.object({
  label: z.string().trim().min(1).max(40),
  image: z.string().trim().min(1),
  helper: z.string().trim().min(1).max(300),
});

export const announcementSchema = z.object({
  contactLabel: z.string().trim().min(1).max(40),
  contactText: z.string().trim().min(1).max(200),
  contactHref: z.string().trim().min(1).max(300),
  divider: z.string().trim().min(1).max(40),
  rules: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  warning: z.string().trim().min(1).max(300),
});

export const contactCardSchema = z.object({
  label: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(300),
});

export const productOptionSchema = z.object({
  label: z.string().trim().min(1).max(80),
  priceCents: z.coerce.number().int().min(0).max(99999999),
});

export const productSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(600),
  image: z.string().trim().default(""),
  coverTheme: z.enum(["gemini", "router", "antigravity"]),
  stock: z.coerce.number().int().min(0).max(999999),
  statusLabel: z.string().trim().min(1).max(40),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  keywords: z.array(z.string().trim().min(1).max(60)).max(20),
  options: z.array(productOptionSchema).min(1).max(20),
});

export const storeConfigSchema = z.object({
  site: z.object({
    brand: z.object({
      title: z.string().trim().min(1).max(80),
      subtitle: z.string().trim().min(1).max(120),
    }),
    nav: z.object({
      shopping: z.string().trim().min(1).max(20),
    }),
  }),
  paymentChannels: z.object({
    alipay: paymentChannelSchema,
    wechat: paymentChannelSchema,
  }),
  announcements: z.array(announcementSchema).min(1).max(5),
  contact: z.array(contactCardSchema).min(1).max(10),
  products: z.array(productSchema).min(1).max(100),
});

export type StoreConfig = z.infer<typeof storeConfigSchema>;
