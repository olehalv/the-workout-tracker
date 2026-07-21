# Setting up payments — the Pro subscription

This guide turns the **simulated** Pro paywall into a real, money-taking
subscription. Today the app ships a fully built paywall (sheet, gating, trial
countdown) whose purchase call is faked: in Expo Go, `purchaseProSubscription()`
returns success and Pro is granted **on-device only** — the server never hears
about it, so `/admin` never sees a plan change.

Making Pro real has three independent parts, in this order:

1. **App Store Connect** — create the auto-renewable subscription product.
2. **Client** — replace the one purchase seam with a real StoreKit call.
3. **Server** — reconcile the entitlement into Postgres so `plan`/`paidUntil`
   are authoritative (survives reinstalls, shows in `/admin`).

> ⚠️ **iOS only, for now.** Google Play is not supported (the Android download
> button is disabled on the landing page). Everything below is App Store /
> StoreKit. Revisit if/when Android ships.

> ⚠️ **Expo/RN facts change per SDK.** Per `CLAUDE.md`, don't trust purchase-SDK
> details from memory — verify command names, config-plugin requirements, and
> Expo Go behavior against the live docs for the SDK in
> `apps/mobile/package.json` (currently Expo `~54`) before running anything.

---

## The one client seam

Everything purchase-related is isolated in **`apps/mobile/src/purchases/iap.ts`**.
The rest of the paywall does not change:

- `PurchaseContext.tsx` owns the entitlement (`isPro = server plan === "pro" || local`),
  `openPaywall()`, `subscribe()`, `trialDaysLeft`, `manageSubscription()`.
- `PaywallSheet.tsx` is the subscribe sheet; `ProGate.tsx` blurs gated UI.
- Product facts live as constants in `iap.ts`:
  - `PRO_PRODUCT_ID = "dev.olehalv.theworkouttracker.pro.monthly"`
  - `PRO_PRICE_LABEL = "$1.00 / month"`
  - `PRO_TRIAL_DAYS = 14`

You only replace the bodies of `purchaseProSubscription()` and
`restoreProSubscription()`.

---

## Part 1 — App Store Connect (the product)

Real StoreKit purchases **cannot run in Expo Go** — they need a development/
production build (Part 2) and a product configured here first.

1. **Prerequisites:** paid Apple Developer Program membership, an App Store
   Connect app record for bundle id `dev.olehalv.theworkouttracker`, and the
   signed **Paid Apps agreement** (App Store Connect → Business → Agreements —
   subscriptions won't load until this is active).
2. **Create a Subscription Group** (e.g. "Pro"). Auto-renewable subscriptions
   always belong to a group; a user can hold one active subscription per group.
3. **Create the auto-renewable subscription** in that group:
   - **Product ID:** `dev.olehalv.theworkouttracker.pro.monthly`
     — must exactly match `PRO_PRODUCT_ID` in `iap.ts`.
   - **Duration:** 1 month. **Price:** the $1/month tier (matches `PRO_PRICE_LABEL`).
4. **Add the free-trial introductory offer:** on the product, add an
   **Introductory Offer → Free trial → 14 days** (matches `PRO_TRIAL_DAYS`).
   The trial is enforced by the App Store, not by app code — the in-app
   `trialDaysLeft` is only a local display mirror.
5. Fill the subscription's display name, description, and review info. Add a
   **sandbox test account** (Users and Access → Sandbox Testers) to test
   purchases without real charges.

---

## Part 2 — Client: replace the purchase seam

Pick a purchase library. **RevenueCat (`react-native-purchases`)** is the
recommended path — it wraps StoreKit, tracks entitlements, handles restores, and
provides a server webhook you'll want in Part 3. `expo-iap` is the lighter,
no-backend alternative (you'd talk to StoreKit directly and do your own receipt
validation). This guide assumes RevenueCat; the `iap.ts` comment sketches the
same shape.

1. **Add the library** (needs a dev build — it no-ops/auto-mocks in Expo Go, so
   guard real calls behind a native build):
   ```bash
   cd apps/mobile
   npx expo install react-native-purchases
   ```
2. **RevenueCat dashboard:** create a project, add the iOS app
   (`dev.olehalv.theworkouttracker`), connect it to App Store Connect (App-Specific
   Shared Secret / in-app purchase key), then:
   - Create an **Entitlement** named `pro`.
   - Create a **Product** pointing at `dev.olehalv.theworkouttracker.pro.monthly`
     and attach it to the `pro` entitlement.
   - Create an **Offering** (default) containing that product's package.
3. **Configure the SDK once at startup** (e.g. in `PurchaseProvider`), behind a
   guard so it never runs in Expo Go:
   ```ts
   import Purchases from "react-native-purchases";
   Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY! });
   ```
   Add `EXPO_PUBLIC_REVENUECAT_IOS_KEY` to `apps/mobile/.env(.example)` and the
   EAS production build profile.
4. **Replace `purchaseProSubscription()`** in `iap.ts` (the real shape is already
   in the file's comment):
   ```ts
   import Purchases from "react-native-purchases";
   const offerings = await Purchases.getOfferings();
   const pkg = offerings.current?.availablePackages[0];
   if (!pkg) return { ok: false, canceled: false, message: "No offering" };
   try {
     const { customerInfo } = await Purchases.purchasePackage(pkg);
     return { ok: customerInfo.entitlements.active.pro != null };
   } catch (e: any) {
     return { ok: false, canceled: e?.userCancelled === true, message: e?.message };
   }
   ```
5. **Replace `restoreProSubscription()`** to read existing entitlement (used on
   launch to restore Pro):
   ```ts
   const info = await Purchases.getCustomerInfo();
   return { ok: info.entitlements.active.pro != null, canceled: false };
   ```
6. **Build natively** to test (Expo Go can't):
   ```bash
   npx expo prebuild --clean
   npx expo run:ios --device        # or an EAS development build
   ```
   Sign in with your **sandbox** Apple account and run the paywall end-to-end.

---

## Part 3 — Server: make the entitlement authoritative

After Part 2, Pro is real on the device but the server `plan` still never
changes, so `/admin` and cross-device/reinstall entitlement are wrong. Fix by
trusting the **store**, not the client:

- **Extend the DB layer** (`apps/web/src/server/db/users.ts`) with a helper to
  set `plan` and `paidUntil` for a user id.
- **Preferred — RevenueCat webhook:** add an authenticated web route (e.g.
  `POST /api/billing/revenuecat`) that verifies RevenueCat's webhook auth header
  and, on `INITIAL_PURCHASE` / `RENEWAL` / `CANCELLATION` / `EXPIRATION` events,
  updates `plan`/`paidUntil` for the mapped user. Set the user's RevenueCat
  **app user id** to our DB user id (`Purchases.logIn(userId)` after sign-in) so
  the webhook knows who to update.
- **Alternative — App Store Server Notifications v2:** point ASC's notification
  URL at a web route that verifies Apple's signed `JWS` payload and applies the
  same `plan`/`paidUntil` updates. Use this if you skip RevenueCat.
- **Do not** set plan from a client call at the moment of purchase and stop
  there — renewals, cancellations, refunds, and expiry only arrive via
  store-to-server notifications. Drive `plan`/`paidUntil` from those events.

The client already computes `isPro = serverPro || localPro`, so once the server
reports `plan: "pro"`, entitlement survives reinstalls and appears in `/admin` —
no further client change needed.

---

## Definition of done

- [ ] ASC subscription `dev.olehalv.theworkouttracker.pro.monthly`, $1/mo, 14-day
      free trial, in an active Subscription Group; Paid Apps agreement signed.
- [ ] `iap.ts` `purchaseProSubscription()` / `restoreProSubscription()` call the
      real SDK; SDK configured at startup; no simulated-success path in release.
- [ ] Sandbox purchase + restore verified on a native build.
- [ ] Store-to-server notifications (RevenueCat webhook or ASC v2) update
      `plan`/`paidUntil` in Postgres; `/admin` reflects a real purchase.
- [ ] Not launching paid yet? Hide the paywall or label it clearly as a
      simulation — never charge against the fake path.
