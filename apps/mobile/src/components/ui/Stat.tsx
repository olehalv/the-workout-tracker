import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { theme } from "../../theme";
import { common } from "./common";

export function StatGrid({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.grid, style]}>{children}</View>;
}

export function Stat({
  label,
  value,
  valueSize = 20,
  accent,
  style,
}: {
  label: string;
  value: string;
  valueSize?: number;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[common.surface, styles.tile, style]}>
      <Text style={[styles.value, { fontSize: valueSize }, accent && styles.accent]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space(3),
  },
  tile: {
    paddingVertical: theme.space(4),
    paddingHorizontal: theme.space(4),
  },
  value: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  accent: {
    color: theme.colors.accent,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
});
