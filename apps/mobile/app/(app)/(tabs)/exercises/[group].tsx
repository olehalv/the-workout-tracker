import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ExerciseList, exercisesInGroup } from "../../../../src/components/ExerciseBrowser";
import { backHeaderItems } from "../../../../src/navigation/headerOptions";
import { useWorkouts } from "../../../../src/workouts/WorkoutContext";

export default function MuscleGroupRoute() {
  const { group } = useLocalSearchParams<{ group: string }>();
  const { library, workouts } = useWorkouts();

  // How many finished sessions reference each exercise, for a quick history hint.
  const sessionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of workouts) {
      for (const e of w.exercises) {
        if (e.sets.length > 0) counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
      }
    }
    return counts;
  }, [workouts]);

  const exercises = useMemo(() => exercisesInGroup(library, group), [library, group]);

  return (
    <>
      <Stack.Screen
        options={{
          title: group,
          headerBackVisible: false,
          unstable_headerLeftItems: backHeaderItems,
        }}
      />
      <ExerciseList
        exercises={exercises}
        empty="No exercises in this group yet."
        meta={(e) => {
          const count = sessionCounts.get(e.id) ?? 0;
          return `${e.custom ? "custom · " : ""}${count === 0 ? "no history" : `${count} session${count === 1 ? "" : "s"}`}`;
        }}
        onSelect={(e) => router.push({ pathname: "/exercise-progress", params: { id: e.id } })}
      />
    </>
  );
}
