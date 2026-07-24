// A single logged set: reps at a weight (kg).
export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
}

// An exercise in the library (the catalog you pick from). Built-in or user-custom.
export interface LibraryExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  custom: boolean;
}

export function muscleLabel(ex: { muscleGroups: string[] }): string {
  return ex.muscleGroups.length > 0 ? ex.muscleGroups.join(", ") : "Uncategorized";
}

// Snapshots the library exercise's name so history survives renames/deletes.
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  note: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  startedAt: number;
  finishedAt: number | null;
  exercises: WorkoutExercise[];
}

export const DEFAULT_PRESET_SETS = 3;

export interface PresetExercise {
  exerciseId: string;
  name: string;
  sets: number;
}

export interface WorkoutPreset {
  id: string;
  name: string;
  exercises: PresetExercise[];
}

// Seed a template from a workout: distinct exercises (by id), logged set count as target.
export function templateSeed(workout: Workout): PresetExercise[] {
  const seed: PresetExercise[] = [];
  const seen = new Set<string>();
  for (const e of workout.exercises) {
    if (seen.has(e.exerciseId)) continue;
    seen.add(e.exerciseId);
    seed.push({ exerciseId: e.exerciseId, name: e.name, sets: Math.max(1, e.sets.length) });
  }
  return seed;
}

export function totalSets(w: Workout): number {
  return w.exercises.reduce((n, e) => n + e.sets.length, 0);
}

// Σ reps × weight across all sets (a rough progressive-overload proxy).
export function totalVolume(w: Workout): number {
  return w.exercises.reduce(
    (v, e) => v + e.sets.reduce((s, set) => s + set.reps * set.weight, 0),
    0,
  );
}

export function topSet(e: WorkoutExercise): WorkoutSet | null {
  return e.sets.reduce<WorkoutSet | null>(
    (best, s) => (best === null || s.weight > best.weight ? s : best),
    null,
  );
}

export interface ProgressPoint {
  workoutId: string;
  date: number;
  topWeight: number;
  topReps: number;
  volume: number;
  sets: number;
}
