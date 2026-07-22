import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, statusGrantsPro } from "@/server/billing/stripe";
import { config, isBillingConfigured } from "@/server/config";
import { applySubscriptionState, getUserById, getUserByStripeCustomerId } from "@/server/db/users";

// Needs the raw request body for signature verification, plus pg — Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The only place a payment grants Pro.
 *
 * Deliberately not the browser redirect: the user can close the in-app browser
 * before `success_url` loads, and a redirect is client-controlled anyway. Stripe
 * signs these events, retries them, and re-sends on failure, so this is the one
 * channel we trust with entitlement.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isBillingConfigured() || !config.stripe.webhookSecret) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // Must be the raw, unparsed body — any re-serialization breaks the signature.
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      payload,
      signature,
      config.stripe.webhookSecret,
    );
  } catch (err) {
    console.error("[stripe] signature verification failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // A subscription checkout always has a subscription id; fetch the full
        // object so we write the same fields as the subscription.* events.
        if (typeof session.subscription === "string") {
          const subscription = await getStripe().subscriptions.retrieve(session.subscription);
          await syncSubscription(subscription, session.client_reference_id);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object, null);
        break;
      }

      default:
        // Everything else is informational; ack so Stripe stops retrying.
        break;
    }
  } catch (err) {
    // 500 makes Stripe retry with backoff — right for a transient DB failure.
    console.error(`[stripe] handling ${event.type} failed`, err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Write a Stripe subscription's state onto our user row.
 *
 * Resolving the user prefers the subscription metadata (set at checkout) and
 * falls back to the customer id, so renewals a year later still land even if
 * metadata was lost.
 */
async function syncSubscription(
  subscription: Stripe.Subscription,
  fallbackUserId: string | null,
): Promise<void> {
  const userId = subscription.metadata?.userId ?? fallbackUserId;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const user = userId ? await getUserById(userId) : await getUserByStripeCustomerId(customerId);
  if (!user) {
    console.warn(`[stripe] no user for subscription ${subscription.id} (customer ${customerId})`);
    return;
  }

  const isPro = statusGrantsPro(subscription.status);

  await applySubscriptionState(user.id, {
    stripeSubscriptionId: subscription.id,
    stripeStatus: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    paidUntil: isPro ? periodEnd(subscription) : null,
    // Downgrade to "free" on cancellation so /admin and the app agree. An admin
    // comp is re-granted by hand; we don't try to preserve it here.
    plan: isPro ? "pro" : "free",
  });
}

/**
 * End of the current paid period. Stripe moved `current_period_end` off the
 * subscription and onto its items, so take the latest across items (there is
 * normally exactly one).
 */
function periodEnd(subscription: Stripe.Subscription): Date | null {
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((v): v is number => typeof v === "number");
  if (ends.length === 0) return null;
  return new Date(Math.max(...ends) * 1000);
}
