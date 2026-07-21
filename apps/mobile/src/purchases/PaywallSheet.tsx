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
import { PRO_PRICE_LABEL, PRO_TRIAL_DAYS } from "./iap";

const PERKS = [
  "Full top-set progression charts",
  "Complete per-exercise history",
  "Muscle-activity body map",
  "Strength ratings for every lift",
];

/**
 * The subscribe sheet — a dark bottom sheet modeled on Apple's StoreKit purchase
 * confirmation. Tapping "Start free trial" runs the (simulated in Expo Go) native
 * purchase via `onSubscribe`, then unlocks Pro across the app.
 */
export function PaywallSheet({
  visible,
  onClose,
  onSubscribe,
}: {
  visible: boolean;
  onClose: () => void;
  onSubscribe: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  // Keep the modal mounted through the exit animation so it can slide back down.
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;

  // Drive the entrance/exit: backdrop fades in place, sheet slides up — so the
  // scrim no longer travels with the sheet (Modal's own "slide" moved both).
  useEffect(() => {
    if (visible) {
      setBusy(false);
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

  const handleSubscribe = async () => {
    setBusy(true);
    const ok = await onSubscribe();
    setBusy(false);
    if (ok) onClose();
  };

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [520, 0] });

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
            {PRO_TRIAL_DAYS} days free, then {PRO_PRICE_LABEL}
          </Text>

          <View style={styles.perks}>
            {PERKS.map((p) => (
              <View key={p} style={styles.perkRow}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                <Text style={styles.perkText}>{p}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.cta, (pressed || busy) && styles.ctaPressed]}
            onPress={handleSubscribe}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>Start {PRO_TRIAL_DAYS}-day free trial</Text>
            )}
          </Pressable>

          <Text style={styles.fineprint}>
            Free for {PRO_TRIAL_DAYS} days, then {PRO_PRICE_LABEL}. The trial is non-binding —
            cancel anytime in Settings › Apple Account › Subscriptions and you won't be charged. The
            subscription auto-renews monthly until canceled.
          </Text>

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
  notNow: {
    marginTop: theme.space(5),
  },
  notNowText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
});
