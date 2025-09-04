import OpenAI from "openai";
import { storage } from '../storage';
import { rssService } from './rssService';
import { type InsertSummary } from '@shared/schema';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

// Increase the amount of article content included in the prompt
// Tuneable via env var; defaults to 2000 characters
const ARTICLE_CHAR_LIMIT = (() => {
  const raw = process.env.ARTICLE_CHAR_LIMIT;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 2000;
})();

interface ArticleData {
  title: string;
  content: string;
  source: string;
  link?: string;
  pubDate?: string;
}

export class SummaryService {
  async generateSummary(): Promise<{
    success: boolean;
    summaryId?: string;
    error?: string;
  }> {
    try {
      await storage.createActivityLog({
        type: 'summary_generation',
        message: 'Starting summary generation',
        level: 'info'
      });

      // Get all active feeds
      const feeds = await storage.getFeeds();
      const activeFeeds = feeds.filter(f => f.isActive && f.includeInSummary);

      if (activeFeeds.length === 0) {
        throw new Error('No active feeds available for summarization');
      }

      // Collect articles from all feeds
      const allArticles: ArticleData[] = [];
      const processedFeedIds: string[] = [];

      for (const feed of activeFeeds) {
        const result = await rssService.checkFeed(feed.id);
        if (result.success && result.items.length > 0) {
          processedFeedIds.push(feed.id);
          
          // Take recent items (last 24 hours or top 10)
          const recentItems = result.items
            .filter(item => {
              if (!item.pubDate) return true;
              const itemDate = new Date(item.pubDate);
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
              return itemDate > oneDayAgo;
            })
            .slice(0, 10);

          for (const item of recentItems) {
            if (item.title && (item.content || item.contentSnippet)) {
              allArticles.push({
                title: item.title,
                content: item.content || item.contentSnippet || '',
                source: feed.name,
                link: item.link,
                pubDate: item.pubDate
              });
            }
          }
        }
      }

      if (allArticles.length === 0) {
        throw new Error('No articles found in any feeds');
      }

      // Generate AI summary
      const summaryData = await this.createAISummary(allArticles);
      
      // Create summary record
      const summary = await storage.createSummary({
        title: summaryData.title,
        content: summaryData.content,
        excerpt: summaryData.excerpt,
        articleCount: allArticles.length,
        sourceCount: processedFeedIds.length,
        emailSent: false,
        emailError: null,
        feedIds: processedFeedIds
      });

      await storage.createActivityLog({
        type: 'summary_generation',
        message: `Summary generated successfully: ${summary.title}`,
        details: { 
          summaryId: summary.id, 
          articleCount: allArticles.length,
          sourceCount: processedFeedIds.length 
        },
        level: 'info'
      });

      return {
        success: true,
        summaryId: summary.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await storage.createActivityLog({
        type: 'error',
        message: `Summary generation failed: ${errorMessage}`,
        details: { error: errorMessage },
        level: 'error'
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async createAISummary(articles: ArticleData[]): Promise<{
    title: string;
    content: string;
    excerpt: string;
  }> {
    try {
      // Prepare content for AI
      const articleTexts = articles.map(article => {
        const text = article.content || "";
        const snippet = text.slice(0, ARTICLE_CHAR_LIMIT);
        const ellipsis = text.length > ARTICLE_CHAR_LIMIT ? "..." : "";
        return `**${article.title}** (${article.source})\n${snippet}${ellipsis}`;
      }).join('\n\n');

      const prompt = `Please analyze the following RSS feed articles and create a comprehensive summary. Return your response in JSON format with the following structure:

{
  "title": "A compelling title for this news summary",
  "excerpt": "A brief 2-3 sentence overview of the key themes",
  "content": "A detailed summary organized by topic, highlighting the most important news and trends. Include source attribution and maintain objectivity."
}

Articles to summarize:
${articleTexts}

Focus on identifying key themes, important developments, and providing a balanced overview that would be valuable to someone wanting to stay informed.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert news analyst and writer. Create concise, informative summaries that highlight the most important information from multiple sources."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        title: result.title || `News Summary - ${new Date().toLocaleDateString()}`,
        content: result.content || 'Summary content could not be generated.',
        excerpt: result.excerpt || 'News summary from multiple RSS feeds.'
      };

    } catch (error) {
      console.error('Error creating AI summary:', error);
      
      // Fallback summary
      const sourceNames = Array.from(new Set(articles.map(a => a.source))).join(', ');
      const topTitles = articles.slice(0, 5).map(a => `• ${a.title}`).join('\n');
      
      return {
        title: `News Summary - ${new Date().toLocaleDateString()}`,
        excerpt: `Latest news from ${articles.length} articles across ${sourceNames}.`,
        content: `# Latest News Summary\n\n**Sources:** ${sourceNames}\n\n**Top Stories:**\n${topTitles}\n\nThis summary was generated from ${articles.length} articles. AI summarization was unavailable.`
      };
    }
  }

  async retrySummary(summaryId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const summary = await storage.getSummary(summaryId);
      if (!summary) {
        throw new Error('Summary not found');
      }

      // Re-generate summary using the same feed IDs
      return await this.generateSummary();

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const summaryService = new SummaryService();
