import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { type ReactNode, useState } from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { PaywallSheet } from "../purchases/PaywallSheet";
import { usePurchases } from "../purchases/PurchaseContext";
import { PRO_PRICE_LABEL, PRO_TRIAL_DAYS } from "../purchases/plans";
import { theme } from "../theme";

// Blurs Pro-only children and overlays a subscribe button when `locked`.
// The paywall sheet is rendered here (not at the provider) so it presents inside
// whatever modal the gate lives in — a Modal can't stack above an ancestor's Modal.
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
  const { entitlement } = usePurchases();
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Same container box when unlocked, so toggling locked doesn't shift layout.
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
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => setPaywallOpen(true)}
        >
          <Text style={styles.ctaText}>
            {entitlement.trialEligible ? "Try Pro free" : `Requires Pro · ${PRO_PRICE_LABEL}`}
          </Text>
        </Pressable>
        {!compact ? (
          <Text style={styles.hint}>
            {entitlement.trialEligible
              ? `${PRO_TRIAL_DAYS} days free — no card required`
              : "Cancel anytime"}
          </Text>
        ) : null}
      </View>
      <PaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.md,
  },
  // Room for the overlay so short gated content isn't cramped/clipped.
  wrapMinHeight: {
    minHeight: 132,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space(2),
    padding: theme.space(4),
  },
  cta: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  ctaPressed: {
    opacity: 0.85,
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
