import { Pressable, StyleSheet, Text } from "react-native";
import { theme } from "../../theme";
import { common } from "./common";

// Rendered inside the real UINavigationBar by native-stack's headerLeft/headerRight.
export function HeaderButton({
  label,
  onPress,
  prominent,
}: {
  label: string;
  onPress: () => void;
  prominent?: boolean;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={({ pressed }) => pressed && common.pressed}>
      <Text style={[styles.label, prominent && styles.prominent]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    color: theme.colors.accent,
    fontSize: 17,
  },
  prominent: {
    fontWeight: "600",
  },
});
