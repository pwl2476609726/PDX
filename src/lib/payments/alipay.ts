import { PaymentProvider } from "@prisma/client";
import { createSign, createVerify } from "node:crypto";

import { AppError } from "../errors";
import { env } from "../env";

import type {
  NormalizedPaymentResult,
  PaymentAdapter,
  PaymentCreateInput,
  PaymentCreateResult,
} from "./types";

function normalizePem(value: string) {
  return value.replaceAll("\\n", "\n").trim();
}

function buildSignedQuery(params: Record<string, string>) {
  const sorted = Object.entries(params).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const unsigned = sorted.map(([key, value]) => `${key}=${value}`).join("&");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned, "utf8");
  signer.end();
  const signature = signer.sign(normalizePem(env.ALIPAY_PRIVATE_KEY), "base64");

  const query = new URLSearchParams(params);
  query.set("sign", signature);
  return query.toString();
}

function verifyAlipaySignature(params: URLSearchParams) {
  const signature = params.get("sign");
  const signType = params.get("sign_type");

  if (!signature || signType !== "RSA2") {
    throw new AppError("ALIPAY_SIGNATURE_INVALID", "支付宝回调签名缺失或签名类型不正确。", 400);
  }

  const filtered = [...params.entries()]
    .filter(([key]) => key !== "sign" && key !== "sign_type")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(filtered, "utf8");
  verifier.end();

  const ok = verifier.verify(
    normalizePem(env.ALIPAY_PUBLIC_KEY),
    signature,
    "base64",
  );

  if (!ok) {
    throw new AppError("ALIPAY_SIGNATURE_INVALID", "支付宝回调验签失败。", 400);
  }
}

export function createAlipayAdapter(): PaymentAdapter {
  return {
    provider: PaymentProvider.ALIPAY,
    async createPayment(input: PaymentCreateInput): Promise<PaymentCreateResult> {
      if (env.PAYMENT_MODE === "mock") {
        return {
          provider: PaymentProvider.ALIPAY,
          displayName: "支付宝",
          mode: "redirect",
          checkoutUrl: `${env.APP_URL}/pay/mock/${input.orderNo}?provider=alipay`,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };
      }

      if (!env.ALIPAY_APP_ID || !env.ALIPAY_PRIVATE_KEY || !env.ALIPAY_PUBLIC_KEY) {
        throw new AppError("ALIPAY_NOT_CONFIGURED", "支付宝商户参数未配置完整。", 503);
      }

      const bizContent = JSON.stringify({
        out_trade_no: input.orderNo,
        product_code: "FAST_INSTANT_TRADE_PAY",
        total_amount: (input.amountCents / 100).toFixed(2),
        subject: input.subject,
        body: input.description,
      });

      const params = {
        app_id: env.ALIPAY_APP_ID,
        method: "alipay.trade.page.pay",
        charset: "utf-8",
        sign_type: "RSA2",
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
        version: "1.0",
        notify_url: input.notifyUrl,
        return_url: input.returnUrl,
        biz_content: bizContent,
      };

      return {
        provider: PaymentProvider.ALIPAY,
        displayName: "支付宝",
        mode: "redirect",
        checkoutUrl: `${env.ALIPAY_GATEWAY_URL}?${buildSignedQuery(params)}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    },
    async verifyNotify(request: Request): Promise<NormalizedPaymentResult> {
      const body = await request.text();
      const params = new URLSearchParams(body);

      if (env.PAYMENT_MODE !== "mock") {
        verifyAlipaySignature(params);
      }

      const tradeStatus = params.get("trade_status");
      if (!tradeStatus || !["TRADE_SUCCESS", "TRADE_FINISHED"].includes(tradeStatus)) {
        throw new AppError("ALIPAY_TRADE_INVALID", "支付宝通知状态不是成功支付。", 400);
      }

      const outTradeNo = params.get("out_trade_no");
      const tradeNo = params.get("trade_no");
      const totalAmount = params.get("total_amount");

      if (!outTradeNo || !tradeNo || !totalAmount) {
        throw new AppError("ALIPAY_NOTIFY_INVALID", "支付宝通知缺少关键字段。", 400);
      }

      return {
        provider: PaymentProvider.ALIPAY,
        orderNo: outTradeNo,
        providerTransactionId: tradeNo,
        amountCents: Math.round(Number(totalAmount) * 100),
        raw: Object.fromEntries(params.entries()),
      };
    },
  };
}
