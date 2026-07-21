import Ionicons from "@expo/vector-icons/Ionicons";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { type ComponentProps, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ExercisesScreen } from "../screens/ExercisesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RestPill } from "../screens/RestPill";
import { ResumeBar } from "../screens/ResumeBar";
import { TemplatesScreen } from "../screens/TemplatesScreen";
import { WorkoutsScreen } from "../screens/WorkoutsScreen";
import { theme } from "../theme";
import { useRestTimer } from "../workouts/RestTimerContext";
import { useWorkouts } from "../workouts/WorkoutContext";
import { GLASS_TAB_BAR_CLEARANCE, liquidGlassTabs } from "./tabBar";

type TabKey = "workouts" | "templates" | "exercises" | "profile";
type IconName = ComponentProps<typeof Ionicons>["name"];

const TABS: Array<{ key: TabKey; label: string; icon: IconName; iconActive: IconName }> = [
  { key: "workouts", label: "Workouts", icon: "barbell-outline", iconActive: "barbell" },
  { key: "templates", label: "Templates", icon: "clipboard-outline", iconActive: "clipboard" },
  { key: "exercises", label: "Exercises", icon: "stats-chart-outline", iconActive: "stats-chart" },
  { key: "profile", label: "Me", icon: "person-outline", iconActive: "person" },
];

/**
 * Bottom tab shell. A lightweight custom tab bar (no navigation library / native
 * module) that swaps between the three top-level screens. The active workout is
 * shown full-screen elsewhere and takes over these tabs until minimized/finished.
 */
export function AppTabs() {
  const { isLoaded, active } = useWorkouts();
  const { running } = useRestTimer();
  const [tab, setTab] = useState<TabKey>("workouts");

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.textMuted} />
      </View>
    );
  }

  const renderTab = ({ key, label, icon, iconActive }: (typeof TABS)[number], glass: boolean) => {
    const selected = tab === key;
    // On the glass bar the selected tab sits on an accent pill, so its icon/label
    // go white for contrast; the plain bar keeps the accent-on-dark selected look.
    const onPill = glass && selected;
    const color = onPill ? "#FFFFFF" : selected ? theme.colors.accent : theme.colors.textMuted;
    return (
      <Pressable
        key={key}
        style={styles.tab}
        onPress={() => setTab(key)}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
      >
        {/* iOS 26 selected-tab pill: an accent glass surface the GlassContainer
            merges with the bar. `backgroundColor` is the fallback so it still reads
            as a solid accent pill on runtimes where the glass effect doesn't paint. */}
        {onPill ? (
          <GlassView
            style={styles.selectedPill}
            glassEffectStyle="regular"
            tintColor={theme.colors.accent}
            colorScheme="dark"
            pointerEvents="none"
          />
        ) : null}
        <Ionicons name={selected ? iconActive : icon} size={22} color={color} />
        <Text
          style={[
            styles.tabLabel,
            selected && styles.tabLabelActive,
            onPill && styles.tabLabelOnPill,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {tab === "workouts" ? <WorkoutsScreen /> : null}
        {tab === "templates" ? <TemplatesScreen /> : null}
        {tab === "exercises" ? <ExercisesScreen /> : null}
        {tab === "profile" ? <ProfileScreen /> : null}
      </View>

      {/* Floating workout control: the rest-timer pill takes priority; otherwise,
          off the Workouts tab (which has its own resume button), offer Resume.
          Lifted above the glass capsule so it doesn't sit behind the floating bar. */}
      <View style={liquidGlassTabs ? styles.floatingAboveGlass : null}>
        {running ? <RestPill /> : active && tab !== "workouts" ? <ResumeBar /> : null}
      </View>

      {liquidGlassTabs ? (
        // iOS 26+: a floating Liquid Glass capsule; the screens above scroll behind
        // it. The GlassContainer lets the selected-tab pill merge into the bar.
        <GlassContainer spacing={16} style={styles.glassTabBar}>
          <GlassView
            style={styles.glassBarBg}
            glassEffectStyle="regular"
            colorScheme="dark"
            pointerEvents="none"
          />
          <View style={styles.glassRow}>{TABS.map((t) => renderTab(t, true))}</View>
        </GlassContainer>
      ) : (
        <View style={styles.tabBar}>{TABS.map((t) => renderTab(t, false))}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.background,
    paddingTop: theme.space(1),
    paddingBottom: theme.space(2),
  },
  // iOS 26+ floating glass capsule: absolute so tab content scrolls beneath it.
  glassTabBar: {
    position: "absolute",
    left: theme.space(4),
    right: theme.space(4),
    bottom: theme.space(2),
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  // The bar's own glass, filling the capsule. `backgroundColor` is the fallback so
  // the floating bar still has a solid surface where the glass effect doesn't paint.
  glassBarBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.surface,
  },
  glassRow: {
    flexDirection: "row",
    paddingVertical: theme.space(2),
  },
  // Accent pill behind the selected tab's icon/label (glass-frosted when supported,
  // solid accent otherwise).
  selectedPill: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: theme.space(2),
    right: theme.space(2),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
  },
  // Keeps the Resume/Rest pill clear of the floating capsule.
  floatingAboveGlass: {
    marginBottom: GLASS_TAB_BAR_CLEARANCE,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.space(1),
    gap: theme.space(1),
  },
  tabLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: theme.colors.accent,
  },
  tabLabelOnPill: {
    color: "#FFFFFF",
  },
});
