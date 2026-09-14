/**
 * New PRs Engine
 * Finds PRs achieved within the snapshot window (last 7 days).
 * A set is a PR if its e1RM is the best e1RM for that exercise
 * among all sets logged up to and including that set's date.
 * Recomputed from history (PR status isn't persisted on workout_sets).
 */
import { db } from "@/db";
import { workoutSessions, workoutExerciseLogs, workoutSets, exerciseLibrary } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface NewPRSignal {
  exercise:  string; // slug
  name:      string;
  weight_kg: number;
  reps:      number;
  date:      string;
}

function e1rm(kg: number, reps: number) { return kg * (1 + reps / 30); }

export async function buildNewPRs(userId: string, since: string): Promise<NewPRSignal[]> {
  const rows = await db
    .select({
      exerciseId: workoutExerciseLogs.exerciseId,
      slug:       exerciseLibrary.slug,
      name:       exerciseLibrary.name,
      date:       workoutSessions.date,
      weightKg:   workoutSets.weightKg,
      reps:       workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
    .innerJoin(workoutSessions,     eq(workoutExerciseLogs.sessionId, workoutSessions.id))
    .innerJoin(exerciseLibrary,     eq(workoutExerciseLogs.exerciseId, exerciseLibrary.id))
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSets.isWarmup, false)));

  if (!rows.length) return [];

  // Group all-time sets by exercise, sorted chronologically
  const byExercise = new Map<string, { slug: string; name: string; sets: { date: string; weightKg: number; reps: number }[] }>();
  for (const r of rows) {
    if (!byExercise.has(r.exerciseId)) {
      byExercise.set(r.exerciseId, { slug: r.slug, name: r.name, sets: [] });
    }
    byExercise.get(r.exerciseId)!.sets.push({ date: r.date, weightKg: Number(r.weightKg), reps: r.reps });
  }

  const newPRs: NewPRSignal[] = [];

  for (const [, ex] of byExercise) {
    const chronological = [...ex.sets].sort((a, b) => a.date.localeCompare(b.date));

    let bestE1rm = 0;
    const bestByReps = new Map<number, number>();

    for (const s of chronological) {
      const val = e1rm(s.weightKg, s.reps);
      const bestForReps = bestByReps.get(s.reps) ?? 0;
      const isRepPR   = s.weightKg > bestForReps;
      const isE1rmPR  = val > bestE1rm;
      const isPR = isRepPR || isE1rmPR;

      if (isPR && s.date >= since) {
        newPRs.push({ exercise: ex.slug, name: ex.name, weight_kg: s.weightKg, reps: s.reps, date: s.date });
      }

      if (s.weightKg > bestForReps) bestByReps.set(s.reps, s.weightKg);
      if (val > bestE1rm) bestE1rm = val;
    }
  }

  // Most recent first
  return newPRs.sort((a, b) => b.date.localeCompare(a.date));
}
