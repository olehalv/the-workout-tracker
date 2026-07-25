import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "../../theme";
import { common } from "./common";

// Rendered inside the real UINavigationBar by native-stack's headerLeft/headerRight.
export function HeaderButton({
  label,
  onPress,
  prominent,
  disabled,
}: {
  label: string;
  onPress: () => void;
  prominent?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={12}
      style={({ pressed }) => pressed && common.pressed}
    >
      <Text style={[styles.label, prominent && styles.prominent, disabled && styles.disabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    paddingHorizontal: theme.space(2),
    color: theme.colors.accent,
    fontSize: 17,
  },
  prominent: {
    fontWeight: "600",
  },
  disabled: {
    color: theme.colors.textMuted,
  },
});
