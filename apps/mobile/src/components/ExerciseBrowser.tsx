import { type ReactElement, useMemo } from "react";
import { FlatList, StyleSheet } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { theme } from "../theme";
import { MUSCLE_GROUPS } from "../workouts/defaultExercises";
import type { LibraryExercise } from "../workouts/types";
import { ExerciseListRow } from "./ExerciseListRow";
import { useMinimizedBarClearance } from "./MinimizedWorkoutBar";
import { EmptyState } from "./ui";

interface MuscleGroupRow {
  group: string;
  count: number;
}

function muscleGroupRows(library: LibraryExercise[]): MuscleGroupRow[] {
  const counts = new Map<string, number>();
  for (const e of library) {
    for (const g of e.muscleGroups) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const seeded: string[] = [...MUSCLE_GROUPS];
  const extra = [...counts.keys()].filter((g) => !seeded.includes(g)).sort();
  return [...seeded, ...extra]
    .filter((g) => (counts.get(g) ?? 0) > 0)
    .map((group) => ({ group, count: counts.get(group) ?? 0 }));
}

export const MIN_SEARCH_LENGTH = 3;

export function exercisesInGroup(library: LibraryExercise[], group: string): LibraryExercise[] {
  return library
    .filter((e) => e.muscleGroups.includes(group))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function ExerciseList({
  exercises,
  header,
  meta,
  onSelect,
  isSelected,
  empty,
  emptySymbol = "tray",
}: {
  exercises: LibraryExercise[];
  header?: ReactElement;
  meta: (exercise: LibraryExercise) => string;
  onSelect: (exercise: LibraryExercise) => void;
  isSelected?: (exercise: LibraryExercise) => boolean;
  empty?: string;
  emptySymbol?: SFSymbol;
}) {
  const clearance = useMinimizedBarClearance();
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      data={exercises}
      keyExtractor={(e) => e.id}
      contentContainerStyle={[styles.content, { paddingBottom: clearance + theme.space(6) }]}
      ListHeaderComponent={header}
      ListEmptyComponent={empty ? <EmptyState title={empty} systemImage={emptySymbol} /> : null}
      renderItem={({ item }) => (
        <ExerciseListRow
          name={item.name}
          meta={meta(item)}
          onPress={() => onSelect(item)}
          selected={isSelected?.(item)}
        />
      )}
    />
  );
}

export function ExerciseBrowser({
  library,
  query,
  header,
  meta,
  onSelectGroup,
  onSelectExercise,
  isSelected,
}: {
  library: LibraryExercise[];
  query: string;
  header?: ReactElement;
  meta: (exercise: LibraryExercise) => string;
  onSelectGroup: (group: string) => void;
  onSelectExercise: (exercise: LibraryExercise) => void;
  isSelected?: (exercise: LibraryExercise) => boolean;
}) {
  const clearance = useMinimizedBarClearance();
  const q = query.trim().toLowerCase();
  const searching = q.length >= MIN_SEARCH_LENGTH;
  const groups = useMemo(() => muscleGroupRows(library), [library]);
  const matches = useMemo(() => {
    if (q.length < MIN_SEARCH_LENGTH) return [];
    return library
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscleGroups.some((g) => g.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [library, q]);

  const rows: (MuscleGroupRow | LibraryExercise)[] = searching ? matches : groups;

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      data={rows}
      keyExtractor={(item) => ("group" in item ? item.group : item.id)}
      contentContainerStyle={[styles.content, { paddingBottom: clearance + theme.space(6) }]}
      ListHeaderComponent={header}
      ListEmptyComponent={
        searching ? (
          <EmptyState title="No exercises match." systemImage="magnifyingglass" />
        ) : (
          <EmptyState
            title="Your library is empty"
            description="Create an exercise to start building your library."
            systemImage="dumbbell"
          />
        )
      }
      renderItem={({ item }) =>
        "group" in item ? (
          <ExerciseListRow
            name={item.group}
            meta={`${item.count} exercise${item.count === 1 ? "" : "s"}`}
            onPress={() => onSelectGroup(item.group)}
          />
        ) : (
          <ExerciseListRow
            name={item.name}
            meta={meta(item)}
            onPress={() => onSelectExercise(item)}
            selected={isSelected?.(item)}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.gutter,
    gap: theme.space(2),
  },
});
