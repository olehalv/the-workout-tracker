import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loadJSON, STORAGE_KEYS, saveJSON } from "../storage/storage";
import { defaultLibrary } from "./defaultExercises";
import { DEFAULT_REST } from "./RestTimerContext";
import type { Sex } from "./strengthStandards";
import type {
  LibraryExercise,
  PresetExercise,
  ProgressPoint,
  Workout,
  WorkoutPreset,
  WorkoutSet,
} from "./types";
import type { WeightUnit } from "./units";

interface StoredSettings {
  unit: WeightUnit;
  bodyweight: number | null;
  sex: Sex | null;
  restDuration: number;
}

interface StoredActive {
  workout: Workout | null;
  minimized: boolean;
}

type SetPatch = Partial<Pick<WorkoutSet, "reps" | "weight">>;

// Older stored exercises used a single `category` string; normalize to array.
type StoredExercise = {
  id: string;
  name: string;
  custom?: boolean;
  muscleGroups?: string[];
  category?: string;
};

function normalizeLibrary(items: StoredExercise[]): LibraryExercise[] {
  return items.map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroups: Array.isArray(e.muscleGroups) ? e.muscleGroups : e.category ? [e.category] : [],
    custom: Boolean(e.custom),
  }));
}

// Refreshes built-ins' muscle groups from the seed and appends seed entries the
// stored copy predates (so additions reach existing users), preserving customs
// and renames. Trade-off: a built-in the user deleted reappears on next launch.
function reconcileLibrary(items: StoredExercise[]): LibraryExercise[] {
  const seed = defaultLibrary();
  const seedById = new Map(seed.map((s) => [s.id, s]));
  const reconciled = normalizeLibrary(items).map((e) => {
    const s = seedById.get(e.id);
    return s ? { ...e, muscleGroups: s.muscleGroups } : e;
  });
  const have = new Set(reconciled.map((e) => e.id));
  const missing = seed.filter((s) => !have.has(s.id));
  return [...reconciled, ...missing];
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface WorkoutContextValue {
  isLoaded: boolean;
  workouts: Workout[];
  library: LibraryExercise[];
  presets: WorkoutPreset[];
  active: Workout | null;
  minimized: boolean;
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
  bodyweight: number | null;
  setBodyweight: (kg: number | null) => void;
  sex: Sex | null;
  setSex: (sex: Sex) => void;
  restDuration: number;
  setRestDuration: (seconds: number) => void;
  startWorkout: () => void;
  startWorkoutFromPreset: (preset: WorkoutPreset) => void;
  minimizeWorkout: () => void;
  resumeWorkout: () => void;
  createPreset: (name: string, exercises: PresetExercise[]) => WorkoutPreset;
  updatePreset: (id: string, patch: Partial<Pick<WorkoutPreset, "name" | "exercises">>) => void;
  deletePreset: (id: string) => void;
  addExercise: (exercise: LibraryExercise) => void;
  createExercise: (name: string, muscleGroups: string[]) => LibraryExercise;
  updateExercise: (
    id: string,
    patch: Partial<Pick<LibraryExercise, "name" | "muscleGroups">>,
  ) => void;
  deleteExercise: (id: string) => void;
  removeExercise: (workoutExerciseId: string) => void;
  reorderExercises: (from: number, to: number) => void;
  setExerciseNote: (workoutExerciseId: string, note: string) => void;
  addSet: (workoutExerciseId: string) => void;
  updateSet: (workoutExerciseId: string, setId: string, patch: SetPatch) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;
  finishWorkout: () => void;
  discardWorkout: () => void;
  deleteWorkout: (workoutId: string) => void;
  summary: Workout | null;
  dismissSummary: () => void;
  progressFor: (exerciseId: string) => ProgressPoint[];
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [presets, setPresets] = useState<WorkoutPreset[]>([]);
  const [active, setActive] = useState<Workout | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [summary, setSummary] = useState<Workout | null>(null);
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [bodyweight, setBodyweight] = useState<number | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [restDuration, setRestDuration] = useState(DEFAULT_REST);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedWorkouts, storedLibrary, storedPresets, storedSettings, storedActive] =
        await Promise.all([
          loadJSON<Workout[]>(STORAGE_KEYS.workouts, []),
          loadJSON<StoredExercise[]>(STORAGE_KEYS.library, []),
          loadJSON<WorkoutPreset[]>(STORAGE_KEYS.presets, []),
          loadJSON<Partial<StoredSettings>>(STORAGE_KEYS.settings, {}),
          loadJSON<Partial<StoredActive>>(STORAGE_KEYS.active, {}),
        ]);
      if (cancelled) return;
      setWorkouts(storedWorkouts);
      setLibrary(storedLibrary.length > 0 ? reconcileLibrary(storedLibrary) : defaultLibrary());
      setPresets(storedPresets);
      // Restore an in-progress workout only if it wasn't already finished.
      const restoredActive =
        storedActive.workout && storedActive.workout.finishedAt === null
          ? storedActive.workout
          : null;
      setActive(restoredActive);
      setMinimized(restoredActive ? Boolean(storedActive.minimized) : false);
      setUnit(storedSettings.unit === "lbs" ? "lbs" : "kg");
      setBodyweight(
        typeof storedSettings.bodyweight === "number" && storedSettings.bodyweight > 0
          ? storedSettings.bodyweight
          : null,
      );
      setSex(
        storedSettings.sex === "male" || storedSettings.sex === "female"
          ? storedSettings.sex
          : null,
      );
      setRestDuration(
        typeof storedSettings.restDuration === "number" && storedSettings.restDuration > 0
          ? storedSettings.restDuration
          : DEFAULT_REST,
      );
      setIsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Guard on isLoaded so we never clobber stored data with the empty initial state.
  useEffect(() => {
    if (isLoaded) saveJSON(STORAGE_KEYS.workouts, workouts);
  }, [isLoaded, workouts]);
  useEffect(() => {
    if (isLoaded) saveJSON(STORAGE_KEYS.library, library);
  }, [isLoaded, library]);
  useEffect(() => {
    if (isLoaded) saveJSON(STORAGE_KEYS.presets, presets);
  }, [isLoaded, presets]);
  useEffect(() => {
    if (isLoaded) saveJSON(STORAGE_KEYS.settings, { unit, bodyweight, sex, restDuration });
  }, [isLoaded, unit, bodyweight, sex, restDuration]);
  useEffect(() => {
    if (isLoaded) saveJSON(STORAGE_KEYS.active, { workout: active, minimized });
  }, [isLoaded, active, minimized]);

  const startWorkout = useCallback(() => {
    setMinimized(false);
    setActive({ id: newId(), startedAt: Date.now(), finishedAt: null, exercises: [] });
  }, []);

  const startWorkoutFromPreset = useCallback((preset: WorkoutPreset) => {
    setMinimized(false);
    setActive({
      id: newId(),
      startedAt: Date.now(),
      finishedAt: null,
      exercises: preset.exercises.map((pe) => ({
        id: newId(),
        exerciseId: pe.exerciseId,
        name: pe.name,
        note: "",
        sets: Array.from({ length: Math.max(1, pe.sets || 1) }, () => ({
          id: newId(),
          reps: 0,
          weight: 0,
        })),
      })),
    });
  }, []);

  const minimizeWorkout = useCallback(() => setMinimized(true), []);
  const resumeWorkout = useCallback(() => setMinimized(false), []);

  const createPreset = useCallback((name: string, exercises: PresetExercise[]): WorkoutPreset => {
    const preset: WorkoutPreset = { id: newId(), name: name.trim(), exercises };
    setPresets((list) => [...list, preset]);
    return preset;
  }, []);

  const updatePreset = useCallback(
    (id: string, patch: Partial<Pick<WorkoutPreset, "name" | "exercises">>) => {
      const clean = {
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.exercises !== undefined ? { exercises: patch.exercises } : {}),
      };
      setPresets((list) => list.map((p) => (p.id === id ? { ...p, ...clean } : p)));
    },
    [],
  );

  const deletePreset = useCallback((id: string) => {
    setPresets((list) => list.filter((p) => p.id !== id));
  }, []);

  const addExercise = useCallback((exercise: LibraryExercise) => {
    setActive((w) => {
      if (!w) return w;
      return {
        ...w,
        exercises: [
          ...w.exercises,
          {
            id: newId(),
            exerciseId: exercise.id,
            name: exercise.name,
            note: "",
            sets: [{ id: newId(), reps: 0, weight: 0 }],
          },
        ],
      };
    });
  }, []);

  const createExercise = useCallback((name: string, muscleGroups: string[]): LibraryExercise => {
    const exercise: LibraryExercise = {
      id: newId(),
      name: name.trim(),
      muscleGroups,
      custom: true,
    };
    setLibrary((list) => [...list, exercise]);
    return exercise;
  }, []);

  const updateExercise = useCallback(
    (id: string, patch: Partial<Pick<LibraryExercise, "name" | "muscleGroups">>) => {
      const clean = {
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.muscleGroups !== undefined ? { muscleGroups: patch.muscleGroups } : {}),
      };
      setLibrary((list) => list.map((e) => (e.id === id ? { ...e, ...clean } : e)));
      // Keep the active workout's snapshot name in sync on rename.
      if (clean.name !== undefined) {
        const renamed = clean.name;
        setActive((w) =>
          w
            ? {
                ...w,
                exercises: w.exercises.map((e) =>
                  e.exerciseId === id ? { ...e, name: renamed } : e,
                ),
              }
            : w,
        );
      }
    },
    [],
  );

  const deleteExercise = useCallback((id: string) => {
    setLibrary((list) => list.filter((e) => e.id !== id));
  }, []);

  const removeExercise = useCallback((workoutExerciseId: string) => {
    setActive((w) =>
      w ? { ...w, exercises: w.exercises.filter((e) => e.id !== workoutExerciseId) } : w,
    );
  }, []);

  const reorderExercises = useCallback((from: number, to: number) => {
    setActive((w) => {
      if (!w) return w;
      const n = w.exercises.length;
      if (from === to || from < 0 || to < 0 || from >= n || to >= n) return w;
      const exercises = [...w.exercises];
      const [moved] = exercises.splice(from, 1);
      exercises.splice(to, 0, moved);
      return { ...w, exercises };
    });
  }, []);

  const setExerciseNote = useCallback((workoutExerciseId: string, note: string) => {
    setActive((w) =>
      w
        ? {
            ...w,
            exercises: w.exercises.map((e) => (e.id === workoutExerciseId ? { ...e, note } : e)),
          }
        : w,
    );
  }, []);

  const addSet = useCallback((workoutExerciseId: string) => {
    setActive((w) =>
      w
        ? {
            ...w,
            exercises: w.exercises.map((e) => {
              if (e.id !== workoutExerciseId) return e;
              const last = e.sets.at(-1);
              return {
                ...e,
                sets: [
                  ...e.sets,
                  { id: newId(), reps: last?.reps ?? 0, weight: last?.weight ?? 0 },
                ],
              };
            }),
          }
        : w,
    );
  }, []);

  const updateSet = useCallback((workoutExerciseId: string, setId: string, patch: SetPatch) => {
    setActive((w) =>
      w
        ? {
            ...w,
            exercises: w.exercises.map((e) =>
              e.id === workoutExerciseId
                ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
                : e,
            ),
          }
        : w,
    );
  }, []);

  const removeSet = useCallback((workoutExerciseId: string, setId: string) => {
    setActive((w) =>
      w
        ? {
            ...w,
            exercises: w.exercises.map((e) =>
              e.id === workoutExerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
            ),
          }
        : w,
    );
  }, []);

  const finishWorkout = useCallback(() => {
    setMinimized(false);
    setActive((current) => {
      if (!current) return null;
      // Drop incomplete sets (no reps logged) and exercises left empty.
      const exercises = current.exercises
        .map((e) => ({ ...e, sets: e.sets.filter((s) => s.reps > 0) }))
        .filter((e) => e.sets.length > 0);
      if (exercises.length > 0) {
        const finished: Workout = { ...current, exercises, finishedAt: Date.now() };
        setWorkouts((list) => [finished, ...list]);
        setSummary(finished);
      }
      return null;
    });
  }, []);

  const dismissSummary = useCallback(() => setSummary(null), []);

  const discardWorkout = useCallback(() => {
    setMinimized(false);
    setActive(null);
  }, []);

  const deleteWorkout = useCallback((workoutId: string) => {
    setWorkouts((list) => list.filter((w) => w.id !== workoutId));
  }, []);

  const progressFor = useCallback(
    (exerciseId: string): ProgressPoint[] => {
      const points: ProgressPoint[] = [];
      for (const w of workouts) {
        // Combine every entry of this exercise — it can appear more than once.
        const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets);
        if (sets.length === 0) continue;
        const best = sets.reduce<WorkoutSet | null>(
          (b, s) => (b === null || s.weight > b.weight ? s : b),
          null,
        );
        points.push({
          workoutId: w.id,
          date: w.finishedAt ?? w.startedAt,
          topWeight: best?.weight ?? 0,
          topReps: best?.reps ?? 0,
          volume: sets.reduce((v, s) => v + s.reps * s.weight, 0),
          sets: sets.length,
        });
      }
      return points.sort((a, b) => a.date - b.date);
    },
    [workouts],
  );

  const value = useMemo<WorkoutContextValue>(
    () => ({
      isLoaded,
      workouts,
      library,
      presets,
      active,
      minimized,
      unit,
      setUnit,
      bodyweight,
      setBodyweight,
      sex,
      setSex,
      restDuration,
      setRestDuration,
      startWorkout,
      startWorkoutFromPreset,
      minimizeWorkout,
      resumeWorkout,
      createPreset,
      updatePreset,
      deletePreset,
      addExercise,
      createExercise,
      updateExercise,
      deleteExercise,
      removeExercise,
      reorderExercises,
      setExerciseNote,
      addSet,
      updateSet,
      removeSet,
      finishWorkout,
      discardWorkout,
      deleteWorkout,
      summary,
      dismissSummary,
      progressFor,
    }),
    [
      isLoaded,
      workouts,
      library,
      presets,
      active,
      minimized,
      unit,
      bodyweight,
      sex,
      restDuration,
      startWorkout,
      startWorkoutFromPreset,
      minimizeWorkout,
      resumeWorkout,
      createPreset,
      updatePreset,
      deletePreset,
      addExercise,
      createExercise,
      updateExercise,
      deleteExercise,
      removeExercise,
      reorderExercises,
      setExerciseNote,
      addSet,
      updateSet,
      removeSet,
      finishWorkout,
      discardWorkout,
      deleteWorkout,
      summary,
      dismissSummary,
      progressFor,
    ],
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkouts(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) {
    throw new Error("useWorkouts must be used within a WorkoutProvider");
  }
  return ctx;
}
