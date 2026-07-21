import type { User } from "./db/schema";

/** What the mobile app sees about the signed-in user. */
export interface PublicUser {
  id: string;
  email: string | null;
  plan: User["plan"];
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, plan: user.plan };
}

/** Full record for the admin dashboard (includes PII + billing). */
export interface AdminUser {
  id: string;
  appleUserId: string;
  email: string | null;
  emailVerified: boolean;
  plan: User["plan"];
  paidUntil: string | null;
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
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}
