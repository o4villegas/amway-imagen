// Simple rate limiter for API routes
// Uses in-memory storage (resets on worker restart)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  keyGenerator?: (request: Request) => string;  // Function to generate rate limit key
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs || 60000, // Default: 1 minute
      maxRequests: config.maxRequests || 10, // Default: 10 requests
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator
    };
  }

  private defaultKeyGenerator(request: Request): string {
    // Use IP address as default key
    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For') ||
               'unknown';
    return ip;
  }

  async isAllowed(request: Request): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = this.config.keyGenerator!(request);
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      this.cleanup(now);
    }

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired one
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return { allowed: true };
    }

    if (entry.count >= this.config.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000); // Convert to seconds
      return {
        allowed: false,
        retryAfter
      };
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);
    return { allowed: true };
  }

  private cleanup(now: number): void {
    // Remove expired entries to prevent memory leak
    const entries = Array.from(rateLimitStore.entries());
    for (const [key, entry] of entries) {
      if (entry.resetTime <= now) {
        rateLimitStore.delete(key);
      }
    }

    // Prevent unbounded growth - keep max 1000 entries
    if (rateLimitStore.size > 1000) {
      const entriesToDelete = rateLimitStore.size - 900;
      let deleted = 0;
      const keys = Array.from(rateLimitStore.keys());
      for (const key of keys) {
        if (deleted >= entriesToDelete) break;
        rateLimitStore.delete(key);
        deleted++;
      }
    }
  }

  reset(request: Request): void {
    const key = this.config.keyGenerator!(request);
    rateLimitStore.delete(key);
  }
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // Scraping: 10 requests per minute per IP
  scrape: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10
  }),

  // Generation: 5 campaigns per 5 minutes per IP
  generate: new RateLimiter({
    windowMs: 5 * 60 * 1000,
    maxRequests: 5
  }),

  // Download: 20 downloads per minute per IP
  download: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20
  })
};