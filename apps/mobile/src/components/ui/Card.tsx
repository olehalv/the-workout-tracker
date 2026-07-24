import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { theme } from "../../theme";
import { common } from "./common";

export function Card({
  children,
  padding = 4,
  style,
}: {
  children: ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[common.surface, { padding: theme.space(padding) }, style]}>{children}</View>;
}
