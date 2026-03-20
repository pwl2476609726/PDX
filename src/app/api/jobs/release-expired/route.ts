import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { cleanupExpiredReservations } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ message: "未授权。" }, { status: 401 });
  }

  const released = await cleanupExpiredReservations();
  return NextResponse.json({ released });
}
