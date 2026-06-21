import { auth } from "@/lib/auth";
import { getActiveGoal, setActiveGoal } from "@/modules/users/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const GoalSchema = z.object({
  goalType: z.enum(["fat_loss", "lean_bulk", "muscle_gain", "strength_gain", "recomposition", "maintain"]),
  startWeightKg: z.number().min(20).max(500),
  targetWeightKg: z.number().min(20).max(500).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const goal = await getActiveGoal(session.user.id as string);
  return NextResponse.json(goal);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = GoalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const goal = await setActiveGoal(session.user.id as string, parsed.data);
  return NextResponse.json(goal, { status: 201 });
}
