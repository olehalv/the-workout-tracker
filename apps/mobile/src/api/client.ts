// The web app (Next.js) hosts the user/auth API. On a physical device,
// "localhost" points at the device itself — set EXPO_PUBLIC_USER_API_URL to your
// machine's LAN IP (e.g. http://192.168.1.20:3000).
const USER_API_URL = process.env.EXPO_PUBLIC_USER_API_URL ?? "http://localhost:3000";

/**
 * Why the user does (or doesn't) have Pro. Computed by the server — the app
 * never decides this itself, so a wound-forward device clock can't extend a
 * trial. Mirrors `apps/web/src/server/billing/entitlement.ts`.
 */
export interface Entitlement {
  isPro: boolean;
  source: "subscription" | "trial" | "admin" | "none";
  trialEndsAt: string | null;
  trialDaysLeft: number;
  /** True when the free trial has never been started — CTA is "try it free". */
  trialEligible: boolean;
  paidUntil: string | null;
  cancelAtPeriodEnd: boolean;
  /** True once there's a Stripe customer, i.e. the billing portal will open. */
  canManageBilling: boolean;
}

/** No account / offline with nothing cached: locked, but still trial-eligible. */
export const NO_ENTITLEMENT: Entitlement = {
  isPro: false,
  source: "none",
  trialEndsAt: null,
  trialDaysLeft: 0,
  trialEligible: true,
  paidUntil: null,
  cancelAtPeriodEnd: false,
  canManageBilling: false,
};

export interface AuthUser {
  id: string;
  email: string | null;
  plan: "free" | "pro";
  entitlement: Entitlement;
}

/**
 * Users cached in SecureStore before entitlement existed (or written by an older
 * server) have no `entitlement` field. Fill it in rather than crashing on
 * `user.entitlement.isPro` — the next refresh replaces it with the real thing.
 */
export function normalizeUser(user: AuthUser): AuthUser {
  return { ...user, entitlement: user.entitlement ?? NO_ENTITLEMENT };
}

export interface AuthResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

/**
 * Fetch the current user for a session token. Returns the fresh user (so an
 * admin plan change is picked up), `null` when the token is rejected (expired /
 * user deleted — caller should sign out), or throws when the service is
 * unreachable (offline — caller should keep the cached user).
 */
export async function fetchMe(token: string): Promise<AuthUser | null> {
  let res: Response;
  try {
    res = await fetch(`${USER_API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error(`Could not reach the user service at ${USER_API_URL}.`);
  }

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Could not refresh the account (${res.status}).`);

  const body = (await res.json()) as { user: AuthUser };
  return normalizeUser(body.user);
}

// --- Billing --------------------------------------------------------------
// Payment runs outside the App Store / Play Store: these endpoints hand back a
// Stripe URL that the app opens in an in-app browser. Nothing here grants Pro —
// the Stripe webhook does that server-side, and the app learns about it by
// re-fetching the user.

/** Thrown for billing calls so callers can show the server's own message. */
export class BillingError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "BillingError";
  }
}

async function postAuthed<T>(path: string, token: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${USER_API_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new BillingError(`Could not reach the server at ${USER_API_URL}.`, "network");
  }

  const payload = (await res.json().catch(() => null)) as {
    error?: string;
    message?: string;
  } | null;

  if (!res.ok) {
    const code = payload?.error ?? `http_${res.status}`;
    throw new BillingError(billingMessage(code, payload?.message), code);
  }
  return payload as T;
}

/** Turns the server's error codes into something worth showing a lifter. */
function billingMessage(code: string, serverMessage?: string): string {
  switch (code) {
    case "billing_not_configured":
      return "Subscriptions aren't available yet. Please try again later.";
    case "no_billing_account":
      return "There's no subscription to manage on this account yet.";
    case "unauthorized":
      return "Your session expired. Sign in again to continue.";
    default:
      return serverMessage ?? "Something went wrong. Please try again.";
  }
}

/**
 * Start the no-card free trial. Idempotent server-side — calling it again after
 * a reinstall returns the original end date rather than a fresh window.
 */
export async function startTrial(token: string): Promise<{ user: AuthUser; alreadyUsed: boolean }> {
  const body = await postAuthed<{ user: AuthUser; alreadyUsed: boolean }>(
    "/api/billing/trial",
    token,
  );
  return { user: normalizeUser(body.user), alreadyUsed: body.alreadyUsed };
}

/** Create a Stripe Checkout session and return its hosted URL. */
export async function createCheckoutUrl(
  token: string,
  plan: "monthly" | "annual",
): Promise<string> {
  const body = await postAuthed<{ url: string }>("/api/billing/checkout", token, { plan });
  return body.url;
}

/** Create a Stripe billing-portal session (manage card / cancel) and return its URL. */
export async function createPortalUrl(token: string): Promise<string> {
  const body = await postAuthed<{ url: string }>("/api/billing/portal", token);
  return body.url;
}

export async function verifyAppleLogin(identityToken: string): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${USER_API_URL}/api/auth/apple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityToken }),
    });
  } catch {
    throw new Error(`Could not reach the user service at ${USER_API_URL}.`);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Login failed (${res.status}).`);
  }

  const body = (await res.json()) as AuthResponse;
  return { ...body, user: normalizeUser(body.user) };
}
