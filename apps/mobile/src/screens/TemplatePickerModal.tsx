import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, common, ScreenHeader } from "../components/ui";
import { theme } from "../theme";
import type { WorkoutPreset } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutContext";
import { PresetFormModal } from "./PresetFormModal";

function totalPresetSets(p: WorkoutPreset): number {
  return p.exercises.reduce((n, e) => n + e.sets, 0);
}

export function TemplatePickerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { presets, startWorkoutFromPreset } = useWorkouts();
  const [creating, setCreating] = useState(false);

  const start = (p: WorkoutPreset) => {
    startWorkoutFromPreset(p);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <ScreenHeader
          title="Start from template"
          titleSize={22}
          action={{ label: "Cancel", onPress: onClose }}
          style={styles.header}
        />

        <Button
          title="+ New template"
          variant="dashed"
          onPress={() => setCreating(true)}
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

        <PresetFormModal visible={creating} preset={null} onClose={() => setCreating(false)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(14),
  },
  header: {
    marginBottom: theme.space(4),
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
