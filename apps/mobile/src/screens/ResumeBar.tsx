import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";
import { elapsedMs, formatClock, useNow } from "../workouts/time";
import { useWorkouts } from "../workouts/WorkoutContext";

/**
 * Floating "Resume workout" control shown on the tab screens (except Workouts,
 * which has its own resume button) while a workout is minimized. Displays the
 * live elapsed time and jumps back into the workout on tap. The rest-timer pill
 * takes priority over this — see AppTabs.
 */
export function ResumeBar() {
  const { active, resumeWorkout } = useWorkouts();
  const now = useNow(active !== null);

  if (!active) return null;

  const elapsed = elapsedMs(active.startedAt, now);
  const count = active.exercises.length;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        onPress={resumeWorkout}
        accessibilityRole="button"
        accessibilityLabel={`Resume workout. ${formatClock(elapsed)} elapsed.`}
      >
        <Ionicons name="barbell" size={18} color="#FFFFFF" />
        <View style={styles.text}>
          <Text style={styles.label}>Resume workout</Text>
          <Text style={styles.sub}>
            {count} exercise{count === 1 ? "" : "s"} in progress
          </Text>
        </View>
        <Text style={styles.time}>{formatClock(elapsed)}</Text>
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
    gap: theme.space(3),
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  text: {
    flex: 1,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  sub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  time: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  pressed: {
    opacity: 0.85,
  },
});
