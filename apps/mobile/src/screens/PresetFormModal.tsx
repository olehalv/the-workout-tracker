import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReorderableList, {
  type ReorderableListRenderItemInfo,
  reorderItems,
  useIsActive,
  useReorderableDrag,
} from "react-native-reorderable-list";
import { ExerciseListRow } from "../components/ExerciseListRow";
import { REORDER_CELL_ANIMATIONS } from "../components/reorder";
import { Button, common, Input, ScreenHeader, SectionLabel } from "../components/ui";
import { theme } from "../theme";
import {
  DEFAULT_PRESET_SETS,
  type LibraryExercise,
  muscleLabel,
  type PresetExercise,
  type WorkoutPreset,
} from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutContext";
import { ExerciseFormModal } from "./ExerciseFormModal";

const MAX_SETS = 12;

// Local instance id so the same library exercise can appear multiple times.
type SelItem = PresetExercise & { uid: string };

let uidSeq = 0;
const makeUid = () => `sel-${Date.now()}-${uidSeq++}`;

// Pass `preset` to edit; otherwise creates, optionally seeded with `initialExercises`.
export function PresetFormModal({
  visible,
  preset,
  initialExercises,
  onClose,
}: {
  visible: boolean;
  preset: WorkoutPreset | null;
  initialExercises?: PresetExercise[];
  onClose: () => void;
}) {
  const { library, createPreset, updatePreset, deletePreset } = useWorkouts();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<SelItem[]>([]);
  const [query, setQuery] = useState("");
  const [creatingExercise, setCreatingExercise] = useState(false);

  const isEdit = preset !== null;

  useEffect(() => {
    if (visible) {
      setName(preset?.name ?? "");
      setSelected(
        (preset?.exercises ?? initialExercises ?? []).map((e) => ({ ...e, uid: makeUid() })),
      );
      setQuery("");
    }
  }, [visible, preset, initialExercises]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of selected) m.set(e.exerciseId, (m.get(e.exerciseId) ?? 0) + 1);
    return m;
  }, [selected]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const list = q ? library.filter((e) => e.name.toLowerCase().includes(q)) : [...library];
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [library, q]);
  const exactMatch = results.some((e) => e.name.toLowerCase() === q);

  const add = (exerciseId: string, exName: string) => {
    setSelected((cur) => [
      ...cur,
      { uid: makeUid(), exerciseId, name: exName, sets: DEFAULT_PRESET_SETS },
    ]);
  };
  const removeAt = (uid: string) => {
    setSelected((cur) => cur.filter((e) => e.uid !== uid));
  };
  const changeSets = (uid: string, delta: number) => {
    setSelected((cur) =>
      cur.map((e) =>
        e.uid === uid ? { ...e, sets: Math.min(MAX_SETS, Math.max(1, e.sets + delta)) } : e,
      ),
    );
  };

  const onExerciseCreated = (ex: LibraryExercise) => {
    add(ex.id, ex.name);
    setQuery("");
  };

  const canSave = name.trim().length > 0 && selected.length > 0;

  const save = () => {
    if (!canSave) return;
    const exercises = selected.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      sets: e.sets,
    }));
    if (preset) updatePreset(preset.id, { name, exercises });
    else createPreset(name, exercises);
    onClose();
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
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      {/* RN Modal detaches from the app-root GestureHandlerRootView, so the drag
          gestures need their own root here. */}
      <GestureHandlerRootView style={styles.container}>
        <ScreenHeader
          title={isEdit ? "Edit template" : "New template"}
          titleSize={22}
          action={{ label: "Cancel", onPress: onClose }}
          style={styles.header}
        />

        <ReorderableList
          data={selected}
          keyExtractor={(e) => e.uid}
          onReorder={({ from, to }) => setSelected((cur) => reorderItems(cur, from, to))}
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
                value={name}
                onChangeText={setName}
                autoFocus={!isEdit}
                autoCorrect={false}
                returnKeyType="done"
              />

              <SectionLabel style={styles.label}>
                Exercises{selected.length > 0 ? ` · ${selected.length}` : ""}
              </SectionLabel>
              {selected.length === 0 ? (
                <Text style={styles.hint}>Tap exercises below to add them, in order.</Text>
              ) : (
                <Text style={styles.hint}>Hold the grip to drag and reorder.</Text>
              )}
            </View>
          }
          renderItem={({ item }: ReorderableListRenderItemInfo<SelItem>) => (
            <SelectedRow
              item={item}
              onChangeSets={(delta) => changeSets(item.uid, delta)}
              onRemove={() => removeAt(item.uid)}
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
                  onPress={() => setCreatingExercise(true)}
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
                      onPress={() => add(item.id, item.name)}
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

        <ExerciseFormModal
          visible={creatingExercise}
          exercise={null}
          initialName={query.trim()}
          onCreated={onExerciseCreated}
          onClose={() => setCreatingExercise(false)}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

function SelectedRow({
  item,
  onChangeSets,
  onRemove,
}: {
  item: SelItem;
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
    paddingTop: theme.space(14),
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
