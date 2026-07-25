import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, HeaderButton, SectionLabel, Stat, StatGrid } from "../../src/components/ui";
import { MusclesTrainedCard, StrengthSummaryCard } from "../../src/components/WorkoutRecap";
import { theme } from "../../src/theme";
import { useTemplateDraft } from "../../src/workouts/TemplateDraftContext";
import { elapsedMs, formatDuration, formatTimeOfDay } from "../../src/workouts/time";
import { templateSeed, totalSets, totalVolume } from "../../src/workouts/types";
import { toDisplayWeight } from "../../src/workouts/units";
import { useWorkouts } from "../../src/workouts/WorkoutContext";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function WorkoutDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workouts, unit } = useWorkouts();
  const draft = useTemplateDraft();

  const workout = workouts.find((w) => w.id === id) ?? null;
  if (!workout) return <Redirect href="/" />;

  const duration =
    workout.finishedAt != null ? elapsedMs(workout.startedAt, workout.finishedAt) : null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: fmtDate(workout.startedAt),
          headerRight: () => <HeaderButton label="Done" prominent onPress={() => router.back()} />,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.times}>
          {formatTimeOfDay(workout.startedAt)}
          {workout.finishedAt != null ? ` → ${formatTimeOfDay(workout.finishedAt)}` : ""}
        </Text>

        <StatGrid style={styles.statsRow}>
          <Stat style={styles.statTile} label="Exercises" value={`${workout.exercises.length}`} />
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
            onPress={() => draft.openNew(templateSeed(workout))}
            hitSlop={6}
            style={styles.savePreset}
          >
            <Text style={styles.savePresetText}>Save as template</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(4),
  },
  times: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginBottom: theme.space(4),
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
