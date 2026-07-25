import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ExerciseListRow } from "../../src/components/ExerciseListRow";
import { common, Input, ScreenHeader } from "../../src/components/ui";
import { theme } from "../../src/theme";
import { type LibraryExercise, muscleLabel } from "../../src/workouts/types";
import { useWorkouts } from "../../src/workouts/WorkoutContext";

export default function ExercisePickerRoute() {
  const { library, addExercise } = useWorkouts();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const list = q ? library.filter((e) => e.name.toLowerCase().includes(q)) : [...library];
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [library, q]);

  const exactMatch = results.some((e) => e.name.toLowerCase() === q);

  const pick = (exercise: LibraryExercise) => {
    addExercise(exercise);
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Add exercise"
        titleSize={22}
        action={{ label: "Cancel", onPress: () => router.back() }}
        style={styles.header}
      />

      <Input
        style={styles.search}
        placeholder="Search or create an exercise"
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCorrect={false}
        returnKeyType="done"
      />

      <FlatList
        showsVerticalScrollIndicator={false}
        data={results}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          q.length > 0 && !exactMatch ? (
            <Pressable
              style={({ pressed }) => [styles.createRow, pressed && common.pressed]}
              onPress={() =>
                router.push({
                  pathname: "/exercise-form",
                  params: { name: query.trim(), addTo: "workout" },
                })
              }
            >
              <Text style={styles.createText}>Create “{query.trim()}”</Text>
              <Text style={styles.createHint}>Set muscle group, then create &amp; add</Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <ExerciseListRow
            name={item.name}
            meta={`${muscleLabel(item)}${item.custom ? " · custom" : ""}`}
            onPress={() => pick(item)}
            showAdd
          />
        )}
        ListEmptyComponent={
          q.length === 0 ? <Text style={styles.empty}>Your library is empty.</Text> : null
        }
      />
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
    marginBottom: theme.space(4),
  },
  search: {
    marginBottom: theme.space(3),
  },
  listContent: {
    paddingBottom: theme.space(10),
    gap: theme.space(2),
  },
  createRow: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  createText: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  createHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    marginTop: theme.space(8),
  },
});
