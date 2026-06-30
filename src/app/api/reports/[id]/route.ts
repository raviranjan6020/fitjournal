import { auth } from "@/lib/auth";
import { getReport, markReportRead } from "@/modules/reporting/service";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const report = await getReport(session.user.id as string, id);
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Mark as read on fetch
  if (!report.isRead) await markReportRead(session.user.id as string, id);

  return NextResponse.json(report);
}
