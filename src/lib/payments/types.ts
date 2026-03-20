import type { PaymentProvider } from "@prisma/client";

export type PaymentProviderSlug = "alipay" | "wechat";

export type PaymentCreateInput = {
  orderNo: string;
  amountCents: number;
  subject: string;
  description: string;
  returnUrl: string;
  notifyUrl: string;
  clientIp: string;
  userAgent: string;
  isMobile: boolean;
};

export type PaymentCreateResult = {
  provider: PaymentProvider;
  displayName: string;
  mode: "redirect" | "qr";
  checkoutUrl?: string;
  qrCodeText?: string;
  deepLink?: string;
  expiresAt: string;
};

export type NormalizedPaymentResult = {
  provider: PaymentProvider;
  orderNo: string;
  providerTransactionId: string;
  amountCents: number;
  raw: unknown;
};

export interface PaymentAdapter {
  provider: PaymentProvider;
  createPayment(input: PaymentCreateInput): Promise<PaymentCreateResult>;
  verifyNotify(request: Request): Promise<NormalizedPaymentResult>;
}
