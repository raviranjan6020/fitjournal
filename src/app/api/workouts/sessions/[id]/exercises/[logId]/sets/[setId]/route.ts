import { auth } from "@/lib/auth";
import { updateSet, deleteSet } from "@/modules/workouts/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateSchema = z.object({
  weightKg: z.number().min(0).max(1000).optional(),
  reps:     z.number().int().min(1).max(200).optional(),
  rpe:      z.number().min(6).max(10).optional(),
  isWarmup: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; logId: string; setId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, logId, setId } = await params;
  const body   = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const updated = await updateSet(session.user.id as string, id, logId, setId, parsed.data);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; logId: string; setId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, logId, setId } = await params;
  const removed = await deleteSet(session.user.id as string, id, logId, setId);
  if (!removed) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
