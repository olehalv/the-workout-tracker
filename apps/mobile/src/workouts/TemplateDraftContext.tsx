import { router } from "expo-router";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { DEFAULT_PRESET_SETS, type PresetExercise, type WorkoutPreset } from "./types";

export const MIN_SETS = 1;
export const MAX_SETS = 12;

export interface DraftExercise extends PresetExercise {
  uid: string;
}

interface TemplateDraftValue {
  name: string;
  presetId: string | null;
  exercises: DraftExercise[];
  setName: (name: string) => void;
  addExercise: (exerciseId: string, name: string) => void;
  removeExercise: (uid: string) => void;
  reorderExercises: (from: number, to: number) => void;
  setSets: (uid: string, sets: number) => void;
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
  const [presetId, setPresetId] = useState<string | null>(null);
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

  const reorderExercises = useCallback((from: number, to: number) => {
    setExercises((cur) => {
      const n = cur.length;
      if (from === to || from < 0 || to < 0 || from >= n || to >= n) return cur;
      const next = [...cur];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }, []);

  const setSets = useCallback((uid: string, sets: number) => {
    setExercises((cur) =>
      cur.map((e) =>
        e.uid === uid ? { ...e, sets: Math.min(MAX_SETS, Math.max(MIN_SETS, sets)) } : e,
      ),
    );
  }, []);

  const openNew = useCallback((seed: PresetExercise[] = []) => {
    setName("");
    setPresetId(null);
    setExercises(withUids(seed));
    router.push("/template-form");
  }, []);

  // Which preset is being edited rides on the draft, not a route param: the picker
  // returns with router.dismissTo("/template-form"), which does not carry params, so
  // an ?id would be lost and the form would save a new template instead.
  const openEditor = useCallback((preset: WorkoutPreset) => {
    setName(preset.name);
    setPresetId(preset.id);
    setExercises(withUids(preset.exercises));
    router.push("/template-form");
  }, []);

  const value = useMemo<TemplateDraftValue>(
    () => ({
      name,
      presetId,
      exercises,
      setName,
      addExercise,
      removeExercise,
      reorderExercises,
      setSets,
      openNew,
      openEditor,
    }),
    [
      name,
      presetId,
      exercises,
      addExercise,
      removeExercise,
      reorderExercises,
      setSets,
      openNew,
      openEditor,
    ],
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
