import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { theme } from "../../theme";
import { common } from "./common";

type Variant = "primary" | "secondary" | "danger" | "dashed";
type Size = "md" | "sm";

const TEXT_COLOR: Record<Variant, string> = {
  primary: theme.colors.onAccent,
  secondary: theme.colors.text,
  danger: theme.colors.danger,
  dashed: theme.colors.accent,
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  icon,
  style,
  textStyle,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.sizeSm : styles.sizeMd,
        styles[variant],
        disabled && common.disabled,
        pressed && common.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={TEXT_COLOR[variant]} /> : null}
      <Text
        style={[
          styles.text,
          size === "sm" && styles.textSm,
          { color: TEXT_COLOR[variant] },
          variant === "primary" && styles.textStrong,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space(2),
    borderRadius: theme.radius.md,
  },
  sizeMd: {
    paddingVertical: theme.space(4),
  },
  sizeSm: {
    paddingVertical: theme.space(3),
    borderRadius: theme.radius.sm,
  },
  primary: {
    backgroundColor: theme.colors.accent,
  },
  secondary: {
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.surface,
  },
  danger: {
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dashed: {
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    backgroundColor: theme.colors.surface,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  textSm: {
    fontSize: 15,
  },
  textStrong: {
    fontWeight: "700",
  },
});
