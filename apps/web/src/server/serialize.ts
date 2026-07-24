import { type Entitlement, resolveEntitlement } from "./billing/entitlement";
import type { User } from "./db/schema";

// What the mobile app sees. `entitlement` is computed here so Pro/trial status
// has one implementation, on the side that owns the clock.
export interface PublicUser {
  id: string;
  email: string | null;
  plan: User["plan"];
  entitlement: Entitlement;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    plan: user.plan,
    entitlement: resolveEntitlement(user),
  };
}

// Full record for the admin dashboard (includes PII + billing).
export interface AdminUser {
  id: string;
  appleUserId: string;
  email: string | null;
  emailVerified: boolean;
  plan: User["plan"];
  paidUntil: string | null;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeStatus: string | null;
  cancelAtPeriodEnd: boolean;
  entitlement: Entitlement;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export function toAdminUser(user: User): AdminUser {
  return {
    id: user.id,
    appleUserId: user.appleUserId,
    email: user.email,
    emailVerified: user.emailVerified,
    plan: user.plan,
    paidUntil: user.paidUntil?.toISOString() ?? null,
    trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    stripeCustomerId: user.stripeCustomerId,
    stripeStatus: user.stripeStatus,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd,
    entitlement: resolveEntitlement(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}
