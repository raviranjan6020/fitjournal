import { auth } from "@/lib/auth";
import { addExerciseToSession, getSessionWithExercises } from "@/modules/workouts/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const AddSchema = z.object({ exerciseId: z.string().uuid() });

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
  const log = await addExerciseToSession(session.user.id as string, id, parsed.data.exerciseId);
  if (!log) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(log, { status: 201 });
}
