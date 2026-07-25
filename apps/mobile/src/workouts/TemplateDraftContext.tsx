import { router } from "expo-router";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { DEFAULT_PRESET_SETS, type PresetExercise, type WorkoutPreset } from "./types";

const MAX_SETS = 12;

export interface DraftExercise extends PresetExercise {
  uid: string;
}

interface TemplateDraftValue {
  name: string;
  exercises: DraftExercise[];
  setName: (name: string) => void;
  setExercises: (exercises: DraftExercise[]) => void;
  addExercise: (exerciseId: string, name: string) => void;
  removeExercise: (uid: string) => void;
  changeSets: (uid: string, delta: number) => void;
  openNew: (exercises?: PresetExercise[]) => void;
  openEditor: (preset: WorkoutPreset) => void;
}

const TemplateDraftContext = createContext<TemplateDraftValue | null>(null);

let uidSeq = 0;
const makeUid = () => `draft-${Date.now()}-${uidSeq++}`;

const withUids = (exercises: PresetExercise[]): DraftExercise[] =>
  exercises.map((e) => ({ ...e, uid: makeUid() }));

// The draft lives above the router so the "create an exercise" route can hand a new
// exercise back to the template form, which stays mounted underneath it.
export function TemplateDraftProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);

  const addExercise = useCallback((exerciseId: string, exerciseName: string) => {
    setExercises((cur) => [
      ...cur,
      { uid: makeUid(), exerciseId, name: exerciseName, sets: DEFAULT_PRESET_SETS },
    ]);
  }, []);

  const removeExercise = useCallback((uid: string) => {
    setExercises((cur) => cur.filter((e) => e.uid !== uid));
  }, []);

  const changeSets = useCallback((uid: string, delta: number) => {
    setExercises((cur) =>
      cur.map((e) =>
        e.uid === uid ? { ...e, sets: Math.min(MAX_SETS, Math.max(1, e.sets + delta)) } : e,
      ),
    );
  }, []);

  const openNew = useCallback((seed: PresetExercise[] = []) => {
    setName("");
    setExercises(withUids(seed));
    router.push("/template-form");
  }, []);

  const openEditor = useCallback((preset: WorkoutPreset) => {
    setName(preset.name);
    setExercises(withUids(preset.exercises));
    router.push({ pathname: "/template-form", params: { id: preset.id } });
  }, []);

  const value = useMemo<TemplateDraftValue>(
    () => ({
      name,
      exercises,
      setName,
      setExercises,
      addExercise,
      removeExercise,
      changeSets,
      openNew,
      openEditor,
    }),
    [name, exercises, addExercise, removeExercise, changeSets, openNew, openEditor],
  );

  return <TemplateDraftContext.Provider value={value}>{children}</TemplateDraftContext.Provider>;
}

export function useTemplateDraft(): TemplateDraftValue {
  const ctx = useContext(TemplateDraftContext);
  if (!ctx) {
    throw new Error("useTemplateDraft must be used within a TemplateDraftProvider");
  }
  return ctx;
}
