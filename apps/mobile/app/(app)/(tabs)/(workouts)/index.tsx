import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMinimizedBarClearance } from "../../../../src/components/MinimizedWorkoutBar";
import { Button, common, EmptyState, SectionLabel } from "../../../../src/components/ui";
import { dayKey, WeekCalendar } from "../../../../src/components/WeekCalendar";
import { theme } from "../../../../src/theme";
import { totalSets, totalVolume, type Workout } from "../../../../src/workouts/types";
import { toDisplayWeight, type WeightUnit } from "../../../../src/workouts/units";
import { useWorkouts } from "../../../../src/workouts/WorkoutContext";

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

export default function WorkoutsTab() {
  const { workouts, active, unit, startWorkout, deleteWorkout } = useWorkouts();
  const [selectedTs, setSelectedTs] = useState(todayMidnight);
  const clearance = useMinimizedBarClearance();

  const start = () => {
    startWorkout();
    router.push("/workout");
  };

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
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      data={dayWorkouts}
      keyExtractor={(w) => w.id}
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: clearance + theme.space(6) }]}
      ListHeaderComponent={
        <>
          <SectionLabel tone="accent">Progressive overload</SectionLabel>
          {active ? (
            <>
              <Button title="Workout in progress" disabled />
              <Text style={styles.banner}>Finish your current workout to start a new one.</Text>
            </>
          ) : (
            <>
              <Button title="Start workout" onPress={start} />
              <Button
                title="Start workout from template"
                variant="secondary"
                onPress={() => router.push("/template-picker")}
                style={styles.startSecondary}
              />
            </>
          )}

          <SectionLabel style={styles.sectionLabel}>History</SectionLabel>
          <WeekCalendar selectedKey={selectedKey} marked={marked} onSelect={setSelectedTs} />

          <Text style={styles.dayLabel}>{fmtDayLabel(selectedTs)}</Text>
        </>
      }
      ListEmptyComponent={
        <EmptyState title="No workouts on this day" systemImage="calendar.badge.exclamationmark" />
      }
      renderItem={({ item }) => (
        <HistoryRow
          workout={item}
          unit={unit}
          onOpen={() => router.push({ pathname: "/workout-detail", params: { id: item.id } })}
          onDelete={() => confirmDelete(item)}
        />
      )}
    />
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
    <View style={[common.surface, styles.row]}>
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
  banner: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: theme.space(2),
  },
  startSecondary: {
    marginTop: theme.space(3),
  },
  sectionLabel: {
    marginTop: theme.space(7),
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
    paddingHorizontal: theme.gutter,
    gap: theme.space(2),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
});
