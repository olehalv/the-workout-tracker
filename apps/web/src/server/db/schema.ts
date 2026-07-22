import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Stable Apple user id (the identity token `sub`) — the account key. */
  appleUserId: text("apple_user_id").notNull().unique(),
  email: text("email"),
  emailVerified: boolean("email_verified").notNull().default(false),
  /** Billing tier. "pro" is the paid ("Pro") plan; drives the app paywall. */
  plan: text("plan", { enum: ["free", "pro"] })
    .notNull()
    .default("free"),
  /** When the current paid period ends. Null for free users / no active sub. */
  paidUntil: timestamp("paid_until", { withTimezone: true }),

  // --- Free trial (no card required) --------------------------------------
  // Granted server-side the first time the user opens the paywall, never at
  // signup — otherwise it burns down while they are still on the free features.
  /** When the no-card trial was granted. Null = never started (still eligible). */
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  /** When the no-card trial lapses. Entitlement is live while now() < this. */
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),

  // --- Stripe subscription -------------------------------------------------
  // Payment runs outside the app stores: the app opens Stripe Checkout in an
  // in-app browser and the Stripe webhook is what actually grants Pro.
  /** Stripe customer id, created lazily at first checkout. */
  stripeCustomerId: text("stripe_customer_id").unique(),
  /** Stripe subscription id of the current/most recent subscription. */
  stripeSubscriptionId: text("stripe_subscription_id"),
  /** Raw Stripe subscription status (active, past_due, canceled, …). */
  stripeStatus: text("stripe_status"),
  /** True when the sub is set to lapse at period end rather than renew. */
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Plan = User["plan"];
