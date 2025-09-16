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
    const fallbackSummary = this.buildFallbackSummary(articles);

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

      const choice = response.choices?.[0];
      if (!choice?.message) {
        console.warn('AI summary response did not include a message. Using fallback summary.');
        return fallbackSummary;
      }

      const rawContent = (() => {
        const content = (choice.message as any).content;
        if (typeof content === 'string') {
          return content.trim();
        }
        if (Array.isArray(content)) {
          return content
            .map((part: any) => {
              if (typeof part === 'string') return part;
              if (part && typeof part.text === 'string') return part.text;
              return '';
            })
            .join('')
            .trim();
        }
        return '';
      })();

      if (!rawContent) {
        console.warn('AI summary response did not contain JSON content. Using fallback summary.');
        return fallbackSummary;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (parseError) {
        console.error('Failed to parse AI summary JSON response:', parseError);
        console.warn('Raw AI response (truncated):', rawContent.slice(0, 200));
        return fallbackSummary;
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.warn('AI summary response had unexpected structure. Using fallback summary.');
        return fallbackSummary;
      }

      const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
      const content = typeof parsed.content === 'string' ? parsed.content.trim() : '';
      const excerpt = typeof parsed.excerpt === 'string' ? parsed.excerpt.trim() : '';

      if (!content || /could not be generated/i.test(content)) {
        console.warn('AI summary response was missing meaningful content. Using fallback summary.');
        return fallbackSummary;
      }

      return {
        title: title || fallbackSummary.title,
        content,
        excerpt: excerpt || fallbackSummary.excerpt
      };

    } catch (error) {
      console.error('Error creating AI summary:', error);
      return fallbackSummary;
    }
  }

  private buildFallbackSummary(articles: ArticleData[]): {
    title: string;
    content: string;
    excerpt: string;
  } {
    const articleCount = articles.length;
    const uniqueSources = Array.from(new Set(articles.map(article => article.source).filter(Boolean)));
    const sourceCount = uniqueSources.length;
    const sourceList = sourceCount > 0 ? uniqueSources.join(', ') : 'your configured RSS feeds';
    const topTitles = articles
      .slice(0, 5)
      .map(article => `• ${article.title}`)
      .join('\n') || 'No articles were available to summarize.';

    const articleLabel = `Latest news from ${articleCount} article${articleCount === 1 ? '' : 's'}`;
    const sourceLabel = sourceCount > 0
      ? `across ${sourceCount} source${sourceCount === 1 ? '' : 's'}.`
      : 'from your configured RSS feeds.';

    return {
      title: `News Summary - ${new Date().toLocaleDateString()}`,
      excerpt: `${articleLabel} ${sourceLabel}`.trim(),
      content: [
        '# Latest News Summary',
        '',
        `**Sources:** ${sourceList}`,
        '',
        '**Top Stories:**',
        topTitles,
        '',
        `This summary was generated from ${articleCount} article${articleCount === 1 ? '' : 's'}. AI summarization was unavailable.`,
      ].join('\n')
    };
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
