import { auth } from "@/lib/auth";
import { askCoach } from "@/modules/ai-coach/service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { question } = await req.json();
  if (!question || typeof question !== "string" || question.length < 5) {
    return NextResponse.json({ error: "invalid question" }, { status: 422 });
  }
  const result = await askCoach(session.user.id as string, question.slice(0, 500));
  return NextResponse.json(result);
}
