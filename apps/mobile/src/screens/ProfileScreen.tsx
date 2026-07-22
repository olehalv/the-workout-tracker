import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { BodyMap, heatRamp } from "../components/BodyMap";
import { ProGate } from "../components/ProGate";
import { tabScrollClearance } from "../navigation/tabBar";
import { usePurchases } from "../purchases/PurchaseContext";
import { PRO_TRIAL_DAYS } from "../purchases/plans";
import { theme } from "../theme";
import { muscleActivity, startOfThisWeek } from "../workouts/muscleStats";
import { type Sex, strengthProfile } from "../workouts/strengthStandards";
import { fmtWeight, fromDisplayWeight, toDisplayWeight } from "../workouts/units";
import { useWorkouts } from "../workouts/WorkoutContext";

const UNITS = ["kg", "lbs"] as const;
const SEXES: Array<{ key: Sex; label: string }> = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
];
const WINDOWS = [
  { key: "week", label: "This week" },
  { key: "all", label: "All time" },
] as const;
type WindowKey = (typeof WINDOWS)[number]["key"];

const LEGEND = heatRamp(6);

/** "Me" tab: account info, plan, unit preference, strength ratings, muscle map, sign out. */
export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { workouts, library, unit, setUnit, bodyweight, setBodyweight, sex, setSex } =
    useWorkouts();
  const { isPro, entitlement, trialDaysLeft, busy, openPaywall, manageSubscription } =
    usePurchases();
  const [muscleWindow, setMuscleWindow] = useState<WindowKey>("week");

  const activity = useMemo(
    () => muscleActivity(workouts, library, muscleWindow === "week" ? startOfThisWeek() : null),
    [workouts, library, muscleWindow],
  );
  const topTrained = activity.ranked.filter((m) => m.sets > 0).slice(0, 3);

  const strength = useMemo(
    () => strengthProfile(workouts, bodyweight, sex ?? "male"),
    [workouts, bodyweight, sex],
  );
  const strengthReady = bodyweight !== null && sex !== null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, tabScrollClearance]}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Account</Text>
        <Text style={styles.title}>{user?.email ?? "Apple account"}</Text>
        <View style={[styles.planBadge, isPro ? styles.planPro : styles.planFree]}>
          <Text style={[styles.planText, isPro && styles.planTextPro]}>
            {isPro ? "Pro plan" : "Free plan"}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Strength ratings</Text>
      <ProGate locked={!isPro} style={styles.strengthCard}>
        <View style={styles.bwRow}>
          <View style={styles.bwField}>
            <Text style={styles.fieldLabel}>Bodyweight</Text>
            <View style={styles.bwInputWrap}>
              <BodyweightInput
                key={unit}
                bodyweightKg={bodyweight}
                unit={unit}
                onChangeKg={setBodyweight}
              />
              <Text style={styles.bwUnit}>{unit}</Text>
            </View>
          </View>
          <View style={styles.bwField}>
            <Text style={styles.fieldLabel}>Sex</Text>
            <View style={styles.sexSegment}>
              {SEXES.map((s) => {
                const active = sex === s.key;
                return (
                  <Pressable
                    key={s.key}
                    style={[styles.sexBtn, active && styles.sexBtnActive]}
                    onPress={() => setSex(s.key)}
                  >
                    <Text style={[styles.sexText, active && styles.sexTextActive]}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {!strengthReady ? (
          <Text style={styles.strengthHint}>
            Enter your bodyweight and sex to rate your main lifts against general strength
            standards.
          </Text>
        ) : strength.ratedCount === 0 ? (
          <Text style={styles.strengthHint}>
            Log Squat, Bench Press, Deadlift, or Overhead Press to see your rating.
          </Text>
        ) : (
          <View style={styles.overall}>
            <View>
              <Text style={styles.overallLabel}>Overall</Text>
              <Text style={styles.overallTier}>{strength.overallTier}</Text>
            </View>
            <Text style={styles.overallScore}>{strength.overallScore}</Text>
          </View>
        )}

        {strengthReady ? (
          <View style={styles.liftList}>
            {strength.lifts.map((l) => (
              <View key={l.key} style={styles.liftRow}>
                <View style={styles.liftHead}>
                  <Text style={styles.liftName}>{l.label}</Text>
                  {l.tier ? (
                    <Text style={styles.liftTier}>{l.tier}</Text>
                  ) : (
                    <Text style={styles.liftUnrated}>Not logged</Text>
                  )}
                </View>
                <View style={styles.liftBar}>
                  <View style={[styles.liftBarFill, { width: `${l.score}%` }]} />
                </View>
                <View style={styles.liftHead}>
                  <Text style={styles.liftMeta}>
                    {l.e1rm ? `Est. 1RM ${fmtWeight(l.e1rm, unit)}` : "—"}
                  </Text>
                  {l.kgToNext !== null && l.nextTier ? (
                    <Text style={styles.liftMeta}>
                      {fmtWeight(l.kgToNext, unit)} to {l.nextTier}
                    </Text>
                  ) : l.tier === "Elite" ? (
                    <Text style={styles.liftMeta}>Elite 💪</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ProGate>

      <View style={styles.muscleHeader}>
        <Text style={styles.sectionLabel}>Muscle activity</Text>
        <View style={styles.windowSegment}>
          {WINDOWS.map((w) => {
            const active = muscleWindow === w.key;
            return (
              <Pressable
                key={w.key}
                style={[styles.windowBtn, active && styles.windowBtnActive]}
                onPress={() => setMuscleWindow(w.key)}
              >
                <Text style={[styles.windowText, active && styles.windowTextActive]}>
                  {w.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ProGate locked={!isPro} style={styles.muscleCard}>
        <BodyMap activity={activity} sex={sex ?? "male"} />
        {activity.totalSets === 0 ? (
          <Text style={styles.muscleEmpty}>
            {muscleWindow === "week"
              ? "No sets logged this week yet. Train to light up your muscle map."
              : "Log a workout to see which muscles you've been hitting."}
          </Text>
        ) : (
          <>
            <View style={styles.legend}>
              <Text style={styles.legendLabel}>Less</Text>
              <View style={styles.legendBar}>
                {LEGEND.map((c) => (
                  <View key={c} style={[styles.legendSwatch, { backgroundColor: c }]} />
                ))}
              </View>
              <Text style={styles.legendLabel}>More</Text>
            </View>

            <View style={styles.rankList}>
              <Text style={styles.rankHeading}>Most trained</Text>
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
          </>
        )}
      </ProGate>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{workouts.length}</Text>
          <Text style={styles.statLabel}>Workouts logged</Text>
        </View>
      </View>

      {isPro ? (
        <View style={styles.proCard}>
          <View style={styles.proHeader}>
            <Text style={styles.proTitle}>Pro unlocked</Text>
            {entitlement.source === "trial" ? (
              <Text style={styles.proTrial}>
                {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} of free trial left
              </Text>
            ) : null}
          </View>
          <Text style={styles.proBody}>
            {entitlement.source === "trial"
              ? "You're on the free trial — no payment details needed. Subscribe before it ends to keep everything."
              : entitlement.cancelAtPeriodEnd
                ? "Your subscription is set to end at the close of the current period."
                : "Progression charts, full history, the muscle map and strength ratings are all yours."}
          </Text>
          {/* On the free trial there's no Stripe customer yet, so offer the
              upgrade instead of a billing portal that has nothing in it. */}
          {entitlement.source === "trial" ? (
            <Pressable
              style={({ pressed }) => [styles.manageBtn, pressed && styles.pressed]}
              onPress={openPaywall}
            >
              <Text style={styles.manageText}>Subscribe</Text>
            </Pressable>
          ) : entitlement.canManageBilling ? (
            <Pressable
              style={({ pressed }) => [styles.manageBtn, pressed && styles.pressed]}
              onPress={manageSubscription}
              disabled={busy}
            >
              <Text style={styles.manageText}>Manage subscription</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.goPro, pressed && styles.pressed]}
          onPress={openPaywall}
        >
          <Text style={styles.goProTitle}>Unlock everything with Pro</Text>
          <Text style={styles.goProBody}>
            {entitlement.trialEligible
              ? `Charts, full history, muscle map & strength ratings. ${PRO_TRIAL_DAYS} days free — no card required.`
              : "Charts, full history, muscle map & strength ratings. From $0.83/month, cancel anytime."}
          </Text>
          <View style={styles.goProCta}>
            <Text style={styles.goProCtaText}>
              {entitlement.trialEligible ? "Start free trial" : "See plans"}
            </Text>
          </View>
        </Pressable>
      )}

      <Text style={styles.sectionLabel}>Units</Text>
      <View style={styles.segment}>
        {UNITS.map((u) => {
          const active = unit === u;
          return (
            <Pressable
              key={u}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => setUnit(u)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {u.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        onPress={signOut}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

/**
 * Bodyweight entry. Seeds its text from the stored kg value converted to the
 * active unit; remounted (via `key={unit}`) when the unit changes so the shown
 * number always matches the unit. Empty input clears the stored bodyweight.
 */
function BodyweightInput({
  bodyweightKg,
  unit,
  onChangeKg,
}: {
  bodyweightKg: number | null;
  unit: (typeof UNITS)[number];
  onChangeKg: (kg: number | null) => void;
}) {
  const [text, setText] = useState(
    bodyweightKg !== null ? String(toDisplayWeight(bodyweightKg, unit)) : "",
  );
  return (
    <TextInput
      style={styles.bwInput}
      placeholder="—"
      placeholderTextColor={theme.colors.textMuted}
      keyboardType="decimal-pad"
      value={text}
      onChangeText={(t) => {
        setText(t);
        const n = Number.parseFloat(t.replace(",", "."));
        onChangeKg(Number.isFinite(n) && n > 0 ? fromDisplayWeight(n, unit) : null);
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.space(6),
    paddingTop: theme.space(12),
    paddingBottom: theme.space(6),
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
    fontSize: 22,
    fontWeight: "700",
    marginTop: theme.space(2),
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.space(3),
  },
  segment: {
    flexDirection: "row",
    gap: theme.space(2),
    marginBottom: theme.space(5),
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.space(3),
    borderRadius: theme.radius.md,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.surface,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  segmentText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  strengthCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(5),
    marginBottom: theme.space(4),
  },
  bwRow: {
    flexDirection: "row",
    gap: theme.space(4),
  },
  bwField: {
    flex: 1,
  },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.space(2),
  },
  bwInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space(3),
    height: 40,
  },
  bwInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    padding: 0,
  },
  bwUnit: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  sexSegment: {
    flexDirection: "row",
    gap: theme.space(1),
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.sm,
    padding: 2,
    height: 40,
  },
  sexBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm - 2,
  },
  sexBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  sexText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  sexTextActive: {
    color: "#FFFFFF",
  },
  strengthHint: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.space(4),
  },
  overall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.space(5),
    paddingTop: theme.space(4),
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    marginTop: theme.space(5),
    gap: theme.space(4),
  },
  liftRow: {
    gap: theme.space(2),
  },
  liftHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liftName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  liftTier: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  liftUnrated: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  liftBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.background,
    overflow: "hidden",
  },
  liftBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  liftMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  planBadge: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(1),
    marginTop: theme.space(3),
  },
  planFree: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  planPro: {
    backgroundColor: theme.colors.accent,
  },
  planText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  planTextPro: {
    color: "#FFFFFF",
  },
  muscleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space(3),
  },
  windowSegment: {
    flexDirection: "row",
    gap: theme.space(1),
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: 2,
  },
  windowBtn: {
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(1),
    borderRadius: theme.radius.sm,
  },
  windowBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  windowText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  windowTextActive: {
    color: "#FFFFFF",
  },
  muscleCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(5),
    marginBottom: theme.space(4),
  },
  muscleEmpty: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: theme.space(4),
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
  rankHeading: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.space(1),
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
  statsRow: {
    flexDirection: "row",
    gap: theme.space(3),
    marginBottom: theme.space(4),
  },
  stat: {
    flex: 1,
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
  proCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(4),
    marginBottom: theme.space(4),
  },
  proHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space(2),
  },
  proTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  proTrial: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  proBody: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  manageBtn: {
    marginTop: theme.space(4),
    alignSelf: "flex-start",
  },
  manageText: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  goPro: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(5),
    marginBottom: theme.space(4),
  },
  goProTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  goProBody: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: theme.space(2),
  },
  goProCta: {
    marginTop: theme.space(4),
    alignSelf: "flex-start",
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(5),
    paddingVertical: theme.space(3),
  },
  goProCtaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  signOut: {
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space(4),
    alignItems: "center",
  },
  signOutText: {
    color: theme.colors.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.6,
  },
});
