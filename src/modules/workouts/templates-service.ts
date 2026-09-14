import { db } from "@/db";
import { workoutTemplates, exerciseLibrary } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { addExercisesToSession, createSession } from "./service";

export async function listTemplates(userId: string) {
  const templates = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.userId, userId))
    .orderBy(workoutTemplates.name);

  if (!templates.length) return [];

  // Resolve exercise names for display (ordered per-template).
  const allIds = [...new Set(templates.flatMap(t => t.exerciseIds))];
  const exercises = allIds.length
    ? await db.select({ id: exerciseLibrary.id, name: exerciseLibrary.name })
        .from(exerciseLibrary)
        .where(inArray(exerciseLibrary.id, allIds))
    : [];
  const nameById = new Map(exercises.map(e => [e.id, e.name]));

  return templates.map(t => ({
    ...t,
    exercises: t.exerciseIds.map(id => ({ id, name: nameById.get(id) ?? "Unknown exercise" })),
  }));
}

export async function getTemplate(userId: string, templateId: string) {
  const [template] = await db
    .select()
    .from(workoutTemplates)
    .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)))
    .limit(1);
  return template ?? null;
}

export async function createTemplate(userId: string, data: {
  name: string;
  workoutType: string;
  exerciseIds: string[];
}) {
  const [template] = await db
    .insert(workoutTemplates)
    .values({
      userId,
      name: data.name.trim(),
      workoutType: data.workoutType,
      exerciseIds: data.exerciseIds,
    })
    .returning();
  return template;
}

/** Overwrite an existing template's exercise list / type — used by "update template". */
export async function updateTemplate(userId: string, templateId: string, data: {
  name?: string;
  workoutType?: string;
  exerciseIds?: string[];
}) {
  const [updated] = await db
    .update(workoutTemplates)
    .set({
      name: data.name?.trim(),
      workoutType: data.workoutType,
      exerciseIds: data.exerciseIds,
      updatedAt: new Date(),
    })
    .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteTemplate(userId: string, templateId: string) {
  const result = await db
    .delete(workoutTemplates)
    .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)))
    .returning({ id: workoutTemplates.id });
  return result.length > 0;
}

/**
 * Start a new workout session pre-loaded with a template's exercises.
 * Reuses the same batched exercise-add path as manual session creation,
 * so this gets the same lastSets-inline, single-round-trip behaviour.
 */
export async function startSessionFromTemplate(userId: string, templateId: string, data?: { date?: string; name?: string }) {
  const template = await getTemplate(userId, templateId);
  if (!template) return null;

  const session = await createSession(userId, {
    date: data?.date,
    workoutType: template.workoutType,
    name: data?.name ?? template.name,
    seedDefaults: false,
  });

  if (!template.exerciseIds.length) return { ...session, exercises: [] };

  const exercises = await addExercisesToSession(userId, session.id, template.exerciseIds);
  return { ...session, exercises };
}
