import { pgTable, text, numeric, integer, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const bodyMetrics = pgTable("body_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(),
  weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
  bodyFatPct: numeric("body_fat_pct", { precision: 4, scale: 1 }),
  waistCm: numeric("waist_cm", { precision: 5, scale: 1 }),
  chestCm: numeric("chest_cm", { precision: 5, scale: 1 }),
  leftArmCm: numeric("left_arm_cm", { precision: 4, scale: 1 }),
  rightArmCm: numeric("right_arm_cm", { precision: 4, scale: 1 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.date)]);

export const sleepLogs = pgTable("sleep_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(),
  hours: numeric("hours", { precision: 3, scale: 1 }).notNull(),
  quality: integer("quality"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.date)]);
