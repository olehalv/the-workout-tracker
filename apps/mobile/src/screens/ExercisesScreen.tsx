import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, common, Input, ScreenHeader } from "../components/ui";
import { tabScrollClearance } from "../navigation/tabBar";
import { theme } from "../theme";
import { type LibraryExercise, muscleLabel } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutContext";
import { ExerciseFormModal } from "./ExerciseFormModal";
import { ExerciseProgressModal } from "./ExerciseProgressModal";

// "Exercises & progress" tab: manage the library and view per-exercise progress.
export function ExercisesScreen() {
  const { library, workouts } = useWorkouts();
  const [progress, setProgress] = useState<LibraryExercise | null>(null);
  const [editing, setEditing] = useState<LibraryExercise | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  // How many finished sessions reference each exercise, for a quick history hint.
  const sessionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of workouts) {
      for (const e of w.exercises) {
        if (e.sets.length > 0) counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
      }
    }
    return counts;
  }, [workouts]);

  const q = query.trim().toLowerCase();
  const sorted = useMemo(() => {
    const list = q
      ? library.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.muscleGroups.some((g) => g.toLowerCase().includes(q)),
        )
      : [...library];
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [library, q]);

  return (
    <View style={styles.container}>
      <ScreenHeader eyebrow="Library" title="Exercises & progress" style={styles.header} />

      <Input
        style={styles.search}
        placeholder="Search exercises or muscle groups"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      <Button
        title="+ New exercise"
        variant="dashed"
        onPress={() => setCreating(true)}
        style={styles.addBtn}
      />

      <FlatList
        data={sorted}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.listContent, tabScrollClearance]}
        renderItem={({ item }) => {
          const count = sessionCounts.get(item.id) ?? 0;
          return (
            <View style={[common.surface, styles.row]}>
              <Pressable style={styles.rowMain} onPress={() => setProgress(item)}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {muscleLabel(item)}
                  {item.custom ? " · custom" : ""} ·{" "}
                  {count === 0 ? "no history" : `${count} session${count === 1 ? "" : "s"}`}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.editBtn, pressed && common.pressed]}
                onPress={() => setEditing(item)}
                hitSlop={6}
              >
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </View>
          );
        }}
      />

      <ExerciseProgressModal exercise={progress} onClose={() => setProgress(null)} />
      <ExerciseFormModal
        visible={creating || editing !== null}
        exercise={editing}
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
    marginBottom: theme.space(4),
  },
  search: {
    marginBottom: theme.space(3),
  },
  addBtn: {
    marginBottom: theme.space(4),
  },
  listContent: {
    paddingBottom: theme.space(6),
    gap: theme.space(2),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  rowMain: {
    flex: 1,
  },
  rowName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  rowMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
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
});
