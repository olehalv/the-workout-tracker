import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { GlassPressable } from "../../src/components/ui";
import { usePurchases } from "../../src/purchases/PurchaseContext";
import {
  DEFAULT_PLAN,
  PLAN_OPTIONS,
  PRO_TRIAL_DAYS,
  type ProPlan,
} from "../../src/purchases/plans";
import { theme } from "../../src/theme";

const PERKS = [
  "Full top-set progression charts",
  "Complete per-exercise history",
  "Muscle-activity body map",
  "Strength ratings for every lift",
];

// Two states by trial eligibility: eligible → one-tap no-card trial; used up →
// the plan picker → Stripe Checkout (payment does not go through the App Store).
export default function PaywallRoute() {
  const { entitlement, startFreeTrial, subscribe, busy } = usePurchases();
  const [plan, setPlan] = useState<ProPlan>(DEFAULT_PLAN);
  const [showPlans, setShowPlans] = useState(false);

  const offerTrial = entitlement.trialEligible && !showPlans;

  const close = () => router.back();

  const handlePrimary = async () => {
    const ok = offerTrial ? await startFreeTrial() : await subscribe(plan);
    if (ok) close();
  };

  return (
    <View style={styles.sheet}>
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
                  {option.caption ? <Text style={styles.planCaption}>{option.caption}</Text> : null}
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

      <GlassPressable
        tint={theme.colors.accent}
        disabled={busy}
        onPress={handlePrimary}
        style={styles.ctaWrap}
        surfaceStyle={styles.cta}
        fallbackStyle={styles.ctaSolid}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.ctaText}>
            {offerTrial ? `Start ${PRO_TRIAL_DAYS}-day free trial` : "Continue to payment"}
          </Text>
        )}
      </GlassPressable>

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

      <Pressable onPress={busy ? undefined : close} hitSlop={8} style={styles.notNow}>
        <Text style={styles.notNowText}>Not now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(6),
    paddingBottom: theme.space(10),
    alignItems: "center",
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
  ctaWrap: {
    alignSelf: "stretch",
  },
  cta: {
    alignSelf: "stretch",
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(4),
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  ctaSolid: {
    backgroundColor: theme.colors.accent,
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
