import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, common, HeaderButton } from "../../src/components/ui";
import { theme } from "../../src/theme";
import { useTemplateDraft } from "../../src/workouts/TemplateDraftContext";
import type { WorkoutPreset } from "../../src/workouts/types";
import { useWorkouts } from "../../src/workouts/WorkoutContext";

function totalPresetSets(p: WorkoutPreset): number {
  return p.exercises.reduce((n, e) => n + e.sets, 0);
}

export default function TemplatePickerRoute() {
  const { presets, startWorkoutFromPreset } = useWorkouts();
  const draft = useTemplateDraft();

  const start = (p: WorkoutPreset) => {
    startWorkoutFromPreset(p);
    router.dismissTo("/workout");
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Start from template",
          headerLeft: () => <HeaderButton label="Back" onPress={() => router.back()} />,
        }}
      />

      <Button
        title="+ New template"
        variant="dashed"
        onPress={() => draft.openNew()}
        style={styles.addBtn}
      />

      <FlatList
        showsVerticalScrollIndicator={false}
        data={presets}
        keyExtractor={(p) => p.id}
        contentContainerStyle={presets.length === 0 ? styles.emptyWrap : styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No templates yet. Create one to start workouts from a saved plan.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [common.surface, styles.row, pressed && common.pressed]}
            onPress={() => start(item)}
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {item.exercises.length} exercise{item.exercises.length === 1 ? "" : "s"} ·{" "}
                {totalPresetSets(item)} sets
              </Text>
            </View>
            <Ionicons name="play-circle" size={28} color={theme.colors.accent} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(4),
  },
  addBtn: {
    marginBottom: theme.space(4),
  },
  listContent: {
    paddingBottom: theme.space(10),
    gap: theme.space(2),
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(4),
  },
  rowMain: {
    flex: 1,
  },
  rowName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  rowMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: theme.space(1),
  },
});
