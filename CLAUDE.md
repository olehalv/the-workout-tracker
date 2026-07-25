# The Workout Tracker — Monorepo

PRIORITIZE ME:
- **Comments:** default to **zero** comments. Add one *only* to document a
  non-obvious **external** gotcha — a library bug, an OS/runtime/Expo Go footgun, an
  API that behaves surprisingly. **Never** explain your own code, narrate *what* it
  does, or justify *why* a function/bridge/abstraction exists — if that needs
  explaining, fix the naming or structure instead. When unsure, write no comment.

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
  — stays **on the user's own devices**: the local device (AsyncStorage) plus a
  mirror in the **user's own iCloud** (CloudKit-backed private storage, iOS only)
  so a new phone restores everything. It never touches *our* servers. The only
  server-side data is the **user account** (Apple id, email, plan/billing), stored
  by the `web` app in Postgres. See the mobile Storage section for the sync model.
- **Auth:** Sign in with Apple, handled in the app UI. The identity token is
  verified by the `web` app's `POST /api/auth/apple` route, which upserts the user
  in Postgres and returns a session JWT plus the user (id, email, plan).
- **Monetization:** a "Pro" paywall in the app gates the analytics features
  (progress charts, full exercise history, muscle-activity map, strength ratings)
  behind a subscription — **$1/month or $10/year** (annual is the default offer —
  the fixed ~$0.30 processing fee eats a third of a $1 charge), preceded by a
  **14-day free trial that needs no card**.
- **Payments run through Stripe, deliberately outside the App Store / Play
  Store.** The paywall opens **Stripe Checkout in an in-app browser**
  (`expo-web-browser`); the `web` app hosts the API + return pages, and Stripe's
  **webhook** is the only thing that grants Pro. This keeps Apple/Google out of
  the payment path and means one billing integration covers both platforms.
  - **Entitlement is computed server-side**, never in the app — see
    `apps/web/src/server/billing/entitlement.ts`. `/api/auth/me` returns an
    `entitlement` object (`isPro`, `source`, `trialDaysLeft`, …) and the app just
    renders it, so a device with a wound-forward clock can't extend its trial.
    Precedence: live Stripe subscription → admin comp (`/admin` plan toggle) →
    free trial. `past_due` intentionally keeps Pro while Stripe retries the card.
  - **The free trial is ours, not Stripe's:** granted on first paywall open (not
    at signup, so it doesn't burn down while the user is still on free features),
    recorded as `trial_started_at`/`trial_ends_at`, and idempotent — replaying
    `POST /api/billing/trial` returns the original end date rather than a fresh
    window.
  - **App Store review risk:** linking out to external payment for digital goods
    is governed by Apple guideline 3.1.1, and the rules differ per storefront.
    **Verify current Apple policy before submitting** — this area moves fast, so
    don't answer it from memory.

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
- Purpose (marketing): a very small landing site. Pitch + an App Store download
  button (`src/app/page.tsx`; the link is a **placeholder** — `#` — until the app
  ships; there is no Play button, Android is unsupported) and static **Privacy**
  (`src/app/privacy`) and **Terms**
  (`src/app/terms`) pages linked from the footer. Little information, no app
  functionality.
- Stack: Next.js (App Router), TypeScript, Tailwind CSS, `src/` dir, `@/*` alias,
  **Drizzle ORM + node-postgres** for the user registry. Linting/formatting comes
  from the root Biome config (no per-app ESLint).
- **User/auth API** — Next route handlers under `src/app/api` (Node runtime):
  - `POST /api/auth/apple` — `{ identityToken }` → `{ token, expiresIn, user }`.
  - `GET  /api/auth/me` — `Authorization: Bearer <session token>` → `{ user }`
    (the user carries the derived `entitlement`).
  - `GET  /api/health` — liveness check.
- **Billing API** (all Bearer-authenticated except the webhook):
  - `POST /api/billing/trial` — grant the no-card 14-day trial. Idempotent.
  - `POST /api/billing/checkout` — `{ plan: "monthly" | "annual" }` → `{ url }`,
    a Stripe Checkout URL the app opens in an in-app browser. Creating the
    session **here** (rather than the app opening a page of ours with the token
    in the query string) keeps the 30-day session JWT out of URLs, which leak via
    history/referrers. Grants nothing on its own.
  - `POST /api/billing/portal` — `{ url }` for the Stripe billing portal (update
    card, cancel, invoices). 409 when the user has no Stripe customer yet.
  - `POST /api/stripe/webhook` — signature-verified; **the only path that grants
    Pro.** Handles `checkout.session.completed` and `customer.subscription.*`,
    writing `plan`/`paid_until`/`stripe_*` and downgrading on cancellation. Reads
    the raw body (any re-serialization breaks the signature). Returns 500 on a
    handler failure so Stripe retries.
  - When `STRIPE_SECRET_KEY` is unset every billing route returns **503** and the
    rest of the app still runs, so local dev needs no Stripe account.
  - Return pages: `src/app/billing/success` + `src/app/billing/cancel` — cosmetic
    only (entitlement comes from the webhook); their job is the deep link back
    into the app. `noindex`.
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
  Component): `billing/stripe.ts` (cached Stripe client, price lookup,
  `statusGrantsPro`), `billing/entitlement.ts` (`resolveEntitlement` — the single
  source of truth for Pro access), `auth/requireUser.ts` (shared Bearer-token →
  user), `config.ts` (env), `db/schema.ts` (Drizzle `users` table),
  `db/client.ts` (pool + drizzle, cached across dev HMR), `db/users.ts` (queries:
  upsert/list/stats/CRUD), `db/migrate.ts` (runs migrations), `auth/appleAuth.ts`
  (verify Apple identity token), `auth/session.ts` (issue/verify our session JWT),
  `serialize.ts` (public vs admin user shapes). Drizzle migration SQL is in
  `drizzle/` (committed); `drizzle.config.ts` at the app root.
- The user registry is Postgres, via Drizzle. Login flow: verify the Apple token
  against Apple's public keys (issuer + audience), **upsert** the user
  (`users.apple_user_id` = Apple `sub`; email only arrives on first authorization,
  so it's coalesced), then issue our session JWT (its `sub` is our DB user id).
- **Config via env — `apps/web/.env.example` is the reference**, not this file;
  every var is documented there. Read `src/server/config.ts` for the semantics.
  Worth knowing: `DATABASE_URL` is always required; dev falls back to an insecure
  `SESSION_JWT_SECRET` (warns) and auto-accepts Expo Go's audience, while prod
  throws on boot without a real one. `PUBLIC_BASE_URL` must be reachable from the
  *phone's* browser, so a LAN IP in dev. Both Next.js and the Drizzle tooling read
  `apps/web/.env`.

### apps/mobile — Expo / React Native
- Purpose: the real product. All workout tracking features live here.
- Stack: Expo SDK 54 (RN 0.81), React Native, TypeScript. SDK 54 is the stable
  release the public App Store Expo Go supports — do not bump to a prerelease SDK
  (e.g. 57), or Expo Go on physical devices rejects the project ("requires a newer
  version of Expo Go"). `react`/`react-native` are pinned to SDK 54's versions. Root
  `overrides` enforce a **single React across the monorepo** (`react`/`react-dom`
  → `19.1.0`) plus the `react-native-is-edge-to-edge` RN pin: without the React
  override, `expo-router`'s dep tree resolves loose `react` ranges to a newer 19.x
  and hoists it, leaving the mobile bundle with **two React copies** → "Cannot read
  property 'useState' of null" on launch. Next 16 (web) accepts `^19.0.0`, so it's
  fine on 19.1.0 too. Bump these alongside the Expo SDK's React. (Overrides only
  re-resolve on a clean install — `rm -rf node_modules package-lock.json`; a plain
  `npm install` reconciles against existing `node_modules` and silently keeps the
  old version.)
- **Reanimated / worklets are pinned EXACT — Expo Go footgun.** Hold-and-drag
  reorder (the active-workout exercise list and the template form) uses
  `react-native-reorderable-list`, which builds on `react-native-gesture-handler` +
  `react-native-reanimated` 4 (all bundled in Expo Go on SDK 54; the root
  `GestureHandlerRootView` in `app/_layout.tsx` is required for the gestures; since
  both lists are plain routes rather than RN `Modal`s, that single root covers them).
  The library's **default cell animation scales the dragged
  item to 1.025 and ghosts it to 0.75 opacity**, which overflows the row's slot and
  clips into neighbours; we disable both via a shared `cellAnimations` constant
  (`src/components/reorder.ts`, `REORDER_CELL_ANIMATIONS`) and signal "picked up" with
  a border + shadow on the card instead. Pass it to every `ReorderableList`. **Reanimated hard-crashes on any
  JS↔native version mismatch**, and Expo Go ships the exact native versions its SDK
  pins — so `react-native-reanimated` (`4.1.1`) and `react-native-worklets`
  (`0.5.1`) are pinned without a range. `expo install` / `npm update` float them to
  newer patches that then crash Expo Go with "Exception in HostFunction"; keep both
  matched to `expo/bundledNativeModules.json` when bumping the SDK. Reanimated 4
  needs the New Architecture (SDK 54 default) and its worklets babel plugin, which
  `babel-preset-expo` adds automatically — no `babel.config.js` needed.
  `react-native-draggable-flatlist` does **not** work with reanimated 4 (its
  published build ships v2-era worklets → crashes on import); don't reach for it.
- Login (implemented): Sign in with Apple via `expo-apple-authentication`. The
  `identityToken` is POSTed to the `web` app, which returns a session JWT; the
  token + user are persisted with `expo-secure-store`. Source layout:
  - Entry is **`expo-router`** (`package.json` `main: expo-router/entry`); routes
    live in `app/`. `app/_layout.tsx` mounts `GestureHandlerRootView` +
    `AuthProvider` + the root `Stack`;
    `app/login.tsx` is the signed-out route; `app/(app)/_layout.tsx` guards auth
    (redirects to `/login`), mounts the app providers, and holds the `Stack` that
    owns the tabs plus every full-screen/modal route. (There is no `App.tsx` — the
    old single-tree entry was removed in the router migration.)
  - `src/auth/AuthContext.tsx` — session state, restore-on-startup, sign in/out.
  - `src/auth/appleSignIn.ts` — native Apple flow → identity token.
  - `src/api/client.ts` — calls `POST /api/auth/apple` on the `web` app (base URL
    from `EXPO_PUBLIC_USER_API_URL`, defaults to `http://localhost:3000`; see
    `apps/mobile/.env.example`); the returned user includes `plan` (free/pro).
  - `app/login.tsx` (the sign-in UI itself), `src/theme.ts` (dark tokens).
- **Shared UI kit — `src/components/ui/` (reuse it; don't re-copy styles).** The
  dark/minimal design language is componentized here so screens compose instead of
  duplicating `StyleSheet` blocks: `Button` (primary/secondary/danger/dashed, md/sm,
  optional Ionicon), `Card` (surface panel, `padding` in `theme.space` steps),
  `Input` (surface text field), `SectionLabel` (the uppercase muted heading),
  `ScreenHeader` (tab + modal headers — pass `action` for the Cancel/Done text
  button), `Stat`/`StatGrid` (the stat tiles), `Segmented` (settings-style toggles:
  `variant` buttons|pill, `tone` for pills on a surface card), and `common` (the
  `surface`/`pressed`/`disabled` style fragments). Barrel-exported from
  `src/components/ui/index.ts`. Add new reusable primitives here rather than
  re-deriving them in a screen; extend a component's props before forking a copy.
- **Liquid glass goes through the kit — never hand-roll `GlassView`.** Raw
  `expo-glass-effect` (`GlassView` / `isLiquidGlassAvailable`) is allowed **only**
  inside `src/components/ui/`. Any tappable glass surface (accent CTA, secondary
  button, glass pill) is a `GlassPressable` (or `Button`, which now delegates to it);
  pass `tint` for the fill, `surfaceStyle` for layout, `fallbackStyle` for the solid
  pre-iOS-26 look. `GlassPressable` centralizes the two footguns — GlassView
  degrades to a background-less View off iOS 26 (so it keeps a solid fallback), and
  glass corrupts under `opacity < 1` (so `disabled`/busy always takes the solid
  path). Reuse these instead of re-copying the gate + `GlassView` boilerplate. The
  one legitimate exception is `Segmented`, whose per-segment active/inactive glass
  sits inside a single shared `Pressable` (not the Pressable-wraps-Glass shape
  `GlassPressable` encodes); it still reuses the shared `GLASS` flag. **General rule:
  if a component already does the job, reuse it — don't reimplement it.**
- Navigation: **`expo-router` file-based routing** with a **native iOS tab bar**.
  `app/(app)/(tabs)/_layout.tsx` uses `NativeTabs` from
  `expo-router/unstable-native-tabs` — a real `UITabBarController`, so on **iOS 26
  it gets the system Liquid Glass** treatment for free (and falls back to a standard
  native bar on older iOS). The native tab module is **bundled in Expo Go on SDK 54**,
  so the real native bar — including iOS 26 Liquid Glass — renders in Expo Go on the
  iOS simulator with **no dev build needed** (verified 2026-07; only the
  `getImageSourceSync` custom-icon path needs a dev build, not the tab bar itself).
  This replaced the old hand-rolled `View`/`expo-glass-effect` tab bar
  (`src/navigation/AppTabs.tsx`, deleted), which could only *mimic* glass. **Native tabs are alpha on SDK 54** (`unstable-`); the
  API may change. Four tabs, each a route file under `(tabs)/`: **Workouts**
  (`index.tsx`), **Templates**, **Exercises** (heading "Exercises & progress"), and
  **Me** (`profile.tsx`); SF Symbols for the icons.
- **Everything above the tabs is a route in the `(app)` Stack — there is no
  state-driven gate and no RN `Modal` left in the app.** `app/(app)/_layout.tsx`
  mounts the providers plus a `<Stack>` whose `anchor` is `(tabs)`; every overlay
  is a sibling route with its `presentation` set there:
  - `workout` and `summary` — `fullScreenModal`, `gestureEnabled: false` (a swipe
    must not drop you out of an active workout).
  - `workout-detail` (`?id`), `exercise-picker`, `exercise-form`
    (`?id` to edit, else `?name` to prefill and `?addTo=workout|template`),
    `exercise-progress` (`?id`, `?name` fallback), `template-picker`,
    `template-form` (`?id` to edit) — `presentation: "modal"`.
  - `paywall` — `presentation: "formSheet"` with `sheetAllowedDetents:
    "fitToContents"`, so iOS owns the sheet: no hand-rolled `Animated` slide, no
    scrim, no grabber of our own.
  **A route file *is* the screen — there is no `src/screens/` indirection.** Each
  file under `app/` holds its own UI and calls `router` / `useLocalSearchParams`
  directly, and the safe-area wrapper is folded into that same component (so
  `app/(app)/(tabs)/index.tsx` is the Workouts screen, not a two-line re-export).
  Only genuinely shared pieces live under `src/components/` — the kit in
  `src/components/ui/`, plus `MinimizedWorkoutBar`/`ResumeBar`/`RestPill`/
  `RestTimerBar`/`WeekCalendar`/`BodyMap`/`LineChart`/`WorkoutRecap`/`ProGate`.
  `headerShown` is off everywhere — the modal routes keep the kit's `ScreenHeader`
  with its Cancel/Done action.
- **Safe area: use `useSafeAreaInsets()`, never `<SafeAreaView>`.** `SafeAreaView`
  measures itself natively, and inside a screen that mounts in a just-presented
  modal view controller that measurement lands on **0** — so a pushed route opens
  with no top inset the first time and looks right on every reopen (the value is
  cached by then). The hook reads the provider's already-measured metrics, and
  `app/_layout.tsx` passes `initialMetrics={initialWindowMetrics}` so they're
  available synchronously on the first frame. Screens add `insets.top` /
  `insets.bottom` onto their own padding.
- Navigating the workout: **Start workout** → `startWorkout()` + `push("/workout")`;
  **Minimize** → `router.back()` (the store's `minimized` flag is set by the route's
  mount/unmount effect, and is only read to reopen the workout after a cold start);
  **Resume** → `push("/workout")`; **Finish** → `finishWorkout()` +
  `replace("/summary")`. `workout.tsx`/`summary.tsx` render a `<Redirect>`
  when their state is missing, aimed at the same destination the explicit navigation
  goes to, so a deep link or a mid-transition re-render can't strand you.
  Finishing a (non-empty) workout shows the **post-workout summary**
  (`app/(app)/summary.tsx`): session stats, new personal records, the trained-muscle
  body map, and a strength read-out. This recap is **free — no Pro gate** (unlike
  the Me tab's always-on analytics), by design.
- While a workout is minimized, `src/components/MinimizedWorkoutBar.tsx` floats the
  **Resume workout** bar (`ResumeBar.tsx`, live elapsed time) over the tab screens —
  it renders next to the `<Stack>` and shows only on the four tab paths
  (`usePathname()`; also hidden on the Workouts tab at `/`, which has its own Resume
  button). The rest-timer pill (`RestPill.tsx`) takes priority (one or the other,
  never both). Native tabs don't expose their bar height, so that overlay floats
  above an estimate (`TAB_BAR_ESTIMATE`, tune on-device). Native tabs auto-inset
  scroll content on iOS, so tab screens need no manual bottom clearance.
- Workout tracking (implemented): start/minimize/finish a workout, add exercises
  from a library (built-in seed + user-created custom, each with one or more
  **muscle groups**; editable/deletable — icon buttons for progress/edit/remove),
  reorder exercises within a workout (hold-and-drag by the grip handle — see the
  reanimated note above), log sets as inline
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
    workout header, the Resume controls, and the workout detail view.
  - `src/workouts/units.ts` — `WeightUnit` ("kg"/"lbs") + convert/format helpers.
    Weights are stored canonically in **kg**; screens convert to the user's unit
    at display/input boundaries (unit preference lives in the store, set on the
    Me tab, default kg).
  - `src/workouts/WorkoutContext.tsx` — the single workout store: loads/persists
    on mount (old single-`category` exercises are migrated to `muscleGroups`),
    holds `workouts` + `library` + `presets` + `active` + `minimized` (a cold-start
    hint only — see Navigation) + `unit` +
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
    tab (`app/(app)/(tabs)/templates.tsx`); create/edit/delete + per-exercise
    set-count steppers + hold-and-drag reorder (`react-native-reorderable-list`,
    same as the active workout) in `app/(app)/template-form.tsx`; also "save
    active workout as template" from the active workout. The template picker
    (`app/(app)/template-picker.tsx`, opened from the Workouts tab) also offers "+ New
    template" so a template can be created without visiting the Templates tab.
    Starting a template is disabled while a workout is active. **The form's in-progress
    draft lives in `src/workouts/TemplateDraftContext.tsx`, above the router** — the
    "create an exercise" route stacks on top of the form, and a pushed route has no
    way to hand a value back, so the draft is the hand-off point. Its `openNew(seed?)`
    / `openEditor(preset)` seed the draft *and* navigate, which keeps "the form is
    always seeded before it mounts" a single invariant instead of a mount effect.
  - Tab screens (`app/(app)/(tabs)/`): `index.tsx` (start/resume + a paged weekly
    `src/components/WeekCalendar.tsx` strip — one week per swipe, current week
    first, lazily loading one more week each page back up to ~1 year; filters
    history to the selected day), `templates.tsx`, `exercises.tsx` (searchable
    library), `profile.tsx` (the **Me** tab: kg/lbs unit toggle, a
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
    sets-per-muscle-group from logged workouts). Workout flow, all under
    `app/(app)/`: `workout.tsx` (active workout), `exercise-picker.tsx`
    (search/create + add), `exercise-form.tsx` (create/edit/delete a library
    exercise; multi-select muscle groups; "Create" vs "Create & add", the latter
    routed by the `addTo` param), `exercise-progress.tsx` (chart + history, with an
    Edit button when the exercise is still in the library), `workout-detail.tsx`
    (read-only view of a finished workout — totals, the trained-muscle body map +
    strength summary, then every exercise/set/note);
    `src/components/LineChart.tsx` (pure-`View` progression line — no SVG/native
    module, so it renders identically in Expo Go). The **body map + strength
    summary** cards are shared between the post-workout `summary.tsx` and
    `workout-detail.tsx` via `src/components/WorkoutRecap.tsx`
    (`MusclesTrainedCard` + `StrengthSummaryCard`, both scoped to a single workout
    and Pro-free); PRs are summary-only (time-relative).
  - Rest timer: `src/workouts/RestTimerContext.tsx` (`RestTimerProvider` +
    `useRestTimer`; end-timestamp countdown, buzzes via RN `Vibration` on
    completion). The provider is mounted above the workout screen and the tab
    shell (in `app/(app)/_layout.tsx`) so the countdown survives minimizing. The
    chosen default length is **owned by `WorkoutContext`** (persisted with the other
    settings) and fed in via `duration`/`onDurationChange` props through a small
    `RestTimer` bridge in the layout — so changing 1:30 → 3:00 sticks across
    restarts, and `RestTimerContext` stays decoupled from the store (no import
    cycle). UI:
    `src/components/RestTimerBar.tsx` (control above the workout footer) and
    `src/components/RestPill.tsx` (tap-to-resume pill shown on the tab screens while
    a minimized workout is resting). Auto-starts when a set is added; also manual
    start/skip/±15s. Tabs use `@expo/vector-icons` (Ionicons; bundled with Expo).
- Pro paywall (`src/purchases/`): `PurchaseProvider` + `usePurchases()`
  (`PurchaseContext.tsx`) expose `isPro`/`entitlement`/`trialDaysLeft`/`busy` plus
  `openPaywall()`, `startFreeTrial()`, `subscribe(plan)` and
  `manageSubscription()`. Provider is mounted above the signed-in app in
  `app/(app)/_layout.tsx` (under `AuthProvider`); `openPaywall()` is just
  `router.push("/paywall")`.
  - **`isPro` comes only from the server** (`user.entitlement`, itself cached in
    SecureStore by `AuthContext`, so offline still works). There is **no local
    entitlement store** — the old simulated-StoreKit `iap.ts` and
    `STORAGE_KEYS.subscription` are gone.
  - `subscribe(plan)` asks the web app for a Checkout URL, opens it with
    `WebBrowser.openAuthSessionAsync`, then **polls `/api/auth/me`** until the
    webhook lands. It polls regardless of the browser result — someone who pays
    and then closes the browser by hand reports `dismiss` but is still a paying
    customer — but with **two budgets**: ~15s when they returned via the success
    page's deep link (`type === "success"`), ~4s when they just closed the
    browser, so a plain cancel isn't stuck behind a spinner. A late webhook is
    still picked up by `AuthContext`'s refresh-on-foreground.
  - Return URLs use `Linking.createURL()` so the deep link works under both Expo
    Go (`exp://…`) and a real build (`workouttracker://…`).
  - `app/(app)/paywall.tsx` has two states: trial-eligible → one-tap no-card trial
    (never opens a browser), with "subscribe now instead" underneath; otherwise
    the annual/monthly picker → Checkout. Plan labels live in `plans.ts` and must
    be kept in step with the Stripe prices (there's no store product to read
    localized pricing from).
  - Deps: `expo-web-browser` + `expo-linking`, both bundled in Expo Go — so the
    **whole payment flow is testable in Expo Go**, unlike StoreKit.
  Gated UI is wrapped in `src/components/ProGate.tsx`, which blurs its children
  (`expo-blur` `BlurView`, bundled in Expo Go), makes them non-interactive, and
  overlays a "Requires Pro" button when `locked`. Used on the exercise progress
  chart + older history rows (`exercise-progress.tsx`, latest session stays
  visible) and the muscle-activity + strength-ratings cards (the Me tab).
- Storage: **local-first with an iCloud backup mirror**, both behind
  `src/storage/storage.ts` (`loadJSON`/`saveJSON` + `STORAGE_KEYS` — the single
  swap point; only `WorkoutContext` calls it). AsyncStorage
  (`@react-native-async-storage/async-storage`, bundled in Expo Go) stays the fast,
  offline, always-available source of truth. On top of it, synced keys are mirrored
  to the **user's own iCloud** via `react-native-cloud-storage`
  (`CloudStorageScope.AppData` — a hidden, CloudKit-backed private container, so no
  1 MB key-value cap; iOS only, `Platform.OS === "ios"`), so a fresh install on a
  new phone restores instead of starting empty.
  - **Reconciliation is last-write-wins per key**, decided by a timestamped
    envelope (`{ __mwtEnvelope, updatedAt, data }`) written to both tiers. On load,
    both are read and the newer one wins, seeding whichever side is stale/missing;
    `saveJSON` writes local immediately and pushes to iCloud on an ~800 ms trailing
    debounce. Pre-envelope (legacy raw) values are treated as oldest, so existing
    installs seed iCloud on first run. This is **not** record-level merge: two
    devices editing while both offline lose the earlier writer's whole key — an
    accepted tradeoff for single-user / one-device-at-a-time use (CloudKit-record
    modelling would be the next step up). `isCloudBackupAvailable()` exposes the
    (cached) availability probe; the Me tab shows an "iCloud backup on/off" row via
    the library's `useIsCloudAvailable()` hook.
  - The in-progress `active` workout is **excluded** from the iCloud mirror
    (`SYNCED_KEYS`): it's transient device state (you don't swap phones mid-set) and
    it churns on every set edit. Workouts, library, presets and settings sync.
  - **Requires a native dev build — iCloud does NOT work in Expo Go** (needs iCloud
    entitlements + a container, which only a native build has). Needs a paid Apple
    Developer account and an iCloud container `iCloud.dev.olehalv.theworkouttracker`
    on the App ID with the **iCloud (CloudKit + Documents)** capability. `app.json`
    wires the `react-native-cloud-storage` config plugin; run `expo prebuild` /
    rebuild the dev client after changing it.
  - **CloudKit environment footgun:** the plugin's `iCloudContainerEnvironment` is
    set to `Development` (matches a dev-build / development provisioning profile).
    CloudKit **Development and Production are separate databases — records do NOT
    carry over.** This MUST become `Production` (or be driven per EAS build profile)
    before TestFlight/App Store, or released users get an empty Production container.
  - The abstraction stays swappable to `expo-sqlite` later if progress aggregation
    outgrows in-memory scans.
- Monorepo note: `metro.config.js` is configured to resolve hoisted deps from the
  repo root (`watchFolders` + `nodeModulesPaths`). Keep it when adding packages.
- `app.json`: `userInterfaceStyle: "dark"`, `ios.usesAppleSignIn: true`,
  `expo-apple-authentication` + `react-native-cloud-storage` (iCloud backup) config
  plugins. Bundle id / Android package:
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

Setup (Postgres, `.env`, migrate, `npm run dev`) is in `README.md`. To run
against the **real** bundle id rather than Expo Go's, you need a dev build:

```bash
cd apps/mobile
npx expo prebuild --clean          # generates ios/ with the Apple Sign In entitlement
npx expo run:ios --device          # build + install on the connected iPhone
```

Requires Xcode, and `dev.olehalv.theworkouttracker` must exist as an App ID with
the **Sign in with Apple** capability (Xcode prompts to register it). Drop
`--device` for the simulator; `eas build --profile development --platform ios` is
the EAS equivalent. The dev build's only added value is that the token's `aud`
matches `APPLE_CLIENT_IDS` — the button itself already renders in Expo Go.

### Testing payments locally

Unlike StoreKit, the whole payment flow works in **Expo Go** — it's just a web
checkout in an in-app browser. With `STRIPE_SECRET_KEY` unset the billing routes
return 503 and the app shows "Subscriptions aren't available yet", which is fine
for working on anything else.

To exercise the real flow, use Stripe **test mode** keys/prices in
`apps/web/.env` and forward webhooks to the dev server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook   # prints STRIPE_WEBHOOK_SECRET
```

Without that forwarder, checkout completes but **Pro is never granted** — the
webhook is the only thing that flips the plan. `PUBLIC_BASE_URL` must be your LAN
IP, not `localhost` (which resolves to the phone). Pay with `4242 4242 4242 4242`.

To re-test the paywall from scratch, clear the trial and subscription on your
user (entitlement is entirely server-side, so this fully resets it):

```bash
psql -d the_workout_tracker -c "update users set plan='free', paid_until=null, \
  trial_started_at=null, trial_ends_at=null, stripe_status=null where email='you@example.com';"
```

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
- **Comments:** default to **zero** comments. Add one *only* to document a
  non-obvious **external** gotcha — a library bug, an OS/runtime/Expo Go footgun, an
  API that behaves surprisingly. **Never** explain your own code, narrate *what* it
  does, or justify *why* a function/bridge/abstraction exists — if that needs
  explaining, fix the naming or structure instead. When unsure, write no comment.
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
- Mobile: editing a finished workout after the fact, and richer progressive-overload
  charts (volume view, per-set previous data rather than just the top set). The
  rest-timer default length now persists (stored in `WorkoutContext` settings, fed
  into `RestTimerProvider` via props). If progress aggregation outgrows in-memory
  scans, migrate the store behind `src/storage/storage.ts` to `expo-sqlite`.
- iCloud backup: wired end-to-end (local-first + `react-native-cloud-storage`
  mirror) but only exercisable in a **dev build**, not Expo Go, and so far only
  against the CloudKit **Development** environment. Before shipping: flip
  `iCloudContainerEnvironment` to `Production` in `app.json` (or drive it per EAS
  profile), ensure the iCloud container + capability exist on the App ID, and
  verify restore on a second device. Consider a manual "Back up now" action and
  surfacing last-sync time. True concurrent multi-device sync (record-level merge)
  is out of scope — current model is last-write-wins per key.
- Payments: the Stripe flow is wired end-to-end (paywall → in-app browser →
  Checkout → webhook → entitlement) but has only run in **test mode**. Going live
  is account configuration, not code: live-mode product + prices, a **saved**
  customer-portal config (the portal route 500s until it's saved once), a
  registered webhook endpoint, and the matching env vars. Nothing carries over
  from test mode — and test-mode `stripe_customer_id`s in a live database break
  checkout with "No such customer", so clear them if you ever reuse a dev DB.
- Web: swap the **placeholder** App Store link on the landing page for the real
  URL once the app ships (Android unsupported for now — no Play button). Contact
  email in Privacy/Terms is `ole2005morten@outlook.com`. `/admin` has a password
  login (`ADMIN_PASSWORD`); per-user admin accounts or host-level protection
  would be the next step up.
- Deploy: `apps/web` targets **Vercel** with Root Directory `apps/web` and a
  managed Postgres. Two things that bite:
  - **Don't run migrations in the build** — it runs on every deploy, races
    concurrent builds, and can't roll back. Run `npm run db:migrate` manually
    with the prod `DATABASE_URL` exported.
  - `lightningcss` and `@tailwindcss/oxide` ship platform-specific native
    binaries as *optional* deps, and npm only locks the current machine's — so a
    macOS lockfile breaks Vercel's linux-x64 build. The root `package.json`
    pins `lightningcss-linux-x64-gnu` + `@tailwindcss/oxide-linux-x64-gnu` in
    `optionalDependencies` to force them into the lockfile. **Bump these pins
    whenever you bump `tailwindcss` or `lightningcss`.**
- Apple sign-in works in Expo Go, but the token's `aud` is Expo Go's bundle id,
  so testing against the real `APPLE_CLIENT_IDS` needs a dev build (or adding
  Expo Go's client id to the allowed audiences). Only the web/browser sandbox
  genuinely can't do it.
