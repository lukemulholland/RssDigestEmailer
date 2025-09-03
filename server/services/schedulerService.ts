import * as cron from 'node-cron';
import { storage } from '../storage';
import { summaryService } from './summaryService';
import { emailService } from './emailService';

export class SchedulerService {
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;

  async initialize(): Promise<void> {
    await this.updateSchedule();
  }

  async updateSchedule(): Promise<void> {
    const settings = await storage.getScheduleSettings();
    
    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    if (!settings || !settings.isEnabled) {
      await storage.createActivityLog({
        type: 'info',
        message: 'Scheduler disabled',
        level: 'info'
      });
      return;
    }

    const cronExpression = this.getCronExpression(settings.frequencyHours);
    
    this.task = cron.schedule(cronExpression, async () => {
      await this.runScheduledTask();
    });

    this.task.start();

    // Update next run time
    const nextRun = this.getNextRunTime(settings.frequencyHours);
    await storage.createOrUpdateScheduleSettings({
      ...settings,
      nextRun
    });

    await storage.createActivityLog({
      type: 'info',
      message: `Scheduler updated: runs every ${settings.frequencyHours} hours`,
      details: { 
        frequencyHours: settings.frequencyHours,
        cronExpression,
        nextRun: nextRun?.toISOString()
      },
      level: 'info'
    });
  }

  async runScheduledTask(): Promise<void> {
    if (this.isRunning) {
      await storage.createActivityLog({
        type: 'info',
        message: 'Scheduled task skipped - previous task still running',
        level: 'info'
      });
      return;
    }

    this.isRunning = true;

    try {
      await storage.createActivityLog({
        type: 'info',
        message: 'Starting scheduled RSS processing',
        level: 'info'
      });

      // Update last run time
      const settings = await storage.getScheduleSettings();
      if (settings) {
        await storage.createOrUpdateScheduleSettings({
          ...settings,
          lastRun: new Date(),
          nextRun: this.getNextRunTime(settings.frequencyHours)
        });
      }

      // Generate summary
      const summaryResult = await summaryService.generateSummary();
      
      if (summaryResult.success && summaryResult.summaryId) {
        // Send email
        const emailResult = await emailService.sendSummaryEmail(summaryResult.summaryId);
        
        if (emailResult.success) {
          await storage.createActivityLog({
            type: 'info',
            message: 'Scheduled task completed successfully',
            details: { summaryId: summaryResult.summaryId },
            level: 'info'
          });
        } else {
          await storage.createActivityLog({
            type: 'error',
            message: `Scheduled task completed but email failed: ${emailResult.error}`,
            details: { summaryId: summaryResult.summaryId, emailError: emailResult.error },
            level: 'error'
          });
        }
      } else {
        await storage.createActivityLog({
          type: 'error',
          message: `Scheduled task failed: ${summaryResult.error}`,
          details: { error: summaryResult.error },
          level: 'error'
        });
      }

    } catch (error) {
      await storage.createActivityLog({
        type: 'error',
        message: `Scheduled task error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'error'
      });
    } finally {
      this.isRunning = false;
    }
  }

  async runNow(): Promise<{
    success: boolean;
    summaryId?: string;
    error?: string;
  }> {
    if (this.isRunning) {
      return {
        success: false,
        error: 'A scheduled task is already running'
      };
    }

    try {
      await storage.createActivityLog({
        type: 'info',
        message: 'Manual RSS processing started',
        level: 'info'
      });

      const summaryResult = await summaryService.generateSummary();
      
      if (summaryResult.success && summaryResult.summaryId) {
        const emailResult = await emailService.sendSummaryEmail(summaryResult.summaryId);
        
        if (emailResult.success) {
          await storage.createActivityLog({
            type: 'info',
            message: 'Manual task completed successfully',
            details: { summaryId: summaryResult.summaryId },
            level: 'info'
          });
        }

        return {
          success: true,
          summaryId: summaryResult.summaryId
        };
      } else {
        return {
          success: false,
          error: summaryResult.error
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private getCronExpression(hours: number): string {
    // Convert hours to cron expression
    if (hours === 1) return '0 * * * *'; // Every hour
    if (hours === 2) return '0 */2 * * *'; // Every 2 hours
    if (hours === 4) return '0 */4 * * *'; // Every 4 hours
    if (hours === 6) return '0 */6 * * *'; // Every 6 hours
    if (hours === 8) return '0 */8 * * *'; // Every 8 hours
    if (hours === 12) return '0 */12 * * *'; // Every 12 hours
    if (hours === 24) return '0 0 * * *'; // Daily at midnight
    
    // Default to every 4 hours if unsupported frequency
    return '0 */4 * * *';
  }

  private getNextRunTime(hours: number): Date {
    const now = new Date();
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  }

  async getStatus(): Promise<{
    isEnabled: boolean;
    isRunning: boolean;
    nextRun?: Date;
    lastRun?: Date;
    frequencyHours?: number;
  }> {
    const settings = await storage.getScheduleSettings();
    
    return {
      isEnabled: settings?.isEnabled || false,
      isRunning: this.isRunning,
      nextRun: settings?.nextRun || undefined,
      lastRun: settings?.lastRun || undefined,
      frequencyHours: settings?.frequencyHours
    };
  }
}

export const schedulerService = new SchedulerService();
