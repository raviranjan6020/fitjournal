import { auth } from "@/lib/auth";
import { upsertCheckin } from "@/modules/body-metrics/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const result = await upsertCheckin(session.user.id as string, body);
  return NextResponse.json(result);
}
