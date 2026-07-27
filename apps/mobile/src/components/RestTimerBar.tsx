import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { GlassPressable } from "../components/ui";
import { theme } from "../theme";
import { REST_STEP, type RestTimer } from "../workouts/RestTimerContext";

const CONTROL_SIZE = 40;
const ICON_SIZE = 18;

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RestTimerBar({ timer }: { timer: RestTimer }) {
  const { running, paused, remaining, duration, start, pause, resume, skip, addTime, setDuration } =
    timer;

  const active = running || paused;
  const step = (delta: number) => (active ? addTime(delta) : setDuration(duration + delta));
  const pct = active && duration > 0 ? Math.min(100, (remaining / duration) * 100) : 100;

  return (
    <View style={styles.bar}>
      <GlassPressable
        surfaceStyle={styles.step}
        onPress={skip}
        disabled={!active}
        accessibilityLabel="Stop rest"
      >
        <Ionicons
          name="stop"
          size={ICON_SIZE}
          color={active ? theme.colors.text : theme.colors.textMuted}
        />
      </GlassPressable>

      <GlassPressable
        surfaceStyle={styles.step}
        onPress={() => step(-REST_STEP)}
        accessibilityLabel="Shorter rest"
      >
        <Text style={styles.stepText}>−{REST_STEP}</Text>
      </GlassPressable>

      <View style={styles.center}>
        <Text style={styles.time}>{fmt(active ? remaining : duration)}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </View>

      <GlassPressable
        surfaceStyle={styles.step}
        onPress={() => step(REST_STEP)}
        accessibilityLabel="Longer rest"
      >
        <Text style={styles.stepText}>+{REST_STEP}</Text>
      </GlassPressable>

      <GlassPressable
        tint={theme.colors.accent}
        surfaceStyle={styles.accentBtn}
        fallbackStyle={styles.accentSolid}
        onPress={running ? pause : paused ? resume : () => start()}
        accessibilityLabel={running ? "Pause rest" : paused ? "Resume rest" : "Start rest"}
      >
        <Ionicons
          name={running ? "pause" : "play"}
          size={ICON_SIZE}
          color={theme.colors.onAccent}
        />
      </GlassPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
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
  step: {
    minWidth: CONTROL_SIZE,
    height: CONTROL_SIZE,
    paddingHorizontal: theme.space(2),
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  accentBtn: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: theme.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  accentSolid: {
    backgroundColor: theme.colors.accent,
  },
});
