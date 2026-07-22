import type { User } from "../db/schema";
import { statusGrantsPro } from "./stripe";

/**
 * Why the user does (or doesn't) have Pro. The app shows different paywall copy
 * per source — a trialing user sees "X days left", a lapsed one sees the prices.
 */
export type EntitlementSource = "subscription" | "trial" | "admin" | "none";

export interface Entitlement {
  isPro: boolean;
  source: EntitlementSource;
  /** End of the no-card trial, ISO. Null when never started. */
  trialEndsAt: string | null;
  /** Whole days left in the trial (0 once lapsed). */
  trialDaysLeft: number;
  /** True when the user has never started the free trial — the CTA is "try it". */
  trialEligible: boolean;
  /** End of the paid period, ISO. Null when there's no paid subscription. */
  paidUntil: string | null;
  /** True when a paid sub is set to lapse at period end instead of renewing. */
  cancelAtPeriodEnd: boolean;
  /** True when the user has a Stripe customer record (→ can open the portal). */
  canManageBilling: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The single source of truth for Pro access. Deliberately computed server-side
 * from the DB row and the server clock: the app never re-derives it, so a
 * device with a wound-forward clock can't extend its own trial.
 *
 * Precedence matters. A live Stripe subscription wins over everything; then an
 * admin-set `plan`/`paidUntil` (the /admin dashboard comps accounts and must be
 * able to grant Pro to someone who never paid); then the free trial.
 */
export function resolveEntitlement(user: User, now: Date = new Date()): Entitlement {
  const trialEndsAt = user.trialEndsAt;
  const trialActive = trialEndsAt !== null && trialEndsAt.getTime() > now.getTime();

  const subscriptionActive =
    statusGrantsPro(user.stripeStatus) &&
    // `paidUntil` is refreshed from the subscription's period end on every
    // webhook; if it has passed without a renewal event, don't keep granting.
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
