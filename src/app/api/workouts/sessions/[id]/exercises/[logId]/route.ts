import { auth } from "@/lib/auth";
import { removeExerciseFromSession } from "@/modules/workouts/service";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; logId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, logId } = await params;
  const removed = await removeExerciseFromSession(session.user.id as string, id, logId);
  if (!removed) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
