import { Stack } from "expo-router";
import { tabStackOptions } from "../../../../src/navigation/headerOptions";

export default function WorkoutsStackLayout() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: "Workouts" }} />
    </Stack>
  );
}
