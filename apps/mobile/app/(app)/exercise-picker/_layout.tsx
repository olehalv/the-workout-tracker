import { Stack } from "expo-router";
import { modalStackOptions } from "../../../src/navigation/headerOptions";

// A navigation controller inside the modal, so drilling into a muscle group pushes
// within the sheet instead of presenting a second one on top of it.
export default function ExercisePickerLayout() {
  return <Stack screenOptions={modalStackOptions} />;
}
