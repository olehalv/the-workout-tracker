export type ProPlan = "monthly" | "annual";

export interface PlanOption {
  id: ProPlan;
  title: string;
  price: string;
  caption: string | null;
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

export const DEFAULT_PLAN: ProPlan = "annual";

export const PRO_TRIAL_DAYS = 14;

export const PRO_PRICE_LABEL = "from $0.83/month";
