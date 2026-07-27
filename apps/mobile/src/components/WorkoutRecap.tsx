import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";
import { muscleActivity } from "../workouts/muscleStats";
import { RATED_LIFTS, strengthProfile } from "../workouts/strengthStandards";
import type { Workout } from "../workouts/types";
import { fmtWeight } from "../workouts/units";
import { useWorkouts } from "../workouts/WorkoutContext";
import { BodyMap, heatRamp } from "./BodyMap";
import { Card, SectionLabel } from "./ui";

const LEGEND = heatRamp(6);

export function MusclesTrainedCard({ workout }: { workout: Workout }) {
  const { library, sex } = useWorkouts();
  const activity = useMemo(() => muscleActivity([workout], library, null), [workout, library]);
  const topTrained = activity.ranked.filter((m) => m.sets > 0).slice(0, 3);

  return (
    <>
      <SectionLabel>Muscles trained</SectionLabel>
      <Card padding={5} style={styles.card}>
        <BodyMap activity={activity} sex={sex ?? "male"} />
        <View style={styles.legend}>
          <Text style={styles.legendLabel}>Less</Text>
          <View style={styles.legendBar}>
            {LEGEND.map((c) => (
              <View key={c} style={[styles.legendSwatch, { backgroundColor: c }]} />
            ))}
          </View>
          <Text style={styles.legendLabel}>More</Text>
        </View>
        {topTrained.length > 0 ? (
          <View style={styles.rankList}>
            {topTrained.map((m, i) => (
              <View key={m.group} style={styles.rankRow}>
                <Text style={styles.rankPos}>{i + 1}</Text>
                <Text style={styles.rankName}>{m.group}</Text>
                <Text style={styles.rankSets}>
                  {m.sets} set{m.sets === 1 ? "" : "s"}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </>
  );
}

export function StrengthSummaryCard({ workout }: { workout: Workout }) {
  const { bodyweight, sex, unit } = useWorkouts();
  const profile = useMemo(
    () => strengthProfile([workout], bodyweight, sex ?? "male"),
    [workout, bodyweight, sex],
  );
  const strengthReady = bodyweight !== null && sex !== null;
  const trainedNames = new Set(workout.exercises.map((e) => e.name.trim().toLowerCase()));
  const trainedLifts = RATED_LIFTS.filter((l) => l.names.some((n) => trainedNames.has(n))).map(
    (l) => ({ lift: l, rating: profile.lifts.find((r) => r.key === l.key) }),
  );

  return (
    <>
      <SectionLabel>Strength summary</SectionLabel>
      <Card padding={5} style={styles.card}>
        {strengthReady && profile.ratedCount >= 2 ? (
          <View style={styles.overall}>
            <View>
              <Text style={styles.overallLabel}>Session strength</Text>
              <Text style={styles.overallTier}>{profile.overallTier}</Text>
            </View>
            <Text style={styles.overallScore}>{profile.overallScore}</Text>
          </View>
        ) : null}

        {trainedLifts.length > 0 ? (
          <View style={styles.liftList}>
            {trainedLifts.map(({ lift, rating }) => (
              <View key={lift.key} style={styles.liftRow}>
                <Text style={styles.liftName}>{lift.label}</Text>
                <View style={styles.liftRight}>
                  {rating?.e1rm ? (
                    <Text style={styles.liftMeta}>Est. 1RM {fmtWeight(rating.e1rm, unit)}</Text>
                  ) : null}
                  {strengthReady && rating?.tier ? (
                    <Text style={styles.liftTier}>{rating.tier}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.hint}>
            No main lifts (squat, bench, deadlift, overhead press) logged in this workout.
          </Text>
        )}

        {!strengthReady ? (
          <Text style={[styles.hint, styles.hintSpaced]}>
            Add your bodyweight and sex on the Me tab to rate your lifts against strength standards.
          </Text>
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.space(4),
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
    marginTop: theme.space(5),
  },
  legendBar: {
    flex: 1,
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  legendSwatch: {
    flex: 1,
  },
  legendLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  rankList: {
    marginTop: theme.space(5),
    gap: theme.space(2),
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rankPos: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    width: 20,
  },
  rankName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  rankSets: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  overall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space(4),
    paddingBottom: theme.space(4),
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  overallLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overallTier: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: theme.space(1),
  },
  overallScore: {
    color: theme.colors.accent,
    fontSize: 34,
    fontWeight: "800",
  },
  liftList: {
    gap: theme.space(3),
  },
  liftRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liftName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  liftRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
  },
  liftMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  liftTier: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  hintSpaced: {
    marginTop: theme.space(3),
  },
});
