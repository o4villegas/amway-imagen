// 24-hour product caching system for Claude API scraping
// Reduces API costs and improves performance

import { DatabaseManager, ScrapedProduct } from './db';
import { ProductExtractionResult } from './ai-scraper';

export interface CachedProduct {
  url: string;
  data: ProductExtractionResult;
  cachedAt: Date;
  expiresAt: Date;
}

export class ProductCacheManager {
  private readonly CACHE_DURATION_HOURS = 24;

  constructor(private db: DatabaseManager) {}

  /**
   * Checks if a product is cached and still valid
   */
  async getCachedProduct(url: string): Promise<ProductExtractionResult | null> {
    try {
      console.log(`[CACHE] Checking cache for URL: ${url}`);

      const cached = await this.db.getCachedProduct(url);

      if (!cached) {
        console.log(`[CACHE] No cached data found for ${url}`);
        return null;
      }

      const now = new Date();

      if (!cached.cached_until) {
        console.log(`[CACHE] No expiration time found for ${url} - treating as expired`);
        await this.db.deleteCachedProduct(url);
        return null;
      }

      const cachedUntil = new Date(cached.cached_until);

      if (now > cachedUntil) {
        console.log(`[CACHE] Cached data expired for ${url} (expired: ${cachedUntil})`);
        // Clean up expired cache entry
        await this.db.deleteCachedProduct(url);
        return null;
      }

      console.log(`[CACHE] Valid cached data found for ${url} (expires: ${cachedUntil})`);

      // Convert stored product back to extraction result format
      return this.convertStoredToExtractionResult(cached);

    } catch (error) {
      console.error('[CACHE] Error checking cache:', error);
      return null; // Fall back to fresh scraping
    }
  }

  /**
   * Caches a product extraction result for 24 hours
   */
  async cacheProduct(url: string, extractionResult: ProductExtractionResult): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (this.CACHE_DURATION_HOURS * 60 * 60 * 1000));

      console.log(`[CACHE] Caching product ${extractionResult.name} until ${expiresAt}`);

      // Convert extraction result to scraped product format
      const scrapedProduct: ScrapedProduct = {
        amway_product_id: this.generateProductId(url),
        name: extractionResult.name,
        description: extractionResult.description,
        benefits: extractionResult.benefits.join('. '),
        category: extractionResult.category,
        brand: extractionResult.brand,
        price: extractionResult.price || null,
        currency: extractionResult.currency || 'USD',
        main_image_url: extractionResult.imageUrl || null,
        inventory_status: 'in_stock'
      };

      // Save with caching metadata
      await this.db.saveProductWithCache(url, scrapedProduct, expiresAt);

      console.log(`[CACHE] Successfully cached product for ${url}`);

    } catch (error) {
      console.error('[CACHE] Error caching product:', error);
      // Don't throw - caching failure shouldn't break the scraping flow
    }
  }

  /**
   * Converts stored product back to extraction result format
   */
  private convertStoredToExtractionResult(stored: any): ProductExtractionResult {
    return {
      name: stored.name,
      description: stored.description,
      benefits: stored.benefits ? stored.benefits.split('. ').filter((b: string) => b.trim()) : [],
      category: stored.category,
      brand: stored.brand,
      price: stored.price,
      currency: stored.currency || 'USD',
      imageUrl: stored.main_image_url,
      confidence: 0.95 // Cached results are considered high confidence
    };
  }

  /**
   * Generates consistent product ID from URL
   */
  private generateProductId(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/p\/([^\/]+)/);
      if (pathMatch) {
        return pathMatch[1];
      }

      // Fallback: generate from URL hash
      const hash = this.simpleHash(url);
      return `ai_${hash}`;
    } catch {
      return `ai_${Date.now()}`;
    }
  }

  /**
   * Simple hash function for URL-based IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }

  /**
   * Gets cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    totalCached: number;
    validEntries: number;
    expiredEntries: number;
  }> {
    try {
      const stats = await this.db.getCacheStats();
      return stats;
    } catch (error) {
      console.error('[CACHE] Error getting cache stats:', error);
      return {
        totalCached: 0,
        validEntries: 0,
        expiredEntries: 0
      };
    }
  }

  /**
   * Cleans up expired cache entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const deletedCount = await this.db.cleanupExpiredCache();
      console.log(`[CACHE] Cleaned up ${deletedCount} expired entries`);
      return deletedCount;
    } catch (error) {
      console.error('[CACHE] Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Forces cache refresh for a specific URL
   */
  async invalidateProduct(url: string): Promise<void> {
    try {
      await this.db.deleteCachedProduct(url);
      console.log(`[CACHE] Invalidated cache for ${url}`);
    } catch (error) {
      console.error('[CACHE] Error invalidating cache:', error);
    }
  }
}