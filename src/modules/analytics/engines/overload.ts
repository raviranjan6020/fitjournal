/**
 * Progressive Overload Engine
 * Compares best e1RM per session across user's top exercises.
 * Returns improving / stalled / regressed / no_data per exercise.
 */
import { db } from "@/db";
import { workoutSessions, workoutExerciseLogs, workoutSets, exerciseLibrary } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export interface OverloadSignal {
  exercise: string;       // slug
  name: string;
  status: "improving" | "stalled" | "regressed" | "no_data";
  change_kg: number | null;  // e1RM delta vs prior session
  last_weight_kg: number | null;
  last_reps: number | null;
}

/** Epley estimated 1RM */
function e1rm(kg: number, reps: number) { return kg * (1 + reps / 30); }

export async function buildOverloadSignals(userId: string): Promise<OverloadSignal[]> {
  // Get top 8 exercises by frequency (most logged)
  const logs = await db
    .select({
      exerciseId:   workoutExerciseLogs.exerciseId,
      slug:         exerciseLibrary.slug,
      name:         exerciseLibrary.name,
      sessionDate:  workoutSessions.date,
      weightKg:     workoutSets.weightKg,
      reps:         workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
    .innerJoin(workoutSessions,     eq(workoutExerciseLogs.sessionId, workoutSessions.id))
    .innerJoin(exerciseLibrary,     eq(workoutExerciseLogs.exerciseId, exerciseLibrary.id))
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSets.isWarmup, false)))
    .orderBy(desc(workoutSessions.date));

  if (!logs.length) return [];

  // Group by exercise → sessions → best e1RM per session
  const byExercise = new Map<string, { slug: string; name: string; sessionBests: Map<string, number> }>();

  for (const row of logs) {
    if (!byExercise.has(row.exerciseId)) {
      byExercise.set(row.exerciseId, { slug: row.slug, name: row.name, sessionBests: new Map() });
    }
    const entry = byExercise.get(row.exerciseId)!;
    const val   = e1rm(Number(row.weightKg), row.reps);
    const prev  = entry.sessionBests.get(row.sessionDate) ?? 0;
    if (val > prev) entry.sessionBests.set(row.sessionDate, val);
  }

  // Sort exercises by session count desc, take top 8
  const sorted = [...byExercise.entries()]
    .sort((a, b) => b[1].sessionBests.size - a[1].sessionBests.size)
    .slice(0, 8);

  return sorted.map(([, ex]) => {
    const sessions = [...ex.sessionBests.entries()]
      .sort((a, b) => b[0].localeCompare(a[0])); // newest first

    if (sessions.length < 2) {
      return { exercise: ex.slug, name: ex.name, status: "no_data", change_kg: null, last_weight_kg: null, last_reps: null };
    }

    const delta = sessions[0][1] - sessions[1][1];
    const status = delta > 0.5 ? "improving" : delta < -0.5 ? "regressed" : "stalled";

    // Find last session's top set weight+reps for display
    const lastLog = logs.find(l => l.slug === ex.slug && l.sessionDate === sessions[0][0]);

    return {
      exercise:      ex.slug,
      name:          ex.name,
      status,
      change_kg:     Math.round(delta * 10) / 10,
      last_weight_kg: lastLog ? Number(lastLog.weightKg) : null,
      last_reps:     lastLog?.reps ?? null,
    };
  });
}
