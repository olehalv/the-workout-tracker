import type { LibraryExercise } from "./types";

/** Muscle groups offered when creating/editing a library exercise (multi-select). */
export const MUSCLE_GROUPS = [
  "Chest",
  "Upper Back",
  "Lats",
  "Lower Back",
  "Traps",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
] as const;

/**
 * Built-in exercise library, seeded on first launch. Ids are stable strings
 * (`builtin-<index>`) so they never collide with generated custom-exercise ids —
 * which means **the order of this array is load-bearing**: never reorder or
 * remove an existing entry, only append. Reordering would remap ids to different
 * exercises in already-installed copies. Each exercise lists the muscle groups it
 * primarily targets. `reconcileLibrary` (WorkoutContext) appends any entries a
 * stored library is missing, so new additions reach existing users too.
 */
const SEED: Array<[string, string[]]> = [
  // Legs
  ["Back Squat", ["Quads", "Glutes"]],
  ["Front Squat", ["Quads", "Core"]],
  ["Deadlift", ["Hamstrings", "Glutes", "Lower Back"]],
  ["Romanian Deadlift", ["Hamstrings", "Glutes"]],
  ["Leg Press", ["Quads", "Glutes"]],
  ["Leg Extension", ["Quads"]],
  ["Leg Curl", ["Hamstrings"]],
  ["Walking Lunge", ["Quads", "Glutes"]],
  ["Calf Raise", ["Calves"]],
  // Chest
  ["Bench Press", ["Chest", "Triceps"]],
  ["Incline Bench Press", ["Chest", "Shoulders"]],
  ["Dumbbell Bench Press", ["Chest", "Triceps"]],
  ["Chest Fly", ["Chest"]],
  ["Push-Up", ["Chest", "Triceps"]],
  // Back
  ["Pull-Up", ["Lats", "Biceps"]],
  ["Lat Pulldown", ["Lats", "Biceps"]],
  ["Barbell Row", ["Upper Back", "Lats"]],
  ["Seated Cable Row", ["Upper Back", "Lats"]],
  ["Face Pull", ["Upper Back", "Shoulders"]],
  // Shoulders
  ["Overhead Press", ["Shoulders", "Triceps"]],
  ["Dumbbell Shoulder Press", ["Shoulders", "Triceps"]],
  ["Lateral Raise", ["Shoulders"]],
  ["Rear Delt Fly", ["Shoulders", "Upper Back"]],
  // Arms
  ["Barbell Curl", ["Biceps"]],
  ["Dumbbell Curl", ["Biceps"]],
  ["Hammer Curl", ["Biceps", "Forearms"]],
  ["Triceps Pushdown", ["Triceps"]],
  ["Overhead Triceps Extension", ["Triceps"]],
  ["Dip", ["Triceps", "Chest"]],
  // Core
  ["Plank", ["Core"]],
  ["Hanging Leg Raise", ["Core"]],
  ["Cable Crunch", ["Core"]],

  // --- Expanded library (append-only below this line) ---------------------

  // Squat & quad variations
  ["Hack Squat", ["Quads", "Glutes"]],
  ["Pendulum Squat", ["Quads", "Glutes"]],
  ["Belt Squat", ["Quads", "Glutes"]],
  ["Goblet Squat", ["Quads", "Glutes"]],
  ["Bulgarian Split Squat", ["Quads", "Glutes"]],
  ["Smith Machine Squat", ["Quads", "Glutes"]],
  ["Box Squat", ["Quads", "Glutes"]],
  ["Zercher Squat", ["Quads", "Glutes", "Core"]],
  ["Sissy Squat", ["Quads"]],
  ["Step-Up", ["Quads", "Glutes"]],
  ["Reverse Lunge", ["Quads", "Glutes"]],
  ["Split Squat", ["Quads", "Glutes"]],
  ["Single-Leg Leg Press", ["Quads", "Glutes"]],
  // Hip hinge / posterior chain
  ["Sumo Deadlift", ["Glutes", "Hamstrings", "Quads"]],
  ["Trap Bar Deadlift", ["Quads", "Glutes", "Hamstrings"]],
  ["Stiff-Leg Deadlift", ["Hamstrings", "Glutes"]],
  ["Deficit Deadlift", ["Hamstrings", "Glutes", "Lower Back"]],
  ["Rack Pull", ["Lower Back", "Traps", "Glutes"]],
  ["Good Morning", ["Hamstrings", "Lower Back"]],
  ["Nordic Curl", ["Hamstrings"]],
  ["Seated Leg Curl", ["Hamstrings"]],
  ["Lying Leg Curl", ["Hamstrings"]],
  // Glutes
  ["Hip Thrust", ["Glutes", "Hamstrings"]],
  ["Glute Bridge", ["Glutes"]],
  ["Cable Pull-Through", ["Glutes", "Hamstrings"]],
  ["Cable Kickback", ["Glutes"]],
  ["Hip Abduction", ["Glutes"]],
  ["Hip Adduction", ["Glutes", "Quads"]],
  ["Back Extension", ["Lower Back", "Glutes"]],
  // Calves
  ["Standing Calf Raise", ["Calves"]],
  ["Seated Calf Raise", ["Calves"]],
  ["Leg Press Calf Raise", ["Calves"]],
  // Chest — incline / machine / cable variations
  ["Incline Dumbbell Press", ["Chest", "Shoulders"]],
  ["Incline Machine Press", ["Chest", "Shoulders"]],
  ["Decline Bench Press", ["Chest", "Triceps"]],
  ["Close-Grip Bench Press", ["Triceps", "Chest"]],
  ["Machine Chest Press", ["Chest", "Triceps"]],
  ["Smith Machine Bench Press", ["Chest", "Triceps"]],
  ["Cable Fly", ["Chest"]],
  ["Low-to-High Cable Fly", ["Chest"]],
  ["Dumbbell Fly", ["Chest"]],
  ["Pec Deck", ["Chest"]],
  ["Weighted Dip", ["Chest", "Triceps"]],
  // Back — rows / pulldowns / pulls
  ["Chin-Up", ["Lats", "Biceps"]],
  ["Neutral-Grip Pull-Up", ["Lats", "Biceps"]],
  ["Wide-Grip Lat Pulldown", ["Lats"]],
  ["Single-Arm Lat Pulldown", ["Lats"]],
  ["Straight-Arm Pulldown", ["Lats"]],
  ["Pendlay Row", ["Upper Back", "Lats"]],
  ["Dumbbell Row", ["Lats", "Upper Back"]],
  ["Chest-Supported Row", ["Upper Back", "Lats"]],
  ["T-Bar Row", ["Upper Back", "Lats"]],
  ["Machine Row", ["Upper Back", "Lats"]],
  ["Meadows Row", ["Upper Back", "Lats"]],
  ["Inverted Row", ["Upper Back", "Lats"]],
  // Traps
  ["Barbell Shrug", ["Traps"]],
  ["Dumbbell Shrug", ["Traps"]],
  // Shoulders
  ["Arnold Press", ["Shoulders", "Triceps"]],
  ["Machine Shoulder Press", ["Shoulders", "Triceps"]],
  ["Push Press", ["Shoulders", "Triceps"]],
  ["Landmine Press", ["Shoulders", "Chest"]],
  ["Cable Lateral Raise", ["Shoulders"]],
  ["Machine Lateral Raise", ["Shoulders"]],
  ["Front Raise", ["Shoulders"]],
  ["Upright Row", ["Shoulders", "Traps"]],
  ["Reverse Pec Deck", ["Shoulders", "Upper Back"]],
  // Biceps
  ["EZ-Bar Curl", ["Biceps"]],
  ["Preacher Curl", ["Biceps"]],
  ["Incline Dumbbell Curl", ["Biceps"]],
  ["Cable Curl", ["Biceps"]],
  ["Concentration Curl", ["Biceps"]],
  ["Spider Curl", ["Biceps"]],
  ["Reverse Curl", ["Forearms", "Biceps"]],
  // Triceps
  ["Skull Crusher", ["Triceps"]],
  ["Rope Pushdown", ["Triceps"]],
  ["Overhead Cable Extension", ["Triceps"]],
  ["Dumbbell Kickback", ["Triceps"]],
  ["Bench Dip", ["Triceps"]],
  ["JM Press", ["Triceps"]],
  // Forearms
  ["Wrist Curl", ["Forearms"]],
  ["Reverse Wrist Curl", ["Forearms"]],
  ["Farmer's Carry", ["Forearms", "Traps", "Core"]],
  // Core
  ["Crunch", ["Core"]],
  ["Sit-Up", ["Core"]],
  ["Decline Sit-Up", ["Core"]],
  ["Leg Raise", ["Core"]],
  ["Russian Twist", ["Core"]],
  ["Ab Wheel Rollout", ["Core"]],
  ["Cable Woodchopper", ["Core"]],
  ["Side Plank", ["Core"]],
  ["Dead Bug", ["Core"]],
  ["Hollow Hold", ["Core"]],
  ["Mountain Climber", ["Core"]],
];

export function defaultLibrary(): LibraryExercise[] {
  return SEED.map(([name, muscleGroups], i) => ({
    id: `builtin-${i}`,
    name,
    muscleGroups,
    custom: false,
  }));
}
