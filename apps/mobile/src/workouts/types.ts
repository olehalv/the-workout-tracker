/**
 * A single logged set: how many reps at what weight (kg).
 */
export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
}

/**
 * An exercise in the library (the catalog you pick from). Built-in ones ship
 * with the app; custom ones are created by the user. Both are persisted.
 */
export interface LibraryExercise {
  id: string;
  name: string;
  /** Muscle groups this exercise targets (one or more). */
  muscleGroups: string[];
  custom: boolean;
}

/** Comma-joined muscle-group label for display. */
export function muscleLabel(ex: { muscleGroups: string[] }): string {
  return ex.muscleGroups.length > 0 ? ex.muscleGroups.join(", ") : "Uncategorized";
}

/**
 * An exercise as performed within a workout. References a {@link LibraryExercise}
 * by id, snapshots its name (so history survives library renames/deletes), and
 * carries the logged sets plus an optional free-text note.
 */
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

/** Default target set count for a new preset exercise. */
export const DEFAULT_PRESET_SETS = 3;

/** One exercise slot in a preset — references a library exercise, snapshots name. */
export interface PresetExercise {
  exerciseId: string;
  name: string;
  /** Target number of sets to perform for this exercise. */
  sets: number;
}

/** A reusable workout template: a named, ordered list of exercises. */
export interface WorkoutPreset {
  id: string;
  name: string;
  exercises: PresetExercise[];
}

/**
 * A template seed from a workout's exercises — distinct exercises (by library id),
 * each with its logged set count as the target. Used by "save as template".
 */
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

/** Total volume = Σ reps × weight across all sets (a rough progressive-overload proxy). */
export function totalVolume(w: Workout): number {
  return w.exercises.reduce(
    (v, e) => v + e.sets.reduce((s, set) => s + set.reps * set.weight, 0),
    0,
  );
}

/** The heaviest set of an exercise entry, or null if it has no sets. */
export function topSet(e: WorkoutExercise): WorkoutSet | null {
  return e.sets.reduce<WorkoutSet | null>(
    (best, s) => (best === null || s.weight > best.weight ? s : best),
    null,
  );
}

/** One finished-workout data point for an exercise's progress over time. */
export interface ProgressPoint {
  workoutId: string;
  date: number;
  topWeight: number;
  topReps: number;
  volume: number;
  sets: number;
}
