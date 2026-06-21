import { auth } from "@/lib/auth";
import { getUserProfile, updateUserProfile } from "@/modules/users/service";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await getUserProfile(session.user.id as string);
  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const updated = await updateUserProfile(session.user.id as string, body);
  return NextResponse.json(updated);
}
