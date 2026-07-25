import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, router, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ReorderableList, {
  type ReorderableListRenderItemInfo,
  useIsActive,
  useReorderableDrag,
} from "react-native-reorderable-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RestTimerBar } from "../../src/components/RestTimerBar";
import { REORDER_CELL_ANIMATIONS } from "../../src/components/reorder";
import { Button, Card, common, GlassPressable, HeaderButton } from "../../src/components/ui";
import { theme } from "../../src/theme";
import { useRestTimer } from "../../src/workouts/RestTimerContext";
import { useTemplateDraft } from "../../src/workouts/TemplateDraftContext";
import { elapsedMs, formatClock, formatTimeOfDay, useNow } from "../../src/workouts/time";
import type { ProgressPoint, WorkoutExercise, WorkoutSet } from "../../src/workouts/types";
import { templateSeed, totalSets, totalVolume } from "../../src/workouts/types";
import { fromDisplayWeight, toDisplayWeight, type WeightUnit } from "../../src/workouts/units";
import { useWorkouts } from "../../src/workouts/WorkoutContext";

// 0 means "not logged".
function toReps(t: string): number {
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// 0 = bodyweight; accepts comma decimals.
function toWeight(t: string): number {
  const n = Number.parseFloat(t.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function WorkoutRoute() {
  const {
    active,
    library,
    addSet,
    updateSet,
    removeSet,
    removeExercise,
    reorderExercises,
    setExerciseNote,
    finishWorkout,
    discardWorkout,
    setMinimized,
    progressFor,
    summary,
    unit,
  } = useWorkouts();
  const draft = useTemplateDraft();
  const insets = useSafeAreaInsets();
  const rest = useRestTimer();
  const now = useNow(active !== null);

  useEffect(() => {
    setMinimized(false);
    return () => setMinimized(true);
  }, [setMinimized]);

  if (!active) return <Redirect href={summary ? "/summary" : "/"} />;

  const elapsed = elapsedMs(active.startedAt, now);

  const hasLoggedSet = active.exercises.some((e) => e.sets.some((s) => s.reps > 0));

  const confirmDiscard = () => {
    Alert.alert("Discard workout?", "This workout and its logged sets will be deleted.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          discardWorkout();
          router.back();
        },
      },
    ]);
  };

  const finish = () => {
    finishWorkout();
    router.replace("/summary");
  };

  // The exercise may since have been removed from the library; its name still
  // labels the progress screen.
  const openProgress = (ex: WorkoutExercise) => {
    router.push({
      pathname: "/exercise-progress",
      params: { id: ex.exerciseId, name: ex.name },
    });
  };

  const openEdit = (ex: WorkoutExercise) => {
    const found = library.find((l) => l.id === ex.exerciseId);
    if (found) router.push({ pathname: "/exercise-form", params: { id: found.id } });
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          title: "Active workout",
          headerLeft: () => <HeaderButton label="Back" onPress={() => router.back()} />,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View style={styles.clock}>
            <Ionicons name="time-outline" size={14} color={theme.colors.accent} />
            <Text style={styles.clockText}>{formatClock(elapsed)}</Text>
          </View>
          <Text style={styles.title}>
            {totalSets(active)} sets · {Math.round(toDisplayWeight(totalVolume(active), unit))}{" "}
            {unit}
          </Text>
          <Text style={styles.startedAt}>Started {formatTimeOfDay(active.startedAt)}</Text>
        </View>

        <ReorderableList
          data={active.exercises}
          keyExtractor={(ex) => ex.id}
          onReorder={({ from, to }) => reorderExercises(from, to)}
          cellAnimations={REORDER_CELL_ANIMATIONS}
          shouldUpdateActiveItem
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item: ex }: ReorderableListRenderItemInfo<WorkoutExercise>) => (
            <ExerciseCard
              exercise={ex}
              unit={unit}
              // Excludes the active workout — it isn't finished yet.
              previous={progressFor(ex.exerciseId).at(-1) ?? null}
              onAddSet={() => {
                addSet(ex.id);
                rest.start(); // the previous set is done → start resting
              }}
              onUpdateSet={(sid, patch) => updateSet(ex.id, sid, patch)}
              onRemoveSet={(sid) => removeSet(ex.id, sid)}
              onChangeNote={(note) => setExerciseNote(ex.id, note)}
              onRemove={() => removeExercise(ex.id)}
              onOpenProgress={() => openProgress(ex)}
              onEdit={() => openEdit(ex)}
            />
          )}
          ListFooterComponent={
            <>
              <Button
                title="+ Add exercise"
                variant="dashed"
                onPress={() => router.push("/exercise-picker")}
                style={styles.addExercise}
              />

              {active.exercises.length > 0 ? (
                <Pressable
                  onPress={() => draft.openNew(templateSeed(active))}
                  hitSlop={6}
                  style={styles.savePreset}
                >
                  <Text style={styles.savePresetText}>Save as template</Text>
                </Pressable>
              ) : null}
            </>
          }
        />

        <RestTimerBar timer={rest} />

        <View style={styles.footer}>
          <Button
            title="Discard"
            variant="danger"
            onPress={confirmDiscard}
            style={styles.discard}
          />
          <Button title="Finish" disabled={!hasLoggedSet} onPress={finish} style={styles.finish} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ExerciseCard({
  exercise,
  unit,
  previous,
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
  onAddSet: () => void;
  onUpdateSet: (setId: string, patch: Partial<Pick<WorkoutSet, "reps" | "weight">>) => void;
  onRemoveSet: (setId: string) => void;
  onChangeNote: (note: string) => void;
  onRemove: () => void;
  onOpenProgress: () => void;
  onEdit: () => void;
}) {
  const drag = useReorderableDrag();
  const isActive = useIsActive();
  const previousLabel = useMemo(() => {
    if (!previous) return "No previous record";
    return `Previous: ${previous.topReps} × ${toDisplayWeight(previous.topWeight, unit)} ${unit}`;
  }, [previous, unit]);

  return (
    <Card style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.cardHeader}>
        <Pressable
          onLongPress={drag}
          delayLongPress={150}
          disabled={isActive}
          hitSlop={8}
          style={styles.dragHandle}
          accessibilityLabel="Drag to reorder exercise"
        >
          <Ionicons name="reorder-three" size={22} color={theme.colors.textMuted} />
        </Pressable>
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

      <GlassPressable
        onPress={onAddSet}
        style={styles.addSetWrap}
        surfaceStyle={styles.addSet}
        fallbackStyle={styles.addSetSolid}
      >
        <Text style={styles.addSetText}>+ Add set</Text>
      </GlassPressable>

      <TextInput
        style={styles.noteInput}
        placeholder="Add a note"
        placeholderTextColor={theme.colors.textMuted}
        value={exercise.note}
        onChangeText={onChangeNote}
        multiline
      />
    </Card>
  );
}

// Avoids float dust: 2.5 + 2.5 = 5, not 5.0000001.
function trimNum(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.stepBtn, pressed && common.pressed]}
      onPress={onPress}
      hitSlop={4}
    >
      <Text style={styles.stepBtnText}>{label}</Text>
    </Pressable>
  );
}

// Local text state backs the fields (so partial/decimal entry works) while parsed
// numbers flow to the store for live totals.
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

  // Empty fields preview last session's top set.
  const repsPlaceholder = previous ? String(previous.topReps) : "0";
  const weightPlaceholder = previous ? String(toDisplayWeight(previous.topWeight, unit)) : "0";

  const weightStep = unit === "kg" ? 2.5 : 5;

  const stepReps = (delta: number) => {
    const next = Math.max(0, toReps(reps) + delta);
    setReps(next > 0 ? String(next) : "");
    onChange({ reps: next });
  };

  const stepWeight = (delta: number) => {
    const next = Math.max(0, toWeight(weight) + delta * weightStep);
    setWeight(next > 0 ? trimNum(next) : "");
    onChange({ weight: fromDisplayWeight(next, unit) });
  };

  return (
    <View style={styles.setRow}>
      <Text style={[styles.setIndex, styles.colSet]}>{index}</Text>
      <View style={[styles.stepper, styles.colField]}>
        <StepButton label="−" onPress={() => stepReps(-1)} />
        <TextInput
          style={styles.stepperInput}
          placeholder={repsPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="number-pad"
          value={reps}
          onChangeText={(t) => {
            setReps(t);
            onChange({ reps: toReps(t) });
          }}
        />
        <StepButton label="+" onPress={() => stepReps(1)} />
      </View>
      <View style={[styles.stepper, styles.colField]}>
        <StepButton label="−" onPress={() => stepWeight(-1)} />
        <TextInput
          style={styles.stepperInput}
          placeholder={weightPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={(t) => {
            setWeight(t);
            onChange({ weight: fromDisplayWeight(toWeight(t), unit) });
          }}
        />
        <StepButton label="+" onPress={() => stepWeight(1)} />
      </View>
      <Pressable style={styles.colRemove} onPress={onRemove} hitSlop={6}>
        <Text style={styles.removeX}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(4),
  },
  header: {
    marginBottom: theme.space(4),
  },
  clock: {
    alignSelf: "flex-start",
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
    marginBottom: theme.space(3),
  },
  cardActive: {
    borderColor: theme.colors.accent,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.space(3),
    marginBottom: theme.space(3),
  },
  dragHandle: {
    marginTop: -2,
    paddingRight: theme.space(1),
    alignItems: "center",
    justifyContent: "center",
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
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.sm,
    overflow: "hidden",
  },
  stepperInput: {
    flex: 1,
    color: theme.colors.text,
    textAlign: "center",
    paddingVertical: theme.space(2),
    paddingHorizontal: theme.space(1),
    fontSize: 16,
  },
  stepBtn: {
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: {
    color: theme.colors.accent,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 22,
  },
  removeX: {
    color: theme.colors.textMuted,
    fontSize: 22,
    lineHeight: 24,
  },
  addSetWrap: {
    marginTop: theme.space(2),
  },
  addSet: {
    alignItems: "center",
    paddingVertical: theme.space(3),
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addSetSolid: {
    backgroundColor: theme.colors.background,
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
    marginTop: theme.space(1),
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
  },
  finish: {
    flex: 2,
  },
});
