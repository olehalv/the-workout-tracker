import { NextResponse } from "next/server";
import { userFromRequest } from "@/server/auth/requireUser";
import { resolveEntitlement } from "@/server/billing/entitlement";
import { config } from "@/server/config";
import { startTrial } from "@/server/db/users";
import { toPublicUser } from "@/server/serialize";

// Uses pg / jsonwebtoken (Node built-ins), so this must run on the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start the no-card free trial. Called the first time the user opens the
 * paywall — not at signup, so the window doesn't burn down while they're still
 * using the free features.
 *
 * Idempotent: replaying it returns the existing trial rather than extending it.
 * No Stripe involvement at all; this grants Pro purely from our own DB.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const user = await userFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Already trialed: hand back current state instead of erroring, so the app
  // can treat "start trial" as a safe no-op after a reinstall.
  if (user.trialStartedAt !== null) {
    return NextResponse.json({
      user: toPublicUser(user),
      entitlement: resolveEntitlement(user),
      alreadyUsed: true,
    });
  }

  const updated = await startTrial(user.id, config.trialDays);
  if (!updated) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    user: toPublicUser(updated),
    entitlement: resolveEntitlement(updated),
    alreadyUsed: false,
  });
}
