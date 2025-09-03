import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const feeds = pgTable("feeds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  checkFrequencyHours: integer("check_frequency_hours").notNull().default(4),
  includeInSummary: boolean("include_in_summary").notNull().default(true),
  lastChecked: timestamp("last_checked"),
  lastError: text("last_error"),
  status: text("status").notNull().default("active"), // active, warning, error
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const summaries = pgTable("summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  articleCount: integer("article_count").notNull().default(0),
  sourceCount: integer("source_count").notNull().default(0),
  emailSent: boolean("email_sent").notNull().default(false),
  emailError: text("email_error"),
  generatedAt: timestamp("generated_at").notNull().default(sql`now()`),
  feedIds: text("feed_ids").array().notNull().default([]),
});

export const emailSettings = pgTable("email_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  smtpServer: text("smtp_server").notNull(),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpSecurity: text("smtp_security").notNull().default("TLS"), // TLS, SSL, None
  fromEmail: text("from_email").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  recipients: text("recipients").array().notNull().default([]),
  subjectTemplate: text("subject_template").notNull().default("RSS Summary - {date}"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const scheduleSettings = pgTable("schedule_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  isEnabled: boolean("is_enabled").notNull().default(true),
  frequencyHours: integer("frequency_hours").notNull().default(4),
  nextRun: timestamp("next_run"),
  lastRun: timestamp("last_run"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // feed_check, summary_generation, email_sent, error
  message: text("message").notNull(),
  details: jsonb("details"),
  level: text("level").notNull().default("info"), // info, warning, error
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Insert schemas
export const insertFeedSchema = createInsertSchema(feeds).omit({
  id: true,
  createdAt: true,
  lastChecked: true,
  lastError: true,
  status: true,
});

export const insertSummarySchema = createInsertSchema(summaries).omit({
  id: true,
  generatedAt: true,
});

export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleSettingsSchema = createInsertSchema(scheduleSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type Feed = typeof feeds.$inferSelect;
export type InsertFeed = z.infer<typeof insertFeedSchema>;

export type Summary = typeof summaries.$inferSelect;
export type InsertSummary = z.infer<typeof insertSummarySchema>;

export type EmailSettings = typeof emailSettings.$inferSelect;
export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;

export type ScheduleSettings = typeof scheduleSettings.$inferSelect;
export type InsertScheduleSettings = z.infer<typeof insertScheduleSettingsSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Additional types for API responses
export type DashboardStats = {
  activeFeeds: number;
  articlesToday: number;
  emailsSent: number;
  lastCheck: string;
  systemStatus: {
    rssParser: "operational" | "warning" | "error";
    emailService: "operational" | "warning" | "error";
    aiSummarizer: "operational" | "warning" | "error";
    scheduler: "operational" | "warning" | "error";
  };
};

export type SystemStatus = {
  service: string;
  status: "operational" | "warning" | "error";
  message?: string;
};
