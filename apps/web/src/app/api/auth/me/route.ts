import { NextResponse } from "next/server";
import { verifySessionToken } from "@/server/auth/session";
import { getUserById } from "@/server/db/users";
import { toPublicUser } from "@/server/serialize";

// Uses pg / jsonwebtoken (Node built-ins), so this must run on the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return NextResponse.json({ error: "missing_bearer_token" }, { status: 401 });
  }

  try {
    const claims = verifySessionToken(token);
    const user = await getUserById(claims.sub);
    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 401 });
    }
    return NextResponse.json({ user: toPublicUser(user) });
  } catch {
    return NextResponse.json({ error: "invalid_session_token" }, { status: 401 });
  }
}
