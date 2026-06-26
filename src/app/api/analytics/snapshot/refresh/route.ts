import { auth } from "@/lib/auth";
import { buildSnapshot } from "@/modules/analytics/service";
import { NextResponse } from "next/server";

// Rate-limit per user tracked in memory (simple, resets on cold start)
const lastRefresh = new Map<string, number>();
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const last   = lastRefresh.get(userId) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json({ error: "rate_limited", retry_after: "6 hours" }, { status: 429 });
  }

  lastRefresh.set(userId, Date.now());
  const snapshot = await buildSnapshot(userId);
  return NextResponse.json(snapshot);
}
