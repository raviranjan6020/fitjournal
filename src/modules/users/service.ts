import { db } from "@/db";
import { users, usersGoals, usersPreferences } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getUserProfile(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  const [prefs] = await db.select().from(usersPreferences).where(eq(usersPreferences.userId, userId)).limit(1);
  const [goal] = await db
    .select()
    .from(usersGoals)
    .where(and(eq(usersGoals.userId, userId), eq(usersGoals.isActive, true)))
    .limit(1);
  return { ...user, preferences: prefs ?? null, goal: goal ?? null };
}

export async function updateUserProfile(userId: string, data: {
  name?: string;
  heightCm?: number;
  dateOfBirth?: string;
  gender?: string;
  timezone?: string;
}) {
  const [updated] = await db
    .update(users)
    .set({
      name: data.name,
      heightCm: data.heightCm !== undefined ? String(data.heightCm) : undefined,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      timezone: data.timezone,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

export async function getActiveGoal(userId: string) {
  const [goal] = await db
    .select()
    .from(usersGoals)
    .where(and(eq(usersGoals.userId, userId), eq(usersGoals.isActive, true)))
    .limit(1);
  return goal ?? null;
}

export async function setActiveGoal(userId: string, data: {
  goalType: string;
  startWeightKg: number;
  targetWeightKg?: number;
  startDate?: string;
  targetDate?: string;
}) {
  // Deactivate current goal
  await db.update(usersGoals).set({ isActive: false }).where(eq(usersGoals.userId, userId));

  const [goal] = await db
    .insert(usersGoals)
    .values({
      userId,
      goalType: data.goalType,
      startWeightKg: String(data.startWeightKg),
      targetWeightKg: data.targetWeightKg ? String(data.targetWeightKg) : null,
      startDate: data.startDate ?? new Date().toISOString().slice(0, 10),
      targetDate: data.targetDate ?? null,
      isActive: true,
    })
    .returning();

  // Recompute protein target: 1.6 × startWeightKg
  const proteinTarget = Math.round(1.6 * data.startWeightKg);
  await db
    .update(usersPreferences)
    .set({ proteinTargetG: String(proteinTarget), updatedAt: new Date() })
    .where(eq(usersPreferences.userId, userId));

  return goal;
}

export async function getPreferences(userId: string) {
  const [prefs] = await db
    .select()
    .from(usersPreferences)
    .where(eq(usersPreferences.userId, userId))
    .limit(1);
  return prefs ?? null;
}

export async function updatePreferences(userId: string, data: {
  proteinTargetG?: number;
  waterTargetL?: number;
  weeklyWorkoutTarget?: number;
  deliveryEmail?: boolean;
  deliveryWhatsapp?: boolean;
  deliveryPush?: boolean;
  whatsappNumber?: string;
}) {
  const [updated] = await db
    .update(usersPreferences)
    .set({
      proteinTargetG: data.proteinTargetG !== undefined ? String(data.proteinTargetG) : undefined,
      waterTargetL: data.waterTargetL !== undefined ? String(data.waterTargetL) : undefined,
      weeklyWorkoutTarget: data.weeklyWorkoutTarget !== undefined ? String(data.weeklyWorkoutTarget) : undefined,
      deliveryEmail: data.deliveryEmail,
      deliveryWhatsapp: data.deliveryWhatsapp,
      deliveryPush: data.deliveryPush,
      whatsappNumber: data.whatsappNumber,
      updatedAt: new Date(),
    })
    .where(eq(usersPreferences.userId, userId))
    .returning();
  return updated;
}

/** Returns whether user has completed onboarding (profile + goal set) */
export async function getOnboardingStatus(userId: string) {
  const [user] = await db
    .select({ name: users.name, heightCm: users.heightCm })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const goal = await getActiveGoal(userId);
  return {
    profileComplete: !!(user?.name && user?.heightCm),
    goalSet: !!goal,
    readyForInsights: false, // unlocks after 14d data — analytics engine sets this
  };
}
