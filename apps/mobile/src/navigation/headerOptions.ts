import { DarkTheme, type Theme } from "@react-navigation/native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { theme } from "../theme";

// Header/screen colours come from here, not from per-screen headerStyle overrides:
// setting headerStyle.backgroundColor alongside a large title makes the title text
// invisible on iOS 26, and an explicit colour also opts the bar out of adapting to
// the content scrolling under it.
export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.colors.accent,
    background: theme.colors.background,
    card: theme.colors.background,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.danger,
  },
};

// Large titles make native-stack transparent the header and let iOS inset the
// screen's primary scroll view, so every tab screen's root must BE that scroll view.
export const tabStackOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerLargeTitleEnabled: true,
  headerShadowVisible: false,
};

export const modalStackOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerShadowVisible: false,
};
