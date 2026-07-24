import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthContext";
import { PurchaseProvider } from "../../src/purchases/PurchaseContext";
import { MinimizedWorkoutBar } from "../../src/screens/MinimizedWorkoutBar";
import { WorkoutScreen } from "../../src/screens/WorkoutScreen";
import { WorkoutSummaryScreen } from "../../src/screens/WorkoutSummaryScreen";
import { theme } from "../../src/theme";
import { RestTimerProvider } from "../../src/workouts/RestTimerContext";
import { useWorkouts, WorkoutProvider } from "../../src/workouts/WorkoutContext";

// The active workout and post-workout summary take over the whole screen (hiding the
// native tab bar) by rendering in place of the tabs' <Slot>, mirroring the pre-router
// MainScreens gate. The tab bar returns once neither is showing.
function WorkoutGate() {
  const { active, minimized, summary } = useWorkouts();

  if (active && !minimized) {
    return (
      <SafeAreaView style={styles.fill}>
        <WorkoutScreen />
      </SafeAreaView>
    );
  }
  if (summary) {
    return (
      <SafeAreaView style={styles.fill}>
        <WorkoutSummaryScreen />
      </SafeAreaView>
    );
  }
  return (
    <View style={styles.fill}>
      <Slot />
      <MinimizedWorkoutBar />
    </View>
  );
}

export default function AppLayout() {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <SafeAreaView style={styles.splash}>
        <ActivityIndicator color={theme.colors.textMuted} />
      </SafeAreaView>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <PurchaseProvider>
      <WorkoutProvider>
        <RestTimerProvider>
          <WorkoutGate />
        </RestTimerProvider>
      </WorkoutProvider>
    </PurchaseProvider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  splash: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
