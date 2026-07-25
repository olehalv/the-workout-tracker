import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import ReorderableList, {
  type ReorderableListRenderItemInfo,
  reorderItems,
  useIsActive,
  useReorderableDrag,
} from "react-native-reorderable-list";
import { ExerciseListRow } from "../../src/components/ExerciseListRow";
import { REORDER_CELL_ANIMATIONS } from "../../src/components/reorder";
import { Button, common, Input, ScreenHeader, SectionLabel } from "../../src/components/ui";
import { theme } from "../../src/theme";
import { type DraftExercise, useTemplateDraft } from "../../src/workouts/TemplateDraftContext";
import { muscleLabel } from "../../src/workouts/types";
import { useWorkouts } from "../../src/workouts/WorkoutContext";

export default function TemplateFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { library, presets, createPreset, updatePreset, deletePreset } = useWorkouts();
  const draft = useTemplateDraft();
  const [query, setQuery] = useState("");

  const preset = id ? (presets.find((p) => p.id === id) ?? null) : null;
  const isEdit = preset !== null;

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of draft.exercises) m.set(e.exerciseId, (m.get(e.exerciseId) ?? 0) + 1);
    return m;
  }, [draft.exercises]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const list = q ? library.filter((e) => e.name.toLowerCase().includes(q)) : [...library];
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [library, q]);
  const exactMatch = results.some((e) => e.name.toLowerCase() === q);

  const canSave = draft.name.trim().length > 0 && draft.exercises.length > 0;

  const save = () => {
    if (!canSave) return;
    const exercises = draft.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      sets: e.sets,
    }));
    if (preset) updatePreset(preset.id, { name: draft.name, exercises });
    else createPreset(draft.name, exercises);
    router.back();
  };

  const confirmDelete = () => {
    if (!preset) return;
    Alert.alert("Delete template", `Delete “${preset.name}”?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deletePreset(preset.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isEdit ? "Edit template" : "New template"}
        titleSize={22}
        action={{ label: "Cancel", onPress: () => router.back() }}
        style={styles.header}
      />

      <ReorderableList
        data={draft.exercises}
        keyExtractor={(e) => e.uid}
        onReorder={({ from, to }) => draft.setExercises(reorderItems(draft.exercises, from, to))}
        cellAnimations={REORDER_CELL_ANIMATIONS}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <SectionLabel style={styles.label}>Name</SectionLabel>
            <Input
              style={styles.input}
              placeholder="e.g. Push day"
              value={draft.name}
              onChangeText={draft.setName}
              autoFocus={!isEdit}
              autoCorrect={false}
              returnKeyType="done"
            />

            <SectionLabel style={styles.label}>
              Exercises{draft.exercises.length > 0 ? ` · ${draft.exercises.length}` : ""}
            </SectionLabel>
            {draft.exercises.length === 0 ? (
              <Text style={styles.hint}>Tap exercises below to add them, in order.</Text>
            ) : (
              <Text style={styles.hint}>Hold the grip to drag and reorder.</Text>
            )}
          </View>
        }
        renderItem={({ item }: ReorderableListRenderItemInfo<DraftExercise>) => (
          <SelectedRow
            item={item}
            onChangeSets={(delta) => draft.changeSets(item.uid, delta)}
            onRemove={() => draft.removeExercise(item.uid)}
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Input
              style={styles.search}
              placeholder="Search or create an exercise"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="done"
            />
            {q.length > 0 && !exactMatch ? (
              <Pressable
                style={({ pressed }) => [styles.createRow, pressed && common.pressed]}
                onPress={() =>
                  router.push({
                    pathname: "/exercise-form",
                    params: { name: query.trim(), addTo: "template" },
                  })
                }
              >
                <Text style={styles.createText}>Create “{query.trim()}”</Text>
                <Text style={styles.createHint}>Set muscle group, then create &amp; add</Text>
              </Pressable>
            ) : null}
            <View style={styles.results}>
              {results.map((item) => {
                const count = counts.get(item.id) ?? 0;
                return (
                  <ExerciseListRow
                    key={item.id}
                    name={item.name}
                    meta={`${muscleLabel(item)}${item.custom ? " · custom" : ""}${
                      count > 0 ? ` · ${count} in template` : ""
                    }`}
                    onPress={() => draft.addExercise(item.id, item.name)}
                    showAdd
                  />
                );
              })}
            </View>
          </View>
        }
      />

      <Button
        title={isEdit ? "Save template" : "Create template"}
        disabled={!canSave}
        onPress={save}
        style={styles.saveBtn}
      />
      {isEdit ? (
        <Button
          title="Delete template"
          variant="danger"
          onPress={confirmDelete}
          style={styles.gapTop}
        />
      ) : null}
    </View>
  );
}

function SelectedRow({
  item,
  onChangeSets,
  onRemove,
}: {
  item: DraftExercise;
  onChangeSets: (delta: number) => void;
  onRemove: () => void;
}) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();
  return (
    <View style={[styles.selRow, isActive && styles.selRowActive]}>
      <Pressable
        onLongPress={drag}
        delayLongPress={150}
        disabled={isActive}
        hitSlop={8}
        style={styles.dragHandle}
        accessibilityLabel="Drag to reorder exercise"
      >
        <Ionicons name="reorder-three" size={22} color={theme.colors.textMuted} />
      </Pressable>
      <Text style={styles.selName} numberOfLines={1}>
        {item.name}
      </Text>
      <View style={styles.stepper}>
        <Pressable
          style={({ pressed }) => [styles.stepBtn, pressed && common.pressed]}
          onPress={() => onChangeSets(-1)}
          hitSlop={4}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepVal}>{item.sets}</Text>
        <Pressable
          style={({ pressed }) => [styles.stepBtn, pressed && common.pressed]}
          onPress={() => onChangeSets(1)}
          hitSlop={4}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.setsUnit}>sets</Text>
      <Pressable onPress={onRemove} hitSlop={6}>
        <Text style={styles.selRemove}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(6),
    paddingBottom: theme.space(4),
  },
  header: {
    marginBottom: theme.space(4),
  },
  listContent: {
    paddingBottom: theme.space(4),
  },
  label: {
    marginBottom: theme.space(2),
    marginTop: theme.space(2),
  },
  input: {
    marginBottom: theme.space(3),
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.space(3),
  },
  selRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    marginBottom: theme.space(2),
  },
  selRowActive: {
    borderColor: theme.colors.accent,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dragHandle: {
    paddingRight: theme.space(1),
  },
  selName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  stepVal: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 18,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  setsUnit: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  selRemove: {
    color: theme.colors.danger,
    fontSize: 20,
    fontWeight: "700",
    paddingLeft: theme.space(1),
  },
  footer: {
    marginTop: theme.space(1),
  },
  results: {
    gap: theme.space(2),
  },
  search: {
    marginBottom: theme.space(2),
  },
  createRow: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
    marginBottom: theme.space(2),
  },
  createText: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  createHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
  saveBtn: {
    marginTop: theme.space(2),
  },
  gapTop: {
    marginTop: theme.space(2),
  },
});
