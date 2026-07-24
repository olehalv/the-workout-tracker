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

interface PurchaseContextValue {
  isPro: boolean;
  entitlement: Entitlement;
  trialDaysLeft: number;
  busy: boolean;
  openPaywall: () => void;
  startFreeTrial: () => Promise<boolean>;
  subscribe: (plan: ProPlan) => Promise<boolean>;
  manageSubscription: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

// Stripe's webhook (not the client) grants Pro, so after checkout we poll the
// server for the new entitlement. Two budgets: a `success` deep link back means
// a payment is likely, so wait properly; a hand-closed browser is usually a
// cancel, so don't pin it behind a long spinner. A late webhook is picked up by
// AuthContext's refresh-on-foreground.
const CONFIRM_TIMEOUT_MS = 15_000;
const CONFIRM_DISMISSED_TIMEOUT_MS = 4_000;
const CONFIRM_INTERVAL_MS = 1_500;

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const { user, token, refresh } = useAuth();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const entitlement = user?.entitlement ?? NO_ENTITLEMENT;

  const openPaywall = useCallback(() => setPaywallOpen(true), []);

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
        const returnUrl = Linking.createURL("billing/return");
        const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);

        // Poll regardless of result type: a hand-closed browser reports "dismiss"
        // but may still be a completed payment — only the server knows.
        const returnedViaDeepLink = result.type === "success";
        const unlocked = await waitForPro(
          returnedViaDeepLink ? CONFIRM_TIMEOUT_MS : CONFIRM_DISMISSED_TIMEOUT_MS,
        );

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

    // No Stripe customer exists on the no-card trial, so the portal would 409.
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
