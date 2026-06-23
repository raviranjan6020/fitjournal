import { db } from "@/db";
import { workoutSessions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isoDate } from "@/lib/utils";

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
