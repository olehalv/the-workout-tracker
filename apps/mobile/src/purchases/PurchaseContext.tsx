import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Alert } from "react-native";
import {
  BillingError,
  createCheckoutUrl,
  createPortalUrl,
  type Entitlement,
  NO_ENTITLEMENT,
  startTrial as startTrialRequest,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { PaywallSheet } from "./PaywallSheet";
import type { ProPlan } from "./plans";

/**
 * Pro entitlement + the purchase flow.
 *
 * Payment intentionally bypasses StoreKit / Play Billing: `subscribe()` asks the
 * web app for a Stripe Checkout URL and opens it in an in-app browser. Stripe's
 * webhook is what actually grants Pro, so after the browser closes we poll the
 * server until the new entitlement shows up rather than trusting the client.
 *
 * There is no local entitlement cache any more — `isPro` comes from the server
 * user (itself cached in SecureStore by AuthContext, so offline still works).
 */
interface PurchaseContextValue {
  /** True if this account has Pro — paid subscription, admin comp, or trial. */
  isPro: boolean;
  entitlement: Entitlement;
  /** Whole days left in the free trial (0 when not trialing). */
  trialDaysLeft: number;
  /** A purchase / trial / portal round-trip is in flight. */
  busy: boolean;
  openPaywall: () => void;
  /** Grant the no-card free trial. Returns true when Pro is now unlocked. */
  startFreeTrial: () => Promise<boolean>;
  /** Run Stripe Checkout for a plan. Returns true when Pro is now unlocked. */
  subscribe: (plan: ProPlan) => Promise<boolean>;
  /** Open the Stripe billing portal (update card, cancel, invoices). */
  manageSubscription: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

/**
 * How long to wait for Stripe's webhook after checkout. It usually lands in
 * under a second, but it's a server-to-server round trip we don't control.
 *
 * Two budgets, because the browser result tells us how likely a payment is:
 * `success` means the user came back through our success page's deep link, so
 * wait properly. `cancel`/`dismiss` means they closed the browser themselves —
 * usually a genuine cancel, so don't pin them behind a long spinner. It can
 * still be someone who paid and then closed the tab, hence the short grace
 * window; and if the webhook lands after we stop looking, AuthContext's
 * refresh-on-foreground picks it up anyway.
 */
const CONFIRM_TIMEOUT_MS = 15_000;
const CONFIRM_DISMISSED_TIMEOUT_MS = 4_000;
const CONFIRM_INTERVAL_MS = 1_500;

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const { user, token, refresh } = useAuth();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const entitlement = user?.entitlement ?? NO_ENTITLEMENT;

  const openPaywall = useCallback(() => setPaywallOpen(true), []);

  /**
   * Poll the server until the entitlement turns Pro or we give up. Needed
   * because the browser closing tells us nothing about whether Stripe has
   * finished processing the payment.
   */
  const waitForPro = useCallback(
    async (budgetMs: number): Promise<boolean> => {
      const deadline = Date.now() + budgetMs;
      for (;;) {
        const fresh = await refresh();
        if (fresh?.entitlement.isPro) return true;
        if (Date.now() >= deadline) return false;
        await new Promise((resolve) => setTimeout(resolve, CONFIRM_INTERVAL_MS));
      }
    },
    [refresh],
  );

  const startFreeTrial = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    setBusy(true);
    try {
      const { alreadyUsed } = await startTrialRequest(token);
      const fresh = await refresh();
      if (alreadyUsed && !fresh?.entitlement.isPro) {
        Alert.alert(
          "Free trial already used",
          "You've already had your free trial on this account. Subscribe to keep the Pro features.",
        );
        return false;
      }
      return fresh?.entitlement.isPro === true;
    } catch (err) {
      Alert.alert(
        "Couldn't start the trial",
        err instanceof BillingError ? err.message : "Please try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [token, refresh]);

  const subscribe = useCallback(
    async (plan: ProPlan): Promise<boolean> => {
      if (!token) return false;
      setBusy(true);
      try {
        const checkoutUrl = await createCheckoutUrl(token, plan);

        // Linking.createURL builds the right scheme for wherever we're running
        // (exp://… under Expo Go, workouttracker://… in a real build), so the
        // success page's "back to the app" link routes home either way.
        const returnUrl = Linking.createURL("billing/return");
        const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);

        // Poll regardless of the result type — someone who paid and then closed
        // the browser by hand reports "dismiss" but is still a paying customer,
        // and only the server knows which happened. The budget differs, though
        // (see the constants), so a plain cancel isn't stuck behind a spinner.
        const returnedViaDeepLink = result.type === "success";
        const unlocked = await waitForPro(
          returnedViaDeepLink ? CONFIRM_TIMEOUT_MS : CONFIRM_DISMISSED_TIMEOUT_MS,
        );

        // Only nag if they actually came back through the success page; closing
        // the browser is far more often a deliberate "no thanks".
        if (!unlocked && returnedViaDeepLink) {
          Alert.alert(
            "Not confirmed yet",
            "If you completed the payment, Pro will unlock shortly — reopen the app in a moment. Nothing was charged twice.",
          );
        }
        return unlocked;
      } catch (err) {
        Alert.alert(
          "Couldn't start checkout",
          err instanceof BillingError ? err.message : "Please try again.",
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [token, waitForPro],
  );

  const manageSubscription = useCallback(async (): Promise<void> => {
    if (!token) return;

    // On the no-card trial there is no Stripe customer yet, so the portal would
    // 409. Explain instead of surfacing an error.
    if (!entitlement.canManageBilling) {
      Alert.alert(
        "Nothing to manage yet",
        entitlement.source === "trial"
          ? "You're on the free trial — no payment method, nothing to cancel. Subscribe when it ends to keep Pro."
          : "This account has no subscription to manage.",
      );
      return;
    }

    setBusy(true);
    try {
      const portalUrl = await createPortalUrl(token);
      const returnUrl = Linking.createURL("billing/return");
      await WebBrowser.openAuthSessionAsync(portalUrl, returnUrl);
      // Cancelling / changing the card fires a webhook; pick up the result.
      await refresh();
    } catch (err) {
      Alert.alert(
        "Couldn't open billing",
        err instanceof BillingError ? err.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [token, entitlement.canManageBilling, entitlement.source, refresh]);

  const value = useMemo<PurchaseContextValue>(
    () => ({
      isPro: entitlement.isPro,
      entitlement,
      trialDaysLeft: entitlement.trialDaysLeft,
      busy,
      openPaywall,
      startFreeTrial,
      subscribe,
      manageSubscription,
    }),
    [entitlement, busy, openPaywall, startFreeTrial, subscribe, manageSubscription],
  );

  return (
    <PurchaseContext.Provider value={value}>
      {children}
      <PaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </PurchaseContext.Provider>
  );
}

export function usePurchases(): PurchaseContextValue {
  const ctx = useContext(PurchaseContext);
  if (!ctx) {
    throw new Error("usePurchases must be used within a PurchaseProvider");
  }
  return ctx;
}
