import Ionicons from "@expo/vector-icons/Ionicons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
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

// GlassView degrades to a background-less View off iOS 26, so gate on this and
// keep the solid styling as the fallback.
const GLASS = isLiquidGlassAvailable();

const TEXT_COLOR: Record<Variant, string> = {
  primary: theme.colors.onAccent,
  secondary: theme.colors.text,
  danger: theme.colors.danger,
  dashed: theme.colors.accent,
};

const GLASS_TINT: Record<Variant, string | undefined> = {
  primary: theme.colors.accent,
  secondary: undefined,
  danger: undefined,
  dashed: undefined,
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
  const label = (
    <>
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
    </>
  );

  // Glass can't be dimmed (opacity < 1 corrupts it), so disabled uses the solid path.
  if (GLASS && !disabled) {
    return (
      <Pressable onPress={onPress} style={style}>
        <GlassView
          isInteractive
          glassEffectStyle="regular"
          tintColor={GLASS_TINT[variant]}
          style={[
            styles.base,
            size === "sm" ? styles.glassSizeSm : styles.sizeMd,
            variant !== "primary" && styles.glassBorder,
            variant === "dashed" && styles.glassDashed,
          ]}
        >
          {label}
        </GlassView>
      </Pressable>
    );
  }

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
      {label}
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
    overflow: "hidden",
  },
  sizeMd: {
    paddingVertical: theme.space(4),
    paddingHorizontal: theme.space(5),
  },
  sizeSm: {
    paddingVertical: theme.space(3),
    paddingHorizontal: theme.space(4),
    borderRadius: theme.radius.sm,
  },
  glassSizeSm: {
    paddingVertical: theme.space(3),
    paddingHorizontal: theme.space(4),
    borderRadius: theme.radius.sm,
  },
  glassBorder: {
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glassDashed: {
    borderStyle: "dashed",
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
