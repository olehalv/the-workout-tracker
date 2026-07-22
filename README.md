# The Workout Tracker

A workout tracking app for weight/strength lifters, focused on **progressive
overload** — log workouts, build templates, run a rest timer, manage an exercise
library, and visualize strength progress over time. Modern, minimal, dark-mode.

An **npm workspaces** monorepo:

```
my-workout-tracker/
├── apps/
│   ├── mobile/         # Expo (React Native) app — the actual product
│   └── web/            # Next.js: marketing site + /admin dashboard + user/auth API
├── package.json        # workspace root + top-level scripts
├── tsconfig.base.json  # shared TS compiler options
└── biome.json          # single lint/format config for the whole repo
```

Workout data stays **on-device**; the web app owns only the user account (Apple
id, email, plan/billing) in Postgres.

> `CLAUDE.md` holds the architecture notes and conventions.

## Prerequisites

- **Node.js 20+** and npm
- **PostgreSQL** (local or managed)
- An iPhone or simulator with Expo Go for the mobile app

## Getting started

```bash
# 1. Install all workspaces (hoisted to the repo-root node_modules)
npm install

# 2. Create the database
createdb workout_tracker

# 3. Configure & migrate the web app
cd apps/web
cp .env.example .env          # each var is documented there
npm run db:migrate
cd ../..

# 4. (Optional) Point the mobile app at the web app
cp apps/mobile/.env.example apps/mobile/.env

# 5. Run everything
npm run dev                   # web + mobile together
```

Then open the mobile app in Expo Go, and visit `http://localhost:3000/admin` for
the dashboard. On a physical phone, point `EXPO_PUBLIC_USER_API_URL` at your
machine's LAN IP (e.g. `http://192.168.1.20:3000`) — `localhost` resolves to the
phone itself.

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
