import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { AppTabs } from "./src/navigation/AppTabs";
import { PurchaseProvider } from "./src/purchases/PurchaseContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { WorkoutScreen } from "./src/screens/WorkoutScreen";
import { WorkoutSummaryScreen } from "./src/screens/WorkoutSummaryScreen";
import { theme } from "./src/theme";
import { RestTimerProvider } from "./src/workouts/RestTimerContext";
import { useWorkouts, WorkoutProvider } from "./src/workouts/WorkoutContext";

function MainScreens() {
  const { active, minimized, summary } = useWorkouts();
  if (active && !minimized) return <WorkoutScreen />;
  if (summary) return <WorkoutSummaryScreen />;
  return <AppTabs />;
}

function Root() {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <SafeAreaView style={styles.splash}>
        <ActivityIndicator color={theme.colors.textMuted} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {user ? (
        <PurchaseProvider>
          <WorkoutProvider>
            <RestTimerProvider>
              <MainScreens />
            </RestTimerProvider>
          </WorkoutProvider>
        </PurchaseProvider>
      ) : (
        <LoginScreen />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
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
