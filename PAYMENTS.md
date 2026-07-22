# Setting up payments — the Pro subscription

The Pro subscription is **built and wired end-to-end**: paywall → Stripe Checkout
in an in-app browser → webhook → Postgres → the app re-reads its entitlement.
What's left is account configuration, not code — create the products in Stripe,
set the env vars, register the webhook.

Payments deliberately **do not go through the App Store or Google Play**. That
keeps store commission out of the picture and means one billing integration
covers iOS and Android instead of two.

> ⚠️ **App Store review risk.** Linking out to external payment for digital goods
> is governed by Apple **guideline 3.1.1**. The US storefront allows it following
> the *Epic v. Apple* injunction; other storefronts may require Apple's External
> Purchase Link entitlement (with commission) or disallow it. This area moves
> fast — **verify current Apple policy before submitting**, and don't trust a
> model's recall on it. Google Play has an equivalent but more permissive stance.

> ⚠️ **Expo/RN facts change per SDK.** Per `CLAUDE.md`, verify Expo details
> against the live docs for the SDK in `apps/mobile/package.json` (currently Expo
> `~54`) rather than from memory.

---

## How it works

```
  app: PaywallSheet
        │
        ├─ trial-eligible ──► POST /api/billing/trial ──► Postgres ──► Pro (no browser, no card)
        │
        └─ subscribing ─────► POST /api/billing/checkout ──► Stripe Checkout URL
                                        │
                              expo-web-browser opens it
                                        │
                                   user pays
                                   ╱        ╲
                    /billing/success        POST /api/stripe/webhook
                    (deep link back)         │
                                             ▼
                                   Postgres: plan=pro, paid_until
                                             │
                              app polls /api/auth/me ──► Pro unlocked
```

Three rules the design hangs on:

1. **The webhook is the only thing that grants Pro.** The browser redirect is
   never trusted — the user can close the browser before `success_url` loads, and
   a redirect is client-controlled anyway.
2. **Entitlement is computed server-side** (`apps/web/src/server/billing/entitlement.ts`)
   and returned by `/api/auth/me`. The app only renders it, so a device with a
   wound-forward clock can't extend its own trial.
3. **The checkout URL is minted by an authenticated POST**, not by opening a page
   of ours with the session token in the query string. A 30-day session JWT in a
   URL leaks through browser history, referrers, and the in-app-browser handoff.

### Entitlement precedence

`resolveEntitlement()` decides `isPro`, in this order:

| Source | When | Notes |
| --- | --- | --- |
| `subscription` | Stripe status is `active`/`trialing`/`past_due` and `paid_until` hasn't passed | `past_due` **keeps** Pro on purpose — the card failed but Stripe is still retrying, and cutting access mid-dunning turns a recoverable payment into a lost user |
| `admin` | `/admin` set `plan = pro` with no Stripe record | comped accounts |
| `trial` | `trial_ends_at` is in the future | our own trial, not Stripe's |
| `none` | otherwise | locked |

### The free trial is ours, not Stripe's

14 days, **no card required**. Granted on first paywall open — not at signup, so
it doesn't burn down while the user is still happily on the free features.
Recorded as `trial_started_at`/`trial_ends_at` and **idempotent**: replaying
`POST /api/billing/trial` returns the original end date rather than a fresh
window, so it can't be farmed by reinstalling.

### Where the code lives

| Concern | File |
| --- | --- |
| Entitlement rule (single source of truth) | `apps/web/src/server/billing/entitlement.ts` |
| Stripe client, price lookup, `statusGrantsPro` | `apps/web/src/server/billing/stripe.ts` |
| Trial / checkout / portal routes | `apps/web/src/app/api/billing/*` |
| Webhook (grants Pro) | `apps/web/src/app/api/stripe/webhook/route.ts` |
| Return pages | `apps/web/src/app/billing/{success,cancel}` |
| Purchase flow + entitlement consumption | `apps/mobile/src/purchases/PurchaseContext.tsx` |
| Paywall UI | `apps/mobile/src/purchases/PaywallSheet.tsx` |
| Price labels | `apps/mobile/src/purchases/plans.ts` |

---

## Pricing, and why annual is the default

Card processing costs **2.9% + $0.30** per charge, plus ~0.5% Stripe Billing on
recurring payments. The fixed 30¢ is what matters at these prices:

| Plan | Charge | Fees | You keep |
| --- | --- | --- | --- |
| $1 / month | $1.00 | ~$0.33 | **~$0.67 (~67%)** |
| $10 / year | $10.00 | ~$0.64 | **~$9.36 (~94%)** |

Hence the paywall defaults to annual. International cards cost a further ~1.5%.

Labels shown in the app live in `apps/mobile/src/purchases/plans.ts` and **must be
kept in step with the Stripe prices by hand** — unlike StoreKit there's no store
product to read localized pricing from.

---

## Part 1 — Stripe dashboard

Do all of this in **test mode** first (the toggle in the dashboard). Test and live
mode have completely separate keys, products, and webhooks.

1. **Create the product** — Product catalogue → *Add product*, name it "The
   Workout Tracker Pro". Add **two recurring prices** on it:
   - $1.00 / month
   - $10.00 / year

   Copy both price ids (`price_…`) — not the product id.
2. **Configure the billing portal** — Settings → Billing → Customer portal. Enable
   *Cancel subscription* and *Update payment method*, then **save**.
   `POST /api/billing/portal` fails with a "no configuration provided" error until
   this has been saved at least once. Easy to miss.
3. **(Later, for production)** Settings → Tax if you're using Stripe Tax — see
   [Going live](#part-5--going-live).

## Part 2 — Environment variables

All in `apps/web/.env` (never commit it; `.env.example` documents each one):

```bash
STRIPE_SECRET_KEY=sk_test_…        # Developers → API keys
STRIPE_PRICE_MONTHLY=price_…       # from Part 1
STRIPE_PRICE_ANNUAL=price_…
STRIPE_WEBHOOK_SECRET=whsec_…      # from Part 3
PUBLIC_BASE_URL=http://192.168.1.20:3000   # see below
```

`PUBLIC_BASE_URL` builds Stripe's return URLs, so it must be reachable **from the
phone's browser**. On a physical device `localhost` resolves to the phone itself —
use your machine's LAN IP, the same one you put in `EXPO_PUBLIC_USER_API_URL` in
`apps/mobile/.env`.

Optional: `APP_SCHEME` (default `workouttracker`, the deep link back into the app)
and `TRIAL_DAYS` (default 14).

**With `STRIPE_SECRET_KEY` unset, every billing route returns 503** and the app
shows "Subscriptions aren't available yet". Auth, admin, and the rest of the app
work normally — you don't need a Stripe account to develop anything else.

## Part 3 — Webhooks

The webhook is what actually grants Pro. Without it, checkout succeeds and
**nothing happens**.

**Local dev** — install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints a `whsec_…` — put it in `STRIPE_WEBHOOK_SECRET` and restart the web app.
Leave `stripe listen` running while you test.

**Production** — Developers → Webhooks → *Add endpoint*, pointing at
`https://your-domain/api/stripe/webhook`, subscribed to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy that endpoint's signing secret into the production `STRIPE_WEBHOOK_SECRET`.
The handler returns 500 on a transient failure so Stripe retries with backoff.

## Part 4 — Test it end to end

The whole flow works **in Expo Go** — it's just a web checkout in an in-app
browser, so no dev build or Mac is needed (unlike StoreKit).

1. `npm run dev` (web + mobile), with `stripe listen` running in a third terminal.
2. Sign in on the phone, open a Pro-gated card (Me tab → strength ratings).
3. **Trial path:** tap "Try Pro free" → Pro unlocks instantly, no browser.
4. **Payment path:** on the Me tab tap Subscribe (or reset the trial below) → pick
   a plan → the in-app browser opens Stripe Checkout. Pay with test card
   **`4242 4242 4242 4242`**, any future expiry, any CVC, any postcode.
5. Confirm: `stripe listen` logs the events, `/admin` shows the user as **pro**,
   and the app unlocks Pro within a couple of seconds.
6. **Cancel path:** Me tab → Manage subscription → cancel in the portal → the
   `customer.subscription.deleted`/`updated` webhook downgrades the user to free.

**Reset a test user** to run the paywall again from scratch (entitlement is
entirely server-side, so this fully resets it):

```bash
psql -d the_workout_tracker -c "update users set plan='free', paid_until=null, \
  trial_started_at=null, trial_ends_at=null, stripe_status=null, \
  stripe_subscription_id=null where email='you@example.com';"
```

Useful test cards: `4000 0000 0000 9995` (declined), `4000 0025 0000 3155`
(requires 3D Secure authentication).

## Part 5 — Going live

### Moving from test mode to live mode

Test and live mode share nothing but your Stripe login — separate keys, products,
customers, webhooks, and data. You **recreate** the configuration rather than
migrating it. Nothing you did in test mode carries over automatically, with one
exception: a product can be duplicated with the **"Copy to live mode"** button on
its dashboard page (the copies still get **new `price_…` ids**).

**Prerequisite:** live keys don't exist until the account is activated — Stripe
needs your business details and a bank account, and verification can take a day
or two. Do this first.

| What | Test mode | Live mode |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` | `sk_live_…` (Developers → API keys) |
| `STRIPE_PRICE_MONTHLY` / `_ANNUAL` | test `price_…` | **new** `price_…` from the copied product |
| `STRIPE_WEBHOOK_SECRET` | from `stripe listen` | from the **live** dashboard endpoint |
| Webhook delivery | Stripe CLI tunnel | endpoint at `https://your-domain/api/stripe/webhook` |
| Customer portal config | saved in test mode | **must be saved again** in live mode |
| `PUBLIC_BASE_URL` | LAN IP | real HTTPS domain |

Set the production values as deployment environment variables (e.g. Vercel), not
in a `.env` file.

> ⚠️ **Test-mode ids poison a live database.** `users.stripe_customer_id` /
> `stripe_subscription_id` written during testing refer to objects that **do not
> exist in live mode**, and `checkout/route.ts` reuses a stored customer id when
> it's set — so those users get *"No such customer"* on checkout and portal.
> A fresh production database is fine. But if you ever seed prod from a database
> used for testing, or point local live keys at your dev database, clear the
> linkage first:
>
> ```bash
> psql -d the_workout_tracker -c "update users set stripe_customer_id=null, \
>   stripe_subscription_id=null, stripe_status=null, plan='free', paid_until=null;"
> ```
>
> Accounts and sign-in survive; the next checkout creates a fresh live customer.

Test customers, subscriptions, and payments are throwaway — there is no migration
path for them, and you don't want one.

### The rest of going live

1. **Tax is now your problem.** As merchant of record you are liable for **EU/UK
   VAT on digital goods** (and US sales tax in some states) — there is no
   registration threshold for EU digital sales to consumers. Stripe Tax
   calculates and collects for **+0.5% per transaction**, but you still register
   and remit yourself. This is the tradeoff taken against a merchant-of-record
   provider like Paddle or Lemon Squeezy, which handle remittance for ~5% + 50¢
   (punitive at a $1 price point, hence the choice).
2. **Apple compliance** — re-read guideline 3.1.1 for every storefront you ship
   to, and check whether an External Purchase Link entitlement is required. See
   the warning at the top.
3. **Legal pages** — Privacy and Terms should mention Stripe as the payment
   processor and state the refund policy. Both live in `apps/web/src/app/`.
4. **Rotate** `SESSION_JWT_SECRET` for production, and keep the live Stripe key
   out of the repo (it's server-side only — nothing is prefixed `NEXT_PUBLIC_`).

---

## Definition of done

- [ ] Live-mode product with $1/month and $10/year prices; ids in
      `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL`.
- [ ] Customer portal configured **and saved** in live mode (cancel + update card).
- [ ] Production webhook endpoint registered for the four subscription events;
      `STRIPE_WEBHOOK_SECRET` set from it.
- [ ] `PUBLIC_BASE_URL` points at the real domain over HTTPS.
- [ ] Price labels in `apps/mobile/src/purchases/plans.ts` match the Stripe prices.
- [ ] Test-mode run verified: trial → checkout → Pro in `/admin` → cancel →
      downgraded.
- [ ] VAT/sales-tax handling decided (Stripe Tax enabled, or registrations in
      place).
- [ ] Apple guideline 3.1.1 checked for the target storefronts.
