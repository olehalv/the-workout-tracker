import type { Workout } from "./types";

export type Sex = "male" | "female";

export const STRENGTH_TIERS = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"] as const;
export type StrengthTier = (typeof STRENGTH_TIERS)[number];

interface RatedLift {
  key: string;
  label: string;
  names: string[];
  standards: Record<Sex, [number, number, number, number, number]>;
}

export const RATED_LIFTS: RatedLift[] = [
  {
    key: "squat",
    label: "Squat",
    names: ["back squat", "barbell squat", "squat"],
    standards: {
      male: [0.75, 1.25, 1.75, 2.5, 3.0],
      female: [0.5, 0.75, 1.25, 1.75, 2.25],
    },
  },
  {
    key: "bench",
    label: "Bench Press",
    names: ["bench press", "barbell bench press"],
    standards: {
      male: [0.5, 0.75, 1.25, 1.75, 2.0],
      female: [0.3, 0.5, 0.75, 1.1, 1.5],
    },
  },
  {
    key: "deadlift",
    label: "Deadlift",
    names: ["deadlift", "conventional deadlift"],
    standards: {
      male: [1.0, 1.5, 2.0, 2.5, 3.0],
      female: [0.6, 1.0, 1.4, 1.9, 2.5],
    },
  },
  {
    key: "ohp",
    label: "Overhead Press",
    names: ["overhead press", "standing overhead press", "military press"],
    standards: {
      male: [0.35, 0.55, 0.8, 1.1, 1.4],
      female: [0.2, 0.35, 0.5, 0.75, 1.0],
    },
  },
];

export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

function bestEstimated1RM(workouts: Workout[], names: string[]): number {
  const match = new Set(names);
  let best = 0;
  for (const w of workouts) {
    for (const ex of w.exercises) {
      if (!match.has(ex.name.trim().toLowerCase())) continue;
      for (const s of ex.sets) {
        const e = estimate1RM(s.weight, s.reps);
        if (e > best) best = e;
      }
    }
  }
  return best;
}

export interface LiftRating {
  key: string;
  label: string;
  e1rm: number | null;
  ratio: number | null;
  tier: StrengthTier | null;
  score: number;
  nextTier: StrengthTier | null;
  kgToNext: number | null;
}

function tierIndex(ratio: number, thresholds: readonly number[]): number {
  let idx = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (ratio >= thresholds[i]) idx = i;
  }
  return idx;
}

const TIER_POINTS = [8, 31, 54, 77, 100];

export function tierForScore(score: number): StrengthTier {
  let idx = 0;
  for (let i = 0; i < TIER_POINTS.length; i++) {
    if (score >= TIER_POINTS[i]) idx = i;
  }
  return STRENGTH_TIERS[idx];
}

function scoreFor(ratio: number, thresholds: readonly number[]): number {
  const pts = TIER_POINTS;
  const first = thresholds[0];
  if (ratio <= first) return Math.round(Math.max(0, ratio / first) * pts[0]);
  const last = thresholds[thresholds.length - 1];
  if (ratio >= last) return 100;
  for (let i = 0; i < thresholds.length - 1; i++) {
    const lo = thresholds[i];
    const hi = thresholds[i + 1];
    if (ratio >= lo && ratio < hi) {
      const t = (ratio - lo) / (hi - lo);
      return Math.round(pts[i] + (pts[i + 1] - pts[i]) * t);
    }
  }
  return 100;
}

function rateLift(lift: RatedLift, workouts: Workout[], bodyweight: number, sex: Sex): LiftRating {
  const e1rm = bestEstimated1RM(workouts, lift.names);
  if (e1rm <= 0 || bodyweight <= 0) {
    return {
      key: lift.key,
      label: lift.label,
      e1rm: e1rm > 0 ? e1rm : null,
      ratio: null,
      tier: null,
      score: 0,
      nextTier: null,
      kgToNext: null,
    };
  }
  const thresholds = lift.standards[sex];
  const ratio = e1rm / bodyweight;
  const idx = tierIndex(ratio, thresholds);
  const nextIdx = idx < thresholds.length - 1 ? idx + 1 : null;
  return {
    key: lift.key,
    label: lift.label,
    e1rm,
    ratio,
    tier: STRENGTH_TIERS[idx],
    score: scoreFor(ratio, thresholds),
    nextTier: nextIdx === null ? null : STRENGTH_TIERS[nextIdx],
    kgToNext: nextIdx === null ? null : Math.max(0, thresholds[nextIdx] * bodyweight - e1rm),
  };
}

export interface StrengthProfile {
  lifts: LiftRating[];
  overallScore: number;
  overallTier: StrengthTier | null;
  ratedCount: number;
}

export function strengthProfile(
  workouts: Workout[],
  bodyweight: number | null,
  sex: Sex,
): StrengthProfile {
  const bw = bodyweight ?? 0;
  const lifts = RATED_LIFTS.map((l) => rateLift(l, workouts, bw, sex));
  const rated = lifts.filter((l) => l.tier !== null);
  const overallScore =
    rated.length > 0 ? Math.round(rated.reduce((n, l) => n + l.score, 0) / rated.length) : 0;
  const overallTier = rated.length === 0 ? null : tierForScore(overallScore);
  return { lifts, overallScore, overallTier, ratedCount: rated.length };
}
