import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Saved workout templates — a named, reusable set of exercises a user can
 * start a new session from, instead of re-adding exercises every time (or
 * being stuck with the fixed per-type defaults in workoutType).
 *
 * exerciseIds is an ordered array of exercise_library.id (uuid text form),
 * not a join table: templates are small (typically < 15 exercises), never
 * queried by exercise, and only ever read/written whole. A join table would
 * add joins for no query benefit here.
 */
export const workoutTemplates = pgTable("workout_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  workoutType: text("workout_type").notNull(),
  exerciseIds: uuid("exercise_ids").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.name)]);
