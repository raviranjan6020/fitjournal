import { auth } from "@/lib/auth";
import { getOrBuildSnapshot } from "@/modules/analytics/service";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const snapshot = await getOrBuildSnapshot(session.user.id as string);
  return NextResponse.json(snapshot);
}
