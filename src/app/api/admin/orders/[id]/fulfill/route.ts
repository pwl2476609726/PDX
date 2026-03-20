import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import { AppError, getErrorMessage } from "@/lib/errors";
import { fulfillManualOrder } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ message: "未登录。" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const payload = await request.json();
    const order = await fulfillManualOrder({
      orderId: id,
      deliveryContent: payload.deliveryContent,
    });

    return NextResponse.json({ order });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status },
    );
  }
}
