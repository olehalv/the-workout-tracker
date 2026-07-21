import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";
import { REST_STEP, type RestTimer } from "../workouts/RestTimerContext";

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Rest-timer control shown above the workout footer. Idle: pick a length and
 * start. Running: a countdown with a progress bar, ±15s, and skip.
 */
export function RestTimerBar({ timer }: { timer: RestTimer }) {
  const { running, remaining, duration, start, skip, addTime, setDuration } = timer;

  if (running) {
    const pct = Math.min(100, duration > 0 ? (remaining / duration) * 100 : 0);
    return (
      <View style={styles.bar}>
        <Pressable
          style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          onPress={() => addTime(-REST_STEP)}
        >
          <Text style={styles.stepText}>−15</Text>
        </Pressable>

        <View style={styles.center}>
          <Text style={styles.time}>{fmt(remaining)}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          onPress={() => addTime(REST_STEP)}
        >
          <Text style={styles.stepText}>+15</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.skip, pressed && styles.pressed]} onPress={skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <Text style={styles.label}>Rest</Text>
      <Pressable
        style={({ pressed }) => [styles.step, pressed && styles.pressed]}
        onPress={() => setDuration(duration - REST_STEP)}
      >
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text style={styles.durationText}>{fmt(duration)}</Text>
      <Pressable
        style={({ pressed }) => [styles.step, pressed && styles.pressed]}
        onPress={() => setDuration(duration + REST_STEP)}
      >
        <Text style={styles.stepText}>+</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.start, pressed && styles.pressed]}
        onPress={() => start()}
      >
        <Text style={styles.startText}>Start rest</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginRight: "auto",
  },
  center: {
    flex: 1,
    alignItems: "center",
    gap: theme.space(1),
  },
  time: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  track: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: theme.colors.accent,
  },
  durationText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    minWidth: 52,
    textAlign: "center",
  },
  step: {
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 44,
    alignItems: "center",
  },
  stepText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  start: {
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
  },
  startText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  skip: {
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent,
  },
  skipText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.6,
  },
});
