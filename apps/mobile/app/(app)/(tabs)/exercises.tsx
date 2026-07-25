import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExerciseListRow } from "../../../src/components/ExerciseListRow";
import { Button, Input, ScreenHeader } from "../../../src/components/ui";
import { theme } from "../../../src/theme";
import { muscleLabel } from "../../../src/workouts/types";
import { useWorkouts } from "../../../src/workouts/WorkoutContext";

// "Exercises & progress" tab: manage the library and view per-exercise progress.
export default function ExercisesTab() {
  const { library, workouts } = useWorkouts();
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();

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
    <View style={[styles.container, { paddingTop: insets.top + theme.space(12) }]}>
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
        onPress={() => router.push("/exercise-form")}
        style={styles.addBtn}
      />

      <FlatList
        showsVerticalScrollIndicator={false}
        data={sorted}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const count = sessionCounts.get(item.id) ?? 0;
          const history = count === 0 ? "no history" : `${count} session${count === 1 ? "" : "s"}`;
          return (
            <ExerciseListRow
              name={item.name}
              meta={`${muscleLabel(item)}${item.custom ? " · custom" : ""} · ${history}`}
              onPress={() =>
                router.push({ pathname: "/exercise-progress", params: { id: item.id } })
              }
            />
          );
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
});
