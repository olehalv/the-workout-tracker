import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";
import { GlassPressable } from "./ui";

export function ExerciseListRow({
  name,
  meta,
  onPress,
  showAdd = false,
}: {
  name: string;
  meta: string;
  onPress: () => void;
  showAdd?: boolean;
}) {
  return (
    <GlassPressable onPress={onPress} surfaceStyle={styles.row} fallbackStyle={styles.rowSolid}>
      <View style={styles.main}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      {showAdd ? <Text style={styles.plus}>+</Text> : null}
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
  plus: {
    color: theme.colors.accent,
    fontSize: 24,
    fontWeight: "600",
    paddingHorizontal: theme.space(2),
  },
});
