"use server";

import { redirect } from "next/navigation";

import { clearAdminSession, issueAdminSession, requireAdminUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  deleteAnnouncement,
  deleteCategory,
  deleteProduct,
  saveAnnouncement,
  saveCategory,
  saveProduct,
} from "@/lib/orders";

function readBoolean(formData: FormData, field: string) {
  return formData.get(field) === "on";
}

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const user = await issueAdminSession(email, password);

  if (!user) {
    return { error: "邮箱或密码不正确。" };
  }

  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function saveCategoryAction(formData: FormData) {
  await requireAdminUser();
  await saveCategory({
    id: String(formData.get("id") || "") || undefined,
    name: String(formData.get("name") || ""),
    slug: String(formData.get("slug") || "") || undefined,
    description: String(formData.get("description") || "") || undefined,
    sortOrder: String(formData.get("sortOrder") || "0"),
  });

  redirect("/admin/products");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdminUser();

  try {
    await deleteCategory(String(formData.get("id") || ""));
  } catch (error) {
    redirect(`/admin/products?message=${encodeURIComponent(getErrorMessage(error))}`);
  }

  redirect("/admin/products");
}

export async function saveProductAction(formData: FormData) {
  await requireAdminUser();
  await saveProduct({
    id: String(formData.get("id") || "") || undefined,
    categoryId: String(formData.get("categoryId") || ""),
    name: String(formData.get("name") || ""),
    slug: String(formData.get("slug") || "") || undefined,
    summary: String(formData.get("summary") || ""),
    description: String(formData.get("description") || ""),
    supportPolicy: String(formData.get("supportPolicy") || ""),
    deliveryFormat: String(formData.get("deliveryFormat") || ""),
    badge: String(formData.get("badge") || "") || undefined,
    fulfillmentMode: (String(formData.get("fulfillmentMode") || "MANUAL") ||
      "MANUAL") as "MANUAL" | "AUTO_STOCK",
    optionsText: String(formData.get("optionsText") || ""),
    isActive: readBoolean(formData, "isActive"),
    isFeatured: readBoolean(formData, "isFeatured"),
    sortOrder: String(formData.get("sortOrder") || "0"),
  });

  redirect("/admin/products");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdminUser();
  await deleteProduct(String(formData.get("id") || ""));
  redirect("/admin/products");
}

export async function saveAnnouncementAction(formData: FormData) {
  await requireAdminUser();
  await saveAnnouncement({
    id: String(formData.get("id") || "") || undefined,
    title: String(formData.get("title") || ""),
    body: String(formData.get("body") || ""),
    isActive: readBoolean(formData, "isActive"),
    pinned: readBoolean(formData, "pinned"),
  });

  redirect("/admin/announcements");
}

export async function deleteAnnouncementAction(formData: FormData) {
  await requireAdminUser();
  await deleteAnnouncement(String(formData.get("id") || ""));
  redirect("/admin/announcements");
}
