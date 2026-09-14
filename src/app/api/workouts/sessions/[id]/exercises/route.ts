import { auth } from "@/lib/auth";
import { addExercisesToSession, getSessionWithExercises } from "@/modules/workouts/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const AddSchema = z.union([
  z.object({ exerciseId: z.string().uuid() }),
  z.object({ exerciseIds: z.array(z.string().uuid()).min(1).max(20) }),
]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await getSessionWithExercises(session.user.id as string, id);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body   = await req.json();
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const exerciseIds = "exerciseIds" in parsed.data ? parsed.data.exerciseIds : [parsed.data.exerciseId];
  const logs = await addExercisesToSession(session.user.id as string, id, exerciseIds);
  if (!logs.length) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Single-exercise callers (existing behaviour) get the bare object back;
  // batch callers get the array.
  return NextResponse.json("exerciseIds" in parsed.data ? logs : logs[0], { status: 201 });
}
