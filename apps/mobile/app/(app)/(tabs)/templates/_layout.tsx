import { Stack } from "expo-router";
import { tabStackOptions } from "../../../../src/navigation/headerOptions";

export default function TemplatesStackLayout() {
  return (
    <Stack screenOptions={tabStackOptions}>
      <Stack.Screen name="index" options={{ title: "Templates" }} />
    </Stack>
  );
}
