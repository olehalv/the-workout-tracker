import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LineChart } from "../components/LineChart";
import { ProGate } from "../components/ProGate";
import { usePurchases } from "../purchases/PurchaseContext";
import { theme } from "../theme";
import type { LibraryExercise, ProgressPoint } from "../workouts/types";
import { toDisplayWeight, type WeightUnit } from "../workouts/units";
import { useWorkouts } from "../workouts/WorkoutContext";

function fmtShort(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Progress view for a single library exercise: a progression line of the top-set
 * weight across every session it appears in, plus a reverse-chronological history
 * of previous sessions (best set + volume) — the "previous weight tracked" record.
 */
export function ExerciseProgressModal({
  exercise,
  onClose,
}: {
  exercise: LibraryExercise | null;
  onClose: () => void;
}) {
  const { progressFor, unit } = useWorkouts();
  const { isPro } = usePurchases();

  const points = useMemo(() => (exercise ? progressFor(exercise.id) : []), [exercise, progressFor]);

  // Show at most the last 12 sessions in the chart so points stay legible.
  const chartData = points.slice(-12).map((p) => ({
    key: p.workoutId,
    label: fmtShort(p.date),
    value: toDisplayWeight(p.topWeight, unit),
  }));

  const best = toDisplayWeight(
    points.reduce((m, p) => Math.max(m, p.topWeight), 0),
    unit,
  );
  const first = points[0]?.topWeight ?? 0;
  const latest = toDisplayWeight(points[points.length - 1]?.topWeight ?? 0, unit);
  const delta = toDisplayWeight((points[points.length - 1]?.topWeight ?? 0) - first, unit);

  return (
    <Modal
      visible={exercise !== null}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <Text style={styles.eyebrow}>Progress</Text>
            <Text style={styles.title}>{exercise?.name}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>

        {points.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>
              No history yet. Log this exercise in a workout to see progress here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.statsRow}>
              <Stat label="Best" value={`${best} ${unit}`} />
              <Stat label="Latest" value={`${latest} ${unit}`} />
              <Stat
                label="Since first"
                value={`${delta >= 0 ? "+" : ""}${delta} ${unit}`}
                accent={delta > 0}
              />
            </View>

            <Text style={styles.sectionLabel}>Top-set weight over time ({unit})</Text>
            <ProGate locked={!isPro} style={styles.chartGate}>
              <View style={styles.chartCard}>
                <LineChart data={chartData} />
              </View>
            </ProGate>

            <Text style={styles.sectionLabel}>History</Text>
            {(() => {
              const history = [...points].reverse();
              const [latestPoint, ...older] = history;
              return (
                <>
                  {/* Latest session stays visible; earlier history is Pro-gated. */}
                  <HistoryRow point={latestPoint} unit={unit} />
                  {older.length > 0 ? (
                    <ProGate locked={!isPro}>
                      {older.map((p) => (
                        <HistoryRow key={p.workoutId} point={p} unit={unit} />
                      ))}
                    </ProGate>
                  ) : null}
                </>
              );
            })()}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function HistoryRow({ point, unit }: { point: ProgressPoint; unit: WeightUnit }) {
  return (
    <View style={styles.historyRow}>
      <Text style={styles.historyDate}>{fmtShort(point.date)}</Text>
      <Text style={styles.historyMeta}>
        {point.topReps} × {toDisplayWeight(point.topWeight, unit)} {unit} · {point.sets} sets ·{" "}
        {Math.round(toDisplayWeight(point.volume, unit))} {unit} vol
      </Text>
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statAccent]}>{value}</Text>
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
    fontSize: 26,
    fontWeight: "700",
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
  statsRow: {
    flexDirection: "row",
    gap: theme.space(3),
    marginBottom: theme.space(6),
  },
  stat: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(4),
    paddingHorizontal: theme.space(3),
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  statAccent: {
    color: theme.colors.accent,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: theme.space(1),
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.space(3),
  },
  chartGate: {
    marginBottom: theme.space(6),
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(4),
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.space(3),
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyDate: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  historyMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: theme.space(20),
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
