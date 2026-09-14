import { db } from "@/db";
import { workoutSets, workoutExerciseLogs, workoutSessions } from "@/db/schema";
import { eq, and, ne, max, sql } from "drizzle-orm";

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
 *
 * Previously fetched every non-warmup set the user has ever logged for this
 * exercise and computed both maxes in JS. Since this runs on every single
 * set save, that meant the heaviest, highest-frequency query in the app grew
 * linearly with a user's training history. Rewritten to let Postgres compute
 * both aggregates directly: MAX(weight) for the rep-PR check via a plain
 * aggregate, and MAX(e1rm expression) for the 1RM check via a SQL expression
 * aggregate. Either way only 1-2 scalar rows come back, never the full
 * history.
 */
export async function checkPR(
  userId: string,
  exerciseId: string,
  weightKg: number,
  reps: number,
  excludeSetId?: string,
): Promise<PRResult> {
  const baseConditions = and(
    eq(workoutSessions.userId, userId),
    eq(workoutExerciseLogs.exerciseId, exerciseId),
    eq(workoutSets.isWarmup, false),
    excludeSetId ? ne(workoutSets.id, excludeSetId) : undefined,
  );

  const [[repRow], [e1rmRow]] = await Promise.all([
    // Best weight at this exact rep count (for the rep-PR check)
    db
      .select({ bestWeight: max(workoutSets.weightKg) })
      .from(workoutSets)
      .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
      .innerJoin(workoutSessions, eq(workoutExerciseLogs.sessionId, workoutSessions.id))
      .where(and(baseConditions, eq(workoutSets.reps, reps))),
    // Best estimated 1RM across all rep counts (for the 1RM-PR check)
    db
      .select({ bestE1rm: sql<string | null>`max(${workoutSets.weightKg} * (1 + ${workoutSets.reps}::numeric / 30))` })
      .from(workoutSets)
      .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
      .innerJoin(workoutSessions, eq(workoutExerciseLogs.sessionId, workoutSessions.id))
      .where(baseConditions),
  ]);

  const bestForReps = repRow?.bestWeight !== null && repRow?.bestWeight !== undefined ? Number(repRow.bestWeight) : null;
  const bestE1rm     = e1rmRow?.bestE1rm !== null && e1rmRow?.bestE1rm !== undefined ? Number(e1rmRow.bestE1rm) : null;

  if (bestForReps === null && bestE1rm === null) {
    // No history at all for this exercise — first set ever, it's a PR by default
    return { isPR: true, type: "rep_pr", weightKg, reps };
  }

  // Rep PR: new weight > best weight for this exact rep count
  if (bestForReps === null || weightKg > bestForReps) {
    return { isPR: true, type: "rep_pr", weightKg, reps };
  }

  // Estimated 1RM PR
  const newE1rm = e1rm(weightKg, reps);
  if (bestE1rm === null || newE1rm > bestE1rm) {
    return { isPR: true, type: "estimated_1rm_pr", weightKg, reps };
  }

  return { isPR: false, type: null, weightKg, reps };
}
