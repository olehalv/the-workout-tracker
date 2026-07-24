import { MUSCLE_GROUPS } from "./defaultExercises";
import type { LibraryExercise, Workout } from "./types";

export interface MuscleStat {
  group: string;
  sets: number;
  volume: number;
}

export interface MuscleActivity {
  byGroup: Record<string, MuscleStat>;
  maxSets: number;
  ranked: MuscleStat[];
  totalSets: number;
}

// A set counts once for every muscle group its exercise targets — a bench-press
// set credits both Chest and Triceps. sinceTs null = all time.
export function muscleActivity(
  workouts: Workout[],
  library: LibraryExercise[],
  sinceTs: number | null,
): MuscleActivity {
  const byId = new Map(library.map((e) => [e.id, e]));
  const byGroup: Record<string, MuscleStat> = {};
  for (const g of MUSCLE_GROUPS) byGroup[g] = { group: g, sets: 0, volume: 0 };

  for (const w of workouts) {
    const ts = w.finishedAt ?? w.startedAt;
    if (sinceTs !== null && ts < sinceTs) continue;
    for (const ex of w.exercises) {
      const groups = byId.get(ex.exerciseId)?.muscleGroups ?? [];
      if (groups.length === 0) continue;
      const setCount = ex.sets.length;
      const volume = ex.sets.reduce((v, s) => v + s.reps * s.weight, 0);
      for (const g of groups) {
        let stat = byGroup[g];
        if (!stat) {
          stat = { group: g, sets: 0, volume: 0 };
          byGroup[g] = stat;
        }
        stat.sets += setCount;
        stat.volume += volume;
      }
    }
  }

  const stats = Object.values(byGroup);
  const maxSets = stats.reduce((m, s) => Math.max(m, s.sets), 0);
  const totalSets = stats.reduce((n, s) => n + s.sets, 0);
  const ranked = [...stats].sort((a, b) => b.sets - a.sets || b.volume - a.volume);
  return { byGroup, maxSets, ranked, totalSets };
}

// Midnight on the Sunday that begins the current week (local time).
export function startOfThisWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}
