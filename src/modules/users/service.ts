import { db } from "@/db";
import { users, usersGoals, usersPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getUserProfile(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [prefs] = await db.select().from(usersPreferences).where(eq(usersPreferences.userId, userId)).limit(1);
  const [goal] = await db
    .select()
    .from(usersGoals)
    .where(eq(usersGoals.userId, userId))
    .limit(1);
  return { ...user, preferences: prefs, goal: goal ?? null };
}

export async function updateUserProfile(userId: string, data: Partial<typeof users.$inferInsert>) {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

export async function setActiveGoal(userId: string, goalData: typeof usersGoals.$inferInsert) {
  // Deactivate current goal
  await db
    .update(usersGoals)
    .set({ isActive: false })
    .where(eq(usersGoals.userId, userId));

  const [goal] = await db.insert(usersGoals).values({ ...goalData, userId, isActive: true }).returning();

  // Recompute protein target: 1.6 * startWeightKg
  if (goalData.startWeightKg) {
    const proteinTarget = Math.round(1.6 * Number(goalData.startWeightKg));
    await db
      .update(usersPreferences)
      .set({ proteinTargetG: String(proteinTarget), updatedAt: new Date() })
      .where(eq(usersPreferences.userId, userId));
  }

  return goal;
}
