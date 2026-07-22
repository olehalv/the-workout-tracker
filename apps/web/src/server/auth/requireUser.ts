import type { User } from "../db/schema";
import { getUserById } from "../db/users";
import { verifySessionToken } from "./session";

/**
 * Resolve the signed-in user from an `Authorization: Bearer <session jwt>`
 * header. Returns null on anything invalid — the caller turns that into a 401.
 * Shared by the billing routes and /api/auth/me so the check can't drift.
 */
export async function userFromRequest(req: Request): Promise<User | null> {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  try {
    const claims = verifySessionToken(token);
    return await getUserById(claims.sub);
  } catch {
    return null;
  }
}
