import { usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRestTimer } from "../workouts/RestTimerContext";
import { useWorkouts } from "../workouts/WorkoutContext";
import { RestPill } from "./RestPill";
import { ResumeBar } from "./ResumeBar";

// Floating controls above the native tab bar while a workout is minimized: the rest
// countdown takes priority; otherwise a Resume control (hidden on the Workouts tab at
// "/", which has its own Resume button). Native tabs don't expose their bar height, so
// this floats above an estimate — tune TAB_BAR_ESTIMATE if it sits too high/low.
const TAB_BAR_ESTIMATE = 56;

const TAB_ROUTES = new Set(["/", "/templates", "/exercises", "/profile"]);

export function MinimizedWorkoutBar() {
  const { active } = useWorkouts();
  const { running } = useRestTimer();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  if (!active || !TAB_ROUTES.has(pathname)) return null;

  const content = running ? <RestPill /> : pathname !== "/" ? <ResumeBar /> : null;
  if (!content) return null;

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_ESTIMATE }]}
      pointerEvents="box-none"
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});
