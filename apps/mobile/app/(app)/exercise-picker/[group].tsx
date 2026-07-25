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
  const { library, pick, meta, dismiss } = useExercisePicker(addTo);

  const exercises = useMemo(() => exercisesInGroup(library, group), [library, group]);

  return (
    <>
      <Stack.Screen
        options={{
          title: group,
          headerBackVisible: false,
          headerLeft: () => <HeaderButton label="Back" onPress={() => router.back()} />,
          headerRight: () => <HeaderButton label="Done" prominent onPress={dismiss} />,
        }}
      />
      <ExerciseList
        exercises={exercises}
        showAdd
        empty="No exercises in this group yet."
        meta={meta}
        onSelect={pick}
      />
    </>
  );
}
