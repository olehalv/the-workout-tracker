# Deployment — shipping The Workout Tracker to production

This repo has **two independently deployable pieces**:

1. **`apps/web`** — the Next.js service: marketing site + `/admin` dashboard +
   the user/auth API. Needs a Node host and a managed Postgres.
2. **`apps/mobile`** — the Expo / React Native app. Ships to the **App Store**
   via EAS, not to a server. **iOS only for now** — Google Play / Android is not
   supported (the landing page's Play button is removed); the Android bits below
   are left as notes for whenever that changes.

They are coupled by one thing: the mobile app calls the web app's
`/api/auth/apple`, and the web app only accepts Apple tokens whose audience
matches its `APPLE_CLIENT_IDS`. So the web service has to be live (on a real
URL, with the real bundle id configured) **before** a production mobile build is
useful.

> **Note on Expo/RN specifics:** per `CLAUDE.md`, Expo Go / EAS / SDK behavior
> changes release to release. The mobile steps below are grounded in this repo
> (Expo SDK 54, bundle id `dev.olehalv.theworkouttracker`), but verify exact EAS
> commands and App Store requirements against the live docs for SDK 54 before
> running them — don't trust these from memory.

---

## 0. Blockers to resolve before you ship

These are known-unfinished items (see `CLAUDE.md` → Roadmap). Ship-blockers are
marked 🔴; the rest are strongly recommended.

- 🔴 **Set `ADMIN_PASSWORD`.** `/admin` is now gated by a password login
  (`/admin/login`), backed by the `ADMIN_PASSWORD` env var and an httpOnly
  session cookie (`apps/web/src/server/auth/adminAuth.ts`). It ships **denying
  all access when the var is empty** — so you *must* set a strong
  `ADMIN_PASSWORD` in prod, or the dashboard is unreachable (and if you leave it
  unset thinking it's open, it isn't). For extra safety on a public deployment
  you can still layer host-level protection (IP allowlist / access protection) on
  top. Rotating `ADMIN_PASSWORD` (or `SESSION_JWT_SECRET`) invalidates existing
  admin sessions.
- 🔴 **Rotate `SESSION_JWT_SECRET`.** Production **requires** it — the server
  throws on boot if it's unset in prod (`apps/web/src/server/config.ts`). Use a
  long random string (e.g. `openssl rand -base64 48`). Never reuse the dev
  fallback. (It also keys the admin session cookie.)
- 🔴 **Placeholder App Store link.** The App Store button in
  `apps/web/src/app/page.tsx` points at `href="#"`. Swap for the real App Store
  URL once the app has a listing. (The Google Play button has been **removed** —
  Android isn't supported for now.)
- 🟡 **Payments are simulated.** `apps/mobile/src/purchases/iap.ts`
  `purchaseProSubscription()` fakes success and grants Pro **locally only** — it
  never tells the server, so `/admin` never sees the plan change. If you're
  launching **without** real billing, either hide the paywall or ship it clearly
  as a simulation — don't charge against the fake path. Wiring it for real (ASC
  product → real StoreKit call → server reconciliation) is a full guide of its
  own: see **[PAYMENTS.md](./PAYMENTS.md)**.

---

## Part A — Deploy the web service (`apps/web`)

### A1. Provision managed Postgres

Pick a managed Postgres (Neon, Supabase, RDS, Railway, Fly Postgres, etc.).
Capture its connection string as `DATABASE_URL`. If the provider requires TLS,
keep the `?sslmode=require` suffix it gives you.

### A2. Choose a host

`apps/web` is a standard Next.js (App Router) app with Node-runtime route
handlers that use native packages (`pg`, `jsonwebtoken`, `jwks-rsa` — declared
in `serverExternalPackages`, `next.config.ts`). Any host that runs a real Node
server works: **Vercel** (simplest for Next), Fly.io, Railway, Render, a
container, etc. Do **not** target a pure-static/edge-only export — the API needs
the Node runtime and outbound network (to fetch Apple's public keys).

Monorepo setting: it's an npm-workspaces repo. On the host, set the **root
directory to `apps/web`** (or configure the monorepo root) and use:

- Install: `npm install` (from repo root — workspaces hoist).
- Build: `npm run build:web` (or `npm run build` inside `apps/web`).
- Start: `npm run start --workspace web` (i.e. `next start`).

### A3. Set production environment variables

From `apps/web/.env.example`. Set these in the host's env (not committed):

| Var | Required | Prod value |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Your managed Postgres URL (from A1). |
| `APPLE_CLIENT_IDS` | ✅ | `dev.olehalv.theworkouttracker` (the iOS bundle id = Apple token audience). Comma-separate if you add more. **Do not** include `host.exp.Exponent` in prod — it's only auto-added in dev. |
| `SESSION_JWT_SECRET` | ✅ | Long random secret (see blockers). Also keys the admin cookie. |
| `ADMIN_PASSWORD` | ✅ | Password for the `/admin` login. Empty = dashboard denied to everyone. |
| `SESSION_JWT_EXPIRES_IN` | ⬜ | Defaults to `30d`. |
| `SESSION_JWT_ISSUER` | ⬜ | Defaults to `my-workout-tracker-auth`. |
| `NODE_ENV` | ✅ | `production` (most hosts set this automatically; it's what flips the strict secret/audience checks on). |

Nothing here is `NEXT_PUBLIC_`, so none of it reaches the browser — keep it that
way.

### A4. Run database migrations

Migrations are committed SQL under `apps/web/drizzle/` (`0000_init.sql`), applied
by `apps/web/src/server/db/migrate.ts` (reads `DATABASE_URL` via dotenv).

Run **once against the prod DB before/at first deploy**, and again whenever you
add a migration:

```bash
# with the prod DATABASE_URL in the environment:
npm run db:migrate            # = tsx apps/web/src/server/db/migrate.ts
```

Options: run it locally pointed at the prod DB, as a release/deploy hook, or a
one-off job on the host. Schema changes flow: edit
`src/server/db/schema.ts` → `npm run db:generate` → commit the new SQL →
`npm run db:migrate`.

### A5. Deploy, domain, verify

1. Deploy via the host (push-to-deploy or CI).
2. Point your domain at it (e.g. `theworkouttracker.app`), TLS on.
3. Smoke test:
   - `GET https://<domain>/api/health` → liveness OK.
   - Landing page renders; Privacy/Terms load with the real contact email;
     the only store button is **App Store** (Android is not offered).
   - `/admin` redirects to `/admin/login` and only opens with `ADMIN_PASSWORD`.

Record the final base URL — the mobile app needs it as `EXPO_PUBLIC_USER_API_URL`.

---

## Part B — Ship the mobile app (`apps/mobile`)

### B1. Apple Developer prerequisites (one-time)

- Paid **Apple Developer Program** membership.
- An **App ID** for `dev.olehalv.theworkouttracker` with the **Sign in with
  Apple** capability enabled (already declared via `usesAppleSignIn` +
  `expo-apple-authentication` in `app.json`).
- An **App Store Connect** app record for that bundle id.
- _(Android — not supported for now)_ a Google Play Console account + the app
  record for package `dev.olehalv.theworkouttracker`. Skip unless/until Android
  is back on the table.

### B2. Point the app at the production API

`EXPO_PUBLIC_USER_API_URL` is inlined into the bundle **at build time**
(`apps/mobile/.env.example`). For a production build it must be your deployed web
URL, not localhost:

```bash
# apps/mobile/.env (or the EAS build profile's env)
EXPO_PUBLIC_USER_API_URL=https://<your-web-domain>
```

Prefer setting this per **EAS build profile** (`eas.json` → `build.production.env`)
so production and preview builds can't accidentally ship a localhost URL.

### B3. Build with EAS

There's no `eas.json` in the repo yet — create one (`eas build:configure`).
Then, from `apps/mobile`:

```bash
npm i -g eas-cli          # if not installed
eas login
eas build:configure       # generates eas.json (adds development/preview/production profiles)
eas build --profile production --platform ios      # iOS only (Android not supported for now)
```

Notes:
- Keep **Expo SDK 54** — do not bump to a prerelease SDK (`CLAUDE.md` explains
  why: Expo Go / the pinned RN versions).
- EAS handles native credentials (signing certs, provisioning profiles) — let it
  manage them unless you have your own.
- The Apple Sign In entitlement comes from the config plugin at prebuild; no
  manual Xcode entitlement editing needed.

### B4. Real In-App Purchase (only if launching paid Pro)

If you're shipping the paywall for real money (otherwise skip — see the 🟡
blocker), the full walkthrough — App Store Connect product, replacing the
`iap.ts` seam with a real StoreKit/RevenueCat call, and server reconciliation —
lives in **[PAYMENTS.md](./PAYMENTS.md)**. In short: create the
`dev.olehalv.theworkouttracker.pro.monthly` subscription ($1/mo, 14-day trial),
wire the purchase SDK in a native build, and drive `plan`/`paidUntil` from
store-to-server notifications. Do it before B5 if launching paid.

### B5. Submit for review

```bash
eas submit --profile production --platform ios     # uploads the build to App Store Connect
```

Then in App Store Connect: fill metadata, screenshots, the **Privacy Policy URL**
(→ your `/privacy`) and support URL, App Privacy questionnaire, and (if paid) the
subscription for review. Submit. (Android / Google Play is not shipped for now.)

Once you have a live App Store URL, come back and replace the `href="#"`
placeholder on the App Store button in `apps/web/src/app/page.tsx` and redeploy
the web app.

---

## Recommended ordering

1. Resolve the 🔴 blockers (`ADMIN_PASSWORD`, `SESSION_JWT_SECRET`, App Store link).
2. Provision Postgres → deploy web → migrate → verify on a real domain (Part A).
3. Set `EXPO_PUBLIC_USER_API_URL` to that domain; EAS production build (Part B, iOS).
4. (If paid) follow [PAYMENTS.md](./PAYMENTS.md): ASC subscription + real IAP +
   server reconciliation.
5. Submit to the App Store. After approval, update the landing-page App Store
   link and redeploy web.

---

## Pre-flight checklist (run from repo root)

```bash
npm install
npm run check       # Biome lint + format (whole repo)
npm run typecheck   # web + mobile
npm run build:web   # production Next build succeeds
```

---

## Appendix — wiring real payments

Moved to its own guide: **[PAYMENTS.md](./PAYMENTS.md)** covers the App Store
Connect product, replacing the `iap.ts` purchase seam with a real StoreKit/
RevenueCat call, and reconciling the entitlement into Postgres (so `plan`/
`paidUntil` — and therefore `/admin` — are authoritative, not just local).
