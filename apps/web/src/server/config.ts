// Server-only runtime config for the user/auth API and admin data access.
// In the Next.js runtime, env comes from Next's own .env loading; the Drizzle
// tooling (drizzle.config.ts / migrate.ts) loads .env via dotenv itself.

const isProduction = process.env.NODE_ENV === "production";

/**
 * Reads the session-signing secret. Required in production; in development we
 * fall back to a fixed dev-only secret (with a warning) so `npm run dev` works
 * out of the box. Never rely on the fallback for anything but local testing.
 */
function resolveJwtSecret(): string {
  const value = process.env.SESSION_JWT_SECRET;
  if (value) {
    return value;
  }
  if (isProduction) {
    throw new Error("Missing required environment variable: SESSION_JWT_SECRET");
  }
  console.warn("[web] SESSION_JWT_SECRET is not set — using an insecure dev-only secret.");
  return "dev-only-insecure-secret";
}

function resolveDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error(
      "Missing required environment variable: DATABASE_URL (e.g. postgresql://localhost:5432/workout_tracker)",
    );
  }
  return value;
}

/**
 * When signing in through Expo Go, the app runs inside Expo's own binary, so
 * Apple issues the identity token with `aud` = "host.exp.Exponent" rather than
 * our bundle id. Accept it in development so the flow round-trips in Expo Go;
 * never in production, where only our real bundle id is valid.
 */
const EXPO_GO_AUDIENCE = "host.exp.Exponent";

function resolveAppleClientIds(): string[] {
  const configured = (process.env.APPLE_CLIENT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (isProduction) {
    return configured;
  }
  return [...new Set([...configured, EXPO_GO_AUDIENCE])];
}

export const config = {
  databaseUrl: resolveDatabaseUrl(),
  /** Apple Services ID / bundle identifier(s) the identity token was issued for (the token `aud`). */
  appleClientIds: resolveAppleClientIds(),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.SESSION_JWT_EXPIRES_IN ?? "30d",
  jwtIssuer: process.env.SESSION_JWT_ISSUER ?? "my-workout-tracker-auth",
  /**
   * Password gating the /admin dashboard. Set ADMIN_PASSWORD in .env to enable
   * the login. When empty (unset), the dashboard denies all access — there is no
   * insecure fallback, since /admin exposes every user's account data.
   */
  adminPassword: process.env.ADMIN_PASSWORD ?? "",

  /**
   * Stripe billing. Payments deliberately do NOT go through the App Store /
   * Play Store: the app opens Stripe Checkout in an in-app browser and the
   * webhook grants Pro. All of this is optional — when `secretKey` is empty the
   * billing routes return 503 and the rest of the app (auth, admin) still runs,
   * so local dev works without a Stripe account.
   */
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    /** Signing secret for POST /api/stripe/webhook (`whsec_…`). */
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    /** Price ids for the two Pro plans (created in the Stripe dashboard). */
    priceMonthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
    priceAnnual: process.env.STRIPE_PRICE_ANNUAL ?? "",
  },

  /**
   * Public origin of this web app, used to build Stripe's success/cancel return
   * URLs. Must be reachable from the phone's browser — on a physical device in
   * dev that means the LAN IP, not localhost.
   */
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",

  /** Deep-link scheme of the mobile app, for the "back to the app" return link. */
  appScheme: process.env.APP_SCHEME ?? "workouttracker",

  /** Length of the no-card free trial granted on first paywall open. */
  trialDays: Number(process.env.TRIAL_DAYS ?? "14"),
} as const;

/** True when Stripe is configured well enough to sell something. */
export function isBillingConfigured(): boolean {
  return Boolean(
    config.stripe.secretKey && (config.stripe.priceMonthly || config.stripe.priceAnnual),
  );
}
