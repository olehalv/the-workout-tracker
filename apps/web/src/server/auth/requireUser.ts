import type { User } from "../db/schema";
import { getUserById } from "../db/users";
import { verifySessionToken } from "./session";

// Resolves the user from an `Authorization: Bearer <session jwt>` header; null on
// anything invalid (caller returns 401). Shared so the check can't drift.
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
