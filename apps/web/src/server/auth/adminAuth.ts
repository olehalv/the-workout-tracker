import crypto from "node:crypto";
import { cookies } from "next/headers";
import { config } from "../config";

export const ADMIN_COOKIE = "admin_session";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function adminToken(): string {
  return crypto
    .createHmac("sha256", config.jwtSecret)
    .update(`admin:${config.adminPassword}`)
    .digest("hex");
}

export function adminConfigured(): boolean {
  return config.adminPassword.length > 0;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function isAdminAuthed(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;
  return safeEqual(cookie, adminToken());
}

export function verifyAdminPassword(password: string): boolean {
  if (!adminConfigured()) return false;
  return safeEqual(password, config.adminPassword);
}

export async function setAdminCookie(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
