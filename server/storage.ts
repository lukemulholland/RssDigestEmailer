import { 
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
  type DashboardStats
} from "@shared/schema";
import { randomUUID } from "crypto";
import { PostgresStorage } from "./storage/postgres";

export interface IStorage {
  // Feeds
  getFeeds(): Promise<Feed[]>;
  getFeed(id: string): Promise<Feed | undefined>;
  createFeed(feed: InsertFeed): Promise<Feed>;
  updateFeed(id: string, feed: Partial<Feed>): Promise<Feed | undefined>;
  deleteFeed(id: string): Promise<boolean>;

  // Summaries
  getSummaries(): Promise<Summary[]>;
  getSummary(id: string): Promise<Summary | undefined>;
  createSummary(summary: InsertSummary): Promise<Summary>;
  updateSummary(id: string, updates: Partial<Summary>): Promise<Summary | undefined>;
  getRecentSummaries(limit?: number): Promise<Summary[]>;

  // Email Settings
  getEmailSettings(): Promise<EmailSettings | undefined>;
  createOrUpdateEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings>;
  // Recipients
  listRecipients(): Promise<string[]>;
  addRecipient(email: string): Promise<string[]>;
  removeRecipient(email: string): Promise<string[]>;

  // Schedule Settings
  getScheduleSettings(): Promise<ScheduleSettings | undefined>;
  createOrUpdateScheduleSettings(settings: InsertScheduleSettings): Promise<ScheduleSettings>;

  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;
}

export class MemStorage implements IStorage {
  private feeds: Map<string, Feed>;
  private summaries: Map<string, Summary>;
  private emailSettings: EmailSettings | undefined;
  private scheduleSettings: ScheduleSettings | undefined;
  private activityLogs: Map<string, ActivityLog>;

  constructor() {
    this.feeds = new Map();
    this.summaries = new Map();
    this.activityLogs = new Map();
  }

  // Feeds
  async getFeeds(): Promise<Feed[]> {
    return Array.from(this.feeds.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getFeed(id: string): Promise<Feed | undefined> {
    return this.feeds.get(id);
  }

  async createFeed(insertFeed: InsertFeed): Promise<Feed> {
    const id = randomUUID();
    const feed: Feed = {
      name: insertFeed.name,
      url: insertFeed.url,
      isActive: insertFeed.isActive ?? true,
      checkFrequencyHours: insertFeed.checkFrequencyHours ?? 4,
      includeInSummary: insertFeed.includeInSummary ?? true,
      id,
      status: "active",
      lastChecked: null,
      lastError: null,
      createdAt: new Date(),
    };
    this.feeds.set(id, feed);
    return feed;
  }

  async updateFeed(id: string, updates: Partial<Feed>): Promise<Feed | undefined> {
    const feed = this.feeds.get(id);
    if (!feed) return undefined;
    
    const updatedFeed = { ...feed, ...updates };
    this.feeds.set(id, updatedFeed);
    return updatedFeed;
  }

  async deleteFeed(id: string): Promise<boolean> {
    return this.feeds.delete(id);
  }

  // Summaries
  async getSummaries(): Promise<Summary[]> {
    return Array.from(this.summaries.values()).sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }

  async getSummary(id: string): Promise<Summary | undefined> {
    return this.summaries.get(id);
  }

  async createSummary(insertSummary: InsertSummary): Promise<Summary> {
    const id = randomUUID();
    const summary: Summary = {
      title: insertSummary.title,
      content: insertSummary.content,
      excerpt: insertSummary.excerpt,
      articleCount: insertSummary.articleCount ?? 0,
      sourceCount: insertSummary.sourceCount ?? 0,
      emailSent: insertSummary.emailSent ?? false,
      emailError: insertSummary.emailError ?? null,
      feedIds: insertSummary.feedIds ?? [],
      id,
      generatedAt: new Date(),
    };
    this.summaries.set(id, summary);
    return summary;
  }

  async getRecentSummaries(limit: number = 10): Promise<Summary[]> {
    const summaries = await this.getSummaries();
    return summaries.slice(0, limit);
  }

  async updateSummary(id: string, updates: Partial<Summary>): Promise<Summary | undefined> {
    const summary = this.summaries.get(id);
    if (!summary) return undefined;
    
    const updatedSummary = { ...summary, ...updates };
    this.summaries.set(id, updatedSummary);
    return updatedSummary;
  }

  // Email Settings
  async getEmailSettings(): Promise<EmailSettings | undefined> {
    return this.emailSettings;
  }

  async createOrUpdateEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings> {
    const id = this.emailSettings?.id || randomUUID();
    this.emailSettings = {
      smtpServer: settings.smtpServer,
      smtpPort: settings.smtpPort ?? 587,
      smtpSecurity: settings.smtpSecurity ?? "TLS",
      fromEmail: settings.fromEmail,
      username: settings.username,
      password: settings.password,
      recipients: settings.recipients ?? [],
      subjectTemplate: settings.subjectTemplate ?? "RSS Summary - {date}",
      isActive: settings.isActive ?? true,
      id,
      createdAt: this.emailSettings?.createdAt || new Date(),
    };
    return this.emailSettings;
  }

  // Recipients
  async listRecipients(): Promise<string[]> {
    if (!this.emailSettings) {
      this.emailSettings = {
        id: randomUUID(),
        smtpServer: "",
        smtpPort: 587,
        smtpSecurity: "TLS",
        fromEmail: "",
        username: "",
        password: "",
        recipients: [],
        subjectTemplate: "RSS Summary - {date}",
        isActive: false,
        createdAt: new Date(),
      };
    }
    return this.emailSettings.recipients ?? [];
  }

  async addRecipient(email: string): Promise<string[]> {
    if (!this.emailSettings) {
      this.emailSettings = {
        id: randomUUID(),
        smtpServer: "",
        smtpPort: 587,
        smtpSecurity: "TLS",
        fromEmail: "",
        username: "",
        password: "",
        recipients: [],
        subjectTemplate: "RSS Summary - {date}",
        isActive: false,
        createdAt: new Date(),
      };
    }
    const set = new Set(this.emailSettings.recipients ?? []);
    set.add(email);
    this.emailSettings = { ...this.emailSettings, recipients: Array.from(set) };
    return this.emailSettings.recipients;
  }

  async removeRecipient(email: string): Promise<string[]> {
    if (!this.emailSettings) {
      this.emailSettings = {
        id: randomUUID(),
        smtpServer: "",
        smtpPort: 587,
        smtpSecurity: "TLS",
        fromEmail: "",
        username: "",
        password: "",
        recipients: [],
        subjectTemplate: "RSS Summary - {date}",
        isActive: false,
        createdAt: new Date(),
      };
    }
    const filtered = (this.emailSettings.recipients ?? []).filter((e) => e !== email);
    this.emailSettings = { ...this.emailSettings, recipients: filtered };
    return this.emailSettings.recipients;
  }

  // Schedule Settings
  async getScheduleSettings(): Promise<ScheduleSettings | undefined> {
    return this.scheduleSettings;
  }

  async createOrUpdateScheduleSettings(settings: InsertScheduleSettings): Promise<ScheduleSettings> {
    const id = this.scheduleSettings?.id || randomUUID();
    this.scheduleSettings = {
      isEnabled: settings.isEnabled ?? true,
      frequencyHours: settings.frequencyHours ?? 4,
      nextRun: settings.nextRun ?? null,
      lastRun: settings.lastRun ?? null,
      id,
      updatedAt: new Date(),
    };
    return this.scheduleSettings;
  }

  // Activity Logs
  async getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    const logs = Array.from(this.activityLogs.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return logs.slice(0, limit);
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const log: ActivityLog = {
      type: insertLog.type,
      message: insertLog.message,
      details: insertLog.details ?? null,
      level: insertLog.level ?? "info",
      id,
      createdAt: new Date(),
    };
    this.activityLogs.set(id, log);
    return log;
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const feeds = await this.getFeeds();
    const summaries = await this.getSummaries();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const summariesToday = summaries.filter(s => 
      new Date(s.generatedAt) >= today
    );

    const emailsSent = summaries.filter(s => s.emailSent).length;
    
    const activeFeeds = feeds.filter(f => f.isActive).length;
    
    const lastCheckedFeed = feeds
      .filter(f => f.lastChecked)
      .sort((a, b) => new Date(b.lastChecked!).getTime() - new Date(a.lastChecked!).getTime())[0];

    const lastCheck = lastCheckedFeed?.lastChecked 
      ? this.getTimeAgo(new Date(lastCheckedFeed.lastChecked))
      : "Never";

    // System status based on recent errors
    const recentErrors = feeds.filter(f => f.status === "error").length;
    const recentWarnings = feeds.filter(f => f.status === "warning").length;

    return {
      activeFeeds,
      articlesToday: summariesToday.reduce((sum, s) => sum + s.articleCount, 0),
      emailsSent,
      lastCheck,
      systemStatus: {
        rssParser: recentErrors > 0 ? "error" : "operational",
        emailService: "operational",
        aiSummarizer: "operational",
        scheduler: recentWarnings > 0 ? "warning" : "operational",
      }
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

let storage: IStorage;

if (process.env.DATABASE_URL) {
  storage = new PostgresStorage(process.env.DATABASE_URL);
} else {
  storage = new MemStorage();
}

export { storage };
