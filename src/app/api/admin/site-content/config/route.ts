import { NextResponse } from "next/server";

import { AppError, getErrorMessage } from "@/lib/errors";
import {
  assertLocalEditorEnabled,
  readStoreConfig,
  writeStoreConfig,
} from "@/lib/site-content";
import { storeConfigSchema } from "@/lib/site-content-schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    assertLocalEditorEnabled();
    const config = await readStoreConfig();
    return NextResponse.json({ config });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: getErrorMessage(error) }, { status });
  }
}

export async function POST(request: Request) {
  try {
    assertLocalEditorEnabled();
    const payload = await request.json();
    const parsed = storeConfigSchema.parse(payload);
    await writeStoreConfig(parsed);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: getErrorMessage(error) }, { status });
  }
}
