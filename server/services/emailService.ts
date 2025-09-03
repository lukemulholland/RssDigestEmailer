import nodemailer from 'nodemailer';
import { storage } from '../storage';
import { type Summary } from '@shared/schema';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  async initializeTransporter(): Promise<boolean> {
    try {
      const settings = await storage.getEmailSettings();
      if (!settings || !settings.isActive) {
        return false;
      }

      this.transporter = nodemailer.createTransporter({
        host: settings.smtpServer,
        port: settings.smtpPort,
        secure: settings.smtpSecurity === 'SSL',
        auth: {
          user: settings.username,
          pass: settings.password,
        },
        tls: {
          rejectUnauthorized: settings.smtpSecurity !== 'None'
        }
      });

      // Verify connection
      await this.transporter.verify();
      return true;

    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.transporter = null;
      return false;
    }
  }

  async sendSummaryEmail(summaryId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const summary = await storage.getSummary(summaryId);
      if (!summary) {
        throw new Error('Summary not found');
      }

      const settings = await storage.getEmailSettings();
      if (!settings || !settings.isActive) {
        throw new Error('Email settings not configured');
      }

      if (!this.transporter) {
        const initialized = await this.initializeTransporter();
        if (!initialized) {
          throw new Error('Failed to initialize email service');
        }
      }

      const subject = settings.subjectTemplate.replace('{date}', new Date().toLocaleDateString());
      const htmlContent = this.generateEmailHTML(summary);
      const textContent = this.generateEmailText(summary);

      const mailOptions = {
        from: settings.fromEmail,
        to: settings.recipients.join(', '),
        subject,
        text: textContent,
        html: htmlContent,
      };

      await this.transporter!.sendMail(mailOptions);

      // Update summary as sent
      await storage.updateSummary(summaryId, {
        emailSent: true,
        emailError: null
      });

      await storage.createActivityLog({
        type: 'email_sent',
        message: `Email sent successfully for summary: ${summary.title}`,
        details: { 
          summaryId, 
          recipients: settings.recipients,
          subject 
        },
        level: 'info'
      });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update summary with error
      if (summaryId) {
        await storage.updateSummary(summaryId, {
          emailSent: false,
          emailError: errorMessage
        });
      }

      await storage.createActivityLog({
        type: 'error',
        message: `Email sending failed: ${errorMessage}`,
        details: { summaryId, error: errorMessage },
        level: 'error'
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async sendTestEmail(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const settings = await storage.getEmailSettings();
      if (!settings || !settings.isActive) {
        throw new Error('Email settings not configured');
      }

      if (!this.transporter) {
        const initialized = await this.initializeTransporter();
        if (!initialized) {
          throw new Error('Failed to initialize email service');
        }
      }

      const testContent = {
        title: 'Test Email - RSS Automation System',
        excerpt: 'This is a test email to verify your email configuration.',
        content: `# Test Email

This is a test email from your RSS Automation System.

**Configuration Details:**
- SMTP Server: ${settings.smtpServer}:${settings.smtpPort}
- Security: ${settings.smtpSecurity}
- From: ${settings.fromEmail}

If you received this email, your configuration is working correctly!

---
*Sent at ${new Date().toLocaleString()}*`,
        generatedAt: new Date(),
        articleCount: 0,
        sourceCount: 0
      };

      const subject = 'Test Email - RSS Automation System';
      const htmlContent = this.generateEmailHTML(testContent as Summary);
      const textContent = this.generateEmailText(testContent as Summary);

      const mailOptions = {
        from: settings.fromEmail,
        to: settings.recipients.join(', '),
        subject,
        text: textContent,
        html: htmlContent,
      };

      await this.transporter!.sendMail(mailOptions);

      await storage.createActivityLog({
        type: 'email_sent',
        message: 'Test email sent successfully',
        details: { 
          recipients: settings.recipients,
          subject 
        },
        level: 'info'
      });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await storage.createActivityLog({
        type: 'error',
        message: `Test email failed: ${errorMessage}`,
        details: { error: errorMessage },
        level: 'error'
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private generateEmailHTML(summary: Summary): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${summary.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1f2937;
            margin: 0;
            font-size: 24px;
        }
        .meta {
            color: #6b7280;
            font-size: 14px;
            margin-top: 10px;
        }
        .content {
            font-size: 16px;
            line-height: 1.7;
        }
        .content h1, .content h2, .content h3 {
            color: #1f2937;
            margin-top: 25px;
            margin-bottom: 15px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
            text-align: center;
        }
        .stats {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .stats span {
            margin-right: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${summary.title}</h1>
            <div class="meta">
                Generated on ${new Date(summary.generatedAt).toLocaleDateString()} at ${new Date(summary.generatedAt).toLocaleTimeString()}
            </div>
            <div class="stats">
                <span><strong>${summary.articleCount}</strong> articles</span>
                <span><strong>${summary.sourceCount}</strong> sources</span>
            </div>
        </div>
        
        <div class="content">
            ${this.markdownToHTML(summary.content)}
        </div>
        
        <div class="footer">
            <p>This summary was automatically generated by your RSS Automation System</p>
            <p>Powered by AI • ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateEmailText(summary: Summary): string {
    return `${summary.title}

Generated on ${new Date(summary.generatedAt).toLocaleDateString()} at ${new Date(summary.generatedAt).toLocaleTimeString()}
Articles: ${summary.articleCount} | Sources: ${summary.sourceCount}

${summary.content}

---
This summary was automatically generated by your RSS Automation System
Powered by AI • ${new Date().getFullYear()}`;
  }

  private markdownToHTML(markdown: string): string {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/^(.*)$/gim, '<p>$1</p>')
      .replace(/<p><\/p>/gim, '')
      .replace(/^<p>(<h[1-3]>.*<\/h[1-3]>)<\/p>$/gim, '$1');
  }
}


export const emailService = new EmailService();
