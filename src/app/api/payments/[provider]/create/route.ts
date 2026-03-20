import { NextResponse } from "next/server";

import { AppError, getErrorMessage } from "@/lib/errors";
import { createPaymentForOrder } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;
    const payload = (await request.json()) as { orderNo?: string };

    if (!payload.orderNo) {
      return NextResponse.json({ message: "缺少订单号。" }, { status: 400 });
    }

    const payment = await createPaymentForOrder(payload.orderNo, provider, request);
    return NextResponse.json(payment);
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status },
    );
  }
}
