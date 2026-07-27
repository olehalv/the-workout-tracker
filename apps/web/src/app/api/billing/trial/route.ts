import { NextResponse } from "next/server";
import { userFromRequest } from "@/server/auth/requireUser";
import { resolveEntitlement } from "@/server/billing/entitlement";
import { config } from "@/server/config";
import { startTrial } from "@/server/db/users";
import { toPublicUser } from "@/server/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const user = await userFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
