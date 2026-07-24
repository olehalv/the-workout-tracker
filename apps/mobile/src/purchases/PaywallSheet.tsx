import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "../theme";
import { usePurchases } from "./PurchaseContext";
import { DEFAULT_PLAN, PLAN_OPTIONS, PRO_TRIAL_DAYS, type ProPlan } from "./plans";

const PERKS = [
  "Full top-set progression charts",
  "Complete per-exercise history",
  "Muscle-activity body map",
  "Strength ratings for every lift",
];

// Two states by trial eligibility: eligible → one-tap no-card trial; used up →
// the plan picker → Stripe Checkout (payment does not go through the App Store).
export function PaywallSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { entitlement, startFreeTrial, subscribe, busy } = usePurchases();
  const [plan, setPlan] = useState<ProPlan>(DEFAULT_PLAN);
  const [showPlans, setShowPlans] = useState(false);
  // Keep the modal mounted through the exit animation so it can slide back down.
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;

  const offerTrial = entitlement.trialEligible && !showPlans;

  // Backdrop fades in place while the sheet slides up, so the scrim doesn't travel
  // with the sheet the way Modal's own "slide" moves both.
  useEffect(() => {
    if (visible) {
      setShowPlans(false);
      setPlan(DEFAULT_PLAN);
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  const handlePrimary = async () => {
    const ok = offerTrial ? await startFreeTrial() : await subscribe(plan);
    if (ok) onClose();
  };

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [560, 0] });

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.scrim, { opacity: anim }]}>
          <Pressable style={styles.backdropFill} onPress={busy ? undefined : onClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.grabber} />

          <View style={styles.badge}>
            <Ionicons name="barbell" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>The Workout Tracker Pro</Text>
          <Text style={styles.subtitle}>
            {offerTrial
              ? `${PRO_TRIAL_DAYS} days free — no card required`
              : "Keep every chart, stat and record"}
          </Text>

          <View style={styles.perks}>
            {PERKS.map((p) => (
              <View key={p} style={styles.perkRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                <Text style={styles.perkText}>{p}</Text>
              </View>
            ))}
          </View>

          {!offerTrial ? (
            <View style={styles.plans}>
              {PLAN_OPTIONS.map((option) => {
                const selected = option.id === plan;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.plan, selected && styles.planSelected]}
                    onPress={busy ? undefined : () => setPlan(option.id)}
                  >
                    <View style={styles.planRadio}>
                      {selected ? <View style={styles.planRadioDot} /> : null}
                    </View>
                    <View style={styles.planText}>
                      <Text style={styles.planTitle}>{option.title}</Text>
                      {option.caption ? (
                        <Text style={styles.planCaption}>{option.caption}</Text>
                      ) : null}
                    </View>
                    <View style={styles.planRight}>
                      <Text style={styles.planPrice}>{option.price}</Text>
                      {option.badge ? (
                        <View style={styles.planBadge}>
                          <Text style={styles.planBadgeText}>{option.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.cta, (pressed || busy) && styles.ctaPressed]}
            onPress={handlePrimary}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>
                {offerTrial ? `Start ${PRO_TRIAL_DAYS}-day free trial` : "Continue to payment"}
              </Text>
            )}
          </Pressable>

          <Text style={styles.fineprint}>
            {offerTrial
              ? `No payment details needed. After ${PRO_TRIAL_DAYS} days, subscribe from $0.83/month to keep Pro — otherwise it simply reverts to free.`
              : "Secure payment handled by Stripe in your browser. Cancel anytime from the Me tab; subscriptions renew until canceled."}
          </Text>

          {offerTrial ? (
            <Pressable onPress={busy ? undefined : () => setShowPlans(true)} hitSlop={8}>
              <Text style={styles.secondaryText}>Subscribe now instead</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={busy ? undefined : onClose} hitSlop={8} style={styles.notNow}>
            <Text style={styles.notNowText}>Not now</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(3),
    paddingBottom: theme.space(10),
    alignItems: "center",
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    marginBottom: theme.space(5),
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.space(4),
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
    marginTop: theme.space(2),
    textAlign: "center",
  },
  perks: {
    alignSelf: "stretch",
    gap: theme.space(3),
    marginTop: theme.space(6),
    marginBottom: theme.space(6),
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
  },
  perkText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  plans: {
    alignSelf: "stretch",
    gap: theme.space(3),
    marginBottom: theme.space(5),
  },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(3),
    paddingHorizontal: theme.space(4),
  },
  planSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  planText: {
    flex: 1,
  },
  planTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  planCaption: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  planRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  planPrice: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  planBadge: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space(2),
    paddingVertical: 2,
  },
  planBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  cta: {
    alignSelf: "stretch",
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(4),
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  fineprint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: theme.space(4),
  },
  secondaryText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginTop: theme.space(4),
    textDecorationLine: "underline",
  },
  notNow: {
    marginTop: theme.space(5),
  },
  notNowText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
});
