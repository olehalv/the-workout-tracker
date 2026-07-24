import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { common, Input, ScreenHeader } from "../components/ui";
import { theme } from "../theme";
import { type LibraryExercise, muscleLabel } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutContext";
import { ExerciseFormModal } from "./ExerciseFormModal";
import { ExerciseProgressModal } from "./ExerciseProgressModal";

// Picker for adding an exercise to the active workout; offers "create" when nothing matches.
export function ExercisePickerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { library, addExercise } = useWorkouts();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<LibraryExercise | null>(null);
  const [creating, setCreating] = useState(false);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const list = q ? library.filter((e) => e.name.toLowerCase().includes(q)) : [...library];
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [library, q]);

  const exactMatch = results.some((e) => e.name.toLowerCase() === q);

  const pick = (exercise: LibraryExercise) => {
    addExercise(exercise);
    setQuery("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <ScreenHeader
          title="Add exercise"
          titleSize={22}
          action={{ label: "Cancel", onPress: onClose }}
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
          data={results}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            q.length > 0 && !exactMatch ? (
              <Pressable
                style={({ pressed }) => [styles.createRow, pressed && common.pressed]}
                onPress={() => setCreating(true)}
              >
                <Text style={styles.createText}>Create “{query.trim()}”</Text>
                <Text style={styles.createHint}>Set muscle group, then create &amp; add</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[common.surface, styles.row]}>
              <Pressable style={styles.rowMain} onPress={() => pick(item)}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowCategory}>
                  {muscleLabel(item)}
                  {item.custom ? " · custom" : ""}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.historyBtn, pressed && common.pressed]}
                onPress={() => setHistory(item)}
                hitSlop={6}
              >
                <Text style={styles.historyText}>History</Text>
              </Pressable>
              <Pressable onPress={() => pick(item)} hitSlop={6}>
                <Text style={styles.plus}>+</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            q.length === 0 ? <Text style={styles.empty}>Your library is empty.</Text> : null
          }
        />

        <ExerciseProgressModal exercise={history} onClose={() => setHistory(null)} />
        <ExerciseFormModal
          visible={creating}
          exercise={null}
          initialName={query.trim()}
          onCreated={pick}
          onClose={() => setCreating(false)}
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
  historyBtn: {
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  historyText: {
    color: theme.colors.textMuted,
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
    fontSize: 22,
    fontWeight: "600",
    paddingHorizontal: theme.space(2),
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
