import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { loadJSON, STORAGE_KEYS, saveJSON } from "../storage/storage";
import { PRO_TRIAL_DAYS, purchaseProSubscription } from "./iap";
import { PaywallSheet } from "./PaywallSheet";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local record of the device's Pro entitlement. Source of truth is StoreKit in
 * a real build; here it persists the (simulated) purchase so Pro survives reload. */
export interface ProSubscription {
  /** "trial" during the free period, "active" once it would convert to paid. */
  status: "none" | "trial" | "active";
  /** When the subscription/trial began (ms epoch), or null when never bought. */
  startedAt: number | null;
  /** When the free trial ends (ms epoch), or null. */
  trialEndsAt: number | null;
}

const NONE: ProSubscription = { status: "none", startedAt: null, trialEndsAt: null };

interface PurchaseContextValue {
  /** True if this device has Pro — via the server plan OR a local subscription. */
  isPro: boolean;
  subscription: ProSubscription;
  /** Whole days left in the free trial (0 once it has converted). */
  trialDaysLeft: number;
  /** Open the paywall / subscribe sheet. */
  openPaywall: () => void;
  /** Run the purchase (called by the paywall sheet). Returns success. */
  subscribe: () => Promise<boolean>;
  /** Show how to cancel/manage the subscription. */
  manageSubscription: () => void;
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<ProSubscription>(NONE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Restore any prior (simulated) purchase on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadJSON<ProSubscription>(STORAGE_KEYS.subscription, NONE);
      if (cancelled) return;
      // Promote an expired trial to "active" — a real trial auto-converts to paid.
      const next =
        stored.status === "trial" && stored.trialEndsAt !== null && Date.now() >= stored.trialEndsAt
          ? { ...stored, status: "active" as const }
          : stored;
      setSubscription(next);
      setIsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoaded) saveJSON(STORAGE_KEYS.subscription, subscription);
  }, [isLoaded, subscription]);

  const openPaywall = useCallback(() => setPaywallOpen(true), []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    const result = await purchaseProSubscription();
    if (!result.ok) {
      if (!result.canceled) {
        Alert.alert("Purchase failed", result.message ?? "Please try again.");
      }
      return false;
    }
    const now = Date.now();
    setSubscription({
      status: "trial",
      startedAt: now,
      trialEndsAt: now + PRO_TRIAL_DAYS * DAY_MS,
    });
    return true;
  }, []);

  const manageSubscription = useCallback(() => {
    Alert.alert(
      "Manage subscription",
      `Your ${PRO_TRIAL_DAYS}-day free trial is non-binding. To cancel — before or after the trial — open Settings › [your Apple Account] › Subscriptions on this device. Cancel during the trial and you're never charged.`,
      [
        { text: "OK", style: "default" },
        // Dev-only: lets you re-test the locked state in Expo Go.
        ...(__DEV__
          ? [
              {
                text: "Reset (dev)",
                style: "destructive" as const,
                onPress: () => setSubscription(NONE),
              },
            ]
          : []),
      ],
    );
  }, []);

  const serverPro = user?.plan === "pro";
  const localPro = subscription.status !== "none";

  const trialDaysLeft =
    subscription.status === "trial" && subscription.trialEndsAt !== null
      ? Math.max(0, Math.ceil((subscription.trialEndsAt - Date.now()) / DAY_MS))
      : 0;

  const value = useMemo<PurchaseContextValue>(
    () => ({
      isPro: serverPro || localPro,
      subscription,
      trialDaysLeft,
      openPaywall,
      subscribe,
      manageSubscription,
    }),
    [serverPro, localPro, subscription, trialDaysLeft, openPaywall, subscribe, manageSubscription],
  );

  return (
    <PurchaseContext.Provider value={value}>
      {children}
      <PaywallSheet
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onSubscribe={subscribe}
      />
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
