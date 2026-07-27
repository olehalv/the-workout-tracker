import Stripe from "stripe";
import { config } from "../config";

const globalForStripe = globalThis as unknown as { __stripe?: Stripe };

export function getStripe(): Stripe {
  if (!config.stripe.secretKey) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY is unset)");
  }
  if (!globalForStripe.__stripe) {
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

const ENTITLING_STATUSES = new Set(["active", "trialing", "past_due"]);

export function statusGrantsPro(status: string | null): boolean {
  return status !== null && ENTITLING_STATUSES.has(status);
}
