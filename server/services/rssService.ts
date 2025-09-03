import Parser from 'rss-parser';
import { storage } from '../storage';
import { type Feed } from '@shared/schema';

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  creator?: string;
  categories?: string[];
}

interface ParsedFeedData {
  title: string;
  description?: string;
  items: RSSItem[];
}

export class RSSService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 15000, // Increased timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS-Automation-Service/1.0)'
      },
      maxRedirects: 10,
      requestOptions: {
        rejectUnauthorized: false
      }
    });
  }

  async parseFeed(url: string, retries: number = 2): Promise<ParsedFeedData | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const feed = await this.parser.parseURL(url);
        
        return {
          title: feed.title || 'Unknown Feed',
          description: feed.description,
          items: feed.items.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            content: item.content || item.contentSnippet,
            contentSnippet: item.contentSnippet,
            creator: item.creator,
            categories: item.categories
          }))
        };
      } catch (error) {
        console.error(`Error parsing RSS feed ${url} (attempt ${attempt + 1}/${retries + 1}):`, error);
        
        if (attempt === retries) {
          // On final attempt, try alternative URLs
          if (url.endsWith('/feed')) {
            const altUrl = url.replace('/feed', '/rss');
            try {
              const feed = await this.parser.parseURL(altUrl);
              return {
                title: feed.title || 'Unknown Feed',
                description: feed.description,
                items: feed.items.map(item => ({
                  title: item.title,
                  link: item.link,
                  pubDate: item.pubDate,
                  content: item.content || item.contentSnippet,
                  contentSnippet: item.contentSnippet,
                  creator: item.creator,
                  categories: item.categories
                }))
              };
            } catch (altError) {
              console.error(`Alternative URL ${altUrl} also failed:`, altError);
            }
          }
          return null;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    return null;
  }

  async checkFeed(feedId: string): Promise<{
    success: boolean;
    items: RSSItem[];
    error?: string;
  }> {
    try {
      const feed = await storage.getFeed(feedId);
      if (!feed) {
        throw new Error('Feed not found');
      }

      const feedData = await this.parseFeed(feed.url);
      
      if (!feedData) {
        await storage.updateFeed(feedId, {
          status: 'error',
          lastError: 'Failed to parse RSS feed',
          lastChecked: new Date()
        });

        await storage.createActivityLog({
          type: 'error',
          message: `Failed to check feed: ${feed.name}`,
          details: { feedId, url: feed.url },
          level: 'error'
        });

        return {
          success: false,
          items: [],
          error: 'Failed to parse RSS feed'
        };
      }

      await storage.updateFeed(feedId, {
        status: 'active',
        lastError: null,
        lastChecked: new Date()
      });

      await storage.createActivityLog({
        type: 'feed_check',
        message: `Successfully checked feed: ${feed.name} (${feedData.items.length} items)`,
        details: { feedId, url: feed.url, itemCount: feedData.items.length },
        level: 'info'
      });

      return {
        success: true,
        items: feedData.items
      };

    } catch (error) {
      await storage.updateFeed(feedId, {
        status: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      });

      await storage.createActivityLog({
        type: 'error',
        message: `Error checking feed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { feedId, error: error instanceof Error ? error.message : 'Unknown error' },
        level: 'error'
      });

      return {
        success: false,
        items: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkAllFeeds(): Promise<{
    feeds: Feed[];
    totalItems: number;
    errors: string[];
  }> {
    const feeds = await storage.getFeeds();
    const activeFeeds = feeds.filter(f => f.isActive);
    
    let totalItems = 0;
    const errors: string[] = [];

    for (const feed of activeFeeds) {
      const result = await this.checkFeed(feed.id);
      if (result.success) {
        totalItems += result.items.length;
      } else {
        errors.push(`${feed.name}: ${result.error}`);
      }
    }

    const updatedFeeds = await storage.getFeeds();

    return {
      feeds: updatedFeeds,
      totalItems,
      errors
    };
  }

  async validateFeedUrl(url: string): Promise<{
    valid: boolean;
    title?: string;
    error?: string;
  }> {
    try {
      const feedData = await this.parseFeed(url);
      if (!feedData) {
        return {
          valid: false,
          error: 'Invalid RSS feed URL or unreachable'
        };
      }

      return {
        valid: true,
        title: feedData.title
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const rssService = new RSSService();
