import { db } from "@/db";
import { workoutSessions, workoutExerciseLogs, workoutSets, exerciseLibrary } from "@/db/schema";
import { eq, and, desc, asc, max, sql } from "drizzle-orm";
import { isoDate } from "@/lib/utils";
import { checkPR } from "./pr-detector";

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
  return session;
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
  // Verify session ownership
  const session = await getSession(userId, sessionId);
  if (!session) return null;

  // Next order index
  const [{ maxIdx }] = await db
    .select({ maxIdx: max(workoutExerciseLogs.orderIndex) })
    .from(workoutExerciseLogs)
    .where(eq(workoutExerciseLogs.sessionId, sessionId));

  const [log] = await db
    .insert(workoutExerciseLogs)
    .values({ sessionId, exerciseId, orderIndex: (maxIdx ?? 0) + 1 })
    .returning();
  return log;
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
  setId: string,
  data: { weightKg?: number; reps?: number; rpe?: number; isWarmup?: boolean },
) {
  // Verify ownership via session
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
    .where(eq(workoutSets.id, setId))
    .returning();
  return updated ?? null;
}

export async function deleteSet(userId: string, sessionId: string, setId: string) {
  const session = await getSession(userId, sessionId);
  if (!session) return false;
  const result = await db
    .delete(workoutSets)
    .where(eq(workoutSets.id, setId))
    .returning({ id: workoutSets.id });
  return result.length > 0;
}

/** Last session's sets for an exercise — for pre-fill in UI */
export async function getLastSessionSets(userId: string, exerciseId: string) {
  const [lastSession] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .innerJoin(workoutExerciseLogs, eq(workoutExerciseLogs.sessionId, workoutSessions.id))
    .where(and(eq(workoutSessions.userId, userId), eq(workoutExerciseLogs.exerciseId, exerciseId)))
    .orderBy(desc(workoutSessions.date))
    .limit(1);
  if (!lastSession) return [];

  return db
    .select({ weightKg: workoutSets.weightKg, reps: workoutSets.reps, isWarmup: workoutSets.isWarmup })
    .from(workoutSets)
    .innerJoin(workoutExerciseLogs, eq(workoutSets.exerciseLogId, workoutExerciseLogs.id))
    .where(
      and(
        eq(workoutExerciseLogs.sessionId, lastSession.id),
        eq(workoutExerciseLogs.exerciseId, exerciseId),
        eq(workoutSets.isWarmup, false),
      ),
    )
    .orderBy(asc(workoutSets.setNumber));
}
