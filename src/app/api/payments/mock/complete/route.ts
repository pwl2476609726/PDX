import { PaymentProvider } from "@prisma/client";
import { NextResponse } from "next/server";

import { AppError, getErrorMessage } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { applySuccessfulPayment } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      orderNo?: string;
      provider?: "alipay" | "wechat";
    };

    if (!payload.orderNo) {
      return NextResponse.json({ message: "缺少订单号。" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderNo: payload.orderNo },
    });

    if (!order) {
      return NextResponse.json({ message: "订单不存在。" }, { status: 404 });
    }

    const result = await applySuccessfulPayment({
      provider:
        payload.provider === "wechat" ? PaymentProvider.WECHAT : PaymentProvider.ALIPAY,
      orderNo: order.orderNo,
      providerTransactionId: `MOCK-${Date.now()}`,
      amountCents: order.amountCents,
      raw: {
        mode: "mock",
      },
    });

    return NextResponse.json({ order: result });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status },
    );
  }
}
