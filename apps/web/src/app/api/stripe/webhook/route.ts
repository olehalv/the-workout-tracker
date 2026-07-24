import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, statusGrantsPro } from "@/server/billing/stripe";
import { config, isBillingConfigured } from "@/server/config";
import { applySubscriptionState, getUserById, getUserByStripeCustomerId } from "@/server/db/users";

// Needs the raw request body for signature verification, plus pg — Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The only place a payment grants Pro — not the browser redirect, which is
// client-controlled and may never load. Stripe signs and retries these events.
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
        // Fetch the full subscription so we write the same fields as subscription.* events.
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
        break;
    }
  } catch (err) {
    // 500 makes Stripe retry with backoff — right for a transient DB failure.
    console.error(`[stripe] handling ${event.type} failed`, err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// Resolves the user by subscription metadata (set at checkout), falling back to
// the customer id so renewals still land if metadata was lost.
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
    // Downgrade to "free" on cancellation so /admin and the app agree; an admin comp is re-granted by hand.
    plan: isPro ? "pro" : "free",
  });
}

// Stripe moved current_period_end off the subscription onto its items; take the latest.
function periodEnd(subscription: Stripe.Subscription): Date | null {
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((v): v is number => typeof v === "number");
  if (ends.length === 0) return null;
  return new Date(Math.max(...ends) * 1000);
}
