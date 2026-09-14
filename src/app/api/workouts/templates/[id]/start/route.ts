import { auth } from "@/lib/auth";
import { startSessionFromTemplate } from "@/modules/workouts/templates-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const StartSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  name: z.string().max(100).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json().catch(() => ({}));
  const parsed = StartSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const result = await startSessionFromTemplate(session.user.id as string, id, parsed.data);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(result, { status: 201 });
}
