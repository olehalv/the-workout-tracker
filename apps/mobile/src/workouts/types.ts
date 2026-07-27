export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
}

export interface LibraryExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  custom: boolean;
}

export function muscleLabel(ex: { muscleGroups: string[] }): string {
  return ex.muscleGroups.length > 0 ? ex.muscleGroups.join(", ") : "Uncategorized";
}

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
