import { NextResponse } from "next/server";
import { z } from "zod";
import { userFromRequest } from "@/server/auth/requireUser";
import { getStripe, priceIdFor } from "@/server/billing/stripe";
import { config, isBillingConfigured } from "@/server/config";
import { setStripeCustomerId } from "@/server/db/users";

// Uses pg / jsonwebtoken / stripe, so this must run on the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
});

/**
 * Create a Stripe Checkout Session and hand its URL back to the app, which
 * opens it in an in-app browser. Payment therefore runs outside the App Store /
 * Play Store billing systems.
 *
 * The session URL is created here (authenticated with the session JWT) rather
 * than by the app navigating to a page on our site with a token in the query
 * string — URLs leak through browser history, referrers and the in-app-browser
 * handoff, and a session JWT is a 30-day credential.
 *
 * Note this route grants nothing. Pro is only ever unlocked by the webhook.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const user = await userFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const stripe = getStripe();

  try {
    // Reuse the customer across checkouts so a resubscribe lands on the same
    // record (and the billing portal shows the full history).
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id, appleUserId: user.appleUserId },
      });
      customerId = customer.id;
      await setStripeCustomerId(user.id, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdFor(parsed.data.plan), quantity: 1 }],
      // Both are how the webhook maps the payment back to our user. client_
      // reference_id rides on the session; subscription_data.metadata sticks to
      // the subscription itself, which is what later renewal events carry.
      client_reference_id: user.id,
      subscription_data: { metadata: { userId: user.id } },
      // The user already got their free time via the no-card trial, so checkout
      // is a straight paid subscription with no Stripe trial period.
      success_url: `${config.publicBaseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.publicBaseUrl}/billing/cancel`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: "checkout_session_without_url" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[billing] checkout session failed", err);
    return NextResponse.json(
      {
        error: "checkout_failed",
        message: err instanceof Error ? err.message : "Could not start checkout",
      },
      { status: 502 },
    );
  }
}
