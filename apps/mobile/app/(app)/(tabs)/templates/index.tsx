import { router } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useMinimizedBarClearance } from "../../../../src/components/MinimizedWorkoutBar";
import { Button, Card, EmptyState, SectionLabel } from "../../../../src/components/ui";
import { theme } from "../../../../src/theme";
import { useTemplateDraft } from "../../../../src/workouts/TemplateDraftContext";
import type { WorkoutPreset } from "../../../../src/workouts/types";
import { useWorkouts } from "../../../../src/workouts/WorkoutContext";

function totalPresetSets(p: WorkoutPreset): number {
  return p.exercises.reduce((n, e) => n + e.sets, 0);
}

export default function TemplatesTab() {
  const { presets, active, startWorkoutFromPreset } = useWorkouts();
  const draft = useTemplateDraft();
  const clearance = useMinimizedBarClearance();

  const start = (preset: WorkoutPreset) => {
    startWorkoutFromPreset(preset);
    router.push("/workout");
  };

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      data={presets}
      keyExtractor={(p) => p.id}
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: clearance + theme.space(6) }]}
      ListHeaderComponent={
        <>
          <SectionLabel tone="accent">Reusable</SectionLabel>
          <Button
            title="+ New template"
            variant="dashed"
            onPress={() => draft.openNew()}
            style={styles.addBtn}
          />
          {active ? (
            <Text style={styles.banner}>Finish your current workout to start a template.</Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <EmptyState
          title="No templates yet"
          description="Create one, or save a workout as a template."
          systemImage="list.bullet.rectangle"
        />
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
              onPress={() => start(item)}
              style={styles.action}
            />
            <Button
              title="Edit"
              icon="create-outline"
              variant="secondary"
              size="sm"
              onPress={() => draft.openEditor(item)}
              style={styles.action}
            />
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: theme.gutter,
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
