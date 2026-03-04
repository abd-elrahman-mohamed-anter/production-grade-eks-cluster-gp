import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: text("username").unique(),
  password: text("password"),
  googleId: text("google_id").unique(),
  email: text("email"),
  avatar: text("avatar"),
  apiKey: text("api_key"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Scans table
export const scans = pgTable("scans", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  targetUrl: text("target_url").notNull(),
  scanType: text("scan_type").notNull().default("quick"),
  status: text("status").notNull().default("pending"),
  progress: integer("progress").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  totalVulnerabilities: integer("total_vulnerabilities").default(0),
  criticalCount: integer("critical_count").default(0),
  highCount: integer("high_count").default(0),
  mediumCount: integer("medium_count").default(0),
  lowCount: integer("low_count").default(0),
  infoCount: integer("info_count").default(0),
});

export const insertScanSchema = createInsertSchema(scans).pick({
  targetUrl: true,
  scanType: true,
});

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;

// Vulnerabilities table
export const vulnerabilities = pgTable("vulnerabilities", {
  id: varchar("id", { length: 36 }).primaryKey(),
  scanId: varchar("scan_id", { length: 36 }).notNull(),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  affectedUrl: text("affected_url").notNull(),
  remediation: text("remediation"),
  details: jsonb("details"),
});

export const insertVulnerabilitySchema = createInsertSchema(vulnerabilities).omit({
  id: true,
});

export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;
export type Vulnerability = typeof vulnerabilities.$inferSelect;

// Scheduled scans table
export const scheduledScans = pgTable("scheduled_scans", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  targetUrl: text("target_url").notNull(),
  frequency: text("frequency").notNull(), // daily, weekly, monthly, quarterly, annually
  time: text("time").notNull(),
  dayOfWeek: integer("day_of_week"), // 0-6 for Weekly (0 = Sunday)
  dayOfMonth: integer("day_of_month"), // 1-31 for Monthly
  month: integer("month"), // 0-11 for Annually (0 = January)
  enabled: boolean("enabled").default(true),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
});

export const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily", category: "Regular" },
  { value: "weekly", label: "Weekly", category: "Regular" },
  { value: "monthly", label: "Monthly", category: "Regular" },
  { value: "quarterly", label: "Quarterly (Every 3 months)", category: "Extended" },
  { value: "annually", label: "Annually (Yearly)", category: "Extended" },
] as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export const MONTHS = [
  { value: 0, label: "January" },
  { value: 1, label: "February" },
  { value: 2, label: "March" },
  { value: 3, label: "April" },
  { value: 4, label: "May" },
  { value: 5, label: "June" },
  { value: 6, label: "July" },
  { value: 7, label: "August" },
  { value: 8, label: "September" },
  { value: 9, label: "October" },
  { value: 10, label: "November" },
  { value: 11, label: "December" },
] as const;

export const insertScheduledScanSchema = createInsertSchema(scheduledScans).pick({
  targetUrl: true,
  frequency: true,
  time: true,
  enabled: true,
}).extend({
  dayOfWeek: z.number().optional().nullable(),
  dayOfMonth: z.number().optional().nullable(),
  month: z.number().optional().nullable(),
});

export type InsertScheduledScan = z.infer<typeof insertScheduledScanSchema>;
export type ScheduledScan = typeof scheduledScans.$inferSelect;

// Settings table
export const settings = pgTable("settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  scanDepth: text("scan_depth").default("medium"),
  autoScan: boolean("auto_scan").default(false),
  emailNotifications: boolean("email_notifications").default(true),
});

// Reports table
export const reports = pgTable("reports", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  scanId: varchar("scan_id", { length: 36 }),
  reportName: text("report_name").notNull(),
  reportPath: text("report_path").notNull(),
  createdAt: timestamp("created_at").notNull(),
  total: integer("total").default(0),
  critical: integer("critical").default(0),
  high: integer("high").default(0),
  medium: integer("medium").default(0),
  low: integer("low").default(0),
  scanType: text("scan_type"),
});

export const insertReportSchema = createInsertSchema(reports).pick({
  userId: true,
  reportName: true,
  reportPath: true,
  createdAt: true,
  scanId: true,
  total: true,
  critical: true,
  high: true,
  medium: true,
  low: true,
  scanType: true,
});

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
