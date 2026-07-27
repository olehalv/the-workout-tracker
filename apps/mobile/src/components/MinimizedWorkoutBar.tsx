import { usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRestTimer } from "../workouts/RestTimerContext";
import { useWorkouts } from "../workouts/WorkoutContext";
import { RestPill } from "./RestPill";
import { ResumeBar } from "./ResumeBar";

const TAB_BAR_ESTIMATE = 56;

const TAB_ROUTES = new Set(["/", "/templates", "/exercises", "/profile"]);

const BAR_CLEARANCE = 72;

function barVisible(active: boolean, pathname: string): boolean {
  return active && TAB_ROUTES.has(pathname);
}

export function useMinimizedBarClearance(): number {
  const { active } = useWorkouts();
  const pathname = usePathname();
  return barVisible(active !== null, pathname) ? BAR_CLEARANCE : 0;
}

export function MinimizedWorkoutBar() {
  const { active } = useWorkouts();
  const { running } = useRestTimer();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  if (!barVisible(active !== null, pathname)) return null;

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_ESTIMATE }]}
      pointerEvents="box-none"
    >
      {running ? <RestPill /> : <ResumeBar />}
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
