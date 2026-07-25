import { router } from "expo-router";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { LibraryExercise } from "../workouts/types";

export type PickerTarget = "workout" | "template";

interface ExerciseSelectionValue {
  selected: LibraryExercise[];
  isSelected: (id: string) => boolean;
  toggle: (exercise: LibraryExercise) => void;
  add: (exercise: LibraryExercise) => void;
  open: (target: PickerTarget) => void;
  clear: () => void;
}

const ExerciseSelectionContext = createContext<ExerciseSelectionValue | null>(null);

export function ExerciseSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<LibraryExercise[]>([]);

  const isSelected = useCallback((id: string) => selected.some((e) => e.id === id), [selected]);

  const toggle = useCallback((exercise: LibraryExercise) => {
    setSelected((cur) =>
      cur.some((e) => e.id === exercise.id)
        ? cur.filter((e) => e.id !== exercise.id)
        : [...cur, exercise],
    );
  }, []);

  const add = useCallback((exercise: LibraryExercise) => {
    setSelected((cur) => (cur.some((e) => e.id === exercise.id) ? cur : [...cur, exercise]));
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  const open = useCallback((target: PickerTarget) => {
    setSelected([]);
    router.push({ pathname: "/exercise-picker", params: { addTo: target } });
  }, []);

  const value = useMemo<ExerciseSelectionValue>(
    () => ({ selected, isSelected, toggle, add, open, clear }),
    [selected, isSelected, toggle, add, open, clear],
  );

  return (
    <ExerciseSelectionContext.Provider value={value}>{children}</ExerciseSelectionContext.Provider>
  );
}

export function useExerciseSelection(): ExerciseSelectionValue {
  const ctx = useContext(ExerciseSelectionContext);
  if (!ctx) {
    throw new Error("useExerciseSelection must be used within an ExerciseSelectionProvider");
  }
  return ctx;
}
