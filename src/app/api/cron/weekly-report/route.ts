import { runWeeklyReports } from "@/modules/cron/weekly-report";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await runWeeklyReports();
  return NextResponse.json({ ok: true });
}
