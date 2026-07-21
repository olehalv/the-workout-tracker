import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "../theme";
import { useRestTimer } from "../workouts/RestTimerContext";
import { elapsedMs, formatClock, formatTimeOfDay, useNow } from "../workouts/time";
import type {
  LibraryExercise,
  ProgressPoint,
  WorkoutExercise,
  WorkoutSet,
} from "../workouts/types";
import { templateSeed, totalSets, totalVolume } from "../workouts/types";
import { fromDisplayWeight, toDisplayWeight, type WeightUnit } from "../workouts/units";
import { useWorkouts } from "../workouts/WorkoutContext";
import { ExerciseFormModal } from "./ExerciseFormModal";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { ExerciseProgressModal } from "./ExerciseProgressModal";
import { PresetFormModal } from "./PresetFormModal";
import { RestTimerBar } from "./RestTimerBar";

/** Parse a reps field: whole number ≥ 1, else 0 (treated as "not logged"). */
function toReps(t: string): number {
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Parse a weight field: number ≥ 0 (0 = bodyweight), accepts comma decimals. */
function toWeight(t: string): number {
  const n = Number.parseFloat(t.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function WorkoutScreen() {
  const {
    active,
    library,
    addSet,
    updateSet,
    removeSet,
    removeExercise,
    moveExercise,
    setExerciseNote,
    finishWorkout,
    discardWorkout,
    minimizeWorkout,
    progressFor,
    unit,
  } = useWorkouts();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [progressExercise, setProgressExercise] = useState<LibraryExercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<LibraryExercise | null>(null);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const rest = useRestTimer();
  const now = useNow(active !== null);

  if (!active) return null;

  const elapsed = elapsedMs(active.startedAt, now);

  // A workout is finishable once any set has reps logged.
  const hasLoggedSet = active.exercises.some((e) => e.sets.some((s) => s.reps > 0));

  // Distinct exercises of the active workout, for "save as template" — each with
  // its current set count as the template's target.
  const presetSeed = templateSeed(active);

  const confirmDiscard = () => {
    Alert.alert("Discard workout?", "This workout and its logged sets will be deleted.", [
      { text: "Keep", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: discardWorkout },
    ]);
  };

  // Resolve a workout exercise back to its library entry for the progress view,
  // falling back to a snapshot if it was since removed from the library.
  const openProgress = (ex: WorkoutExercise) => {
    const found = library.find((l) => l.id === ex.exerciseId);
    setProgressExercise(
      found ?? { id: ex.exerciseId, name: ex.name, muscleGroups: [], custom: false },
    );
  };

  // Edit the underlying library exercise (name / muscle group) mid-workout.
  const openEdit = (ex: WorkoutExercise) => {
    const found = library.find((l) => l.id === ex.exerciseId);
    if (found) setEditingExercise(found);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow}>Active workout</Text>
            <View style={styles.clock}>
              <Ionicons name="time-outline" size={14} color={theme.colors.accent} />
              <Text style={styles.clockText}>{formatClock(elapsed)}</Text>
            </View>
          </View>
          <Text style={styles.title}>
            {totalSets(active)} sets · {Math.round(toDisplayWeight(totalVolume(active), unit))}{" "}
            {unit}
          </Text>
          <Text style={styles.startedAt}>Started {formatTimeOfDay(active.startedAt)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.minimize, pressed && styles.pressed]}
          onPress={minimizeWorkout}
          hitSlop={8}
        >
          <Text style={styles.minimizeText}>Minimize</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {active.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            unit={unit}
            // The previous session excludes the active workout (not finished yet).
            previous={progressFor(ex.exerciseId).at(-1) ?? null}
            canMoveUp={i > 0}
            canMoveDown={i < active.exercises.length - 1}
            onMove={(dir) => moveExercise(ex.id, dir)}
            onAddSet={() => {
              addSet(ex.id);
              // Adding a set = the previous one is done → start resting.
              rest.start();
            }}
            onUpdateSet={(sid, patch) => updateSet(ex.id, sid, patch)}
            onRemoveSet={(sid) => removeSet(ex.id, sid)}
            onChangeNote={(note) => setExerciseNote(ex.id, note)}
            onRemove={() => removeExercise(ex.id)}
            onOpenProgress={() => openProgress(ex)}
            onEdit={() => openEdit(ex)}
          />
        ))}

        <Pressable
          style={({ pressed }) => [styles.addExercise, pressed && styles.pressed]}
          onPress={() => setPickerOpen(true)}
        >
          <Text style={styles.addExerciseText}>+ Add exercise</Text>
        </Pressable>

        {active.exercises.length > 0 ? (
          <Pressable onPress={() => setSavePresetOpen(true)} hitSlop={6} style={styles.savePreset}>
            <Text style={styles.savePresetText}>Save as template</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <RestTimerBar timer={rest} />

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.discard, pressed && styles.pressed]}
          onPress={confirmDiscard}
        >
          <Text style={styles.discardText}>Discard</Text>
        </Pressable>
        <Pressable
          disabled={!hasLoggedSet}
          style={({ pressed }) => [
            styles.finish,
            !hasLoggedSet && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={finishWorkout}
        >
          <Text style={styles.finishText}>Finish</Text>
        </Pressable>
      </View>

      <ExercisePickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} />
      <ExerciseProgressModal
        exercise={progressExercise}
        onClose={() => setProgressExercise(null)}
      />
      <PresetFormModal
        visible={savePresetOpen}
        preset={null}
        initialExercises={presetSeed}
        onClose={() => setSavePresetOpen(false)}
      />
      <ExerciseFormModal
        visible={editingExercise !== null}
        exercise={editingExercise}
        onClose={() => setEditingExercise(null)}
      />
    </KeyboardAvoidingView>
  );
}

function ExerciseCard({
  exercise,
  unit,
  previous,
  canMoveUp,
  canMoveDown,
  onMove,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onChangeNote,
  onRemove,
  onOpenProgress,
  onEdit,
}: {
  exercise: WorkoutExercise;
  unit: WeightUnit;
  previous: ProgressPoint | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, patch: Partial<Pick<WorkoutSet, "reps" | "weight">>) => void;
  onRemoveSet: (setId: string) => void;
  onChangeNote: (note: string) => void;
  onRemove: () => void;
  onOpenProgress: () => void;
  onEdit: () => void;
}) {
  const previousLabel = useMemo(() => {
    if (!previous) return "No previous record";
    return `Previous: ${previous.topReps} × ${toDisplayWeight(previous.topWeight, unit)} ${unit}`;
  }, [previous, unit]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.reorder}>
          <Pressable
            disabled={!canMoveUp}
            onPress={() => onMove(-1)}
            hitSlop={4}
            style={styles.reorderBtn}
          >
            <Ionicons
              name="chevron-up"
              size={16}
              color={canMoveUp ? theme.colors.textMuted : theme.colors.border}
            />
          </Pressable>
          <Pressable
            disabled={!canMoveDown}
            onPress={() => onMove(1)}
            hitSlop={4}
            style={styles.reorderBtn}
          >
            <Ionicons
              name="chevron-down"
              size={16}
              color={canMoveDown ? theme.colors.textMuted : theme.colors.border}
            />
          </Pressable>
        </View>
        <View style={styles.cardHeaderMain}>
          <Text style={styles.cardTitle}>{exercise.name}</Text>
          <Text style={styles.previous}>{previousLabel}</Text>
        </View>
        <Pressable onPress={onOpenProgress} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="trending-up-outline" size={20} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable onPress={onEdit} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="create-outline" size={20} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
        </Pressable>
      </View>

      {exercise.sets.length > 0 ? (
        <View style={styles.columns}>
          <Text style={[styles.colHeader, styles.colSet]}>Set</Text>
          <Text style={[styles.colHeader, styles.colField]}>Reps</Text>
          <Text style={[styles.colHeader, styles.colField]}>{unit}</Text>
          <View style={styles.colRemove} />
        </View>
      ) : (
        <Text style={styles.noSets}>No sets yet — add your first below.</Text>
      )}

      {exercise.sets.map((s, i) => (
        <SetRow
          key={s.id}
          index={i + 1}
          set={s}
          unit={unit}
          previous={previous}
          onChange={(patch) => onUpdateSet(s.id, patch)}
          onRemove={() => onRemoveSet(s.id)}
        />
      ))}

      <Pressable
        style={({ pressed }) => [styles.addSet, pressed && styles.pressed]}
        onPress={onAddSet}
      >
        <Text style={styles.addSetText}>+ Add set</Text>
      </Pressable>

      <TextInput
        style={styles.noteInput}
        placeholder="Add a note"
        placeholderTextColor={theme.colors.textMuted}
        value={exercise.note}
        onChangeText={onChangeNote}
        multiline
      />
    </View>
  );
}

/**
 * A single editable set: two inputs that *are* the set. Local text state backs
 * the fields (so partial/decimal entry works) while parsed numbers flow to the
 * store for live totals.
 */
function SetRow({
  index,
  set,
  unit,
  previous,
  onChange,
  onRemove,
}: {
  index: number;
  set: WorkoutSet;
  unit: WeightUnit;
  previous: ProgressPoint | null;
  onChange: (patch: Partial<Pick<WorkoutSet, "reps" | "weight">>) => void;
  onRemove: () => void;
}) {
  const [reps, setReps] = useState(set.reps > 0 ? String(set.reps) : "");
  const [weight, setWeight] = useState(
    set.weight > 0 ? String(toDisplayWeight(set.weight, unit)) : "",
  );

  // Placeholders show last session's top set, so an empty field previews it.
  const repsPlaceholder = previous ? String(previous.topReps) : "0";
  const weightPlaceholder = previous ? String(toDisplayWeight(previous.topWeight, unit)) : "0";

  return (
    <View style={styles.setRow}>
      <Text style={[styles.setIndex, styles.colSet]}>{index}</Text>
      <TextInput
        style={[styles.setField, styles.colField]}
        placeholder={repsPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType="number-pad"
        value={reps}
        onChangeText={(t) => {
          setReps(t);
          onChange({ reps: toReps(t) });
        }}
      />
      <TextInput
        style={[styles.setField, styles.colField]}
        placeholder={weightPlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType="decimal-pad"
        value={weight}
        onChangeText={(t) => {
          setWeight(t);
          onChange({ weight: fromDisplayWeight(toWeight(t), unit) });
        }}
      />
      <Pressable style={styles.colRemove} onPress={onRemove} hitSlop={6}>
        <Text style={styles.removeX}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(12),
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: theme.space(4),
  },
  headerMain: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
  },
  clock: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(1),
  },
  clockText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  startedAt: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
  minimize: {
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  minimizeText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: "700",
    marginTop: theme.space(1),
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.space(6),
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(4),
    marginBottom: theme.space(3),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.space(3),
    marginBottom: theme.space(3),
  },
  reorder: {
    alignItems: "center",
    marginTop: -2,
  },
  reorderBtn: {
    paddingVertical: 1,
  },
  cardHeaderMain: {
    flex: 1,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  previous: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
  iconBtn: {
    paddingHorizontal: theme.space(1),
    paddingTop: 2,
  },
  noSets: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.space(1),
  },
  columns: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    marginBottom: theme.space(1),
  },
  colHeader: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colSet: {
    width: 28,
    textAlign: "center",
  },
  colField: {
    flex: 1,
    textAlign: "center",
  },
  colRemove: {
    width: 28,
    alignItems: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    paddingVertical: theme.space(1),
  },
  setIndex: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  setField: {
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.space(2),
    paddingHorizontal: theme.space(3),
    fontSize: 16,
  },
  removeX: {
    color: theme.colors.textMuted,
    fontSize: 22,
    lineHeight: 24,
  },
  addSet: {
    alignItems: "center",
    paddingVertical: theme.space(3),
    marginTop: theme.space(2),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addSetText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  noteInput: {
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(3),
    fontSize: 14,
    marginTop: theme.space(3),
    minHeight: 44,
  },
  addExercise: {
    alignItems: "center",
    paddingVertical: theme.space(4),
    borderRadius: theme.radius.md,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    marginTop: theme.space(1),
  },
  addExerciseText: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  savePreset: {
    alignItems: "center",
    paddingVertical: theme.space(3),
    marginTop: theme.space(2),
  },
  savePresetText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    gap: theme.space(3),
    paddingVertical: theme.space(4),
  },
  discard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.space(4),
    borderRadius: theme.radius.md,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  discardText: {
    color: theme.colors.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  finish: {
    flex: 2,
    alignItems: "center",
    paddingVertical: theme.space(4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
  },
  finishText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
