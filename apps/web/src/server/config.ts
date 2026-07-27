const isProduction = process.env.NODE_ENV === "production";

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
  adminPassword: process.env.ADMIN_PASSWORD ?? "",

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    priceMonthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
    priceAnnual: process.env.STRIPE_PRICE_ANNUAL ?? "",
  },

  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",

  appScheme: process.env.APP_SCHEME ?? "workouttracker",
  trialDays: Number(process.env.TRIAL_DAYS ?? "14"),
} as const;

export function isBillingConfigured(): boolean {
  return Boolean(
    config.stripe.secretKey && (config.stripe.priceMonthly || config.stripe.priceAnnual),
  );
}
