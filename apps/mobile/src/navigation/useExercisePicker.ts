import { router } from "expo-router";
import { useMemo } from "react";
import { useTemplateDraft } from "../workouts/TemplateDraftContext";
import { type LibraryExercise, muscleLabel } from "../workouts/types";
import { useWorkouts } from "../workouts/WorkoutContext";
import { type PickerTarget, useExerciseSelection } from "./ExerciseSelectionContext";

export type { PickerTarget };

export function useExercisePicker(addTo: PickerTarget) {
  const { library, active, addExercise } = useWorkouts();
  const draft = useTemplateDraft();
  const selection = useExerciseSelection();

  const targetName = addTo === "template" ? "template" : "workout";

  const counts = useMemo(() => {
    const already = addTo === "template" ? draft.exercises : (active?.exercises ?? []);
    const m = new Map<string, number>();
    for (const e of already) m.set(e.exerciseId, (m.get(e.exerciseId) ?? 0) + 1);
    return m;
  }, [addTo, draft.exercises, active]);

  const dismissTarget = addTo === "template" ? "/template-form" : "/workout";

  const commit = () => {
    for (const e of selection.selected) {
      if (addTo === "template") draft.addExercise(e.id, e.name);
      else addExercise(e);
    }
    selection.clear();
    router.dismissTo(dismissTarget);
  };

  const meta = (e: LibraryExercise) => {
    const base = `${muscleLabel(e)}${e.custom ? " · custom" : ""}`;
    const count = counts.get(e.id) ?? 0;
    return count > 0 ? `${base} · ${count} in ${targetName}` : base;
  };

  return {
    library,
    meta,
    toggle: selection.toggle,
    isSelected: selection.isSelected,
    count: selection.selected.length,
    commit,
  };
}
