import { Redirect, router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Stat, StatGrid } from "../../src/components/ui";
import { MusclesTrainedCard, StrengthSummaryCard } from "../../src/components/WorkoutRecap";
import { theme } from "../../src/theme";
import { useTemplateDraft } from "../../src/workouts/TemplateDraftContext";
import { elapsedMs, formatDuration, formatTimeOfDay } from "../../src/workouts/time";
import {
  templateSeed,
  topSet,
  totalSets,
  totalVolume,
  type Workout,
} from "../../src/workouts/types";
import { fmtWeight } from "../../src/workouts/units";
import { useWorkouts } from "../../src/workouts/WorkoutContext";

interface PersonalRecord {
  name: string;
  weight: number;
  reps: number;
}

// Exercises whose heaviest set beat their best in every prior workout.
function newPRs(finished: Workout, workouts: Workout[]): PersonalRecord[] {
  const prevBest = new Map<string, number>();
  for (const w of workouts) {
    if (w.id === finished.id) continue;
    for (const ex of w.exercises) {
      const t = topSet(ex);
      if (t) prevBest.set(ex.exerciseId, Math.max(prevBest.get(ex.exerciseId) ?? 0, t.weight));
    }
  }
  const bestNow = new Map<string, PersonalRecord>();
  for (const ex of finished.exercises) {
    const t = topSet(ex);
    if (!t) continue;
    const cur = bestNow.get(ex.exerciseId);
    if (!cur || t.weight > cur.weight)
      bestNow.set(ex.exerciseId, { name: ex.name, weight: t.weight, reps: t.reps });
  }
  const prs: PersonalRecord[] = [];
  for (const [id, rec] of bestNow) {
    const prev = prevBest.get(id) ?? 0;
    if (prev > 0 && rec.weight > prev) prs.push(rec);
  }
  return prs;
}

// Post-workout recap shown right after finishing. Intentionally free — no Pro gate.
export default function SummaryRoute() {
  const { summary, dismissSummary, workouts, unit } = useWorkouts();
  const draft = useTemplateDraft();
  const insets = useSafeAreaInsets();

  const prs = useMemo(() => (summary ? newPRs(summary, workouts) : []), [summary, workouts]);

  if (!summary) return <Redirect href="/" />;

  const done = () => {
    dismissSummary();
    router.back();
  };

  const duration = formatDuration(elapsedMs(summary.startedAt, summary.finishedAt ?? Date.now()));
  const stats: Array<{ label: string; value: string }> = [
    { label: "Duration", value: duration },
    { label: "Exercises", value: String(summary.exercises.length) },
    { label: "Sets", value: String(totalSets(summary)) },
    { label: "Volume", value: fmtWeight(totalVolume(summary), unit) },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Workout complete</Text>
          <Text style={styles.title}>Nice work 💪</Text>
          <Text style={styles.subtitle}>
            Finished at {formatTimeOfDay(summary.finishedAt ?? Date.now())}
          </Text>
        </View>

        <StatGrid style={styles.statsGrid}>
          {stats.map((s) => (
            <Stat
              key={s.label}
              style={styles.statTile}
              valueSize={24}
              label={s.label}
              value={s.value}
            />
          ))}
        </StatGrid>

        {prs.length > 0 ? (
          <Card padding={5} style={styles.prCard}>
            <Text style={styles.prCardTitle}>🏆 New personal records</Text>
            {prs.map((pr) => (
              <View key={pr.name} style={styles.prRow}>
                <Text style={styles.prName}>{pr.name}</Text>
                <Text style={styles.prValue}>
                  {fmtWeight(pr.weight, unit)} × {pr.reps}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        <MusclesTrainedCard workout={summary} />
        <StrengthSummaryCard workout={summary} />

        <Button title="Done" onPress={done} style={styles.done} />

        {summary.exercises.length > 0 ? (
          <Pressable
            onPress={() => draft.openNew(templateSeed(summary))}
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
  },
  content: {
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(10),
    paddingBottom: theme.space(10),
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
    fontSize: 28,
    fontWeight: "800",
    marginTop: theme.space(2),
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: theme.space(1),
  },
  statsGrid: {
    marginBottom: theme.space(4),
  },
  statTile: {
    flexGrow: 1,
    flexBasis: "45%",
  },
  prCard: {
    marginBottom: theme.space(4),
  },
  prCardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: theme.space(3),
  },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.space(1),
  },
  prName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  prValue: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  done: {
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
