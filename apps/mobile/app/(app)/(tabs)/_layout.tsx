import { Icon, Label } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

// The real iOS tab bar (UITabBarController) — on iOS 26 it gets the system Liquid Glass
// treatment for free. Each trigger points at a directory holding that tab's own Stack,
// which is what gives the tab a real UINavigationBar.
export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(workouts)">
        <Label>Workouts</Label>
        <Icon sf="dumbbell.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="templates">
        <Label>Templates</Label>
        <Icon sf="list.bullet.rectangle.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="exercises">
        <Label>Exercises</Label>
        <Icon sf="chart.line.uptrend.xyaxis" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Me</Label>
        <Icon sf="person.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
