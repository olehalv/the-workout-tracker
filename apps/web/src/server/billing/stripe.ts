import Stripe from "stripe";
import { config } from "../config";

/**
 * Lazily-built Stripe client, cached across dev HMR the same way the Postgres
 * pool is (Next re-evaluates modules on every edit, and a fresh client per
 * reload leaks sockets).
 *
 * Throws when STRIPE_SECRET_KEY is unset — callers should gate on
 * `isBillingConfigured()` first and return 503, so the app still boots without
 * a Stripe account.
 */
const globalForStripe = globalThis as unknown as { __stripe?: Stripe };

export function getStripe(): Stripe {
  if (!config.stripe.secretKey) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY is unset)");
  }
  if (!globalForStripe.__stripe) {
    // No explicit `apiVersion`: stripe-node pins its own (and its types only
    // accept that exact version), so the SDK upgrade is what moves the API
    // version — a dashboard-side change can't shift response shapes under us.
    globalForStripe.__stripe = new Stripe(config.stripe.secretKey, {
      typescript: true,
      appInfo: { name: "The Workout Tracker" },
    });
  }
  return globalForStripe.__stripe;
}

export type ProPlan = "monthly" | "annual";

/** Maps our plan name onto the configured Stripe price id. */
export function priceIdFor(plan: ProPlan): string {
  const id = plan === "annual" ? config.stripe.priceAnnual : config.stripe.priceMonthly;
  if (!id) {
    throw new Error(`No Stripe price configured for the ${plan} plan`);
  }
  return id;
}

/**
 * Stripe subscription statuses that should keep Pro unlocked. `past_due` is
 * included deliberately — the card failed but Stripe is still retrying, and
 * yanking access mid-dunning turns a recoverable payment into a lost user.
 */
const ENTITLING_STATUSES = new Set(["active", "trialing", "past_due"]);

export function statusGrantsPro(status: string | null): boolean {
  return status !== null && ENTITLING_STATUSES.has(status);
}
