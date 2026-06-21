// Analytics thresholds — canonical source of truth (matches hld.md)

export const THRESHOLDS = {
  weight: {
    fatLoss:    { onTrackMin: -1.0, onTrackMax: -0.25, tooFast: -1.2 },
    leanBulk:   { onTrackMin: 0.1,  onTrackMax: 0.5,   tooFast: 0.5  },
    maintain:   { driftBand: 0.2 },
  },
  protein: {
    adequateRatio: 1.0,       // >= target
    lowRatio: 0.875,          // >= 87.5% of target
    // below 87.5% = very_low
  },
  volume: {
    adequate: 10,  // sets/muscle/week
    moderate: 6,   // 6–9 = moderate, <6 = low
  },
  consistency: {
    goodRatio: 0.75, // >= 75% of weekly_workout_target (4-week avg)
  },
  plateau: {
    gainThreshold: 0.005,       // <= 0.5% e1RM gain = no progress
    minTrainedWeeks: 3,         // need 3+ trained weeks to judge
    stalledWeeks: 2,            // stalled 2+ consecutive trained weeks
  },
  coldStart: {
    minWeighIns: 8,
    minDays: 14,
  },
  sleep: {
    good: 7, // >= 7h avg
  },
} as const;

export const GOAL_TYPES = [
  "fat_loss", "lean_bulk", "muscle_gain",
  "strength_gain", "recomposition", "maintain",
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const WORKOUT_TYPES = [
  "push", "pull", "legs", "upper", "lower", "full_body", "custom",
] as const;

export const MUSCLE_GROUPS = [
  "chest", "back", "legs", "shoulders", "biceps",
  "triceps", "core", "cardio", "glutes", "hamstrings",
  "quads", "calves",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
