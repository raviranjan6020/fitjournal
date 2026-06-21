import { pgTable, text, numeric, integer, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const nutritionLogs = pgTable("nutrition_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(),
  proteinG: integer("protein_g"),
  waterL: numeric("water_l", { precision: 3, scale: 1 }),
  calories: integer("calories"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.date)]);
