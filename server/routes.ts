import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { rssService } from "./services/rssService";
import { summaryService } from "./services/summaryService";
import { emailService } from "./services/emailService";
import { schedulerService } from "./services/schedulerService";
import { 
  insertFeedSchema, 
  insertEmailSettingsSchema, 
  insertScheduleSettingsSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize scheduler
  await schedulerService.initialize();

  // Dashboard endpoints
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Feed endpoints
  app.get("/api/feeds", async (req, res) => {
    try {
      const feeds = await storage.getFeeds();
      res.json(feeds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch feeds" });
    }
  });

  app.post("/api/feeds", async (req, res) => {
    try {
      const feedData = insertFeedSchema.parse(req.body);
      
      // Validate RSS URL
      const validation = await rssService.validateFeedUrl(feedData.url);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Use discovered title if name not provided
      if (!feedData.name && validation.title) {
        feedData.name = validation.title;
      }

      const feed = await storage.createFeed(feedData);
      
      await storage.createActivityLog({
        type: 'info',
        message: `New feed added: ${feed.name}`,
        details: { feedId: feed.id, url: feed.url },
        level: 'info'
      });

      res.status(201).json(feed);
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create feed" });
      }
    }
  });

  app.get("/api/feeds/:id", async (req, res) => {
    try {
      const feed = await storage.getFeed(req.params.id);
      if (!feed) {
        return res.status(404).json({ error: "Feed not found" });
      }
      res.json(feed);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch feed" });
    }
  });

  app.patch("/api/feeds/:id", async (req, res) => {
    try {
      const updates = req.body;
      const feed = await storage.updateFeed(req.params.id, updates);
      if (!feed) {
        return res.status(404).json({ error: "Feed not found" });
      }
      res.json(feed);
    } catch (error) {
      res.status(500).json({ error: "Failed to update feed" });
    }
  });

  app.delete("/api/feeds/:id", async (req, res) => {
    try {
      const success = await storage.deleteFeed(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Feed not found" });
      }
      
      await storage.createActivityLog({
        type: 'info',
        message: `Feed deleted: ${req.params.id}`,
        details: { feedId: req.params.id },
        level: 'info'
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete feed" });
    }
  });

  app.post("/api/feeds/:id/check", async (req, res) => {
    try {
      const result = await rssService.checkFeed(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to check feed" });
    }
  });

  app.post("/api/feeds/check-all", async (req, res) => {
    try {
      const result = await rssService.checkAllFeeds();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to check feeds" });
    }
  });

  app.post("/api/feeds/validate", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      
      const result = await rssService.validateFeedUrl(url);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to validate feed URL" });
    }
  });

  // Summary endpoints
  app.get("/api/summaries", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const summaries = limit ? 
        await storage.getRecentSummaries(limit) : 
        await storage.getSummaries();
      res.json(summaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch summaries" });
    }
  });

  app.get("/api/summaries/:id", async (req, res) => {
    try {
      const summary = await storage.getSummary(req.params.id);
      if (!summary) {
        return res.status(404).json({ error: "Summary not found" });
      }
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch summary" });
    }
  });

  app.post("/api/summaries/generate", async (req, res) => {
    try {
      const result = await summaryService.generateSummary();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  app.post("/api/summaries/:id/retry", async (req, res) => {
    try {
      const result = await summaryService.retrySummary(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to retry summary" });
    }
  });

  app.post("/api/summaries/:id/send-email", async (req, res) => {
    try {
      const result = await emailService.sendSummaryEmail(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Email settings endpoints
  app.get("/api/email-settings", async (req, res) => {
    try {
      const settings = await storage.getEmailSettings();
      const isConfigured = !!(
        settings &&
        settings.smtpServer &&
        settings.fromEmail &&
        settings.username &&
        settings.password
      );

      if (!isConfigured) {
        return res.status(404).json({ error: "Email settings not configured" });
      }
      
      // Don't send password in response
      const { password, ...settingsWithoutPassword } = settings;
      res.json(settingsWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email settings" });
    }
  });

  app.post("/api/email-settings", async (req, res) => {
    try {
      const settingsData = insertEmailSettingsSchema.parse(req.body);
      const settings = await storage.createOrUpdateEmailSettings(settingsData);
      
      await storage.createActivityLog({
        type: 'info',
        message: 'Email settings updated',
        details: { smtpServer: settings.smtpServer, fromEmail: settings.fromEmail },
        level: 'info'
      });

      // Don't send password in response
      const { password, ...settingsWithoutPassword } = settings;
      res.json(settingsWithoutPassword);
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to save email settings" });
      }
    }
  });

  app.post("/api/email-settings/test", async (req, res) => {
    try {
      const result = await emailService.sendTestEmail();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Recipient management endpoints
  const isValidEmail = (email: string) => /.+@.+\..+/.test(email);

  app.get("/api/recipients", async (req, res) => {
    try {
      const recipients = await storage.listRecipients();
      res.json({ recipients });
    } catch (error: any) {
      const status = error?.status || 500;
      res.status(status).json({ error: error?.message || "Failed to list recipients" });
    }
  });

  app.post("/api/recipients", async (req, res) => {
    try {
      const email = (req.body?.email || "").trim();
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      const recipients = await storage.addRecipient(email);
      await storage.createActivityLog({
        type: 'info',
        message: `Recipient added: ${email}`,
        details: { email },
        level: 'info',
      });
      res.status(201).json({ recipients });
    } catch (error: any) {
      const status = error?.status || 500;
      res.status(status).json({ error: error?.message || "Failed to add recipient" });
    }
  });

  app.delete("/api/recipients/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      const recipients = await storage.removeRecipient(email);
      await storage.createActivityLog({
        type: 'info',
        message: `Recipient removed: ${email}`,
        details: { email },
        level: 'info',
      });
      res.json({ recipients });
    } catch (error: any) {
      const status = error?.status || 500;
      res.status(status).json({ error: error?.message || "Failed to remove recipient" });
    }
  });

  // Schedule endpoints
  app.get("/api/schedule", async (req, res) => {
    try {
      const settings = await storage.getScheduleSettings();
      const status = await schedulerService.getStatus();
      res.json({ settings, status });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedule settings" });
    }
  });

  app.post("/api/schedule", async (req, res) => {
    try {
      const scheduleData = insertScheduleSettingsSchema.parse(req.body);
      const settings = await storage.createOrUpdateScheduleSettings(scheduleData);
      
      // Update the scheduler
      await schedulerService.updateSchedule();
      
      await storage.createActivityLog({
        type: 'info',
        message: `Schedule updated: ${settings.isEnabled ? 'enabled' : 'disabled'}, every ${settings.frequencyHours} hours`,
        details: { isEnabled: settings.isEnabled, frequencyHours: settings.frequencyHours },
        level: 'info'
      });

      res.json(settings);
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to save schedule settings" });
      }
    }
  });

  app.post("/api/schedule/run-now", async (req, res) => {
    try {
      const result = await schedulerService.runNow();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to run scheduled task" });
    }
  });

  // Activity logs endpoints
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
