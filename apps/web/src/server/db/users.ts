import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { AppleIdentity } from "../auth/appleAuth";
import { db } from "./client";
import { type NewUser, type Plan, type User, users } from "./schema";

export async function upsertUserFromApple(identity: AppleIdentity): Promise<User> {
  const now = new Date();
  const [user] = await db
    .insert(users)
    .values({
      appleUserId: identity.appleUserId,
      email: identity.email ?? null,
      emailVerified: identity.emailVerified ?? false,
      lastLoginAt: now,
    })
    .onConflictDoUpdate({
      target: users.appleUserId,
      set: {
        email: sql`coalesce(excluded.email, ${users.email})`,
        emailVerified: sql`case when excluded.email is not null then excluded.email_verified else ${users.emailVerified} end`,
        lastLoginAt: now,
        updatedAt: now,
      },
    })
    .returning();
  return user as User;
}

export async function getUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export interface ListUsersOptions {
  limit: number;
  offset: number;
  search?: string;
  plan?: Plan;
}

export async function listUsers(opts: ListUsersOptions): Promise<{ users: User[]; total: number }> {
  const conditions = [];
  if (opts.search) {
    conditions.push(
      or(ilike(users.email, `%${opts.search}%`), ilike(users.appleUserId, `%${opts.search}%`)),
    );
  }
  if (opts.plan) {
    conditions.push(eq(users.plan, opts.plan));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  const [totals] = await db.select({ total: count() }).from(users).where(where);

  return { users: rows, total: totals?.total ?? 0 };
}

export interface UserStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  newUsersLast30Days: number;
}

export async function getStats(): Promise<UserStats> {
  const [row] = await db
    .select({
      total: count(),
      free: count(sql`case when ${users.plan} = 'free' then 1 end`),
      pro: count(sql`case when ${users.plan} = 'pro' then 1 end`),
      recent: count(sql`case when ${users.createdAt} > now() - interval '30 days' then 1 end`),
    })
    .from(users);

  return {
    totalUsers: row?.total ?? 0,
    freeUsers: row?.free ?? 0,
    proUsers: row?.pro ?? 0,
    newUsersLast30Days: row?.recent ?? 0,
  };
}

export type CreateUserInput = Pick<NewUser, "appleUserId" | "email" | "plan" | "paidUntil">;

export async function createUser(input: CreateUserInput): Promise<User> {
  const [user] = await db.insert(users).values(input).returning();
  return user as User;
}

export type UpdateUserInput = Partial<Pick<User, "email" | "plan" | "paidUntil">>;

export async function updateUser(id: string, patch: UpdateUserInput): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user ?? null;
}

export async function deleteUser(id: string): Promise<User | null> {
  const [user] = await db.delete(users).where(eq(users.id, id)).returning();
  return user ?? null;
}

export async function startTrial(id: string, days: number): Promise<User | null> {
  const now = new Date();
  const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const [updated] = await db
    .update(users)
    .set({ trialStartedAt: now, trialEndsAt: endsAt, updatedAt: now })
    .where(and(eq(users.id, id), isNull(users.trialStartedAt)))
    .returning();
  return updated ?? (await getUserById(id));
}

export async function getUserByStripeCustomerId(customerId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);
  return user ?? null;
}

export async function setStripeCustomerId(id: string, customerId: string): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user ?? null;
}

export interface SubscriptionState {
  stripeSubscriptionId: string | null;
  stripeStatus: string | null;
  cancelAtPeriodEnd: boolean;
  paidUntil: Date | null;
  plan: Plan;
}

export async function applySubscriptionState(
  id: string,
  state: SubscriptionState,
): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({ ...state, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user ?? null;
}
