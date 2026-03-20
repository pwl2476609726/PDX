import { PaymentProvider } from "@prisma/client";
import {
  createDecipheriv,
  createSign,
  createVerify,
  randomBytes,
} from "node:crypto";

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

function buildWechatAuthorization({
  method,
  pathname,
  body,
}: {
  method: string;
  pathname: string;
  body: string;
}) {
  const nonce = randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${method}\n${pathname}\n${timestamp}\n${nonce}\n${body}\n`;
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  const signature = signer.sign(normalizePem(env.WECHAT_PRIVATE_KEY), "base64");

  return `WECHATPAY2-SHA256-RSA2048 mchid="${env.WECHAT_MCH_ID}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${env.WECHAT_SERIAL_NO}"`;
}

function verifyWechatSignature(
  body: string,
  headers: Headers,
  platformPublicKey: string,
) {
  const timestamp = headers.get("wechatpay-timestamp");
  const nonce = headers.get("wechatpay-nonce");
  const signature = headers.get("wechatpay-signature");

  if (!timestamp || !nonce || !signature) {
    throw new AppError("WECHAT_NOTIFY_INVALID", "微信支付回调缺少验签头。", 400);
  }

  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const verifier = createVerify("RSA-SHA256");
  verifier.update(message, "utf8");
  verifier.end();

  const ok = verifier.verify(normalizePem(platformPublicKey), signature, "base64");
  if (!ok) {
    throw new AppError("WECHAT_SIGNATURE_INVALID", "微信支付回调验签失败。", 400);
  }
}

function decryptWechatResource(resource: {
  ciphertext: string;
  associated_data: string;
  nonce: string;
}) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(env.WECHAT_API_V3_KEY, "utf8"),
    Buffer.from(resource.nonce, "utf8"),
  );

  decipher.setAuthTag(Buffer.from(resource.ciphertext, "base64").subarray(-16));
  decipher.setAAD(Buffer.from(resource.associated_data, "utf8"));

  const ciphertext = Buffer.from(resource.ciphertext, "base64");
  const payload = Buffer.concat([
    decipher.update(ciphertext.subarray(0, ciphertext.length - 16)),
    decipher.final(),
  ]);

  return JSON.parse(payload.toString("utf8")) as {
    out_trade_no: string;
    transaction_id: string;
    amount: { total: number };
    trade_state: string;
  };
}

export function createWechatAdapter(): PaymentAdapter {
  return {
    provider: PaymentProvider.WECHAT,
    async createPayment(input: PaymentCreateInput): Promise<PaymentCreateResult> {
      if (env.PAYMENT_MODE === "mock") {
        return {
          provider: PaymentProvider.WECHAT,
          displayName: "微信支付",
          mode: "redirect",
          checkoutUrl: `${env.APP_URL}/pay/mock/${input.orderNo}?provider=wechat`,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };
      }

      if (
        !env.WECHAT_APPID ||
        !env.WECHAT_MCH_ID ||
        !env.WECHAT_PRIVATE_KEY ||
        !env.WECHAT_SERIAL_NO
      ) {
        throw new AppError("WECHAT_NOT_CONFIGURED", "微信支付商户参数未配置完整。", 503);
      }

      const endpoint = input.isMobile
        ? "/v3/pay/transactions/h5"
        : "/v3/pay/transactions/native";

      const payload = {
        appid: env.WECHAT_APPID,
        mchid: env.WECHAT_MCH_ID,
        description: input.subject,
        out_trade_no: input.orderNo,
        notify_url: input.notifyUrl,
        amount: {
          total: input.amountCents,
          currency: "CNY",
        },
        scene_info: {
          payer_client_ip: input.clientIp,
          h5_info: {
            type: "Wap",
          },
        },
      };

      const body = JSON.stringify(payload);
      const response = await fetch(`https://api.mch.weixin.qq.com${endpoint}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: buildWechatAuthorization({
            method: "POST",
            pathname: endpoint,
            body,
          }),
          "User-Agent": "PWL Digital Shop/1.0",
        },
        body,
      });

      if (!response.ok) {
        throw new AppError(
          "WECHAT_CREATE_FAILED",
          `微信支付下单失败：${response.status}`,
          502,
        );
      }

      const data = (await response.json()) as {
        code_url?: string;
        h5_url?: string;
      };

      return {
        provider: PaymentProvider.WECHAT,
        displayName: "微信支付",
        mode: input.isMobile ? "redirect" : "qr",
        checkoutUrl: data.h5_url,
        qrCodeText: data.code_url,
        deepLink: data.h5_url,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    },
    async verifyNotify(request: Request): Promise<NormalizedPaymentResult> {
      const body = await request.text();

      if (env.PAYMENT_MODE !== "mock") {
        verifyWechatSignature(body, request.headers, env.WECHAT_PLATFORM_PUBLIC_KEY);
      }

      const parsed = JSON.parse(body) as {
        event_type?: string;
        resource?: {
          ciphertext: string;
          associated_data: string;
          nonce: string;
        };
      };

      if (!parsed.resource) {
        throw new AppError("WECHAT_NOTIFY_INVALID", "微信支付通知缺少资源体。", 400);
      }

      const resource =
        env.PAYMENT_MODE === "mock"
          ? (JSON.parse(body) as {
              out_trade_no: string;
              transaction_id: string;
              amount: { total: number };
            })
          : decryptWechatResource(parsed.resource);

      return {
        provider: PaymentProvider.WECHAT,
        orderNo: resource.out_trade_no,
        providerTransactionId: resource.transaction_id,
        amountCents: resource.amount.total,
        raw: parsed,
      };
    },
  };
}
