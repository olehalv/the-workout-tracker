// Server-only runtime config. See apps/web/.env.example for the reference.
// Next loads .env in its runtime; the Drizzle tooling loads .env via dotenv itself.

const isProduction = process.env.NODE_ENV === "production";

// Required in production; dev falls back to a fixed insecure secret (with a warning).
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

// In Expo Go the token's `aud` is Expo's binary, not our bundle id. Accept it in
// development so the flow round-trips there; never in production.
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
  appleClientIds: resolveAppleClientIds(),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.SESSION_JWT_EXPIRES_IN ?? "30d",
  jwtIssuer: process.env.SESSION_JWT_ISSUER ?? "my-workout-tracker-auth",
  // When empty, /admin denies all access — no insecure fallback (it exposes user data).
  adminPassword: process.env.ADMIN_PASSWORD ?? "",

  // Optional: when secretKey is empty the billing routes return 503 and the rest
  // of the app still runs, so local dev needs no Stripe account.
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    priceMonthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
    priceAnnual: process.env.STRIPE_PRICE_ANNUAL ?? "",
  },

  // Must be reachable from the phone's browser — a LAN IP (not localhost) in dev.
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",

  appScheme: process.env.APP_SCHEME ?? "workouttracker",
  trialDays: Number(process.env.TRIAL_DAYS ?? "14"),
} as const;

export function isBillingConfigured(): boolean {
  return Boolean(
    config.stripe.secretKey && (config.stripe.priceMonthly || config.stripe.priceAnnual),
  );
}
