import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/auth";
import { AppError, getErrorMessage } from "@/lib/errors";
import { importInventoryBatch } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ message: "未登录。" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const result = await importInventoryBatch(payload);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status },
    );
  }
}
