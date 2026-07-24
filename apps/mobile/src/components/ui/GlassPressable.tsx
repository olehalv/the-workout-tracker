import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from "react-native";
import { common } from "./common";

// GlassView degrades to a background-less View off iOS 26, so gate on this and keep
// a solid fallback. Opacity < 1 corrupts glass, so disabled always uses the fallback.
export const GLASS = isLiquidGlassAvailable();

export function GlassPressable({
  onPress,
  disabled,
  tint,
  hitSlop,
  style,
  surfaceStyle,
  fallbackStyle,
  accessibilityLabel,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  tint?: string;
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
  surfaceStyle?: StyleProp<ViewStyle>;
  fallbackStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: ReactNode;
}) {
  if (GLASS && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={style}
      >
        <GlassView
          isInteractive
          glassEffectStyle="regular"
          tintColor={tint}
          style={[styles.surface, surfaceStyle]}
        >
          {children}
        </GlassView>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.surface,
        surfaceStyle,
        fallbackStyle,
        disabled && common.disabled,
        pressed && common.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: "hidden",
  },
});
