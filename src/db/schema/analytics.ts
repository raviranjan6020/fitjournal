import { pgTable, text, jsonb, boolean, integer, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.snapshotDate)]);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  reportType: text("report_type").notNull().default("weekly"),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  snapshotId: uuid("snapshot_id").references(() => analyticsSnapshots.id),
  content: jsonb("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.userId, t.reportType, t.periodEnd)]);

export const deliveryLogs = pgTable("delivery_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  reportId: uuid("report_id").references(() => reports.id).notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique().on(t.reportId, t.channel)]);
