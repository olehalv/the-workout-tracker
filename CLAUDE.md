# The Workout Tracker — Monorepo

A workout tracking app for weight / strength lifters, focused on **progressive
overload**. Log workouts, build presets, run a rest timer, manage exercises, and
visualize strength progress over time.

## Product overview

- **Audience:** weight/strength lifters tracking progressive overload.
- **Core features (the app):**
  - Log workouts (add sets, add reps, weight per set, edit a workout after the fact).
  - Workout presets (reusable templates).
  - Rest timer between sets.
  - Exercise library: choose from built-in exercises or create/add custom ones.
  - Progressive-overload graphs (strength/volume trends per exercise over time).
- **Design language:** modern, **dark mode**, minimalistic.
- **Data ownership:** all workout data — workouts, exercises, sets, stats, history
  — stays **locally on the device**. The only server-side data is the **user
  account** (Apple id, email, plan/billing), stored by the `web` app in Postgres.
- **Auth:** Sign in with Apple, handled in the app UI. The identity token is
  verified by the `web` app's `POST /api/auth/apple` route, which upserts the user
  in Postgres and returns a session JWT plus the user (id, email, plan).
- **Monetization:** a "Pro" paywall in the app gates the analytics features
  (progress charts, full exercise history, muscle-activity map, strength ratings)
  behind a $1/month subscription with a 14-day free trial. The `web` app tracks
  each user's `plan` (free/pro) and `paidUntil` in Postgres, and its `/admin`
  dashboard reads/edits that data directly. The **real StoreKit purchase is not
  wired yet** — it can't run in Expo Go (needs a dev build + App Store Connect
  product), so the mobile paywall currently uses a *simulated* purchase behind a
  single seam (see `apps/mobile/src/purchases/iap.ts`).

## Repository layout

This is an **npm workspaces** monorepo (no pnpm/yarn). Workspaces live under
`apps/*`.

```
my-workout-tracker/
├── apps/
│   ├── web/            # Next.js: marketing site + /admin dashboard + user/auth API (Postgres)
│   └── mobile/         # Expo (React Native) app — the actual product
├── package.json        # workspace root + top-level scripts
├── tsconfig.base.json  # shared TS compiler options
└── CLAUDE.md
```

### apps/web — Next.js (fullstack)
The single web service: marketing site, `/admin` dashboard, **and** the user/auth
API. It was previously split into `apps/website` + a separate Express
`user-service`; those are now one Next.js app (Express dropped — Next route
handlers serve the API, and the admin UI talks to Postgres directly instead of
over HTTP).
- Purpose (marketing): a very small landing site. Pitch + App Store / Google Play
  download buttons (`src/app/page.tsx`; store links are **placeholders** — `#` —
  until the app ships) and static **Privacy** (`src/app/privacy`) and **Terms**
  (`src/app/terms`) pages linked from the footer. Little information, no app
  functionality.
- Stack: Next.js (App Router), TypeScript, Tailwind CSS, `src/` dir, `@/*` alias,
  **Drizzle ORM + node-postgres** for the user registry. Linting/formatting comes
  from the root Biome config (no per-app ESLint).
- **User/auth API** — Next route handlers under `src/app/api` (Node runtime):
  - `POST /api/auth/apple` — `{ identityToken }` → `{ token, expiresIn, user }`.
  - `GET  /api/auth/me` — `Authorization: Bearer <session token>` → `{ user }`.
  - `GET  /api/health` — liveness check.
- **Admin dashboard:** `src/app/admin` — a Server Component showing user stats and
  a searchable/paginated user table (email, Apple id, plan, paid-until) with plan
  toggle + delete. It reads/mutates Postgres **directly** through the server-only
  data layer in `src/lib/admin.ts` (→ `src/server/db/users.ts`); mutations run as
  server actions in `src/app/admin/actions.ts`. No cross-service HTTP call and no
  admin API key anymore — the whole thing is one process. `/admin` is gated by a
  password login (`src/app/admin/login`): the page and the mutating server
  actions redirect to `/admin/login` unless a valid admin session cookie is
  present, checked via `src/server/auth/adminAuth.ts` against the `ADMIN_PASSWORD`
  env var. The cookie is httpOnly and stores an HMAC of the password keyed by
  `SESSION_JWT_SECRET` (raw password never in the cookie; rotating either
  invalidates sessions). When `ADMIN_PASSWORD` is unset the dashboard denies all
  access — there is no insecure fallback. A single shared password, not per-user
  admin accounts (there is no admin role in Postgres).
- **Server-only code** lives in `src/server/` (never import from a Client
  Component): `config.ts` (env), `db/schema.ts` (Drizzle `users` table),
  `db/client.ts` (pool + drizzle, cached across dev HMR), `db/users.ts` (queries:
  upsert/list/stats/CRUD), `db/migrate.ts` (runs migrations), `auth/appleAuth.ts`
  (verify Apple identity token), `auth/session.ts` (issue/verify our session JWT),
  `serialize.ts` (public vs admin user shapes). Drizzle migration SQL is in
  `drizzle/` (committed); `drizzle.config.ts` at the app root.
- The user registry is Postgres, via Drizzle. Login flow: verify the Apple token
  against Apple's public keys (issuer + audience), **upsert** the user
  (`users.apple_user_id` = Apple `sub`; email only arrives on first authorization,
  so it's coalesced), then issue our session JWT (its `sub` is our DB user id).
- Config via env (see `apps/web/.env.example`): `DATABASE_URL`, `APPLE_CLIENT_IDS`
  (audiences = bundle id), `SESSION_JWT_SECRET`, `SESSION_JWT_EXPIRES_IN`,
  `SESSION_JWT_ISSUER`, `ADMIN_PASSWORD` (gates `/admin`; empty = access denied).
  Dev falls back to an insecure `SESSION_JWT_SECRET` (warns) and auto-accepts Expo
  Go's audience; `DATABASE_URL` is always required. Both Next.js and the Drizzle
  tooling read `apps/web/.env`.

### apps/mobile — Expo / React Native
- Purpose: the real product. All workout tracking features live here.
- Stack: Expo SDK 54 (RN 0.81), React Native, TypeScript. SDK 54 is the stable
  release the public App Store Expo Go supports — do not bump to a prerelease SDK
  (e.g. 57), or Expo Go on physical devices rejects the project ("requires a newer
  version of Expo Go"). `react`/`react-native` are pinned to SDK 54's versions and
  a root `overrides` entry keeps `react-native-is-edge-to-edge` from pulling a
  newer RN via its `*` peer.
- Login (implemented): Sign in with Apple via `expo-apple-authentication`. The
  `identityToken` is POSTed to the `web` app, which returns a session JWT; the
  token + user are persisted with `expo-secure-store`. Source layout:
  - `App.tsx` — wraps the app in `AuthProvider` and gates Login vs the signed-in
    app (`AppTabs`, or the full-screen active workout).
  - `src/auth/AuthContext.tsx` — session state, restore-on-startup, sign in/out.
  - `src/auth/appleSignIn.ts` — native Apple flow → identity token.
  - `src/api/client.ts` — calls `POST /api/auth/apple` on the `web` app (base URL
    from `EXPO_PUBLIC_USER_API_URL`, defaults to `http://localhost:3000`; see
    `apps/mobile/.env.example`); the returned user includes `plan` (free/pro).
  - `src/screens/LoginScreen.tsx`, `src/theme.ts` (dark tokens).
- Navigation: a lightweight custom bottom tab bar in `src/navigation/AppTabs.tsx`
  (no navigation library / native module — state-based screen switching) with
  four tabs: **Workouts**, **Templates**, **Exercises** (heading "Exercises &
  progress"), and **Me** (the account/profile tab; `ProfileScreen`). An
  in-progress workout is shown full-screen
  (`WorkoutScreen`) and
  takes over the tabs until minimized or finished (`active && !minimized` in
  `App.tsx`); minimizing keeps the workout alive and returns to the tabs, where
  the Workouts tab offers **Resume workout**. Finishing a (non-empty) workout
  shows a full-screen **post-workout summary** (`WorkoutSummaryScreen`, gated by
  `summary` in `App.tsx`, dismissed via `dismissSummary()`): session stats, new
  personal records, the trained-muscle body map, and a strength read-out. This
  recap is **free — no Pro gate** (unlike the Me tab's always-on analytics), by
  design. On the other tabs a floating
  **Resume workout** bar (`src/screens/ResumeBar.tsx`, showing live elapsed time)
  appears while a workout is minimized; the rest-timer pill takes priority over it
  (AppTabs renders one or the other, never both).
- Workout tracking (implemented): start/minimize/finish a workout, add exercises
  from a library (built-in seed + user-created custom, each with one or more
  **muscle groups**; editable/deletable — icon buttons for progress/edit/remove),
  reorder exercises within a workout (up/down chevrons), log sets as inline
  editable reps × weight rows (first set auto-added; new sets pre-fill from the
  previous; **empty fields show last session's top set as placeholder**) + an
  always-present per-exercise note, and view per-exercise progress (top-set weight
  over time as a dependency-free **line chart** + previous-session history). Source
  layout:
  - `src/workouts/types.ts` — `LibraryExercise` (`muscleGroups: string[]` +
    `muscleLabel()`), `WorkoutExercise`, `WorkoutSet`, `Workout` (carries
    `startedAt` + `finishedAt`), `ProgressPoint` + helpers
    (`totalSets`/`totalVolume`/`topSet`).
  - `src/workouts/time.ts` — duration helpers over `startedAt`/`finishedAt`:
    `elapsedMs`, `formatClock` (live stopwatch "M:SS"/"H:MM:SS"), `formatDuration`
    ("1h 12m"), `formatTimeOfDay`, and the `useNow(active)` hook (ticks every
    second only while active) that drives the live elapsed timers on the active
    `WorkoutScreen` header, the Resume controls, and the workout detail view.
  - `src/workouts/units.ts` — `WeightUnit` ("kg"/"lbs") + convert/format helpers.
    Weights are stored canonically in **kg**; screens convert to the user's unit
    at display/input boundaries (unit preference lives in the store, set on the
    Me tab, default kg).
  - `src/workouts/WorkoutContext.tsx` — the single workout store: loads/persists
    on mount (old single-`category` exercises are migrated to `muscleGroups`),
    holds `workouts` + `library` + `presets` + `active` + `minimized` + `unit` +
    `bodyweight`/`sex` (kg + biological sex, for strength ratings), exposes actions
    and the `progressFor(exerciseId)` selector. `reconcileLibrary` refreshes
    built-in muscle groups from the seed **and appends any seed entries a stored
    library predates**, so new built-in exercises reach existing installs (a
    built-in the user deleted reappears — acceptable while the library grows).
  - `src/workouts/defaultExercises.ts` — built-in library seed (~120 exercises,
    incl. machine/advanced variants like hack squat, pendulum squat, incline
    machine press) + `MUSCLE_GROUPS` (granular: Chest, Upper Back, Lats, Biceps,
    Triceps, Quads, Hamstrings, …). **Append-only**: ids are `builtin-<index>`, so
    reordering/removing an entry remaps ids in installed copies.
  - `src/workouts/strengthStandards.ts` — strength ratings for the main barbell
    lifts (Squat/Bench/Deadlift/OHP): Epley 1RM estimate from the best logged set ÷
    bodyweight, classified against approximate ratio standards per biological sex
    into Beginner→Elite tiers + a 0–100 score. Shown on the Me tab (needs
    bodyweight + sex, entered there).
  - Presets/templates: persisted `WorkoutPreset`s (named, ordered exercise lists,
    each `PresetExercise` carrying a target `sets` count) in the store; starting
    from one pre-fills that many empty sets per exercise. Live on the **Templates**
    tab (`src/screens/TemplatesScreen.tsx`); create/edit/delete + per-exercise
    set-count steppers + reorder (up/down) in `src/screens/PresetFormModal.tsx`;
    also "save active workout as template" from `WorkoutScreen`. Starting a
    template is disabled while a workout is active.
  - Tab screens: `src/screens/WorkoutsScreen.tsx` (start/resume + a paged weekly
    `WeekCalendar.tsx` strip — one week per swipe, current week first, lazily
    loading one more week each page back up to ~1 year; filters history to the
    selected day), `TemplatesScreen.tsx`, `ExercisesScreen.tsx` (searchable
    library), `ProfileScreen.tsx` (the **Me** tab: kg/lbs unit toggle, a
    **strength-ratings** card (bodyweight + sex inputs → per-lift tiers/score via
    `strengthStandards.ts`), and a **muscle-activity body map**: realistic
    anatomical front/back figures from `src/components/BodyMap.tsx`, tinted by
    training volume via `src/workouts/muscleStats.ts`, with a This-week/All-time
    toggle and a most-trained ranking. The figures are **male or female**, chosen
    by the strength-card **Sex** toggle (defaults to male when unset). Card order
    on the Me tab: strength ratings **above** the muscle map. The per-muscle SVG
    path data (male+female, front+back outline + regions + viewBox) is **vendored**
    in `src/components/bodyMapData.ts` — adapted from the MIT-licensed
    `react-native-body-highlighter` (attribution in the file header; do not
    hand-edit, it's generated) and excluded from Biome. `BodyMap.tsx` maps the
    library's muscle slugs onto our 14 groups (its "upper-back" covers both Upper
    Back + Lats; abs+obliques→Core; tibialis→Calves) and renders/heat-tints them.
    Uses `react-native-svg` — bundled in Expo Go — for the figures; it aggregates
    sets-per-muscle-group from logged workouts). Workout flow:
    `WorkoutScreen.tsx` (active workout), `ExercisePickerModal.tsx` (search/create
    + add, with per-row History), `ExerciseFormModal.tsx` (create/edit/delete a
    library exercise; multi-select muscle groups; "Create" vs "Create & add"),
    `ExerciseProgressModal.tsx` (chart + history), `WorkoutDetailModal.tsx`
    (read-only view of a finished workout — totals, the trained-muscle body map +
    strength summary, then every exercise/set/note);
    `src/components/LineChart.tsx` (pure-`View` progression line — no SVG/native
    module, so it renders identically in Expo Go). The **body map + strength
    summary** cards are shared between the post-workout `WorkoutSummaryScreen` and
    `WorkoutDetailModal` via `src/components/WorkoutRecap.tsx`
    (`MusclesTrainedCard` + `StrengthSummaryCard`, both scoped to a single workout
    and Pro-free); PRs are summary-only (time-relative).
  - Rest timer: `src/workouts/RestTimerContext.tsx` (`RestTimerProvider` +
    `useRestTimer`; end-timestamp countdown, buzzes via RN `Vibration` on
    completion). The provider is mounted above the workout screen and the tab
    shell (in `App.tsx`) so the countdown survives minimizing. UI:
    `src/screens/RestTimerBar.tsx` (control above the workout footer) and
    `src/screens/RestPill.tsx` (tap-to-resume pill shown on the tab screens while
    a minimized workout is resting). Auto-starts when a set is added; also manual
    start/skip/±15s. Tabs use `@expo/vector-icons` (Ionicons; bundled with Expo).
- Pro paywall (`src/purchases/`): `PurchaseProvider` + `usePurchases()`
  (`PurchaseContext.tsx`) own the Pro entitlement — `isPro` is the server `plan`
  **or** a local (persisted) subscription — plus `openPaywall()`, `subscribe()`,
  `manageSubscription()` and `trialDaysLeft`. Provider is mounted above the
  signed-in app in `App.tsx` (under `AuthProvider`) and renders the `PaywallSheet`
  (`PaywallSheet.tsx`, a StoreKit-style subscribe sheet: 14-day free trial → $1/mo).
  The actual purchase call is isolated in `iap.ts` — the **one seam** where a real
  `react-native-purchases`/`expo-iap` call replaces the Expo-Go simulation (which
  just grants Pro locally; trial state persists under `STORAGE_KEYS.subscription`).
  Gated UI is wrapped in `src/components/ProGate.tsx`, which blurs its children
  (`expo-blur` `BlurView`, bundled in Expo Go), makes them non-interactive, and
  overlays a "Requires Pro" button when `locked`. Used on the exercise progress
  chart + older history rows (`ExerciseProgressModal.tsx`, latest session stays
  visible) and the muscle-activity + strength-ratings cards (`ProfileScreen.tsx`).
- Storage: local, on-device via `@react-native-async-storage/async-storage`
  (bundled in Expo Go). Kept behind `src/storage/storage.ts` (`loadJSON`/`saveJSON`
  + `STORAGE_KEYS`) so the backing store is swappable to `expo-sqlite` later if
  progress aggregation ever needs it. Chose AsyncStorage + JSON over SQLite/MMKV
  because a single user's history is tiny and it needs zero native config.
- Monorepo note: `metro.config.js` is configured to resolve hoisted deps from the
  repo root (`watchFolders` + `nodeModulesPaths`). Keep it when adding packages.
- `app.json`: `userInterfaceStyle: "dark"`, `ios.usesAppleSignIn: true`,
  `expo-apple-authentication` plugin. Bundle id / Android package:
  `dev.olehalv.theworkouttracker` (the `web` app's `APPLE_CLIENT_IDS` must match the
  iOS bundle id, since it's the Apple token audience).

## Commands

Run from the repo root.

| Command | What it does |
| --- | --- |
| `npm install` | Install all workspaces (hoisted to root `node_modules`). |
| `npm run dev` | Start web + mobile together (concurrently). |
| `npm run dev:web` | Start the Next.js app — site + admin + API (`next dev`). |
| `npm run dev:mobile` | Start Expo (`expo start`). |
| `npm run build:web` | Build the Next.js app. |
| `npm run db:generate` | Generate a Drizzle migration from `schema.ts` (no DB needed). |
| `npm run db:migrate` | Apply pending migrations to `DATABASE_URL`. |
| `npm run typecheck` | Typecheck workspaces that define a `typecheck` script. |
| `npm run check` | Biome lint + format check (whole repo, no writes). |
| `npm run check:fix` | Biome lint + format + organize imports, applying fixes. |
| `npm run format` | Biome format only (writes). |
| `npm run lint` | Biome lint only. |

Per-workspace commands also work, e.g. `npm run ios --workspace mobile`.

## Running the app end-to-end

`expo-apple-authentication` is **included in Expo Go**, so the Apple button
renders and `isAvailableAsync()` returns true there — no Mac, Xcode, or paid
Apple Developer account needed to sign in on the client. The catch is the
**backend**: in Expo Go the identity token is issued under Expo Go's own bundle
id (`host.exp.Exponent`), so its `aud` won't match
`APPLE_CLIENT_IDS=dev.olehalv.theworkouttracker` and the `web` app will reject
it. Two ways to exercise the full flow:

- **Quick / local:** temporarily add `host.exp.Exponent` to `APPLE_CLIENT_IDS`
  so the app accepts Expo Go tokens. Dev only — never ship this.
- **Real bundle id:** a development build with the real audience (steps below).

To run the real login flow against your own bundle id:

1. **Set up Postgres** (Homebrew, no Docker):
   ```bash
   brew install postgresql@17 && brew services start postgresql@17
   createdb workout_tracker          # name matches DATABASE_URL in .env.example
   ```

2. **Create the web env file** (reads `.env`, not `.env.example`) and migrate:
   ```bash
   cd apps/web
   cp .env.example .env
   # .env has DATABASE_URL=postgresql://localhost:5432/workout_tracker,
   # APPLE_CLIENT_IDS=dev.olehalv.theworkouttracker, and a dev-only fallback for
   # SESSION_JWT_SECRET (set a real value for anything shared).
   npm run db:migrate                # create the users table
   ```

3. **Start the web app** (site + admin + API on http://localhost:3000):
   ```bash
   npm run dev:web      # or `npm run dev` for web + mobile
   ```
   On a physical device, `localhost` points at the phone. Set
   `EXPO_PUBLIC_USER_API_URL` in `apps/mobile/.env` to your machine's LAN IP
   (e.g. `http://192.168.1.20:3000`). The admin dashboard (`/admin`) needs no
   extra env — it reads Postgres directly using the same `DATABASE_URL`.

4. **Build & run the app natively** (only needed to test with the real bundle
   id / full entitlement — Apple sign-in itself already works in Expo Go):
   ```bash
   cd apps/mobile
   npx expo prebuild --clean          # generates ios/ with the Apple Sign In entitlement
   npx expo run:ios --device          # build + install on the connected iPhone
   ```
   - Requires Xcode. For a **physical device**, `dev.olehalv.theworkouttracker` must
     exist as an App ID with the **Sign in with Apple** capability in the Apple
     Developer account — Xcode prompts to register it on first run.
   - Simulator: `npx expo run:ios` (no `--device`).
   - EAS alternative: `eas build --profile development --platform ios`.

`isAvailableAsync()` returns true and the button renders in Expo Go already; the
dev build's added value is that the token's `aud` matches `APPLE_CLIENT_IDS`, so
the `web` app accepts it.

## Conventions

- **Package manager:** npm workspaces only. Do not add pnpm/yarn lockfiles.
- **Lint + format:** a single root `biome.json` (Biome) governs every workspace —
  web and mobile. No per-app ESLint/Prettier configs. 2-space indent, double
  quotes, semicolons, 100-col, organize-imports on.
- **TypeScript:** strict. Non-RN packages extend `tsconfig.base.json`. The mobile
  app keeps Expo's own TS config.
- **Secrets:** never commit `.env`; the `web` app ships a `.env.example`. Anything
  not prefixed `NEXT_PUBLIC_` stays server-side — keep DB/session config off the
  browser (the `web` app has no `NEXT_PUBLIC_` server secrets).
- **The `web` app owns the user account only** — Apple id, email, plan/billing in
  Postgres. Workout data stays on-device; do not move workouts server-side without
  a deliberate design. Server-only code lives in `apps/web/src/server` (never
  import it from a Client Component). Schema changes go through Drizzle: edit
  `src/server/db/schema.ts`, run `npm run db:generate`, commit the SQL in
  `apps/web/drizzle/`, then `db:migrate`.
- **UI:** dark, minimal, modern. Keep the marketing site tiny.
- **Expo / React Native facts change fast — verify, don't recall.** Expo SDKs and
  Expo Go change behavior release to release (which modules are bundled in Expo
  Go, config-plugin requirements, `app.json` keys, prebuild flags, API
  signatures). A model's training data lags these, so **do not answer Expo / RN /
  Expo Go questions from memory** — check the live docs for the SDK version in
  `apps/mobile/package.json` (currently Expo `~54`) before asserting anything or
  editing this file. Canonical sources: <https://docs.expo.dev> (per-SDK, use the
  matching version), each package's page under
  <https://docs.expo.dev/versions/latest/sdk/>, and
  <https://reactnative.dev/docs>. If a claim can't be confirmed against current
  docs, say so rather than guessing. (This note exists because a stale "Apple
  sign-in doesn't work in Expo Go" claim was wrong — it is included in Expo Go.)

## Roadmap / not built yet

Apple login is wired end-to-end (app ↔ `web` app ↔ Postgres), the `web` app has a
working `/admin` user dashboard, and the mobile app now has the core workout loop:
persistence (AsyncStorage), the workout/exercise/set data model, a seeded +
custom exercise library, logging UI with notes, and per-exercise progress charts.
Next steps:
- Mobile: editing a finished workout after the fact, richer progressive-overload
  charts (volume view, per-set previous data rather than just the top set), and
  persisting the rest-timer default length. If progress aggregation outgrows
  in-memory scans, migrate the store behind `src/storage/storage.ts` to
  `expo-sqlite`.
- Mobile (payments): the Pro paywall UI + gating are built (`src/purchases/`), but
  the purchase is **simulated** — replace the body of `iap.ts`
  `purchaseProSubscription()` with a real `react-native-purchases`/`expo-iap` call
  (needs a dev build + an App Store Connect auto-renewable product with a 14-day
  intro offer), and reconcile the entitlement with the server `plan`/`paidUntil`.
- Web: swap the **placeholder** App Store link on the landing page for the real
  URL once the app ships (Google Play is not offered — Android unsupported for
  now, so the Play button was removed). Contact email in Privacy/Terms is set to
  `ole2005morten@outlook.com`. `/admin` now has a password login
  (`ADMIN_PASSWORD`); a possible further step is per-user admin accounts or
  host-level protection, but the password gate is in place.
- Web (backend): wire actual payments (set `plan`/`paidUntil` from a billing
  provider/webhook); choose a hosting target + managed Postgres; rotate
  `SESSION_JWT_SECRET` for prod.
- Apple sign-in works in Expo Go, but the token's `aud` is Expo Go's bundle id,
  so testing against the real `APPLE_CLIENT_IDS` needs a dev build (or adding
  Expo Go's client id to the allowed audiences). Only the web/browser sandbox
  genuinely can't do it.
