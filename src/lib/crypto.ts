import bcrypt from "bcryptjs";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { env } from "./env";

function deriveKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function encryptSecret(value: string) {
  const key = deriveKey(env.DATA_ENCRYPTION_SECRET);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");

  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("密文格式非法。");
  }

  const key = deriveKey(env.DATA_ENCRYPTION_SECRET);
  const decipher = createDecipheriv("aes-256-gcm", key, fromBase64Url(ivRaw));
  decipher.setAuthTag(fromBase64Url(tagRaw));

  return Buffer.concat([
    decipher.update(fromBase64Url(encryptedRaw)),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: string) {
  if (value.length <= 8) {
    return `${value.slice(0, 2)}****`;
  }

  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export function createSignedToken(payload: Record<string, unknown>) {
  const body = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", env.ADMIN_SESSION_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifySignedToken<T>(token: string) {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = createHmac("sha256", env.ADMIN_SESSION_SECRET)
    .update(body)
    .digest("base64url");

  const isValid =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!isValid) {
    return null;
  }

  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
}

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}
