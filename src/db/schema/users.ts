import { pgTable, text, numeric, date, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  authProvider: text("auth_provider").default("google"),
  authProviderId: text("auth_provider_id").unique(),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  timezone: text("timezone").default("UTC").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersGoals = pgTable("users_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  goalType: text("goal_type").notNull(),
  targetWeightKg: numeric("target_weight_kg", { precision: 5, scale: 1 }),
  startWeightKg: numeric("start_weight_kg", { precision: 5, scale: 1 }),
  startDate: date("start_date"),
  targetDate: date("target_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersPreferences = pgTable("users_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).unique().notNull(),
  proteinTargetG: numeric("protein_target_g"),
  waterTargetL: numeric("water_target_l", { precision: 3, scale: 1 }).default("2.5"),
  weeklyWorkoutTarget: numeric("weekly_workout_target").default("4"),
  reportDay: text("report_day").default("sunday"),
  deliveryEmail: boolean("delivery_email").default(true).notNull(),
  deliveryWhatsapp: boolean("delivery_whatsapp").default(false).notNull(),
  deliveryPush: boolean("delivery_push").default(true).notNull(),
  whatsappNumber: text("whatsapp_number"),
  pushSubscription: jsonb("push_subscription"),
  coachHistory: jsonb("coach_history").default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
