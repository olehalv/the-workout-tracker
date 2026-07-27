import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { usePurchases } from "../purchases/PurchaseContext";
import { PRO_PRICE_LABEL, PRO_TRIAL_DAYS } from "../purchases/plans";
import { theme } from "../theme";
import { GlassPressable } from "./ui";

export function ProGate({
  locked,
  children,
  style,
  compact,
}: {
  locked: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const { entitlement, openPaywall } = usePurchases();

  if (!locked) return <View style={style}>{children}</View>;

  return (
    <View style={[styles.wrap, !compact && styles.wrapMinHeight, style]}>
      <View pointerEvents="none">{children}</View>
      <BlurView
        intensity={22}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        {!compact ? <Ionicons name="lock-closed" size={22} color={theme.colors.text} /> : null}
        <GlassPressable
          tint={theme.colors.accent}
          surfaceStyle={styles.cta}
          fallbackStyle={styles.ctaSolid}
          onPress={openPaywall}
        >
          <Text style={styles.ctaText}>
            {entitlement.trialEligible ? "Try Pro free" : `Requires Pro · ${PRO_PRICE_LABEL}`}
          </Text>
        </GlassPressable>
        {!compact ? (
          <Text style={styles.hint}>
            {entitlement.trialEligible
              ? `${PRO_TRIAL_DAYS} days free — no card required`
              : "Cancel anytime"}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.md,
  },
  wrapMinHeight: {
    minHeight: 132,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space(2),
    padding: theme.space(4),
  },
  cta: {
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  ctaSolid: {
    backgroundColor: theme.colors.accent,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  hint: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
  },
});
