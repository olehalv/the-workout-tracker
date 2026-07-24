import { useEffect, useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { Button, GlassPressable, Input, ScreenHeader, SectionLabel } from "../components/ui";
import { theme } from "../theme";
import { MUSCLE_GROUPS } from "../workouts/defaultExercises";
import type { LibraryExercise } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutContext";

// Pass `exercise` to edit, or null to create. In create mode with `onCreated`,
// the final step offers "Create & add", handing the new exercise back to the caller.
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
        <ScreenHeader
          title={isEdit ? "Edit exercise" : "New exercise"}
          titleSize={22}
          action={{ label: "Cancel", onPress: onClose }}
          style={styles.header}
        />

        <SectionLabel style={styles.label}>Name</SectionLabel>
        <Input
          style={styles.input}
          placeholder="e.g. Bulgarian Split Squat"
          value={name}
          onChangeText={setName}
          autoFocus={!isEdit}
          autoCorrect={false}
          returnKeyType="done"
        />

        <SectionLabel style={styles.label}>Muscle groups</SectionLabel>
        <View style={styles.chips}>
          {MUSCLE_GROUPS.map((group) => {
            const selected = groups.includes(group);
            return (
              <GlassPressable
                key={group}
                onPress={() => toggleGroup(group)}
                tint={selected ? theme.colors.accent : undefined}
                surfaceStyle={[styles.chip, !selected && styles.chipBorder]}
                fallbackStyle={selected ? styles.chipSelected : styles.chipUnselected}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{group}</Text>
              </GlassPressable>
            );
          })}
        </View>

        {isEdit ? (
          <>
            <Button title="Save changes" disabled={!canSave} onPress={doSave} />
            <Button
              title="Delete exercise"
              variant="danger"
              onPress={confirmDelete}
              style={styles.gapTop}
            />
          </>
        ) : (
          <>
            <Button
              title={onCreated ? "Create & add" : "Create exercise"}
              disabled={!canSave}
              onPress={() => doCreate(onCreated !== undefined)}
            />
            {onCreated ? (
              <Button
                title="Create only"
                variant="secondary"
                disabled={!canSave}
                onPress={() => doCreate(false)}
                style={styles.gapTop}
              />
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
    marginBottom: theme.space(6),
  },
  label: {
    marginBottom: theme.space(2),
  },
  input: {
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
  },
  chipBorder: {
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipUnselected: {
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: theme.colors.onAccent,
  },
  gapTop: {
    marginTop: theme.space(2),
  },
});
