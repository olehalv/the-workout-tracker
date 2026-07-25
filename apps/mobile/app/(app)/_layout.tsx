import { Redirect, router, Stack } from "expo-router";
import { type ReactNode, useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../../src/auth/AuthContext";
import { MinimizedWorkoutBar } from "../../src/components/MinimizedWorkoutBar";
import { modalStackOptions } from "../../src/navigation/headerOptions";
import { PurchaseProvider } from "../../src/purchases/PurchaseContext";
import { theme } from "../../src/theme";
import { RestTimerProvider } from "../../src/workouts/RestTimerContext";
import { TemplateDraftProvider } from "../../src/workouts/TemplateDraftContext";
import { useWorkouts, WorkoutProvider } from "../../src/workouts/WorkoutContext";

export const unstable_settings = {
  anchor: "(tabs)",
};

function RestTimer({ children }: { children: ReactNode }) {
  const { restDuration, setRestDuration } = useWorkouts();
  return (
    <RestTimerProvider duration={restDuration} onDurationChange={setRestDuration}>
      {children}
    </RestTimerProvider>
  );
}

function ActiveWorkoutRestore() {
  const { isLoaded, active, minimized } = useWorkouts();
  const done = useRef(false);

  useEffect(() => {
    if (!isLoaded || done.current) return;
    done.current = true;
    if (active && !minimized) router.push("/workout");
  }, [isLoaded, active, minimized]);

  return null;
}

export default function AppLayout() {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={theme.colors.textMuted} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  return (
    <PurchaseProvider>
      <WorkoutProvider>
        <TemplateDraftProvider>
          <RestTimer>
            <View style={styles.fill}>
              <Stack screenOptions={modalStackOptions}>
                {/* The tabs carry a Stack per tab, so this one must not draw a bar over them. */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="workout"
                  options={{ presentation: "fullScreenModal", gestureEnabled: false }}
                />
                <Stack.Screen
                  name="summary"
                  options={{ presentation: "fullScreenModal", gestureEnabled: false }}
                />
                <Stack.Screen name="workout-detail" options={{ presentation: "modal" }} />
                <Stack.Screen
                  name="exercise-picker"
                  options={{ presentation: "modal", headerShown: false }}
                />
                <Stack.Screen name="exercise-form" options={{ presentation: "modal" }} />
                <Stack.Screen name="exercise-progress" options={{ presentation: "modal" }} />
                <Stack.Screen name="template-picker" options={{ presentation: "modal" }} />
                <Stack.Screen name="template-form" options={{ presentation: "modal" }} />
                <Stack.Screen
                  name="paywall"
                  options={{
                    headerShown: false,
                    presentation: "formSheet",
                    sheetAllowedDetents: "fitToContents",
                    sheetGrabberVisible: true,
                    sheetCornerRadius: theme.radius.lg,
                    contentStyle: { backgroundColor: theme.colors.surface },
                  }}
                />
              </Stack>
              <MinimizedWorkoutBar />
              <ActiveWorkoutRestore />
            </View>
          </RestTimer>
        </TemplateDraftProvider>
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
