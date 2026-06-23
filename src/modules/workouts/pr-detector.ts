import { db } from "@/db";
import { workoutSets, workoutExerciseLogs, workoutSessions } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

export interface PRResult {
  isPR: boolean;
  type: "rep_pr" | "estimated_1rm_pr" | null;
  weightKg: number;
  reps: number;
}

/** Epley estimated 1RM: weight * (1 + reps/30) */
function e1rm(weightKg: number, reps: number) {
  return weightKg * (1 + reps / 30);
}

/**
 * Check PR BEFORE insert (or pass exclude_set_id to exclude just-inserted set).
 * Compares candidate against existing history only — never includes itself.
 */
export async function checkPR(
  userId: string,
  exerciseId: string,
  weightKg: number,
  reps: number,
  excludeSetId?: string,
): Promise<PRResult> {
  // Load all non-warmup working sets for this user + exercise
  const history = await db
    .select({ id: workoutSets.id, weightKg: workoutSets.weightKg, reps: workoutSets.reps })
    .from(workoutSets)
    .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
    .innerJoin(workoutSessions, eq(workoutExerciseLogs.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutExerciseLogs.exerciseId, exerciseId),
        eq(workoutSets.isWarmup, false),
        excludeSetId ? ne(workoutSets.id, excludeSetId) : undefined,
      ),
    );

  if (history.length === 0) {
    // First set ever — it's a PR by default
    return { isPR: true, type: "rep_pr", weightKg, reps };
  }

  const historyMapped = history.map(s => ({ weightKg: Number(s.weightKg), reps: s.reps }));

  // Rep PR: new weight > best weight for this exact rep count
  const bestForReps = Math.max(0, ...historyMapped.filter(s => s.reps === reps).map(s => s.weightKg));
  if (weightKg > bestForReps) {
    return { isPR: true, type: "rep_pr", weightKg, reps };
  }

  // Estimated 1RM PR
  const newE1rm  = e1rm(weightKg, reps);
  const bestE1rm = Math.max(0, ...historyMapped.map(s => e1rm(s.weightKg, s.reps)));
  if (newE1rm > bestE1rm) {
    return { isPR: true, type: "estimated_1rm_pr", weightKg, reps };
  }

  return { isPR: false, type: null, weightKg, reps };
}
