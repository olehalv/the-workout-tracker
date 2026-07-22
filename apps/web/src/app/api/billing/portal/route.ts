import { NextResponse } from "next/server";
import { userFromRequest } from "@/server/auth/requireUser";
import { getStripe } from "@/server/billing/stripe";
import { config, isBillingConfigured } from "@/server/config";

// Uses pg / jsonwebtoken / stripe, so this must run on the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Open the Stripe billing portal, where the user updates their card, sees
 * invoices, or cancels. Same in-app-browser pattern as checkout — we hand back
 * a one-shot URL. Cancelling there fires a webhook that clears Pro, so we don't
 * need any cancel handling of our own.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const user = await userFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user.stripeCustomerId) {
    // Never checked out (e.g. still on the no-card trial) — nothing to manage.
    return NextResponse.json({ error: "no_billing_account" }, { status: 409 });
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${config.publicBaseUrl}/billing/success`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing] portal session failed", err);
    return NextResponse.json(
      {
        error: "portal_failed",
        message: err instanceof Error ? err.message : "Could not open the billing portal",
      },
      { status: 502 },
    );
  }
}
