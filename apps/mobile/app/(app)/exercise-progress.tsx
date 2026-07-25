import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LineChart } from "../../src/components/LineChart";
import { ProGate } from "../../src/components/ProGate";
import { Card, HeaderButton, SectionLabel, Stat, StatGrid } from "../../src/components/ui";
import { usePurchases } from "../../src/purchases/PurchaseContext";
import { theme } from "../../src/theme";
import type { ProgressPoint } from "../../src/workouts/types";
import { toDisplayWeight, type WeightUnit } from "../../src/workouts/units";
import { useWorkouts } from "../../src/workouts/WorkoutContext";

function fmtShort(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// `name` is the fallback title for an exercise that was deleted from the library
// but still appears in logged workouts.
type Params = { id: string; name?: string };

export default function ExerciseProgressRoute() {
  const { id, name } = useLocalSearchParams<Params>();
  const { library, progressFor, unit } = useWorkouts();
  const { isPro } = usePurchases();

  const libraryExercise = library.find((e) => e.id === id) ?? null;
  const points = useMemo(() => progressFor(id), [id, progressFor]);

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
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: libraryExercise?.name ?? name ?? "",
          headerLeft: () => <HeaderButton label="Back" onPress={() => router.back()} />,
          headerRight: libraryExercise
            ? () => (
                <HeaderButton
                  label="Edit"
                  prominent
                  onPress={() =>
                    router.push({ pathname: "/exercise-form", params: { id: libraryExercise.id } })
                  }
                />
              )
            : undefined,
        }}
      />

      {points.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>
            No history yet. Log this exercise in a workout to see progress here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
    paddingTop: theme.space(4),
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
