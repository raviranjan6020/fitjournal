import { db } from "@/db";
import { workoutSessions, workoutExerciseLogs, workoutSets, exerciseLibrary } from "@/db/schema";
import { eq, and, desc, asc, max, sql, inArray } from "drizzle-orm";
import { isoDate } from "@/lib/utils";
import { checkPR } from "./pr-detector";

// Default exercises seeded per workout type when a new session is started.
// Names must match src/db/seed/exercises.ts exactly.
const DEFAULT_EXERCISE_NAMES: Record<string, string[]> = {
  push:      ["Bench Press", "Overhead Press", "Incline Fly", "Tricep Pushdown"],
  pull:      ["Barbell Row", "Lat Pulldown", "Face Pull", "Dumbbell Curl"],
  legs:      ["Squat", "Romanian Deadlift", "Leg Press", "Calf Raise"],
  upper:     ["Bench Press", "Barbell Row", "Overhead Press", "Pull-up"],
  lower:     ["Squat", "Romanian Deadlift", "Lunges", "Calf Raise"],
  full_body: ["Squat", "Bench Press", "Barbell Row", "Plank"],
};

export async function listSessions(userId: string, limit = 20, offset = 0) {
  return db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.date))
    .limit(limit)
    .offset(offset);
}

export async function getSession(userId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);
  return session ?? null;
}

export async function createSession(userId: string, data: {
  date?: string;
  workoutType: string;
  name?: string;
  notes?: string;
  seedDefaults?: boolean;
}) {
  const [session] = await db
    .insert(workoutSessions)
    .values({
      userId,
      date: data.date ?? isoDate(),
      workoutType: data.workoutType,
      name: data.name ?? null,
      notes: data.notes ?? null,
    })
    .returning();

  if (!data.seedDefaults) return { ...session, exercises: [] as Awaited<ReturnType<typeof addExercisesToSession>> };

  const defaultNames = DEFAULT_EXERCISE_NAMES[data.workoutType] ?? [];
  if (!defaultNames.length) return { ...session, exercises: [] as Awaited<ReturnType<typeof addExercisesToSession>> };

  const defaultExercises = await db
    .select({ id: exerciseLibrary.id })
    .from(exerciseLibrary)
    .where(inArray(exerciseLibrary.name, defaultNames));

  const exercises = defaultExercises.length
    ? await addExercisesToSession(userId, session.id, defaultExercises.map(e => e.id))
    : [];

  return { ...session, exercises };
}

export async function updateSession(userId: string, sessionId: string, data: {
  workoutType?: string;
  name?: string;
  notes?: string;
  durationMin?: number;
}) {
  const [updated] = await db
    .update(workoutSessions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteSession(userId: string, sessionId: string) {
  const result = await db
    .delete(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .returning({ id: workoutSessions.id });
  return result.length > 0;
}

// ── Exercise logs ─────────────────────────────────────────────────────────────

export async function getSessionWithExercises(userId: string, sessionId: string) {
  const session = await getSession(userId, sessionId);
  if (!session) return null;

  const logs = await db
    .select({
      id:         workoutExerciseLogs.id,
      exerciseId: workoutExerciseLogs.exerciseId,
      orderIndex: workoutExerciseLogs.orderIndex,
      notes:      workoutExerciseLogs.notes,
      name:       exerciseLibrary.name,
      slug:       exerciseLibrary.slug,
      muscleGroups: exerciseLibrary.muscleGroups,
    })
    .from(workoutExerciseLogs)
    .innerJoin(exerciseLibrary, eq(workoutExerciseLogs.exerciseId, exerciseLibrary.id))
    .where(eq(workoutExerciseLogs.sessionId, sessionId))
    .orderBy(asc(workoutExerciseLogs.orderIndex));

  const sets = logs.length
    ? await db
        .select()
        .from(workoutSets)
        .where(sql`${workoutSets.exerciseLogId} = ANY(ARRAY[${sql.join(logs.map(l => sql`${l.id}::uuid`), sql`, `)}])`)
        .orderBy(asc(workoutSets.setNumber))
    : [];

  const setsByLog = Object.fromEntries(logs.map(l => [l.id, [] as typeof sets]));
  for (const s of sets) setsByLog[s.exerciseLogId]?.push(s);

  return {
    ...session,
    exercises: logs.map(l => ({ ...l, sets: setsByLog[l.id] ?? [] })),
  };
}

export async function addExerciseToSession(userId: string, sessionId: string, exerciseId: string) {
  const [log] = await addExercisesToSession(userId, sessionId, [exerciseId]);
  return log ?? null;
}

/**
 * Batch-add multiple exercises to a session in one insert, and return each
 * with its last-session sets pre-fetched — avoids N sequential
 * POST + GET round trips from the client (was the main cause of slow
 * workout-start / add-exercise flows).
 *
 * Collapsed to a fixed number of round trips regardless of how many
 * exercises are added (previously: 1 + 1 + 1 + 2*N sequential/parallel
 * Neon HTTP round trips — each one ~150-250ms on its own, so N=4 exercises
 * still took ~2s even with the inserts batched and lookups parallelized).
 */
export async function addExercisesToSession(userId: string, sessionId: string, exerciseIds: string[]) {
  if (!exerciseIds.length) return [];

  const session = await getSession(userId, sessionId);
  if (!session) return [];

  const [{ maxIdx }, exerciseNames] = await Promise.all([
    db
      .select({ maxIdx: max(workoutExerciseLogs.orderIndex) })
      .from(workoutExerciseLogs)
      .where(eq(workoutExerciseLogs.sessionId, sessionId))
      .then(rows => rows[0]),
    db
      .select({ id: exerciseLibrary.id, name: exerciseLibrary.name, slug: exerciseLibrary.slug })
      .from(exerciseLibrary)
      .where(inArray(exerciseLibrary.id, exerciseIds)),
  ]);

  const startIdx = (maxIdx ?? 0) + 1;

  const logs = await db
    .insert(workoutExerciseLogs)
    .values(exerciseIds.map((exerciseId, i) => ({
      sessionId,
      exerciseId,
      orderIndex: startIdx + i,
    })))
    .returning();

  const lastSetsByExercise = await getLastSessionSetsBulk(userId, exerciseIds);
  const nameById = new Map(exerciseNames.map(e => [e.id, e]));

  return logs.map(log => ({
    ...log,
    name:     nameById.get(log.exerciseId)?.name ?? "",
    slug:     nameById.get(log.exerciseId)?.slug ?? "",
    lastSets: lastSetsByExercise.get(log.exerciseId) ?? [],
  }));
}

export async function removeExerciseFromSession(userId: string, sessionId: string, logId: string) {
  const session = await getSession(userId, sessionId);
  if (!session) return false;
  const result = await db
    .delete(workoutExerciseLogs)
    .where(and(eq(workoutExerciseLogs.id, logId), eq(workoutExerciseLogs.sessionId, sessionId)))
    .returning({ id: workoutExerciseLogs.id });
  return result.length > 0;
}

// ── Sets ─────────────────────────────────────────────────────────────────────

export async function addSet(
  userId: string,
  sessionId: string,
  logId: string,
  data: { weightKg: number; reps: number; rpe?: number; isWarmup?: boolean },
) {
  const session = await getSession(userId, sessionId);
  if (!session) return null;

  const [log] = await db
    .select({ exerciseId: workoutExerciseLogs.exerciseId })
    .from(workoutExerciseLogs)
    .where(and(eq(workoutExerciseLogs.id, logId), eq(workoutExerciseLogs.sessionId, sessionId)))
    .limit(1);
  if (!log) return null;

  // PR check BEFORE insert (spec: never include candidate set in history)
  const pr = data.isWarmup
    ? { isPR: false, type: null }
    : await checkPR(userId, log.exerciseId, data.weightKg, data.reps);

  const [{ maxNum }] = await db
    .select({ maxNum: max(workoutSets.setNumber) })
    .from(workoutSets)
    .where(eq(workoutSets.exerciseLogId, logId));

  const [set] = await db
    .insert(workoutSets)
    .values({
      exerciseLogId: logId,
      setNumber:     (maxNum ?? 0) + 1,
      weightKg:      String(data.weightKg),
      reps:          data.reps,
      rpe:           data.rpe !== undefined ? String(data.rpe) : undefined,
      isWarmup:      data.isWarmup ?? false,
    })
    .returning();

  return { ...set, isPR: pr.isPR, prType: pr.type };
}

export async function updateSet(
  userId: string,
  sessionId: string,
  logId: string,
  setId: string,
  data: { weightKg?: number; reps?: number; rpe?: number; isWarmup?: boolean },
) {
  // Verify ownership via session, and that the set belongs to this exercise log
  const session = await getSession(userId, sessionId);
  if (!session) return null;

  const [updated] = await db
    .update(workoutSets)
    .set({
      weightKg: data.weightKg !== undefined ? String(data.weightKg) : undefined,
      reps:     data.reps,
      rpe:      data.rpe !== undefined ? String(data.rpe) : undefined,
      isWarmup: data.isWarmup,
    })
    .where(and(eq(workoutSets.id, setId), eq(workoutSets.exerciseLogId, logId)))
    .returning();
  return updated ?? null;
}

export async function deleteSet(userId: string, sessionId: string, logId: string, setId: string) {
  const session = await getSession(userId, sessionId);
  if (!session) return false;
  const result = await db
    .delete(workoutSets)
    .where(and(eq(workoutSets.id, setId), eq(workoutSets.exerciseLogId, logId)))
    .returning({ id: workoutSets.id });
  return result.length > 0;
}

/** Last session's sets for an exercise — for pre-fill in UI */
export async function getLastSessionSets(userId: string, exerciseId: string) {
  const result = await getLastSessionSetsBulk(userId, [exerciseId]);
  return result.get(exerciseId) ?? [];
}

/**
 * Bulk version of getLastSessionSets — resolves each exercise's most recent
 * session and its sets in 2 round trips total, regardless of how many
 * exercise IDs are passed in (vs. 2 round trips *per exercise* if called
 * one at a time).
 */
export async function getLastSessionSetsBulk(userId: string, exerciseIds: string[]) {
  const result = new Map<string, { weightKg: string; reps: number; isWarmup: boolean }[]>();
  if (!exerciseIds.length) return result;

  // Most recent session date per exercise, in one query using DISTINCT ON.
  const lastSessions = await db
    .select({
      exerciseId:  workoutExerciseLogs.exerciseId,
      sessionId:   workoutSessions.id,
    })
    .from(workoutSessions)
    .innerJoin(workoutExerciseLogs, eq(workoutExerciseLogs.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        sql`${workoutExerciseLogs.exerciseId} = ANY(ARRAY[${sql.join(exerciseIds.map(id => sql`${id}::uuid`), sql`, `)}])`,
      ),
    )
    .orderBy(workoutExerciseLogs.exerciseId, desc(workoutSessions.date));

  // Keep only the first (most recent, due to ORDER BY) row per exercise.
  const sessionIdByExercise = new Map<string, string>();
  for (const row of lastSessions) {
    if (!sessionIdByExercise.has(row.exerciseId)) sessionIdByExercise.set(row.exerciseId, row.sessionId);
  }
  if (!sessionIdByExercise.size) return result;

  const sessionIds = [...new Set(sessionIdByExercise.values())];

  const sets = await db
    .select({
      exerciseId: workoutExerciseLogs.exerciseId,
      sessionId:  workoutExerciseLogs.sessionId,
      weightKg:   workoutSets.weightKg,
      reps:       workoutSets.reps,
      isWarmup:   workoutSets.isWarmup,
      setNumber:  workoutSets.setNumber,
    })
    .from(workoutSets)
    .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
    .where(
      and(
        sql`${workoutExerciseLogs.sessionId} = ANY(ARRAY[${sql.join(sessionIds.map(id => sql`${id}::uuid`), sql`, `)}])`,
        sql`${workoutExerciseLogs.exerciseId} = ANY(ARRAY[${sql.join(exerciseIds.map(id => sql`${id}::uuid`), sql`, `)}])`,
        eq(workoutSets.isWarmup, false),
      ),
    )
    .orderBy(asc(workoutSets.setNumber));

  for (const [exerciseId, sessionId] of sessionIdByExercise) {
    result.set(exerciseId, []);
    for (const s of sets) {
      if (s.exerciseId === exerciseId && s.sessionId === sessionId) {
        result.get(exerciseId)!.push({ weightKg: String(s.weightKg), reps: s.reps, isWarmup: s.isWarmup });
      }
    }
  }

  return result;
}
