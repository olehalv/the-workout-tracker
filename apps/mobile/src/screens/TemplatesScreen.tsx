import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Button, Card, ScreenHeader } from "../components/ui";
import { tabScrollClearance } from "../navigation/tabBar";
import { theme } from "../theme";
import type { WorkoutPreset } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutContext";
import { PresetFormModal } from "./PresetFormModal";

function totalPresetSets(p: WorkoutPreset): number {
  return p.exercises.reduce((n, e) => n + e.sets, 0);
}

export function TemplatesScreen() {
  const { presets, active, startWorkoutFromPreset } = useWorkouts();
  const [editing, setEditing] = useState<WorkoutPreset | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <View style={styles.container}>
      <ScreenHeader eyebrow="Reusable" title="Templates" style={styles.header} />

      <Button
        title="+ New template"
        variant="dashed"
        onPress={() => setCreating(true)}
        style={styles.addBtn}
      />

      {active ? (
        <Text style={styles.banner}>Finish your current workout to start a template.</Text>
      ) : null}

      <FlatList
        showsVerticalScrollIndicator={false}
        data={presets}
        keyExtractor={(p) => p.id}
        style={styles.list}
        contentContainerStyle={[
          presets.length === 0 ? styles.emptyWrap : styles.listContent,
          tabScrollClearance,
        ]}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No templates yet. Create one, or save a workout as a template.
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              {item.exercises.length} exercise{item.exercises.length === 1 ? "" : "s"} ·{" "}
              {totalPresetSets(item)} sets
            </Text>
            <Text style={styles.cardPreview} numberOfLines={2}>
              {item.exercises.map((e) => e.name).join(" · ")}
            </Text>
            <View style={styles.cardActions}>
              <Button
                title="Start"
                icon="play"
                size="sm"
                disabled={active !== null}
                onPress={() => startWorkoutFromPreset(item)}
                style={styles.action}
              />
              <Button
                title="Edit"
                icon="create-outline"
                variant="secondary"
                size="sm"
                onPress={() => setEditing(item)}
                style={styles.action}
              />
            </View>
          </Card>
        )}
      />

      <PresetFormModal
        visible={creating || editing !== null}
        preset={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(12),
    paddingBottom: theme.space(4),
  },
  header: {
    marginBottom: theme.space(6),
  },
  addBtn: {
    marginBottom: theme.space(4),
  },
  banner: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.space(3),
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: theme.space(2),
    paddingBottom: theme.space(6),
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
  cardName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  cardMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
  cardPreview: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: theme.space(2),
  },
  cardActions: {
    flexDirection: "row",
    gap: theme.space(3),
    marginTop: theme.space(4),
  },
  action: {
    flex: 1,
  },
});
