import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "./db";
import { createSignedToken, verifyPassword, verifySignedToken } from "./crypto";

const ADMIN_COOKIE = "pwl_admin_session";
const MAX_AGE = 60 * 60 * 12;

type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  exp: number;
};

export async function issueAdminSession(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };

  const store = await cookies();
  store.set(ADMIN_COOKIE, createSignedToken(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });

  return user;
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function getAdminUser() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = verifySignedToken<SessionPayload>(token);
  if (!payload || payload.exp * 1000 < Date.now()) {
    store.delete(ADMIN_COOKIE);
    return null;
  }

  return prisma.adminUser.findUnique({
    where: { id: payload.sub },
  });
}

export async function requireAdminUser() {
  const user = await getAdminUser();
  if (!user) {
    redirect("/admin/login");
  }

  return user;
}
