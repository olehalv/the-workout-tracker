import type { ReactNode } from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { theme } from "../../theme";

// Shared header for tab screens and full-screen modals. Pass `action` to get the
// right-aligned Cancel/Done text button (row layout); omit it for a plain heading.
export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  titleSize = 30,
  action,
  children,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  titleSize?: number;
  action?: { label: string; onPress: () => void };
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const heading = (
    <>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={[styles.title, { fontSize: titleSize }, eyebrow != null && styles.titleGap]}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </>
  );

  if (!action) return <View style={style}>{heading}</View>;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.rowMain}>{heading}</View>
      <Pressable onPress={action.onPress} hitSlop={8}>
        <Text style={styles.action}>{action.label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  rowMain: {
    flex: 1,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  titleGap: {
    marginTop: theme.space(2),
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: theme.space(1),
  },
  action: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: "600",
    paddingLeft: theme.space(3),
  },
});
