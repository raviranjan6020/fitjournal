import { auth } from "@/lib/auth";
import { listSessions, createSession } from "@/modules/workouts/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  workoutType: z.enum(["push","pull","legs","upper","lower","full_body","custom"]),
  name:        z.string().max(100).optional(),
  notes:       z.string().max(500).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit  = Math.min(Number(searchParams.get("limit")  ?? 20), 50);
  const offset = Number(searchParams.get("offset") ?? 0);

  const sessions = await listSessions(session.user.id as string, limit, offset);
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const created = await createSession(session.user.id as string, parsed.data);
  return NextResponse.json(created, { status: 201 });
}
