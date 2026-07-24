import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { theme } from "../../theme";

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

// `buttons`: standalone pills in a row. `pill`: a single grouped control (settings-style).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant = "buttons",
  stretch = variant === "buttons",
  tone = "surface",
  style,
}: {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T | null;
  onChange: (key: T) => void;
  variant?: "buttons" | "pill";
  stretch?: boolean;
  // Pill background — use "background" when the control sits on a surface card.
  tone?: "surface" | "background";
  style?: StyleProp<ViewStyle>;
}) {
  const grouped = variant === "pill";
  return (
    <View
      style={[
        grouped ? styles.pillWrap : styles.buttonsWrap,
        grouped && tone === "background" && styles.pillOnSurface,
        style,
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              grouped ? styles.pillBtn : styles.button,
              stretch && styles.stretch,
              active && (grouped ? styles.pillActive : styles.buttonActive),
            ]}
          >
            <Text
              style={[grouped ? styles.pillText : styles.buttonText, active && styles.textActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonsWrap: {
    flexDirection: "row",
    gap: theme.space(2),
  },
  button: {
    alignItems: "center",
    paddingVertical: theme.space(3),
    borderRadius: theme.radius.md,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.surface,
  },
  buttonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  pillWrap: {
    flexDirection: "row",
    gap: theme.space(1),
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: 2,
  },
  pillOnSurface: {
    backgroundColor: theme.colors.background,
  },
  pillBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(1),
    borderRadius: theme.radius.sm,
  },
  pillActive: {
    backgroundColor: theme.colors.accent,
  },
  pillText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  stretch: {
    flex: 1,
  },
  textActive: {
    color: theme.colors.onAccent,
  },
});
