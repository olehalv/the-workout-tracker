import { router } from "expo-router";
import { useMemo } from "react";
import { useTemplateDraft } from "../workouts/TemplateDraftContext";
import { type LibraryExercise, muscleLabel } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutContext";

export type PickerTarget = "workout" | "template";

// Adding to a template keeps the picker open (you usually add several in a row) and
// shows a running count; adding to the workout closes it, since that's a single pick.
export function useExercisePicker(addTo: PickerTarget) {
  const { library, addExercise } = useWorkouts();
  const draft = useTemplateDraft();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of draft.exercises) m.set(e.exerciseId, (m.get(e.exerciseId) ?? 0) + 1);
    return m;
  }, [draft.exercises]);

  const dismissTarget = addTo === "template" ? "/template-form" : "/workout";

  const pick = (exercise: LibraryExercise) => {
    if (addTo === "template") {
      draft.addExercise(exercise.id, exercise.name);
      return;
    }
    addExercise(exercise);
    router.dismissTo(dismissTarget);
  };

  const meta = (e: LibraryExercise) => {
    const base = `${muscleLabel(e)}${e.custom ? " · custom" : ""}`;
    const count = counts.get(e.id) ?? 0;
    return addTo === "template" && count > 0 ? `${base} · ${count} in template` : base;
  };

  return { library, pick, meta, dismiss: () => router.dismissTo(dismissTarget) };
}
