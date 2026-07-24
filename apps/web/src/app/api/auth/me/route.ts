import { NextResponse } from "next/server";
import { userFromRequest } from "@/server/auth/requireUser";
import { verifySessionToken } from "@/server/auth/session";
import { getStripe } from "@/server/billing/stripe";
import { isBillingConfigured } from "@/server/config";
import { deleteUser, getUserById } from "@/server/db/users";
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

export async function DELETE(req: Request): Promise<NextResponse> {
  const user = await userFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (isBillingConfigured() && user.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(user.stripeSubscriptionId);
    } catch {}
  }

  await deleteUser(user.id);
  return NextResponse.json({ ok: true });
}
