import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, GlassPressable, Input, ScreenHeader, SectionLabel } from "../../src/components/ui";
import { theme } from "../../src/theme";
import { MUSCLE_GROUPS } from "../../src/workouts/defaultExercises";
import { useTemplateDraft } from "../../src/workouts/TemplateDraftContext";
import type { LibraryExercise } from "../../src/workouts/types";
import { useWorkouts } from "../../src/workouts/WorkoutContext";

type Params = {
  id?: string;
  name?: string;
  addTo?: "workout" | "template";
};

export default function ExerciseFormRoute() {
  const { id, name: initialName, addTo } = useLocalSearchParams<Params>();
  const { library, createExercise, updateExercise, deleteExercise, addExercise } = useWorkouts();
  const draft = useTemplateDraft();

  const exercise = id ? (library.find((e) => e.id === id) ?? null) : null;
  const isEdit = exercise !== null;

  const [name, setName] = useState(exercise?.name ?? initialName ?? "");
  const [groups, setGroups] = useState<string[]>(exercise?.muscleGroups ?? []);

  const toggleGroup = (group: string) => {
    setGroups((cur) => (cur.includes(group) ? cur.filter((g) => g !== group) : [...cur, group]));
  };

  const canSave = name.trim().length > 0 && groups.length > 0;

  const doSave = () => {
    if (!canSave || !exercise) return;
    updateExercise(exercise.id, { name, muscleGroups: groups });
    router.back();
  };

  const addCreated = (created: LibraryExercise) => {
    if (addTo === "workout") {
      addExercise(created);
      router.dismissTo("/workout");
      return;
    }
    if (addTo === "template") draft.addExercise(created.id, created.name);
    router.back();
  };

  const doCreate = (addAfter: boolean) => {
    if (!canSave) return;
    const created = createExercise(name, groups);
    if (addAfter) addCreated(created);
    else router.back();
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
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={isEdit ? "Edit exercise" : "New exercise"}
        titleSize={22}
        action={{ label: "Cancel", onPress: () => router.back() }}
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
            title={addTo ? "Create & add" : "Create exercise"}
            disabled={!canSave}
            onPress={() => doCreate(addTo !== undefined)}
          />
          {addTo ? (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(6),
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
