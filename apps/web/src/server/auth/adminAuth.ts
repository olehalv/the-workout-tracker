// Server-only: password gate for the /admin dashboard. Never import from a
// Client Component. There is no admin user in Postgres — this is a single shared
// password (ADMIN_PASSWORD) that lets an operator into the dashboard.

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { config } from "../config";

export const ADMIN_COOKIE = "admin_session";

// 30 days, matching the session-cookie lifetime elsewhere.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * The value stored in the admin cookie: an HMAC of the password keyed by the
 * session secret, so the raw password never sits in a cookie and rotating either
 * ADMIN_PASSWORD or SESSION_JWT_SECRET invalidates every existing session.
 */
function adminToken(): string {
  return crypto
    .createHmac("sha256", config.jwtSecret)
    .update(`admin:${config.adminPassword}`)
    .digest("hex");
}

/** Whether an admin password is configured at all. If not, /admin denies access. */
export function adminConfigured(): boolean {
  return config.adminPassword.length > 0;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** True when the current request carries a valid admin session cookie. */
export async function isAdminAuthed(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;
  return safeEqual(cookie, adminToken());
}

/** Constant-time check of a submitted password against ADMIN_PASSWORD. */
export function verifyAdminPassword(password: string): boolean {
  if (!adminConfigured()) return false;
  return safeEqual(password, config.adminPassword);
}

/** Sets the admin session cookie (call from a server action / route handler). */
export async function setAdminCookie(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

/** Clears the admin session cookie. */
export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}
