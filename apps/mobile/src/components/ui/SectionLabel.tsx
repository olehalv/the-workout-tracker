import { type StyleProp, StyleSheet, Text, type TextStyle } from "react-native";
import { theme } from "../../theme";

export function SectionLabel({
  children,
  tone = "muted",
  style,
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent";
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.label, tone === "accent" && styles.accent, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.space(3),
  },
  accent: {
    color: theme.colors.accent,
  },
});
