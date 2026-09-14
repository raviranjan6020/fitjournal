import { auth } from "@/lib/auth";
import { listTemplates } from "@/modules/workouts/templates-service";
import { db } from "@/db";
import { exerciseLibrary } from "@/db/schema";
import { or, isNull, eq } from "drizzle-orm";
import { WorkoutLogger } from "./logger";

export default async function NewWorkoutPage() {
  const session = await auth();
  const userId  = session!.user!.id as string;

  const [templates, exercises] = await Promise.all([
    listTemplates(userId),
    db
      .select()
      .from(exerciseLibrary)
      .where(or(isNull(exerciseLibrary.createdBy), eq(exerciseLibrary.createdBy, userId)))
      .orderBy(exerciseLibrary.name),
  ]);

  return <WorkoutLogger initialTemplates={templates} exerciseLibrary={exercises} />;
}
