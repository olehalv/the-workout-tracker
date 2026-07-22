// Pro plan presentation.
//
// Payment does NOT go through StoreKit / Play Billing. The app opens Stripe
// Checkout in an in-app browser (see PurchaseContext), so there is no store
// product to read localized pricing from — the labels below are ours, and must
// be kept in step with the Stripe prices configured in STRIPE_PRICE_MONTHLY /
// STRIPE_PRICE_ANNUAL on the web app.

export type ProPlan = "monthly" | "annual";

export interface PlanOption {
  id: ProPlan;
  title: string;
  /** Headline price, e.g. "$10.00 / year". */
  price: string;
  /** Secondary line under the price, or null. */
  caption: string | null;
  /** Badge shown on the recommended option. */
  badge: string | null;
}

export const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "annual",
    title: "Annual",
    price: "$10.00 / year",
    caption: "Just $0.83 a month",
    badge: "Best value",
  },
  {
    id: "monthly",
    title: "Monthly",
    price: "$1.00 / month",
    caption: null,
    badge: null,
  },
];

/** Annual is the default: one charge a year instead of twelve. */
export const DEFAULT_PLAN: ProPlan = "annual";

/** Length of the no-card free trial. Mirrors TRIAL_DAYS on the web app. */
export const PRO_TRIAL_DAYS = 14;

/** Short price line used outside the paywall (e.g. the ProGate button). */
export const PRO_PRICE_LABEL = "from $0.83/month";
