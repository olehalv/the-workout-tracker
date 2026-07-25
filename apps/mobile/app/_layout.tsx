import { Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth/AuthContext";
import { navigationTheme } from "../src/navigation/headerOptions";

// app.json's userInterfaceStyle only forces dark in a native build's Info.plist; in
// Expo Go (and pre-first-render) UIKit follows the device appearance, so native
// alerts and expo-glass-effect flash light. Pin the runtime interface style dark.
Appearance.setColorScheme("dark");

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Screens read insets via useSafeAreaInsets(), never <SafeAreaView>: that
          component re-measures itself natively and lands on 0 the first time a screen
          mounts inside a just-presented modal view controller (correct on reopen,
          which is what makes it look like a one-off glitch). initialMetrics seeds the
          hook synchronously so the very first frame is already inset. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider value={navigationTheme}>
          <AuthProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="login" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
