import { Host, Picker, Text as UIText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { GlassView } from "expo-glass-effect";
import type { ReactNode } from "react";
import {
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { theme } from "../../theme";
import { GLASS } from "./GlassPressable";

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

const SEGMENTED_HEIGHT = 32;

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
  tone?: "surface" | "background";
  style?: StyleProp<ViewStyle>;
}) {
  const grouped = variant === "pill";

  if (grouped && Platform.OS === "ios") {
    return (
      <Host
        style={[{ height: SEGMENTED_HEIGHT }, style]}
        matchContents={{ horizontal: !stretch, vertical: false }}
        colorScheme="dark"
        seedColor={theme.colors.accent}
      >
        <Picker
          selection={value}
          onSelectionChange={(key) => onChange(key as T)}
          modifiers={[pickerStyle("segmented")]}
        >
          {options.map((opt) => (
            <UIText key={opt.key} modifiers={[tag(opt.key)]}>
              {opt.label}
            </UIText>
          ))}
        </Picker>
      </Host>
    );
  }

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
        const label = (
          <Text
            style={[grouped ? styles.pillText : styles.buttonText, active && styles.textActive]}
          >
            {opt.label}
          </Text>
        );
        const shape = grouped ? styles.pillBtn : styles.button;

        let content: ReactNode;
        if (GLASS) {
          if (grouped) {
            content = active ? (
              <GlassView
                isInteractive
                glassEffectStyle="regular"
                tintColor={theme.colors.accent}
                style={[shape, styles.segSurface]}
              >
                {label}
              </GlassView>
            ) : (
              <View style={shape}>{label}</View>
            );
          } else {
            content = (
              <GlassView
                isInteractive
                glassEffectStyle="regular"
                tintColor={active ? theme.colors.accent : undefined}
                style={[shape, styles.segSurface, !active && styles.buttonGlassBorder]}
              >
                {label}
              </GlassView>
            );
          }
        } else {
          content = (
            <View style={[shape, active && (grouped ? styles.pillActive : styles.buttonActive)]}>
              {label}
            </View>
          );
        }

        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={stretch ? styles.stretch : undefined}
          >
            {content}
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
  segSurface: {
    overflow: "hidden",
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  buttonGlassBorder: {
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stretch: {
    flex: 1,
  },
  textActive: {
    color: theme.colors.onAccent,
  },
});
