import { auth } from "@/lib/auth";
import { computeWeightTrend } from "@/modules/body-metrics/trend";
import { getActiveGoal } from "@/modules/users/service";
import { NextResponse } from "next/server";
import type { GoalType } from "@/lib/constants";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const goal   = await getActiveGoal(userId);
  const trend  = await computeWeightTrend(userId, (goal?.goalType as GoalType) ?? null);

  return NextResponse.json(trend);
}
