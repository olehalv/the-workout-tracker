import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MusclesTrainedCard, StrengthSummaryCard } from "../components/WorkoutRecap";
import { theme } from "../theme";
import { elapsedMs, formatDuration, formatTimeOfDay } from "../workouts/time";
import { templateSeed, topSet, totalSets, totalVolume, type Workout } from "../workouts/types";
import { fmtWeight } from "../workouts/units";
import { useWorkouts } from "../workouts/WorkoutContext";
import { PresetFormModal } from "./PresetFormModal";

interface PersonalRecord {
  name: string;
  weight: number;
  reps: number;
}

/** Exercises in `finished` whose heaviest set beat their best in every prior workout. */
function newPRs(finished: Workout, workouts: Workout[]): PersonalRecord[] {
  const prevBest = new Map<string, number>();
  for (const w of workouts) {
    if (w.id === finished.id) continue;
    for (const ex of w.exercises) {
      const t = topSet(ex);
      if (t) prevBest.set(ex.exerciseId, Math.max(prevBest.get(ex.exerciseId) ?? 0, t.weight));
    }
  }
  // Best set this session per exercise (heaviest weight).
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

/**
 * Post-workout summary shown right after finishing. Free (no Pro gate): a recap
 * of the session's stats, personal records, the muscles it trained (same body
 * map as the Me tab), and a strength read-out.
 */
export function WorkoutSummaryScreen() {
  const { summary, dismissSummary, workouts, unit } = useWorkouts();
  const [savePresetOpen, setSavePresetOpen] = useState(false);

  const prs = useMemo(() => (summary ? newPRs(summary, workouts) : []), [summary, workouts]);

  if (!summary) return null;

  const duration = formatDuration(elapsedMs(summary.startedAt, summary.finishedAt ?? Date.now()));
  const stats: Array<{ label: string; value: string }> = [
    { label: "Duration", value: duration },
    { label: "Exercises", value: String(summary.exercises.length) },
    { label: "Sets", value: String(totalSets(summary)) },
    { label: "Volume", value: fmtWeight(totalVolume(summary), unit) },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Workout complete</Text>
        <Text style={styles.title}>Nice work 💪</Text>
        <Text style={styles.subtitle}>
          Finished at {formatTimeOfDay(summary.finishedAt ?? Date.now())}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {prs.length > 0 ? (
        <View style={styles.prCard}>
          <Text style={styles.prCardTitle}>🏆 New personal records</Text>
          {prs.map((pr) => (
            <View key={pr.name} style={styles.prRow}>
              <Text style={styles.prName}>{pr.name}</Text>
              <Text style={styles.prValue}>
                {fmtWeight(pr.weight, unit)} × {pr.reps}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <MusclesTrainedCard workout={summary} />
      <StrengthSummaryCard workout={summary} />

      <Pressable
        style={({ pressed }) => [styles.done, pressed && styles.pressed]}
        onPress={dismissSummary}
      >
        <Text style={styles.doneText}>Done</Text>
      </Pressable>

      {summary.exercises.length > 0 ? (
        <Pressable onPress={() => setSavePresetOpen(true)} hitSlop={6} style={styles.savePreset}>
          <Text style={styles.savePresetText}>Save as template</Text>
        </Pressable>
      ) : null}

      <PresetFormModal
        visible={savePresetOpen}
        preset={null}
        initialExercises={templateSeed(summary)}
        onClose={() => setSavePresetOpen(false)}
      />
    </ScrollView>
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space(3),
    marginBottom: theme.space(4),
  },
  stat: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(4),
    paddingHorizontal: theme.space(4),
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: theme.space(1),
  },
  prCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(5),
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
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(4),
    alignItems: "center",
    marginTop: theme.space(2),
  },
  doneText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
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
  pressed: {
    opacity: 0.6,
  },
});
