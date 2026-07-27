import { NextResponse } from "next/server";
import { z } from "zod";
import { userFromRequest } from "@/server/auth/requireUser";
import { getStripe, priceIdFor } from "@/server/billing/stripe";
import { config, isBillingConfigured } from "@/server/config";
import { setStripeCustomerId } from "@/server/db/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
});

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
      client_reference_id: user.id,
      subscription_data: { metadata: { userId: user.id } },
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
