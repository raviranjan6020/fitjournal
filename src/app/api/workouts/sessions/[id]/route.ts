import { auth } from "@/lib/auth";
import { getSession, updateSession, deleteSession } from "@/modules/workouts/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateSchema = z.object({
  workoutType: z.enum(["push","pull","legs","upper","lower","full_body","custom"]).optional(),
  name:        z.string().max(100).optional(),
  notes:       z.string().max(500).optional(),
  durationMin: z.number().int().min(1).max(600).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const workoutSession = await getSession(session.user.id as string, id);
  if (!workoutSession) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(workoutSession);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body   = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const updated = await updateSession(session.user.id as string, id, parsed.data);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteSession(session.user.id as string, id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
