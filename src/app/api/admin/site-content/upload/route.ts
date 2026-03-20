import { NextResponse } from "next/server";

import { AppError, getErrorMessage } from "@/lib/errors";
import {
  assertLocalEditorEnabled,
  savePaymentImage,
  saveProductImage,
} from "@/lib/site-content";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertLocalEditorEnabled();
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") || "");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "请选择图片文件。" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "仅支持图片文件。" }, { status: 400 });
    }

    if (kind === "payment") {
      const slot = String(formData.get("slot") || "");
      if (slot !== "alipay" && slot !== "wechat") {
        return NextResponse.json({ message: "支付通道不正确。" }, { status: 400 });
      }

      const imagePath = await savePaymentImage(slot, file);
      return NextResponse.json({ imagePath });
    }

    if (kind === "product") {
      const productId = String(formData.get("productId") || "");
      if (!productId) {
        return NextResponse.json({ message: "缺少商品标识。" }, { status: 400 });
      }

      const imagePath = await saveProductImage(productId, file);
      return NextResponse.json({ imagePath });
    }

    return NextResponse.json({ message: "上传类型不支持。" }, { status: 400 });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: getErrorMessage(error) }, { status });
  }
}
