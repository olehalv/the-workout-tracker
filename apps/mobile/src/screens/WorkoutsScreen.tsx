import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { tabScrollClearance } from "../navigation/tabBar";
import { theme } from "../theme";
import { elapsedMs, formatClock, useNow } from "../workouts/time";
import { totalSets, totalVolume, type Workout } from "../workouts/types";
import { toDisplayWeight, type WeightUnit } from "../workouts/units";
import { useWorkouts } from "../workouts/WorkoutContext";
import { TemplatePickerModal } from "./TemplatePickerModal";
import { dayKey, WeekCalendar } from "./WeekCalendar";
import { WorkoutDetailModal } from "./WorkoutDetailModal";

function workoutTs(w: Workout): number {
  return w.finishedAt ?? w.startedAt;
}

function todayMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function fmtDayLabel(ts: number): string {
  if (dayKey(ts) === dayKey(Date.now())) return "Today";
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "Workouts" tab: start/resume a workout, pick a day, and review its history. */
export function WorkoutsScreen() {
  const { workouts, active, unit, startWorkout, resumeWorkout, deleteWorkout } = useWorkouts();
  const [detail, setDetail] = useState<Workout | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTs, setSelectedTs] = useState(todayMidnight);
  const now = useNow(active !== null);

  const confirmDelete = (workout: Workout) => {
    const when = new Date(workoutTs(workout)).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    Alert.alert("Delete workout?", `Your workout from ${when} will be permanently deleted.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteWorkout(workout.id) },
    ]);
  };

  const selectedKey = dayKey(selectedTs);

  // Days that have at least one logged workout (for calendar dots).
  const marked = useMemo(() => {
    const s = new Set<string>();
    for (const w of workouts) s.add(dayKey(workoutTs(w)));
    return s;
  }, [workouts]);

  const dayWorkouts = useMemo(
    () => workouts.filter((w) => dayKey(workoutTs(w)) === selectedKey),
    [workouts, selectedKey],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Progressive overload</Text>
        <Text style={styles.title}>Workouts</Text>
      </View>

      {active ? (
        <Pressable
          style={({ pressed }) => [styles.start, pressed && styles.pressed]}
          onPress={resumeWorkout}
        >
          <Text style={styles.startText}>Resume workout</Text>
          <Text style={styles.startSub}>
            {active.exercises.length} exercise{active.exercises.length === 1 ? "" : "s"} ·{" "}
            {formatClock(elapsedMs(active.startedAt, now))} elapsed
          </Text>
        </Pressable>
      ) : (
        <>
          <Pressable
            style={({ pressed }) => [styles.start, pressed && styles.pressed]}
            onPress={startWorkout}
          >
            <Text style={styles.startText}>Start workout</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={() => setPickerOpen(true)}
          >
            <Text style={styles.secondaryText}>Start workout from template</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.sectionLabel}>History</Text>
      <WeekCalendar selectedKey={selectedKey} marked={marked} onSelect={setSelectedTs} />

      <Text style={styles.dayLabel}>{fmtDayLabel(selectedTs)}</Text>
      <FlatList
        data={dayWorkouts}
        keyExtractor={(w) => w.id}
        style={styles.list}
        contentContainerStyle={[
          dayWorkouts.length === 0 ? styles.emptyWrap : styles.listContent,
          tabScrollClearance,
        ]}
        ListEmptyComponent={<Text style={styles.empty}>No workouts on this day.</Text>}
        renderItem={({ item }) => (
          <HistoryRow
            workout={item}
            unit={unit}
            onOpen={() => setDetail(item)}
            onDelete={() => confirmDelete(item)}
          />
        )}
      />

      <WorkoutDetailModal workout={detail} onClose={() => setDetail(null)} />
      <TemplatePickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

function HistoryRow({
  workout,
  unit,
  onOpen,
  onDelete,
}: {
  workout: Workout;
  unit: WeightUnit;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const time = new Date(workoutTs(workout)).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <View style={styles.row}>
      <Pressable style={styles.rowMain} onPress={onOpen}>
        <Text style={styles.rowDate}>{time}</Text>
        <Text style={styles.rowMeta}>
          {workout.exercises.length} exercises · {totalSets(workout)} sets ·{" "}
          {Math.round(toDisplayWeight(totalVolume(workout), unit))} {unit}
        </Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Text style={styles.rowDelete}>Delete</Text>
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
    paddingBottom: theme.space(4),
  },
  header: {
    marginBottom: theme.space(6),
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
    fontSize: 30,
    fontWeight: "700",
    marginTop: theme.space(2),
  },
  start: {
    alignItems: "center",
    paddingVertical: theme.space(4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
  },
  startText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  startSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: theme.space(1),
  },
  secondary: {
    alignItems: "center",
    paddingVertical: theme.space(4),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: theme.space(3),
  },
  secondaryText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: theme.space(7),
    marginBottom: theme.space(3),
  },
  dayLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: theme.space(4),
    marginBottom: theme.space(3),
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: theme.space(2),
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(4),
  },
  rowMain: {
    flex: 1,
  },
  rowDate: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  rowMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: theme.space(1),
  },
  rowDelete: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: "600",
    paddingLeft: theme.space(3),
  },
  pressed: {
    opacity: 0.6,
  },
});
