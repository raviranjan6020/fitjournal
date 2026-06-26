/**
 * Volume Engine
 * Counts working sets per muscle group for Mon–Sun week.
 * Thresholds: adequate ≥10, moderate 6–9, low <6.
 */
import { db } from "@/db";
import { workoutSessions, workoutExerciseLogs, workoutSets, exerciseLibrary } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

export interface VolumeSignal {
  sets: number;
  status: "adequate" | "moderate" | "low";
}

export async function buildVolumeSignals(
  userId: string,
  weekStart: string,  // YYYY-MM-DD Monday
): Promise<Record<string, VolumeSignal>> {
  const rows = await db
    .select({
      muscleGroups: exerciseLibrary.muscleGroups,
    })
    .from(workoutSets)
    .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
    .innerJoin(workoutSessions,     eq(workoutExerciseLogs.sessionId, workoutSessions.id))
    .innerJoin(exerciseLibrary,     eq(workoutExerciseLogs.exerciseId, exerciseLibrary.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSets.isWarmup, false),
        gte(workoutSessions.date, weekStart),
      ),
    );

  // Tally sets per muscle
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const muscle of row.muscleGroups) {
      counts[muscle] = (counts[muscle] ?? 0) + 1;
    }
  }

  // Classify
  const result: Record<string, VolumeSignal> = {};
  for (const [muscle, sets] of Object.entries(counts)) {
    result[muscle] = {
      sets,
      status: sets >= 10 ? "adequate" : sets >= 6 ? "moderate" : "low",
    };
  }
  return result;
}
