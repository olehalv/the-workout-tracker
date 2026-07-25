import { Stack } from "expo-router";
import { tabStackOptions } from "../../../../src/navigation/headerOptions";

export default function ExercisesStackLayout() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: "Exercises" }} />
    </Stack>
  );
}
