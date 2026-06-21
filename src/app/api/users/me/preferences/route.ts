import { auth } from "@/lib/auth";
import { getPreferences, updatePreferences } from "@/modules/users/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const PrefsSchema = z.object({
  proteinTargetG: z.number().int().min(0).max(1000).optional(),
  waterTargetL: z.number().min(0).max(20).optional(),
  weeklyWorkoutTarget: z.number().int().min(1).max(14).optional(),
  deliveryEmail: z.boolean().optional(),
  deliveryWhatsapp: z.boolean().optional(),
  deliveryPush: z.boolean().optional(),
  whatsappNumber: z.string().max(20).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const prefs = await getPreferences(session.user.id as string);
  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = PrefsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const updated = await updatePreferences(session.user.id as string, parsed.data);
  return NextResponse.json(updated);
}
