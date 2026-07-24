import { useMemo } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { LineChart } from "../components/LineChart";
import { ProGate } from "../components/ProGate";
import { Card, ScreenHeader, SectionLabel, Stat, StatGrid } from "../components/ui";
import { usePurchases } from "../purchases/PurchaseContext";
import { theme } from "../theme";
import type { LibraryExercise, ProgressPoint } from "../workouts/types";
import { toDisplayWeight, type WeightUnit } from "../workouts/units";
import { useWorkouts } from "../workouts/WorkoutContext";

function fmtShort(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Top-set progression line + reverse-chronological session history for one exercise.
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
        <ScreenHeader
          eyebrow="Progress"
          title={exercise?.name ?? ""}
          titleSize={26}
          action={{ label: "Done", onPress: onClose }}
          style={styles.header}
        />

        {points.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>
              No history yet. Log this exercise in a workout to see progress here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <StatGrid style={styles.statsRow}>
              <Stat style={styles.statTile} valueSize={18} label="Best" value={`${best} ${unit}`} />
              <Stat
                style={styles.statTile}
                valueSize={18}
                label="Latest"
                value={`${latest} ${unit}`}
              />
              <Stat
                style={styles.statTile}
                valueSize={18}
                label="Since first"
                value={`${delta >= 0 ? "+" : ""}${delta} ${unit}`}
                accent={delta > 0}
              />
            </StatGrid>

            <SectionLabel>Top-set weight over time ({unit})</SectionLabel>
            <ProGate locked={!isPro} style={styles.chartGate}>
              <Card>
                <LineChart data={chartData} />
              </Card>
            </ProGate>

            <SectionLabel>History</SectionLabel>
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
    flexWrap: "nowrap",
    marginBottom: theme.space(6),
  },
  statTile: {
    flex: 1,
  },
  chartGate: {
    marginBottom: theme.space(6),
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
