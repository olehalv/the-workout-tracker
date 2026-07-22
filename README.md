# The Workout Tracker

A workout tracking app for weight/strength lifters, focused on **progressive
overload** — log workouts, build presets, run a rest timer, manage an exercise
library, and visualize strength progress over time. Modern, minimal, dark-mode.
Positioned as the cheapest tracker on the market: the free plan covers everything
most people need, with an optional **$1/month Pro** plan for those who want every
feature.

This is an **npm workspaces** monorepo containing the mobile app and a fullstack
Next.js web app (marketing site + admin dashboard + the user/auth API).

> Contributor note: `CLAUDE.md` holds deeper architectural notes and conventions.

## Repository layout

```
my-workout-tracker/
├── apps/
│   ├── mobile/         # Expo (React Native) app — the actual product
│   └── web/            # Next.js: marketing site + /admin dashboard + user/auth API (Postgres)
├── package.json        # workspace root + top-level scripts
├── tsconfig.base.json  # shared TS compiler options
└── biome.json          # single lint/format config for the whole repo
```

### apps/mobile — Expo / React Native
The real product; all workout-tracking features live here. Sign in with Apple is
implemented (`expo-apple-authentication` → identity token → the web app → session
JWT, persisted with `expo-secure-store`). All workout data is stored **on-device**.

- Stack: **Expo SDK 54** (RN 0.81), React Native, TypeScript.
- Runs in Expo Go on iOS (device or simulator). Stay on the stable SDK the public
  App Store Expo Go supports — a prerelease SDK makes Expo Go reject the project.

### apps/web — Next.js (fullstack)
One Next.js app serving three things: a tiny marketing/landing site, an **admin
dashboard** at `/admin` (user stats + a searchable/paginated user table with plan
toggle + delete), and the **user/auth API**. It verifies Sign in with Apple,
registers users in **Postgres** (via **Drizzle ORM**), and tracks each user's
plan/billing. The admin dashboard reads/writes Postgres directly (server-side);
there's no separate backend service.

- Stack: Next.js (App Router), TypeScript, Tailwind CSS, Drizzle ORM +
  node-postgres, `drizzle-kit` migrations. Server-only code lives in `src/server`.
- API route handlers (under `src/app/api`):
  - `POST /api/auth/apple` — `{ identityToken }` → `{ token, expiresIn, user }`
  - `GET  /api/auth/me` — `Authorization: Bearer <session token>` → `{ user }`
  - `GET  /api/health`

## Prerequisites

- **Node.js 20+** and npm
- **PostgreSQL** (local install — e.g. Homebrew — or a cloud DB)
- **Xcode** + an iPhone/simulator to run the mobile app (Expo Go works for login)

## Getting started

```bash
# 1. Install all workspaces (hoisted to the repo-root node_modules)
npm install

# 2. Create the database (adjust the port if your Postgres isn't on 5432)
createdb workout_tracker

# 3. Configure & migrate the web app
cd apps/web
cp .env.example .env          # set DATABASE_URL, APPLE_CLIENT_IDS, SESSION_JWT_SECRET
npm run db:migrate            # creates the users table
cd ../..

# 4. (Optional) Point the mobile app at the web app
cp apps/mobile/.env.example apps/mobile/.env        # EXPO_PUBLIC_USER_API_URL

# 5. Run everything
npm run dev                   # web + mobile together
```

Then open the mobile app in Expo Go, and visit `http://localhost:3000/admin` for
the dashboard. On a physical phone, point `EXPO_PUBLIC_USER_API_URL` at your
machine's LAN IP (e.g. `http://192.168.1.20:3000`) instead of `localhost`.

## Scripts (run from the repo root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Start web + mobile (concurrently). |
| `npm run dev:web` / `dev:mobile` | Start one workspace. |
| `npm run build:web` | Build the Next.js app. |
| `npm run db:generate` | Generate a Drizzle migration from the schema. |
| `npm run db:migrate` | Apply pending migrations to `DATABASE_URL`. |
| `npm run typecheck` | Typecheck all workspaces. |
| `npm run check` / `check:fix` | Biome lint + format (check / apply). |

## Conventions

- **npm workspaces only** (no pnpm/yarn). Deps hoist to the root `node_modules`.
- **Biome** is the single lint/format toolchain for every workspace (2-space indent,
  double quotes, semicolons, 100 cols, organized imports). No per-app ESLint/Prettier.
- **TypeScript strict** everywhere. Non-RN packages extend `tsconfig.base.json`.
- **Never commit `.env`.** The web app ships a `.env.example`. Anything not prefixed
  `NEXT_PUBLIC_` stays server-side — keep DB/session config off the browser.
- **Data:** workout data stays on-device; the web app owns only the user account
  (Apple id, email, plan). Schema changes go through Drizzle migrations.

## Roadmap

Apple login is wired end-to-end (app ↔ web app ↔ Postgres), the web app has a
password-gated `/admin` dashboard, and the Pro subscription is built end-to-end —
Stripe Checkout in an in-app browser, with a webhook driving `plan`/`paidUntil`
(see [PAYMENTS.md](./PAYMENTS.md); it needs a live Stripe account to take money).
Next up: richer progressive-overload charts and editing finished workouts.
