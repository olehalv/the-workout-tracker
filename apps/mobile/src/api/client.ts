// On a physical device "localhost" is the device itself — set
// EXPO_PUBLIC_USER_API_URL to your machine's LAN IP (e.g. http://192.168.1.20:3000).
const USER_API_URL = process.env.EXPO_PUBLIC_USER_API_URL ?? "http://localhost:3000";

// RN's fetch has no default timeout, so an unreachable URL hangs the spinner forever.
const REQUEST_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${USER_API_URL}${path}`, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Computed server-side (mirrors apps/web/src/server/billing/entitlement.ts) so a
// wound-forward device clock can't extend a trial.
export interface Entitlement {
  isPro: boolean;
  source: "subscription" | "trial" | "admin" | "none";
  trialEndsAt: string | null;
  trialDaysLeft: number;
  trialEligible: boolean;
  paidUntil: string | null;
  cancelAtPeriodEnd: boolean;
  canManageBilling: boolean;
}

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

// Back-compat: users cached before entitlement existed lack the field; fill it in
// rather than crashing on user.entitlement.isPro (the next refresh replaces it).
export function normalizeUser(user: AuthUser): AuthUser {
  return { ...user, entitlement: user.entitlement ?? NO_ENTITLEMENT };
}

export interface AuthResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

// Returns the fresh user, null when the token is rejected (caller signs out), or
// throws when unreachable (offline — caller keeps the cached user).
export async function fetchMe(token: string): Promise<AuthUser | null> {
  let res: Response;
  try {
    res = await fetchWithTimeout("/api/auth/me", {
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

// Billing: these endpoints only hand back a Stripe URL to open in a browser —
// nothing here grants Pro; the Stripe webhook does that server-side.

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
    res = await fetchWithTimeout(path, {
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

// Idempotent server-side: calling again after a reinstall returns the original end date.
export async function startTrial(token: string): Promise<{ user: AuthUser; alreadyUsed: boolean }> {
  const body = await postAuthed<{ user: AuthUser; alreadyUsed: boolean }>(
    "/api/billing/trial",
    token,
  );
  return { user: normalizeUser(body.user), alreadyUsed: body.alreadyUsed };
}

export async function createCheckoutUrl(
  token: string,
  plan: "monthly" | "annual",
): Promise<string> {
  const body = await postAuthed<{ url: string }>("/api/billing/checkout", token, { plan });
  return body.url;
}

export async function createPortalUrl(token: string): Promise<string> {
  const body = await postAuthed<{ url: string }>("/api/billing/portal", token);
  return body.url;
}

export async function deleteAccount(token: string): Promise<void> {
  let res: Response;
  try {
    res = await fetchWithTimeout("/api/auth/me", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error(`Could not reach the user service at ${USER_API_URL}.`);
  }

  if (!res.ok && res.status !== 401) {
    throw new Error(`Could not delete the account (${res.status}).`);
  }
}

export async function verifyAppleLogin(identityToken: string): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetchWithTimeout("/api/auth/apple", {
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
