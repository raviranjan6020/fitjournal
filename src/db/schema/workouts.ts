import { pgTable, text, integer, numeric, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const exerciseLibrary = pgTable("exercise_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(),
  slug: text("slug").unique().notNull(),
  muscleGroups: text("muscle_groups").array().notNull().default([]),
  equipment: text("equipment"),
  isCompound: boolean("is_compound").default(false),
  isCustom: boolean("is_custom").default(false).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(), // ISO date string YYYY-MM-DD
  workoutType: text("workout_type").notNull(),
  name: text("name"),
  durationMin: integer("duration_min"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workoutExerciseLogs = pgTable("workout_exercise_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => workoutSessions.id).notNull(),
  exerciseId: uuid("exercise_id").references(() => exerciseLibrary.id).notNull(),
  orderIndex: integer("order_index").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workoutSets = pgTable("workout_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  exerciseLogId: uuid("exercise_log_id").references(() => workoutExerciseLogs.id).notNull(),
  setNumber: integer("set_number").notNull(),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull(),
  reps: integer("reps").notNull(),
  rpe: numeric("rpe", { precision: 3, scale: 1 }),
  isWarmup: boolean("is_warmup").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
