import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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

/** A selected exercise while editing — a preset exercise plus a local instance
 *  id so the same library exercise can appear multiple times. */
type SelItem = PresetExercise & { uid: string };

let uidSeq = 0;
const makeUid = () => `sel-${Date.now()}-${uidSeq++}`;

/**
 * Create or edit a workout preset (template): name it and pick an ordered set of
 * library exercises (search or create new), each with a target number of sets.
 * Pass `preset` to edit; otherwise it creates, optionally seeded with
 * `initialExercises` (e.g. "save workout as template").
 */
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
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(null);

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

  // How many times each library exercise is currently in the template.
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
  const move = (index: number, dir: -1 | 1) => {
    setSelected((cur) => {
      const j = index + dir;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const onExerciseCreated = (ex: LibraryExercise) => {
    add(ex.id, ex.name);
    setQuery("");
  };

  const canSave = name.trim().length > 0 && selected.length > 0;

  const save = () => {
    if (!canSave) return;
    // Drop the local instance ids before persisting.
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{isEdit ? "Edit template" : "New template"}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>

        <FlatList
          data={results}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Push day"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus={!isEdit}
                autoCorrect={false}
                returnKeyType="done"
              />

              <Text style={styles.label}>
                Exercises{selected.length > 0 ? ` · ${selected.length}` : ""}
              </Text>
              {selected.length === 0 ? (
                <Text style={styles.hint}>Tap exercises below to add them, in order.</Text>
              ) : (
                <View style={styles.selList}>
                  {selected.map((e, i) => (
                    <View key={e.uid} style={styles.selRow}>
                      <View style={styles.reorder}>
                        <Pressable
                          disabled={i === 0}
                          onPress={() => move(i, -1)}
                          hitSlop={4}
                          style={styles.reorderBtn}
                        >
                          <Ionicons
                            name="chevron-up"
                            size={16}
                            color={i === 0 ? theme.colors.border : theme.colors.textMuted}
                          />
                        </Pressable>
                        <Pressable
                          disabled={i === selected.length - 1}
                          onPress={() => move(i, 1)}
                          hitSlop={4}
                          style={styles.reorderBtn}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={16}
                            color={
                              i === selected.length - 1
                                ? theme.colors.border
                                : theme.colors.textMuted
                            }
                          />
                        </Pressable>
                      </View>
                      <Text style={styles.selName} numberOfLines={1}>
                        {e.name}
                      </Text>
                      <View style={styles.stepper}>
                        <Pressable
                          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
                          onPress={() => changeSets(e.uid, -1)}
                          hitSlop={4}
                        >
                          <Text style={styles.stepText}>−</Text>
                        </Pressable>
                        <Text style={styles.stepVal}>{e.sets}</Text>
                        <Pressable
                          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
                          onPress={() => changeSets(e.uid, 1)}
                          hitSlop={4}
                        >
                          <Text style={styles.stepText}>+</Text>
                        </Pressable>
                      </View>
                      <Text style={styles.setsUnit}>sets</Text>
                      <Pressable onPress={() => removeAt(e.uid)} hitSlop={6}>
                        <Text style={styles.selRemove}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <TextInput
                style={styles.search}
                placeholder="Search or create an exercise"
                placeholderTextColor={theme.colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                returnKeyType="done"
              />
              {q.length > 0 && !exactMatch ? (
                <Pressable
                  style={({ pressed }) => [styles.createRow, pressed && styles.pressed]}
                  onPress={() => setCreatingExercise(true)}
                >
                  <Text style={styles.createText}>Create “{query.trim()}”</Text>
                  <Text style={styles.createHint}>Set muscle group, then create &amp; add</Text>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const count = counts.get(item.id) ?? 0;
            return (
              <View style={styles.row}>
                <Pressable style={styles.rowMain} onPress={() => add(item.id, item.name)}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowCategory}>
                    {muscleLabel(item)}
                    {item.custom ? " · custom" : ""}
                    {count > 0 ? ` · ${count} in template` : ""}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                  onPress={() => setEditingExercise(item)}
                  hitSlop={6}
                >
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => add(item.id, item.name)} hitSlop={6}>
                  <Text style={styles.plus}>+</Text>
                </Pressable>
              </View>
            );
          }}
        />

        <Pressable
          disabled={!canSave}
          style={({ pressed }) => [
            styles.save,
            !canSave && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={save}
        >
          <Text style={styles.saveText}>{isEdit ? "Save template" : "Create template"}</Text>
        </Pressable>
        {isEdit ? (
          <Pressable
            style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
            onPress={confirmDelete}
          >
            <Text style={styles.deleteText}>Delete template</Text>
          </Pressable>
        ) : null}

        <ExerciseFormModal
          visible={creatingExercise || editingExercise !== null}
          exercise={editingExercise}
          initialName={query.trim()}
          onCreated={onExerciseCreated}
          onClose={() => {
            setCreatingExercise(false);
            setEditingExercise(null);
          }}
        />
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
    paddingBottom: theme.space(4),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space(4),
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  cancel: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: theme.space(4),
    gap: theme.space(2),
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.space(2),
    marginTop: theme.space(2),
  },
  input: {
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
    fontSize: 16,
    marginBottom: theme.space(3),
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.space(3),
  },
  selList: {
    gap: theme.space(2),
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
  },
  reorder: {
    alignItems: "center",
  },
  reorderBtn: {
    paddingVertical: 1,
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
  search: {
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
    fontSize: 16,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  rowMain: {
    flex: 1,
  },
  editBtn: {
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  editText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  rowName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  rowCategory: {
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
  save: {
    alignItems: "center",
    paddingVertical: theme.space(4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    marginTop: theme.space(2),
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  delete: {
    alignItems: "center",
    paddingVertical: theme.space(4),
    marginTop: theme.space(2),
    borderRadius: theme.radius.md,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteText: {
    color: theme.colors.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
