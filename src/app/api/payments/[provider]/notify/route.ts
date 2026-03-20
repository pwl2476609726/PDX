import { NextResponse } from "next/server";

import { AppError, getErrorMessage } from "@/lib/errors";
import { applySuccessfulPayment } from "@/lib/orders";
import { resolvePaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await params;
    const adapter = resolvePaymentProvider(provider);
    const result = await adapter.verifyNotify(request.clone());
    await applySuccessfulPayment(result);

    if (provider === "wechat") {
      return NextResponse.json({ code: "SUCCESS", message: "成功" });
    }

    return new NextResponse("success");
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status },
    );
  }
}
