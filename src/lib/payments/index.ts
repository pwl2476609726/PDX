import { PaymentProvider } from "@prisma/client";

import { AppError } from "../errors";

import { createAlipayAdapter } from "./alipay";
import type { PaymentProviderSlug } from "./types";
import { createWechatAdapter } from "./wechat";

const adapters = {
  alipay: createAlipayAdapter(),
  wechat: createWechatAdapter(),
} as const;

export function resolvePaymentProvider(slug: string) {
  if (!(slug in adapters)) {
    throw new AppError("PAYMENT_PROVIDER_INVALID", "不支持的支付方式。", 400);
  }

  return adapters[slug as PaymentProviderSlug];
}

export function paymentProviderFromOrder(provider: PaymentProvider): PaymentProviderSlug {
  return provider === PaymentProvider.ALIPAY ? "alipay" : "wechat";
}
