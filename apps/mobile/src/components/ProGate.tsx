import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { type ReactNode, useState } from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { PaywallSheet } from "../purchases/PaywallSheet";
import { usePurchases } from "../purchases/PurchaseContext";
import { theme } from "../theme";

/**
 * Wraps Pro-only content. When `locked`, it renders the real content underneath
 * (so the user sees a teaser of what they're missing), blurs it, makes it
 * non-interactive, and overlays a lock + "Requires Pro" button that opens the
 * subscribe sheet. When unlocked it renders children untouched.
 *
 * The paywall sheet is rendered *here* (not once at the provider) so it presents
 * inside whatever modal the gate lives in — a Modal can't stack above another
 * Modal owned by an ancestor, which otherwise left the button doing nothing until
 * the surrounding screen's modal was dismissed.
 */
export function ProGate({
  locked,
  children,
  style,
  compact,
}: {
  locked: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Smaller lock chip (for tight rows) instead of the full lock + subtitle. */
  compact?: boolean;
}) {
  const { subscribe } = usePurchases();
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Unlocked: render children in the same container box, fully interactive, so
  // switching between locked/unlocked doesn't change layout.
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
          <Text style={styles.ctaText}>Requires Pro · $1/month</Text>
        </Pressable>
        {!compact ? <Text style={styles.hint}>14 days free — cancel anytime</Text> : null}
      </View>
      <PaywallSheet
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onSubscribe={subscribe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.md,
  },
  // Ensures short gated content (e.g. a single history row) still leaves room for
  // the lock + button + hint overlay so it isn't cramped/clipped.
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
