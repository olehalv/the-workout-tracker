import type { User } from "../db/schema";
import { statusGrantsPro } from "./stripe";

export type EntitlementSource = "subscription" | "trial" | "admin" | "none";

export interface Entitlement {
  isPro: boolean;
  source: EntitlementSource;
  trialEndsAt: string | null;
  trialDaysLeft: number;
  trialEligible: boolean;
  paidUntil: string | null;
  cancelAtPeriodEnd: boolean;
  canManageBilling: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// The single source of truth for Pro access, computed server-side so a device
// with a wound-forward clock can't extend its trial. Precedence: live Stripe
// subscription → admin comp (/admin plan toggle) → free trial.
export function resolveEntitlement(user: User, now: Date = new Date()): Entitlement {
  const trialEndsAt = user.trialEndsAt;
  const trialActive = trialEndsAt !== null && trialEndsAt.getTime() > now.getTime();

  const subscriptionActive =
    statusGrantsPro(user.stripeStatus) &&
    // If paidUntil has passed without a renewal webhook, stop granting.
    (user.paidUntil === null || user.paidUntil.getTime() > now.getTime());

  // An admin comp: plan flipped to "pro" in /admin without any Stripe record.
  const adminGranted =
    user.plan === "pro" &&
    !subscriptionActive &&
    (user.paidUntil === null || user.paidUntil.getTime() > now.getTime());

  const source: EntitlementSource = subscriptionActive
    ? "subscription"
    : adminGranted
      ? "admin"
      : trialActive
        ? "trial"
        : "none";

  return {
    isPro: source !== "none",
    source,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    trialDaysLeft:
      trialActive && trialEndsAt !== null
        ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS))
        : 0,
    trialEligible: user.trialStartedAt === null,
    paidUntil: user.paidUntil?.toISOString() ?? null,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    canManageBilling: user.stripeCustomerId !== null,
  };
}
