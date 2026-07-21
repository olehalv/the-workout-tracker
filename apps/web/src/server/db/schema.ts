import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Stable Apple user id (the identity token `sub`) — the account key. */
  appleUserId: text("apple_user_id").notNull().unique(),
  email: text("email"),
  emailVerified: boolean("email_verified").notNull().default(false),
  /** Billing tier. "pro" is the paid ("Pro") plan; drives the app paywall later. */
  plan: text("plan", { enum: ["free", "pro"] })
    .notNull()
    .default("free"),
  /** When the current paid period ends. Null for free users / no active sub. */
  paidUntil: timestamp("paid_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Plan = User["plan"];
