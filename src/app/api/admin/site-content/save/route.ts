import { NextResponse } from "next/server";

import { AppError, getErrorMessage } from "@/lib/errors";
import {
  assertLocalEditorEnabled,
  saveStoreContent,
} from "@/lib/site-content";
import { storeConfigSchema } from "@/lib/site-content-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertLocalEditorEnabled();
    const payload = await request.json();
    const config = storeConfigSchema.parse(payload.config);
    const savedConfig = await saveStoreContent({
      config,
      pendingPaymentImages: payload.pendingPaymentImages || {},
      pendingProductImages: payload.pendingProductImages || {},
    });

    return NextResponse.json({ ok: true, config: savedConfig });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: getErrorMessage(error) }, { status });
  }
}
