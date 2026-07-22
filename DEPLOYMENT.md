# Deployment — shipping The Workout Tracker to production

This repo has **two independently deployable pieces**:

1. **`apps/web`** — the Next.js service: marketing site + `/admin` dashboard +
   the user/auth API. Deploys to **Vercel** with a managed Postgres.
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
- 🟡 **Payments need a live Stripe account.** The billing flow is built and
  wired end-to-end (Stripe Checkout in an in-app browser → webhook → Postgres),
  but it needs **live-mode** products, prices, a saved customer-portal config, a
  registered webhook endpoint, and the matching env vars. Until
  `STRIPE_SECRET_KEY` is set, every billing route returns 503 and the paywall
  says subscriptions aren't available — safe to deploy, just can't take money.
  Full walkthrough: **[PAYMENTS.md](./PAYMENTS.md)**.
- 🟡 **Apple guideline 3.1.1.** Payments bypass the App Store by design (external
  Stripe Checkout). The US storefront permits this post-*Epic*; other storefronts
  may require Apple's External Purchase Link entitlement or disallow it.
  **Verify against current Apple policy before submitting** — see PAYMENTS.md.
- 🟡 **VAT/sales tax.** As merchant of record you're liable for EU/UK VAT on
  digital goods, with no registration threshold for EU consumer sales. Decide
  this before charging (Stripe Tax, or your own registrations).

---

## Part A — Deploy the web service (`apps/web`) on Vercel

`apps/web` is a standard Next.js (App Router) app with Node-runtime route
handlers that use native packages (`pg`, `jsonwebtoken`, `jwks-rsa` — declared
in `serverExternalPackages`, `next.config.ts`) and an outbound call to Apple's
public keys, so it must run on Vercel's **Node.js runtime** (the default for
these routes), not a pure-static/edge export. Vercel is the target host for this
project.

### A1. Provision managed Postgres

Any managed Postgres works — **Vercel Postgres / Neon** (integrates directly from
the Vercel dashboard: Storage → Create Database), or an external Neon / Supabase /
RDS. Capture its connection string as `DATABASE_URL`. Keep the `?sslmode=require`
suffix the provider gives you (managed Postgres requires TLS). If you add the
database through the Vercel integration it sets `DATABASE_URL` (and friends) into
the project env for you — just make sure the var the app reads is named
`DATABASE_URL`.

### A2. Import the repo as a Vercel project

Vercel Dashboard → **Add New… → Project** → import this Git repo.

- **Root Directory:** set to **`apps/web`**. This is the key monorepo setting —
  it tells Vercel the Next app lives in the subdirectory. Leave "Include files
  outside the root directory" **enabled** (Vercel's default) so the workspace can
  still hoist deps from the repo root.
- **Framework Preset:** Next.js (auto-detected).
- **Install Command:** leave as the default. Vercel runs `npm install` from the
  repo root (npm workspaces hoist to root `node_modules`); with the committed
  `package-lock.json` that resolves every workspace.
- **Build Command:** leave as the default (`next build`). Equivalent to
  `npm run build:web` from the root.
- **Output:** leave default — Vercel handles the Next.js `.next` output and
  serves the Node route handlers as functions. Do **not** set a custom "Output
  Directory".
- **Node.js Version:** 20 or later (matches the root `engines.node >=20`). Set it
  under Project Settings → General if the default is older.

> **Native binaries / the lightningcss + Tailwind oxide build error.** Turbopack's
> CSS pipeline uses `lightningcss` and Tailwind v4 uses `@tailwindcss/oxide`,
> both of which ship platform-specific native binaries as *optional*
> dependencies. npm only writes the **current machine's** optional binary into
> `package-lock.json`, so a lockfile generated on macOS is missing the Linux x64
> binaries — and Vercel's linux-x64 build then dies with
> `Cannot find module '../lightningcss.linux-x64-gnu.node'` (oxide fails the same
> way). This repo fixes that by pinning the Linux x64 binaries in the **root
> `package.json` `optionalDependencies`** (`lightningcss-linux-x64-gnu`,
> `@tailwindcss/oxide-linux-x64-gnu`), which forces their resolutions into the
> lockfile for all platforms. **If you bump `tailwindcss` or `lightningcss`, bump
> these pins to match** (check the new transitive versions and re-run
> `npm install`), or the Vercel build regresses to the same error.

### A3. Set production environment variables

Project Settings → **Environment Variables** (scope to Production; add Preview too
if you want preview deploys to work). From `apps/web/.env.example`:

| Var | Required | Prod value |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Your managed Postgres URL (from A1), incl. `?sslmode=require`. Set automatically if you used the Vercel Postgres integration. |
| `APPLE_CLIENT_IDS` | ✅ | `dev.olehalv.theworkouttracker` (the iOS bundle id = Apple token audience). Comma-separate if you add more. **Do not** include `host.exp.Exponent` in prod — it's only auto-added in dev. |
| `SESSION_JWT_SECRET` | ✅ | Long random secret (see blockers). Also keys the admin cookie. |
| `ADMIN_PASSWORD` | ✅ | Password for the `/admin` login. Empty = dashboard denied to everyone. |
| `SESSION_JWT_EXPIRES_IN` | ⬜ | Defaults to `30d`. |
| `SESSION_JWT_ISSUER` | ⬜ | Defaults to `the-workout-tracker-auth`. |

Nothing here is `NEXT_PUBLIC_`, so none of it reaches the browser — keep it that
way. Don't set `NODE_ENV`; Vercel sets it to `production` for production builds
automatically, which is what flips on the strict secret/audience checks. After
changing env vars, redeploy (Vercel doesn't hot-reload env into an existing
deployment).

### A4. Run database migrations

Migrations are committed SQL under `apps/web/drizzle/` (`0000_init.sql`), applied
by `apps/web/src/server/db/migrate.ts` (reads `DATABASE_URL` via dotenv).

**Don't run migrations in the Vercel build.** The build runs on every deploy and
should stay side-effect-free (a schema change would race concurrent builds and
can't roll back). Instead run the migration **manually against the prod DB from
your machine** — once before the first deploy, and again whenever you add a
migration:

```bash
# from the repo root, with the prod DATABASE_URL exported (not your local one):
DATABASE_URL='postgresql://…prod…?sslmode=require' npm run db:migrate
```

(`npm run db:migrate` = `tsx apps/web/src/server/db/migrate.ts`.) If you'd rather
not export it inline, pull the value with `vercel env pull apps/web/.env.production`
and point the command at that file. Schema-change flow stays: edit
`src/server/db/schema.ts` → `npm run db:generate` → commit the new SQL →
`npm run db:migrate` against prod.

### A5. Deploy, domain, verify

1. **Deploy:** push to the production branch (Vercel auto-deploys), or click
   **Deploy** in the dashboard / run `vercel --prod`.
2. **Domain:** Project Settings → Domains → add your domain (e.g.
   `theworkouttracker.app`) and follow the DNS instructions. Vercel provisions
   TLS automatically.
3. **Smoke test:**
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

### B4. Switch payments to live mode (only if launching paid Pro)

The code is already wired — this is Stripe account configuration. The full
walkthrough is **[PAYMENTS.md](./PAYMENTS.md)**; in short: recreate the product
and its two prices ($1/month, $10/year) in **live** mode, save the customer
portal configuration, register the production webhook endpoint at
`https://your-domain/api/stripe/webhook`, and set `STRIPE_SECRET_KEY`,
`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_WEBHOOK_SECRET` and
`PUBLIC_BASE_URL` on the deployed web app. Nothing carries over from test mode.

Note there is **no App Store Connect subscription product** — payment happens on
the web, outside store billing. Check guideline 3.1.1 for your storefronts first.

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
4. (If paid) follow [PAYMENTS.md](./PAYMENTS.md): live-mode Stripe products,
   portal config, webhook endpoint + env vars.
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

## Appendix — payments

Has its own guide: **[PAYMENTS.md](./PAYMENTS.md)** covers how the Stripe flow
works (paywall → Checkout in an in-app browser → webhook → Postgres), the Stripe
dashboard setup, testing it in Expo Go with test cards, and going live —
including the VAT and Apple guideline 3.1.1 questions.
