import { NextResponse } from "next/server";

import { AppError, getErrorMessage } from "@/lib/errors";
import { createPendingOrder } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const order = await createPendingOrder(payload);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const status =
      error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status },
    );
  }
}
