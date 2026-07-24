import Ionicons from "@expo/vector-icons/Ionicons";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../auth/AuthContext";
import { BodyMap, heatRamp } from "../components/BodyMap";
import { ProGate } from "../components/ProGate";
import {
  Button,
  Card,
  common,
  GlassPressable,
  ScreenHeader,
  SectionLabel,
  Segmented,
  Stat,
} from "../components/ui";
import { tabScrollClearance } from "../navigation/tabBar";
import { usePurchases } from "../purchases/PurchaseContext";
import { PRO_TRIAL_DAYS } from "../purchases/plans";
import { isCloudBackupAvailable } from "../storage/storage";
import { theme } from "../theme";
import { muscleActivity, startOfThisWeek } from "../workouts/muscleStats";
import { type Sex, strengthProfile } from "../workouts/strengthStandards";
import { fmtWeight, fromDisplayWeight, toDisplayWeight } from "../workouts/units";
import { useWorkouts } from "../workouts/WorkoutContext";

const UNITS = [
  { key: "kg", label: "KG" },
  { key: "lbs", label: "LBS" },
] as const;

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

export function ProfileScreen() {
  const { user, signOut, deleteAccount } = useAuth();
  const { workouts, library, unit, setUnit, bodyweight, setBodyweight, sex, setSex } =
    useWorkouts();
  const { isPro, entitlement, trialDaysLeft, busy, openPaywall, manageSubscription } =
    usePurchases();
  const [muscleWindow, setMuscleWindow] = useState<WindowKey>("week");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You'll need to sign in with Apple again to use the app.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account and all workout data on this device and in iCloud. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
            } catch (err) {
              setDeleting(false);
              Alert.alert(
                "Couldn't delete account",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  // iCloud backup needs a native build; the module isn't present in Expo Go.
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const [cloudAvailable, setCloudAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    isCloudBackupAvailable().then((available) => {
      if (!cancelled) setCloudAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Account"
        title={user?.email ?? "Apple account"}
        titleSize={22}
        style={styles.header}
      >
        <View style={[styles.planBadge, isPro ? styles.planPro : styles.planFree]}>
          <Text style={[styles.planText, isPro && styles.planTextPro]}>
            {isPro ? "Pro plan" : "Free plan"}
          </Text>
        </View>
      </ScreenHeader>

      <SectionLabel>Strength ratings</SectionLabel>
      <ProGate locked={!isPro} style={[common.surface, styles.padCard, styles.cardGap]}>
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
            <Segmented
              options={SEXES}
              value={sex}
              onChange={setSex}
              variant="pill"
              stretch
              tone="background"
              style={styles.sexSegment}
            />
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
        <SectionLabel style={styles.noMargin}>Muscle activity</SectionLabel>
        <Segmented
          options={WINDOWS}
          value={muscleWindow}
          onChange={setMuscleWindow}
          variant="pill"
        />
      </View>

      <ProGate locked={!isPro} style={[common.surface, styles.padCard, styles.cardGap]}>
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
        <Stat
          style={styles.statTile}
          valueSize={24}
          value={`${workouts.length}`}
          label="Workouts logged"
        />
      </View>

      {isPro ? (
        <Card style={styles.cardGap}>
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
            <Button
              title="Subscribe"
              variant="secondary"
              size="sm"
              onPress={openPaywall}
              style={styles.manageBtn}
            />
          ) : entitlement.canManageBilling ? (
            <Button
              title="Manage subscription"
              variant="secondary"
              size="sm"
              onPress={manageSubscription}
              disabled={busy}
              style={styles.manageBtn}
            />
          ) : null}
        </Card>
      ) : (
        <GlassPressable
          onPress={openPaywall}
          style={styles.goProWrap}
          surfaceStyle={styles.goPro}
          fallbackStyle={styles.goProSolid}
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
        </GlassPressable>
      )}

      <SectionLabel>Units</SectionLabel>
      <Segmented options={UNITS} value={unit} onChange={setUnit} style={styles.unitSegment} />

      {Platform.OS === "ios" && (
        <>
          <SectionLabel>Backup</SectionLabel>
          <Card padding={5} style={styles.backupCard}>
            <View style={styles.backupRow}>
              <View
                style={[
                  styles.backupDot,
                  { backgroundColor: cloudAvailable ? theme.colors.accent : theme.colors.border },
                ]}
              />
              <Text style={styles.backupStatus}>
                {isExpoGo
                  ? "iCloud backup needs a dev build"
                  : cloudAvailable
                    ? "iCloud backup on"
                    : "iCloud backup off"}
              </Text>
            </View>
            <Text style={styles.backupHint}>
              {isExpoGo
                ? "iCloud isn't available in Expo Go. Run a development build to enable backup — your data is still saved on this device."
                : cloudAvailable
                  ? "Your workouts, exercises and templates are backed up to your iCloud, so they restore automatically on a new phone."
                  : "Sign in to iCloud in Settings to back up your data and restore it on a new phone."}
            </Text>
          </Card>
        </>
      )}

      <Button title="Sign out" variant="danger" onPress={confirmSignOut} />

      <Pressable
        style={({ pressed }) => [styles.advancedHeader, pressed && common.pressed]}
        onPress={() => setAdvancedOpen((open) => !open)}
        hitSlop={6}
      >
        <Text style={styles.advancedTitle}>Advanced</Text>
        <Ionicons
          name={advancedOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.colors.textMuted}
        />
      </Pressable>

      {advancedOpen ? (
        <View style={styles.advancedBody}>
          <Text style={styles.advancedHint}>
            Permanently delete your account and every workout, exercise and template — on this
            device and in iCloud. This can't be undone.
          </Text>
          <Button
            title={deleting ? "Deleting…" : "Delete account and all data"}
            variant="danger"
            onPress={confirmDeleteAccount}
            disabled={deleting}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

// Remounted via key={unit} on unit change so the shown number matches the unit.
function BodyweightInput({
  bodyweightKg,
  unit,
  onChangeKg,
}: {
  bodyweightKg: number | null;
  unit: (typeof UNITS)[number]["key"];
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
  padCard: {
    padding: theme.space(5),
  },
  cardGap: {
    marginBottom: theme.space(4),
  },
  noMargin: {
    marginBottom: 0,
  },
  unitSegment: {
    marginBottom: theme.space(5),
  },
  backupCard: {
    marginBottom: theme.space(5),
  },
  backupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
    marginBottom: theme.space(2),
  },
  backupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  backupStatus: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  backupHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
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
    height: 40,
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
    color: theme.colors.onAccent,
  },
  muscleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.space(3),
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
  statTile: {
    flex: 1,
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
  goProWrap: {
    marginBottom: theme.space(4),
  },
  goPro: {
    borderColor: theme.colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.space(5),
  },
  goProSolid: {
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.onAccent,
    fontSize: 15,
    fontWeight: "700",
  },
  advancedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.space(6),
    paddingTop: theme.space(4),
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  advancedTitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  advancedBody: {
    marginTop: theme.space(4),
    gap: theme.space(3),
  },
  advancedHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
