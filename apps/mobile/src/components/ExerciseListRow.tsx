import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";
import { GlassPressable } from "./ui";

export function ExerciseListRow({
  name,
  meta,
  onPress,
  selected,
}: {
  name: string;
  meta: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <GlassPressable
      onPress={onPress}
      surfaceStyle={[styles.row, selected && styles.rowSelected]}
      fallbackStyle={styles.rowSolid}
    >
      <View style={styles.main}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      {selected !== undefined ? (
        <Ionicons
          name={selected ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={selected ? theme.colors.accent : theme.colors.border}
        />
      ) : null}
    </GlassPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    borderRadius: theme.radius.md,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  rowSelected: {
    borderColor: theme.colors.accent,
  },
  rowSolid: {
    backgroundColor: theme.colors.surface,
  },
  main: {
    flex: 1,
  },
  name: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
});
