import { customAlphabet } from "nanoid";

import { clsx } from "clsx";

const orderAlphabet = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function formatSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ensureSlug(input: string, fallbackPrefix: string) {
  const slug = formatSlug(input);
  return slug || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

export function createOrderNo() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `PW${stamp}${orderAlphabet()}`;
}

export function isMobileUserAgent(userAgent: string) {
  return /android|iphone|ipad|ipod|mobile|micromessenger/i.test(userAgent);
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  }

  return request.headers.get("x-real-ip") || "127.0.0.1";
}

export function toPositiveInt(value: string | null | undefined, fallback = 0) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
