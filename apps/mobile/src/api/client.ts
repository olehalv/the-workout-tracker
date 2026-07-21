// The web app (Next.js) hosts the user/auth API. On a physical device,
// "localhost" points at the device itself — set EXPO_PUBLIC_USER_API_URL to your
// machine's LAN IP (e.g. http://192.168.1.20:3000).
const USER_API_URL = process.env.EXPO_PUBLIC_USER_API_URL ?? "http://localhost:3000";

export interface AuthUser {
  id: string;
  email: string | null;
  plan: "free" | "pro";
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
  return body.user;
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

  return (await res.json()) as AuthResponse;
}
