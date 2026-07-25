import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ExerciseList, exercisesInGroup } from "../../../src/components/ExerciseBrowser";
import { HeaderButton } from "../../../src/components/ui";
import { type PickerTarget, useExercisePicker } from "../../../src/navigation/useExercisePicker";

export default function PickerMuscleGroupRoute() {
  const { group, addTo = "workout" } = useLocalSearchParams<{
    group: string;
    addTo?: PickerTarget;
  }>();
  const { library, meta, toggle, isSelected, count, commit } = useExercisePicker(addTo);

  const exercises = useMemo(() => exercisesInGroup(library, group), [library, group]);

  return (
    <>
      <Stack.Screen
        options={{
          title: group,
          headerBackVisible: false,
          headerLeft: () => <HeaderButton label="Back" onPress={() => router.back()} />,
          headerRight: () => (
            <HeaderButton
              label={count > 0 ? `Add (${count})` : "Add"}
              prominent
              disabled={count === 0}
              onPress={commit}
            />
          ),
        }}
      />
      <ExerciseList
        exercises={exercises}
        empty="No exercises in this group yet."
        meta={meta}
        isSelected={(e) => isSelected(e.id)}
        onSelect={toggle}
      />
    </>
  );
}
