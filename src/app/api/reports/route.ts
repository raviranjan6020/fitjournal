import { auth } from "@/lib/auth";
import { listReports } from "@/modules/reporting/service";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const reports = await listReports(session.user.id as string);
  return NextResponse.json(reports);
}
