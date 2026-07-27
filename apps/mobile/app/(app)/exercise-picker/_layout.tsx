import { Stack } from "expo-router";
import { modalStackOptions } from "../../../src/navigation/headerOptions";

export default function ExercisePickerLayout() {
  return <Stack screenOptions={modalStackOptions} />;
}
