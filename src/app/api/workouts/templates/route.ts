import { auth } from "@/lib/auth";
import { listTemplates, createTemplate } from "@/modules/workouts/templates-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateSchema = z.object({
  name:        z.string().trim().min(1).max(60),
  workoutType: z.enum(["push","pull","legs","upper","lower","full_body","custom"]),
  exerciseIds: z.array(z.string().uuid()).min(1).max(30),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const templates = await listTemplates(session.user.id as string);
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  try {
    const template = await createTemplate(session.user.id as string, parsed.data);
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    // Unique (userId, name) violation
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json({ error: "You already have a template with this name." }, { status: 409 });
    }
    throw err;
  }
}
