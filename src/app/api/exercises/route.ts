import { auth } from "@/lib/auth";
import { db } from "@/db";
import { exerciseLibrary } from "@/db/schema";
import { or, eq, isNull } from "drizzle-orm";
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

  const exercises = await db
    .select()
    .from(exerciseLibrary)
    .where(
      or(
        isNull(exerciseLibrary.createdBy),              // system exercises
        eq(exerciseLibrary.createdBy, session.user.id as string), // user's custom
      ),
    )
    .orderBy(exerciseLibrary.name);

  const filtered = exercises.filter(e => {
    const matchQ      = !q      || e.name.toLowerCase().includes(q.toLowerCase());
    const matchMuscle = !muscle || e.muscleGroups.includes(muscle);
    return matchQ && matchMuscle;
  });

  return NextResponse.json(filtered);
}
