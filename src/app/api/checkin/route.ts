import { auth } from "@/lib/auth";
import { upsertCheckin, getCheckinForDate } from "@/modules/body-metrics/service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isoDate } from "@/lib/utils";

const CheckinSchema = z.object({
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weightKg:     z.number().min(10).max(500).optional(),
  bodyFatPct:   z.number().min(1).max(70).optional(),
  proteinG:     z.number().int().min(0).max(1000).optional(),
  waterL:       z.number().min(0).max(20).optional(),
  calories:     z.number().int().min(0).max(20000).optional(),
  sleepHours:   z.number().min(0).max(16).optional(),
  sleepQuality: z.number().int().min(1).max(5).optional(),
  notes:        z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CheckinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const result = await upsertCheckin(session.user.id as string, parsed.data);
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? isoDate();

  const result = await getCheckinForDate(session.user.id as string, date);
  return NextResponse.json(result);
}
