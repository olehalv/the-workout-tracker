import Stripe from "stripe";
import { config } from "../config";

// Lazily built and cached across dev HMR (a fresh client per reload leaks sockets).
// Throws when unset — callers gate on isBillingConfigured() and return 503.
const globalForStripe = globalThis as unknown as { __stripe?: Stripe };

export function getStripe(): Stripe {
  if (!config.stripe.secretKey) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY is unset)");
  }
  if (!globalForStripe.__stripe) {
    // No explicit apiVersion: stripe-node pins its own, so the SDK upgrade (not a
    // dashboard change) is what moves the API version.
    globalForStripe.__stripe = new Stripe(config.stripe.secretKey, {
      typescript: true,
      appInfo: { name: "The Workout Tracker" },
    });
  }
  return globalForStripe.__stripe;
}

export type ProPlan = "monthly" | "annual";

export function priceIdFor(plan: ProPlan): string {
  const id = plan === "annual" ? config.stripe.priceAnnual : config.stripe.priceMonthly;
  if (!id) {
    throw new Error(`No Stripe price configured for the ${plan} plan`);
  }
  return id;
}

// `past_due` is deliberate: the card failed but Stripe is still retrying, and
// yanking access mid-dunning turns a recoverable payment into a lost user.
const ENTITLING_STATUSES = new Set(["active", "trialing", "past_due"]);

export function statusGrantsPro(status: string | null): boolean {
  return status !== null && ENTITLING_STATUSES.has(status);
}
