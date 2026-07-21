// The native in-app-purchase seam.
//
// Real Apple subscriptions run through StoreKit, which is NOT available in Expo
// Go — it needs a development build plus an App Store Connect product. So in Expo
// Go this module *simulates* the purchase: `purchaseProSubscription()` resolves as
// if the user completed the App Store sheet, and the caller grants Pro locally.
//
// To ship real purchases, build the app natively (see CLAUDE.md) and replace the
// body of `purchaseProSubscription()` with a real call — the marked block below
// shows the RevenueCat (`react-native-purchases`) shape. Everything else in the
// app (gating, the paywall sheet, persistence) stays exactly as-is.

/** App Store Connect product id for the auto-renewable Pro subscription. */
export const PRO_PRODUCT_ID = "dev.olehalv.theworkouttracker.pro.monthly";
/** Display price. In a real build this comes from the store's localized product. */
export const PRO_PRICE_LABEL = "$1.00 / month";
/**
 * Free-trial length. This is the *introductory offer* configured on the product
 * in App Store Connect — not something enforced in code. We mirror it locally
 * only to show "X days left" and to date the local entitlement.
 */
export const PRO_TRIAL_DAYS = 14;

export type PurchaseResult = { ok: true } | { ok: false; canceled: boolean; message?: string };

/**
 * Kick off the native subscription purchase and resolve once StoreKit reports a
 * result. In Expo Go this always succeeds (simulated) so the rest of the flow is
 * exercisable without a dev build.
 */
export async function purchaseProSubscription(): Promise<PurchaseResult> {
  // --- REAL IMPLEMENTATION (development / production build only) ------------
  // Requires `react-native-purchases` + a RevenueCat entitlement named "pro"
  // and the product above configured in App Store Connect with a 14-day intro
  // offer. In Expo Go this library auto-mocks, so guard it behind a dev build.
  //
  //   import Purchases from "react-native-purchases";
  //   const offerings = await Purchases.getOfferings();
  //   const pkg = offerings.current?.availablePackages[0];
  //   if (!pkg) return { ok: false, canceled: false, message: "No offering" };
  //   try {
  //     const { customerInfo } = await Purchases.purchasePackage(pkg);
  //     return { ok: customerInfo.entitlements.active.pro != null };
  //   } catch (e: any) {
  //     return { ok: false, canceled: e?.userCancelled === true, message: e?.message };
  //   }
  // -------------------------------------------------------------------------

  // Expo Go: pretend StoreKit approved the subscription (with the free trial).
  return { ok: true };
}

/**
 * Ask StoreKit whether the account already owns the subscription (used on launch
 * to restore entitlement). Simulated as "nothing to restore" in Expo Go; a real
 * build would read `Purchases.getCustomerInfo()`.
 */
export async function restoreProSubscription(): Promise<PurchaseResult> {
  return { ok: false, canceled: false };
}
