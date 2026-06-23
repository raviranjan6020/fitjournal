import { auth } from "@/lib/auth";
import { addSet } from "@/modules/workouts/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const SetSchema = z.object({
  weightKg: z.number().min(0).max(1000),
  reps:     z.number().int().min(1).max(200),
  rpe:      z.number().min(6).max(10).optional(),
  isWarmup: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, logId } = await params;
  const body   = await req.json();
  const parsed = SetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const set = await addSet(session.user.id as string, id, logId, parsed.data);
  if (!set) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(set, { status: 201 });
}
