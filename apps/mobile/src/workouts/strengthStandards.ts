import type { Workout } from "./types";

/**
 * Strength ratings for the main barbell lifts.
 *
 * We estimate a one-rep max from the user's best logged set (Epley), divide by
 * bodyweight to get a strength ratio, then classify that ratio against
 * approximate general strength standards (bodyweight-multiple thresholds per
 * lift and biological sex — the axis strength-standard tables are built on).
 * These are ballpark figures for a motivating self-assessment, not a
 * competition benchmark.
 */

/** Biological sex — used only to pick which standards column applies. */
export type Sex = "male" | "female";

export const STRENGTH_TIERS = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"] as const;
export type StrengthTier = (typeof STRENGTH_TIERS)[number];

interface RatedLift {
  key: string;
  label: string;
  /** Snapshot names (lowercased match) of workout exercises that count as this lift. */
  names: string[];
  /** Minimum 1RM-to-bodyweight ratio to reach each tier, indexed by STRENGTH_TIERS. */
  standards: Record<Sex, [number, number, number, number, number]>;
}

/**
 * Ratios are estimated 1RM ÷ bodyweight. Values are rounded, widely-cited
 * general standards (comparable to strengthlevel.com's mid brackets); they trade
 * per-bodyweight precision for staying dependency-free and on-device.
 */
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

/** Epley one-rep-max estimate from a weight × reps set. */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/** Best estimated 1RM (kg) across every logged set matching a lift's names. */
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
  /** Estimated 1RM in kg, or null when the lift has no logged sets. */
  e1rm: number | null;
  ratio: number | null;
  tier: StrengthTier | null;
  /** 0–100 position across the standards range (Beginner floor → Elite). */
  score: number;
  /** The next tier up, or null at Elite / when unrated. */
  nextTier: StrengthTier | null;
  /** Extra 1RM (kg) needed to reach `nextTier`, or null. */
  kgToNext: number | null;
}

/** Tier index for a ratio: highest tier whose threshold it meets (floors at Beginner). */
function tierIndex(ratio: number, thresholds: readonly number[]): number {
  let idx = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (ratio >= thresholds[i]) idx = i;
  }
  return idx;
}

/** Tier midpoints on the 0–100 score scale (one per STRENGTH_TIERS entry). */
const TIER_POINTS = [8, 31, 54, 77, 100];

/** Name the tier a 0–100 score falls in (shared by per-lift and overall scores). */
export function tierForScore(score: number): StrengthTier {
  let idx = 0;
  for (let i = 0; i < TIER_POINTS.length; i++) {
    if (score >= TIER_POINTS[i]) idx = i;
  }
  return STRENGTH_TIERS[idx];
}

/** Map a ratio to 0–100 across the tier thresholds (Beginner floor = 8, Elite = 100). */
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

/** Rate one lift from the user's history, or an unrated shell when no data. */
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
  /** Average score across rated lifts (0 when none rated). */
  overallScore: number;
  /** Tier for the overall score, or null when nothing is rated yet. */
  overallTier: StrengthTier | null;
  ratedCount: number;
}

/**
 * Compute strength ratings for the main lifts. Requires a bodyweight (kg) and
 * sex; without a bodyweight the lifts return unrated shells so the UI can still
 * list them and prompt for the missing info.
 */
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
