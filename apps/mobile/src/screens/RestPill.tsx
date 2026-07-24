import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";
import { useRestTimer } from "../workouts/RestTimerContext";
import { useWorkouts } from "../workouts/WorkoutContext";

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Floating rest countdown shown on the tab screens while a workout is minimized.
export function RestPill() {
  const { active, resumeWorkout } = useWorkouts();
  const { running, remaining, skip } = useRestTimer();

  if (!active || !running) return null;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        onPress={resumeWorkout}
        accessibilityRole="button"
        accessibilityLabel={`Resting ${fmt(remaining)}. Tap to resume workout.`}
      >
        <Ionicons name="timer-outline" size={18} color="#FFFFFF" />
        <Text style={styles.label}>Resting</Text>
        <Text style={styles.time}>{fmt(remaining)}</Text>
        <View style={styles.spacer} />
        <Pressable onPress={skip} hitSlop={8} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.space(4),
    paddingBottom: theme.space(2),
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  time: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  spacer: {
    flex: 1,
  },
  skip: {
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(1),
    borderRadius: theme.radius.sm,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  skipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
});
