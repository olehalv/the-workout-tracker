import {
  DarkTheme,
  type NativeStackHeaderItem,
  type NativeStackNavigationOptions,
  router,
  type Theme,
} from "expo-router";
import { theme } from "../theme";

export const backHeaderItems = (): NativeStackHeaderItem[] => [
  { type: "button", label: "Back", onPress: () => router.back() },
];

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

export const tabStackOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerLargeTitleEnabled: true,
  headerShadowVisible: false,
};

export const modalStackOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerShadowVisible: false,
};
