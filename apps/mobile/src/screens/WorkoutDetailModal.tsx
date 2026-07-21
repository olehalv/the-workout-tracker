import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MusclesTrainedCard, StrengthSummaryCard } from "../components/WorkoutRecap";
import { theme } from "../theme";
import { elapsedMs, formatDuration, formatTimeOfDay } from "../workouts/time";
import { templateSeed, totalSets, totalVolume, type Workout } from "../workouts/types";
import { toDisplayWeight } from "../workouts/units";
import { useWorkouts } from "../workouts/WorkoutContext";
import { PresetFormModal } from "./PresetFormModal";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Read-only view of a finished workout: totals plus every exercise, set, note. */
export function WorkoutDetailModal({
  workout,
  onClose,
}: {
  workout: Workout | null;
  onClose: () => void;
}) {
  const { unit } = useWorkouts();
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const duration =
    workout?.finishedAt != null ? elapsedMs(workout.startedAt, workout.finishedAt) : null;

  return (
    <Modal
      visible={workout !== null}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <Text style={styles.eyebrow}>Workout</Text>
            <Text style={styles.title}>{workout ? fmtDate(workout.startedAt) : ""}</Text>
            {workout ? (
              <Text style={styles.subtitle}>
                {formatTimeOfDay(workout.startedAt)}
                {workout.finishedAt != null ? ` → ${formatTimeOfDay(workout.finishedAt)}` : ""}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>

        {workout ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.statsRow}>
              <Stat label="Exercises" value={`${workout.exercises.length}`} />
              <Stat label="Sets" value={`${totalSets(workout)}`} />
              <Stat
                label="Volume"
                value={`${Math.round(toDisplayWeight(totalVolume(workout), unit))} ${unit}`}
              />
              {duration !== null ? (
                <Stat label="Duration" value={formatDuration(duration)} />
              ) : null}
            </View>

            <MusclesTrainedCard workout={workout} />
            <StrengthSummaryCard workout={workout} />

            <Text style={styles.sectionLabel}>Exercises</Text>
            {workout.exercises.map((ex) => (
              <View key={ex.id} style={styles.card}>
                <Text style={styles.cardTitle}>{ex.name}</Text>
                {ex.sets.map((s, i) => (
                  <View key={s.id} style={styles.setRow}>
                    <Text style={styles.setIndex}>{i + 1}</Text>
                    <Text style={styles.setText}>
                      {s.reps} reps × {toDisplayWeight(s.weight, unit)} {unit}
                    </Text>
                  </View>
                ))}
                {ex.note ? <Text style={styles.note}>{ex.note}</Text> : null}
              </View>
            ))}

            {workout.exercises.length > 0 ? (
              <Pressable
                onPress={() => setSavePresetOpen(true)}
                hitSlop={6}
                style={styles.savePreset}
              >
                <Text style={styles.savePresetText}>Save as template</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}
      </View>

      <PresetFormModal
        visible={savePresetOpen}
        preset={null}
        initialExercises={workout ? templateSeed(workout) : []}
        onClose={() => setSavePresetOpen(false)}
      />
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: theme.space(5),
  },
  headerMain: {
    flex: 1,
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
    fontSize: 22,
    fontWeight: "700",
    marginTop: theme.space(1),
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: theme.space(1),
  },
  close: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: "600",
    paddingLeft: theme.space(3),
  },
  scrollContent: {
    paddingBottom: theme.space(10),
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.space(3),
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space(3),
    marginBottom: theme.space(6),
  },
  stat: {
    flexGrow: 1,
    flexBasis: "40%",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(4),
    paddingHorizontal: theme.space(4),
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(4),
    marginBottom: theme.space(3),
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "600",
    marginBottom: theme.space(2),
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.space(1),
    gap: theme.space(3),
  },
  setIndex: {
    color: theme.colors.textMuted,
    fontSize: 13,
    width: 18,
  },
  setText: {
    color: theme.colors.text,
    fontSize: 15,
  },
  note: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontStyle: "italic",
    marginTop: theme.space(2),
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
});
