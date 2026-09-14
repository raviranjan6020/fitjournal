import { auth } from "@/lib/auth";
import { db } from "@/db";
import { exerciseLibrary } from "@/db/schema";
import { or, and, eq, isNull, ilike, sql } from "drizzle-orm";
import { getLastSessionSets } from "@/modules/workouts/service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q          = searchParams.get("q")          ?? "";
  const muscle     = searchParams.get("muscle")      ?? "";
  const exerciseId = searchParams.get("lastSets")    ?? ""; // prefill

  // Return last session sets for pre-fill
  if (exerciseId) {
    const sets = await getLastSessionSets(session.user.id as string, exerciseId);
    return NextResponse.json(sets);
  }

  const conditions = [
    or(
      isNull(exerciseLibrary.createdBy),
      eq(exerciseLibrary.createdBy, session.user.id as string),
    ),
  ];
  if (q) conditions.push(ilike(exerciseLibrary.name, `%${q}%`));
  if (muscle) conditions.push(sql`${muscle} = ANY(${exerciseLibrary.muscleGroups})`);

  const exercises = await db
    .select()
    .from(exerciseLibrary)
    .where(and(...conditions))
    .orderBy(exerciseLibrary.name); // alphabetical

  return NextResponse.json(exercises);
}
