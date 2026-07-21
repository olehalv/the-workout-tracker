import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "../theme";
import { MUSCLE_GROUPS } from "../workouts/defaultExercises";
import type { LibraryExercise } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutContext";

/**
 * Create or edit a library exercise. Prompts for a name and a muscle group; in
 * edit mode it also offers delete. Pass `exercise` to edit, or null to create.
 * In create mode, `initialName` seeds the name field and, when `onCreated` is
 * given, the final step offers both "Create" and "Create & add" (the latter
 * hands the new exercise back to the caller to add to a workout/template).
 */
export function ExerciseFormModal({
  visible,
  exercise,
  initialName,
  onCreated,
  onClose,
}: {
  visible: boolean;
  exercise: LibraryExercise | null;
  initialName?: string;
  onCreated?: (exercise: LibraryExercise) => void;
  onClose: () => void;
}) {
  const { createExercise, updateExercise, deleteExercise } = useWorkouts();
  const [name, setName] = useState("");
  const [groups, setGroups] = useState<string[]>([]);

  const isEdit = exercise !== null;

  // Reset the form each time it opens.
  useEffect(() => {
    if (visible) {
      setName(exercise?.name ?? initialName ?? "");
      setGroups(exercise?.muscleGroups ?? []);
    }
  }, [visible, exercise, initialName]);

  const toggleGroup = (group: string) => {
    setGroups((cur) => (cur.includes(group) ? cur.filter((g) => g !== group) : [...cur, group]));
  };

  const canSave = name.trim().length > 0 && groups.length > 0;

  const doSave = () => {
    if (!canSave || !exercise) return;
    updateExercise(exercise.id, { name, muscleGroups: groups });
    onClose();
  };

  const doCreate = (addAfter: boolean) => {
    if (!canSave) return;
    const created = createExercise(name, groups);
    if (addAfter) onCreated?.(created);
    onClose();
  };

  const confirmDelete = () => {
    if (!exercise) return;
    Alert.alert("Delete exercise", `Remove “${exercise.name}” from your library?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteExercise(exercise.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{isEdit ? "Edit exercise" : "New exercise"}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Bulgarian Split Squat"
          placeholderTextColor={theme.colors.textMuted}
          value={name}
          onChangeText={setName}
          autoFocus={!isEdit}
          autoCorrect={false}
          returnKeyType="done"
        />

        <Text style={styles.label}>Muscle groups</Text>
        <View style={styles.chips}>
          {MUSCLE_GROUPS.map((group) => {
            const selected = groups.includes(group);
            return (
              <Pressable
                key={group}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleGroup(group)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{group}</Text>
              </Pressable>
            );
          })}
        </View>

        {isEdit ? (
          <>
            <Pressable
              disabled={!canSave}
              style={({ pressed }) => [
                styles.save,
                !canSave && styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={doSave}
            >
              <Text style={styles.saveText}>Save changes</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
              onPress={confirmDelete}
            >
              <Text style={styles.deleteText}>Delete exercise</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              disabled={!canSave}
              style={({ pressed }) => [
                styles.save,
                !canSave && styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={() => doCreate(onCreated !== undefined)}
            >
              <Text style={styles.saveText}>{onCreated ? "Create & add" : "Create exercise"}</Text>
            </Pressable>
            {onCreated ? (
              <Pressable
                disabled={!canSave}
                style={({ pressed }) => [
                  styles.secondary,
                  !canSave && styles.disabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => doCreate(false)}
              >
                <Text style={styles.secondaryText}>Create only</Text>
              </Pressable>
            ) : null}
          </>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space(6),
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
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.space(2),
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
    marginBottom: theme.space(6),
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space(2),
    marginBottom: theme.space(8),
  },
  chip: {
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.md,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  save: {
    alignItems: "center",
    paddingVertical: theme.space(4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondary: {
    alignItems: "center",
    paddingVertical: theme.space(4),
    marginTop: theme.space(2),
    borderRadius: theme.radius.md,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  delete: {
    alignItems: "center",
    paddingVertical: theme.space(4),
    marginTop: theme.space(3),
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
