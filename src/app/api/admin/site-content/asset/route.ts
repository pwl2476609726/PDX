import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { AppError, getErrorMessage } from "@/lib/errors";
import {
  assertLocalEditorEnabled,
  resolveDocsRelativePath,
} from "@/lib/site-content";

export const runtime = "nodejs";

function getContentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export async function GET(request: Request) {
  try {
    assertLocalEditorEnabled();
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get("path");

    if (!relativePath) {
      return NextResponse.json({ message: "缺少文件路径。" }, { status: 400 });
    }

    const absolutePath = resolveDocsRelativePath(relativePath);
    const buffer = await readFile(absolutePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": getContentType(absolutePath),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: getErrorMessage(error) }, { status });
  }
}
