import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { GlassPressable } from "../components/ui";
import { theme } from "../theme";
import { elapsedMs, formatClock, useNow } from "../workouts/time";
import { useWorkouts } from "../workouts/WorkoutContext";

export function ResumeBar() {
  const { active } = useWorkouts();
  const now = useNow(active !== null);

  if (!active) return null;

  const elapsed = elapsedMs(active.startedAt, now);
  const count = active.exercises.length;

  return (
    <View style={styles.wrap}>
      <GlassPressable
        tint={theme.colors.accent}
        surfaceStyle={styles.pill}
        fallbackStyle={styles.pillSolid}
        onPress={() => router.push("/workout")}
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
      </GlassPressable>
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
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  pillSolid: {
    backgroundColor: theme.colors.accent,
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
});
