import { auth } from "@/lib/auth";
import { updateTemplate, deleteTemplate } from "@/modules/workouts/templates-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateSchema = z.object({
  name:        z.string().trim().min(1).max(60).optional(),
  workoutType: z.enum(["push","pull","legs","upper","lower","full_body","custom"]).optional(),
  exerciseIds: z.array(z.string().uuid()).min(1).max(30).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const updated = await updateTemplate(session.user.id as string, id, parsed.data);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const removed = await deleteTemplate(session.user.id as string, id);
  if (!removed) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
