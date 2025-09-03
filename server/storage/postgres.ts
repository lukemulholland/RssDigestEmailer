import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, gt, sql } from "drizzle-orm";
import {
  feeds,
  summaries,
  emailSettings,
  scheduleSettings,
  activityLogs,
  type Feed,
  type InsertFeed,
  type Summary,
  type InsertSummary,
  type EmailSettings,
  type InsertEmailSettings,
  type ScheduleSettings,
  type InsertScheduleSettings,
  type ActivityLog,
  type InsertActivityLog,
  type DashboardStats,
} from "@shared/schema";
import type { IStorage } from "../storage";

export class PostgresStorage implements IStorage {
  private db;

  constructor(connectionString: string) {
    const sqlClient = neon(connectionString);
    this.db = drizzle(sqlClient);
  }

  // Feeds
  async getFeeds(): Promise<Feed[]> {
    return this.db.select().from(feeds).orderBy(desc(feeds.createdAt));
  }

  async getFeed(id: string): Promise<Feed | undefined> {
    const [feed] = await this.db
      .select()
      .from(feeds)
      .where(eq(feeds.id, id));
    return feed;
  }

  async createFeed(feed: InsertFeed): Promise<Feed> {
    const [created] = await this.db.insert(feeds).values(feed).returning();
    return created;
  }

  async updateFeed(id: string, updates: Partial<Feed>): Promise<Feed | undefined> {
    const [updated] = await this.db
      .update(feeds)
      .set(updates)
      .where(eq(feeds.id, id))
      .returning();
    return updated;
  }

  async deleteFeed(id: string): Promise<boolean> {
    const [deleted] = await this.db
      .delete(feeds)
      .where(eq(feeds.id, id))
      .returning();
    return !!deleted;
  }

  // Summaries
  async getSummaries(): Promise<Summary[]> {
    return this.db.select().from(summaries).orderBy(desc(summaries.generatedAt));
  }

  async getSummary(id: string): Promise<Summary | undefined> {
    const [summary] = await this.db
      .select()
      .from(summaries)
      .where(eq(summaries.id, id));
    return summary;
  }

  async createSummary(summary: InsertSummary): Promise<Summary> {
    const [created] = await this.db.insert(summaries).values(summary).returning();
    return created;
  }

  async updateSummary(id: string, updates: Partial<Summary>): Promise<Summary | undefined> {
    const [updated] = await this.db
      .update(summaries)
      .set(updates)
      .where(eq(summaries.id, id))
      .returning();
    return updated;
  }

  async getRecentSummaries(limit = 10): Promise<Summary[]> {
    return this.db
      .select()
      .from(summaries)
      .orderBy(desc(summaries.generatedAt))
      .limit(limit);
  }

  // Email Settings
  async getEmailSettings(): Promise<EmailSettings | undefined> {
    const [settings] = await this.db.select().from(emailSettings).limit(1);
    return settings;
  }

  async createOrUpdateEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings> {
    const existing = await this.getEmailSettings();
    if (existing) {
      const [updated] = await this.db
        .update(emailSettings)
        .set(settings)
        .where(eq(emailSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(emailSettings).values(settings).returning();
    return created;
  }

  // Recipients
  async listRecipients(): Promise<string[]> {
    let settings = await this.getEmailSettings();
    if (!settings) {
      const [created] = await this.db
        .insert(emailSettings)
        .values({
          smtpServer: "",
          smtpPort: 587,
          smtpSecurity: "TLS",
          fromEmail: "",
          username: "",
          password: "",
          recipients: [],
          subjectTemplate: "RSS Summary - {date}",
          isActive: false,
        })
        .returning();
      settings = created;
    }
    return settings.recipients ?? [];
  }

  async addRecipient(email: string): Promise<string[]> {
    let settings = await this.getEmailSettings();
    if (!settings) {
      const [created] = await this.db
        .insert(emailSettings)
        .values({
          smtpServer: "",
          smtpPort: 587,
          smtpSecurity: "TLS",
          fromEmail: "",
          username: "",
          password: "",
          recipients: [],
          subjectTemplate: "RSS Summary - {date}",
          isActive: false,
        })
        .returning();
      settings = created;
    }
    const set = new Set(settings.recipients ?? []);
    set.add(email);
    const [updated] = await this.db
      .update(emailSettings)
      .set({ recipients: Array.from(set) })
      .where(eq(emailSettings.id, settings.id))
      .returning();
    return updated.recipients;
  }

  async removeRecipient(email: string): Promise<string[]> {
    let settings = await this.getEmailSettings();
    if (!settings) {
      const [created] = await this.db
        .insert(emailSettings)
        .values({
          smtpServer: "",
          smtpPort: 587,
          smtpSecurity: "TLS",
          fromEmail: "",
          username: "",
          password: "",
          recipients: [],
          subjectTemplate: "RSS Summary - {date}",
          isActive: false,
        })
        .returning();
      settings = created;
    }
    const filtered = (settings.recipients ?? []).filter((e) => e !== email);
    const [updated] = await this.db
      .update(emailSettings)
      .set({ recipients: filtered })
      .where(eq(emailSettings.id, settings.id))
      .returning();
    return updated.recipients;
  }

  // Schedule Settings
  async getScheduleSettings(): Promise<ScheduleSettings | undefined> {
    const [settings] = await this.db.select().from(scheduleSettings).limit(1);
    return settings;
  }

  async createOrUpdateScheduleSettings(
    settings: InsertScheduleSettings,
  ): Promise<ScheduleSettings> {
    const existing = await this.getScheduleSettings();
    if (existing) {
      const [updated] = await this.db
        .update(scheduleSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(scheduleSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db
      .insert(scheduleSettings)
      .values(settings)
      .returning();
    return created;
  }

  // Activity Logs
  async getActivityLogs(limit = 100): Promise<ActivityLog[]> {
    return this.db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await this.db.insert(activityLogs).values(log).returning();
    return created;
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const [activeFeedsCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(feeds)
      .where(eq(feeds.isActive, true));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [summariesToday] = await this.db
      .select({
        articles: sql<number>`coalesce(sum(${summaries.articleCount}),0)`,
        count: sql<number>`count(*)`,
      })
      .from(summaries)
      .where(gt(summaries.generatedAt, today));

    const [emailsSentCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(summaries)
      .where(eq(summaries.emailSent, true));

    const [lastCheckedFeed] = await this.db
      .select()
      .from(feeds)
      .where(sql`${feeds.lastChecked} is not null`)
      .orderBy(desc(feeds.lastChecked))
      .limit(1);

    const [errorCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(feeds)
      .where(eq(feeds.status, "error"));
    const [warningCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(feeds)
      .where(eq(feeds.status, "warning"));

    const lastCheck = lastCheckedFeed?.lastChecked
      ? this.getTimeAgo(new Date(lastCheckedFeed.lastChecked))
      : "Never";

    return {
      activeFeeds: Number(activeFeedsCount?.count ?? 0),
      articlesToday: Number(summariesToday?.articles ?? 0),
      emailsSent: Number(emailsSentCount?.count ?? 0),
      lastCheck,
      systemStatus: {
        rssParser: Number(errorCount?.count ?? 0) > 0 ? "error" : "operational",
        emailService: "operational",
        aiSummarizer: "operational",
        scheduler: Number(warningCount?.count ?? 0) > 0 ? "warning" : "operational",
      },
    };
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
