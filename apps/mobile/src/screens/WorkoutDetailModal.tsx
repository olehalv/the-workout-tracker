import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, ScreenHeader, SectionLabel, Stat, StatGrid } from "../components/ui";
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
        <ScreenHeader
          eyebrow="Workout"
          title={workout ? fmtDate(workout.startedAt) : ""}
          titleSize={22}
          subtitle={
            workout
              ? `${formatTimeOfDay(workout.startedAt)}${workout.finishedAt != null ? ` → ${formatTimeOfDay(workout.finishedAt)}` : ""}`
              : undefined
          }
          action={{ label: "Done", onPress: onClose }}
          style={styles.header}
        />

        {workout ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <StatGrid style={styles.statsRow}>
              <Stat
                style={styles.statTile}
                label="Exercises"
                value={`${workout.exercises.length}`}
              />
              <Stat style={styles.statTile} label="Sets" value={`${totalSets(workout)}`} />
              <Stat
                style={styles.statTile}
                label="Volume"
                value={`${Math.round(toDisplayWeight(totalVolume(workout), unit))} ${unit}`}
              />
              {duration !== null ? (
                <Stat style={styles.statTile} label="Duration" value={formatDuration(duration)} />
              ) : null}
            </StatGrid>

            <MusclesTrainedCard workout={workout} />
            <StrengthSummaryCard workout={workout} />

            <SectionLabel>Exercises</SectionLabel>
            {workout.exercises.map((ex) => (
              <Card key={ex.id} style={styles.exerciseCard}>
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
              </Card>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(14),
  },
  header: {
    marginBottom: theme.space(5),
  },
  scrollContent: {
    paddingBottom: theme.space(10),
  },
  statsRow: {
    marginBottom: theme.space(6),
  },
  statTile: {
    flexGrow: 1,
    flexBasis: "40%",
  },
  exerciseCard: {
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
