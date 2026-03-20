import { NextResponse } from "next/server";

import { AppError, getErrorMessage } from "@/lib/errors";
import { lookupOrdersByCredentials } from "@/lib/orders";
import { getClientIp } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const orders = await lookupOrdersByCredentials({
      ...payload,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ orders });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status },
    );
  }
}
