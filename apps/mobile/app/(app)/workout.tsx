import Ionicons from "@expo/vector-icons/Ionicons";
import { type NativeStackHeaderItemMenuAction, Redirect, router, Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
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
import { Button, Card, common, GlassPressable } from "../../src/components/ui";
import { useExerciseSelection } from "../../src/navigation/ExerciseSelectionContext";
import { backHeaderItems } from "../../src/navigation/headerOptions";
import { theme } from "../../src/theme";
import { useRestTimer } from "../../src/workouts/RestTimerContext";
import { useTemplateDraft } from "../../src/workouts/TemplateDraftContext";
import { elapsedMs, formatClock, formatTimeOfDay, useNow } from "../../src/workouts/time";
import type { ProgressPoint, WorkoutExercise, WorkoutSet } from "../../src/workouts/types";
import { templateSeed, totalSets, totalVolume } from "../../src/workouts/types";
import { fromDisplayWeight, toDisplayWeight, type WeightUnit } from "../../src/workouts/units";
import { useWorkouts } from "../../src/workouts/WorkoutContext";

function toReps(t: string): number {
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

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
  const selection = useExerciseSelection();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const rest = useRestTimer();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const previousFor = useMemo(() => {
    const cache = new Map<string, ProgressPoint | null>();
    return (exerciseId: string) => {
      if (!cache.has(exerciseId)) cache.set(exerciseId, progressFor(exerciseId).at(-1) ?? null);
      return cache.get(exerciseId) ?? null;
    };
  }, [progressFor]);

  useEffect(() => {
    setMinimized(false);
    return () => setMinimized(true);
  }, [setMinimized]);

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardWillShow", () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener("keyboardWillHide", () => setKeyboardOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  if (!active) return <Redirect href={summary ? "/summary" : "/"} />;

  const everySetLogged =
    active.exercises.length > 0 &&
    active.exercises.every((e) => e.sets.length > 0 && e.sets.every((s) => s.reps > 0));

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

  const menuActions: NativeStackHeaderItemMenuAction[] = [
    ...(active.exercises.length > 0
      ? [
          {
            type: "action",
            label: "Save as template",
            icon: { type: "sfSymbol", name: "doc.badge.plus" },
            onPress: () => draft.openNew(templateSeed(active)),
          } satisfies NativeStackHeaderItemMenuAction,
        ]
      : []),
    {
      type: "action",
      label: "Discard workout",
      icon: { type: "sfSymbol", name: "trash" },
      onPress: confirmDiscard,
      destructive: true,
    },
  ];

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "Workout",
          unstable_headerLeftItems: backHeaderItems,
          unstable_headerRightItems: () => [
            {
              type: "button",
              label: "Finish",
              variant: "done",
              disabled: !everySetLogged,
              onPress: finish,
            },
            {
              type: "menu",
              label: "",
              icon: { type: "sfSymbol", name: "ellipsis" },
              accessibilityLabel: "More workout actions",
              menu: { items: menuActions },
            },
          ],
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <ReorderableList
          data={active.exercises}
          keyExtractor={(ex, i) => ex?.id ?? String(i)}
          onReorder={({ from, to }) => reorderExercises(from, to)}
          cellAnimations={REORDER_CELL_ANIMATIONS}
          shouldUpdateActiveItem
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.header}>
              <ElapsedClock startedAt={active.startedAt} />
              <Text style={styles.title}>
                {totalSets(active)} sets · {Math.round(toDisplayWeight(totalVolume(active), unit))}{" "}
                {unit}
              </Text>
              <Text style={styles.startedAt}>Started {formatTimeOfDay(active.startedAt)}</Text>
            </View>
          }
          renderItem={({ item: ex }: ReorderableListRenderItemInfo<WorkoutExercise>) => (
            <ExerciseCard
              exercise={ex}
              unit={unit}
              previous={previousFor(ex.exerciseId)}
              onAddSet={() => {
                addSet(ex.id);
                rest.start();
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
            <Button
              title="+ Add exercise"
              variant="dashed"
              onPress={() => selection.open("workout")}
              style={styles.addExercise}
            />
          }
        />

        <View
          style={[
            styles.footer,
            { paddingBottom: keyboardOpen ? theme.space(3) : insets.bottom || theme.space(3) },
          ]}
        >
          <View style={styles.restBarFill}>
            <RestTimerBar timer={rest} />
          </View>
          {keyboardOpen ? (
            <GlassPressable
              onPress={Keyboard.dismiss}
              surfaceStyle={styles.dismissKeyboard}
              fallbackStyle={styles.dismissKeyboardSolid}
              accessibilityLabel="Close keyboard"
            >
              <Ionicons name="chevron-down" size={18} color={theme.colors.text} />
            </GlassPressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ElapsedClock({ startedAt }: { startedAt: number }) {
  const now = useNow(true);
  return (
    <View style={styles.clock}>
      <Ionicons name="time-outline" size={14} color={theme.colors.accent} />
      <Text style={styles.clockText}>{formatClock(elapsedMs(startedAt, now))}</Text>
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
  const [noteOpen, setNoteOpen] = useState(() => exercise.note.length > 0);
  const previousLabel = useMemo(() => {
    if (!previous) return "No previous record";
    return `Previous: ${toDisplayWeight(previous.topWeight, unit)} ${unit} × ${previous.topReps}`;
  }, [previous, unit]);

  return (
    <Card style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.cardHeader}>
        <Pressable
          onLongPress={drag}
          delayLongPress={150}
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
          <Text style={[styles.colHeader, styles.colField]}>{unit}</Text>
          <Text style={[styles.colHeader, styles.colField]}>Reps</Text>
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

      {noteOpen ? (
        <TextInput
          style={styles.noteInput}
          placeholder="Note"
          placeholderTextColor={theme.colors.textMuted}
          value={exercise.note}
          onChangeText={onChangeNote}
          onBlur={() => setNoteOpen(exercise.note.length > 0)}
          autoFocus={exercise.note.length === 0}
          multiline
        />
      ) : (
        <Pressable
          onPress={() => setNoteOpen(true)}
          hitSlop={8}
          style={({ pressed }) => [styles.addNote, pressed && common.pressed]}
        >
          <Text style={styles.addNoteText}>+ Add a note</Text>
        </Pressable>
      )}
    </Card>
  );
}

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
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(4),
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
  addNote: {
    alignSelf: "flex-start",
    paddingVertical: theme.space(2),
    marginTop: theme.space(2),
  },
  addNoteText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  addExercise: {
    marginTop: theme.space(1),
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(3),
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  restBarFill: {
    flex: 1,
  },
  dismissKeyboard: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dismissKeyboardSolid: {
    backgroundColor: theme.colors.background,
  },
});
