import { auth } from "@/lib/auth";
import { getUserProfile, updateUserProfile } from "@/modules/users/service";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  heightCm: z.number().min(50).max(300).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  timezone: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await getUserProfile(session.user.id as string);
  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const updated = await updateUserProfile(session.user.id as string, parsed.data);
  return NextResponse.json(updated);
}
