/**
 * Scalable rate limiter using distributed storage for Cloudflare Workers
 * Replaces in-memory solution with persistent, multi-instance compatible approach
 */

import { RATE_LIMITS } from './config';
import { safeLog } from './validation';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Distributed rate limiter using D1 database for persistence
 * Suitable for multi-worker deployment scenarios
 */
export class DistributedRateLimiter {
  private config: RateLimitConfig;
  private db: D1Database;
  private name: string;

  constructor(name: string, config: RateLimitConfig, db: D1Database) {
    this.name = name;
    this.config = config;
    this.db = db;
  }

  /**
   * Generates rate limit key from request
   */
  private generateKey(request: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }

    // Default: use IP + endpoint
    const url = new URL(request.url);
    const ip = request.headers.get('CF-Connecting-IP') ||
              request.headers.get('X-Forwarded-For') ||
              'unknown';

    return `${this.name}:${ip}:${url.pathname}`;
  }

  /**
   * Checks if request is allowed under rate limit
   */
  async isAllowed(request: Request): Promise<RateLimitResult> {
    const key = this.generateKey(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Clean up old entries and get current count in a single query
      const result = await this.db.prepare(`
        WITH cleanup AS (
          DELETE FROM rate_limits
          WHERE limiter_name = ? AND key = ? AND timestamp < ?
        ),
        current_count AS (
          SELECT COUNT(*) as count
          FROM rate_limits
          WHERE limiter_name = ? AND key = ? AND timestamp >= ?
        )
        SELECT count FROM current_count
      `).bind(
        this.name, key, windowStart,
        this.name, key, windowStart
      ).first();

      const currentCount = Number(result?.count) || 0;
      const remaining = Math.max(0, this.config.maxRequests - currentCount);
      const resetTime = now + this.config.windowMs;

      if (currentCount >= this.config.maxRequests) {
        safeLog('Rate limit exceeded', {
          limiter: this.name,
          key: key.substring(0, 20) + '...',
          count: currentCount,
          limit: this.config.maxRequests
        });

        return {
          allowed: false,
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil(this.config.windowMs / 1000)
        };
      }

      // Record this request
      await this.db.prepare(`
        INSERT INTO rate_limits (limiter_name, key, timestamp, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(this.name, key, now, new Date().toISOString()).run();

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: remaining - 1, // Subtract 1 for the current request
        resetTime
      };

    } catch (error: any) {
      safeLog('Rate limiter error', {
        limiter: this.name,
        error: error.message
      });

      // On error, allow the request (fail open)
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs
      };
    }
  }

  /**
   * Resets rate limit for a specific key
   */
  async reset(request: Request): Promise<void> {
    const key = this.generateKey(request);

    try {
      await this.db.prepare(`
        DELETE FROM rate_limits
        WHERE limiter_name = ? AND key = ?
      `).bind(this.name, key).run();

      safeLog('Rate limit reset', {
        limiter: this.name,
        key: key.substring(0, 20) + '...'
      });
    } catch (error: any) {
      safeLog('Rate limit reset error', {
        limiter: this.name,
        error: error.message
      });
    }
  }

  /**
   * Gets current rate limit status without incrementing
   */
  async getStatus(request: Request): Promise<RateLimitResult> {
    const key = this.generateKey(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const result = await this.db.prepare(`
        SELECT COUNT(*) as count
        FROM rate_limits
        WHERE limiter_name = ? AND key = ? AND timestamp >= ?
      `).bind(this.name, key, windowStart).first();

      const currentCount = Number(result?.count) || 0;
      const remaining = Math.max(0, this.config.maxRequests - currentCount);
      const resetTime = now + this.config.windowMs;

      return {
        allowed: currentCount < this.config.maxRequests,
        limit: this.config.maxRequests,
        remaining,
        resetTime,
        retryAfter: currentCount >= this.config.maxRequests
          ? Math.ceil(this.config.windowMs / 1000)
          : undefined
      };

    } catch (error: any) {
      safeLog('Rate limiter status error', {
        limiter: this.name,
        error: error.message
      });

      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs
      };
    }
  }
}

/**
 * Factory for creating configured rate limiters
 */
export class RateLimiterFactory {
  static createScalableRateLimiters(db: D1Database) {
    return {
      scrape: new DistributedRateLimiter('scrape', {
        windowMs: RATE_LIMITS.scrape.windowMs,
        maxRequests: RATE_LIMITS.scrape.maxRequests,
        keyGenerator: (request: Request) => {
          const ip = request.headers.get('CF-Connecting-IP') ||
                    request.headers.get('X-Forwarded-For') ||
                    'unknown';
          return `scrape:${ip}`;
        }
      }, db),

      generate: new DistributedRateLimiter('generate', {
        windowMs: RATE_LIMITS.generate.windowMs,
        maxRequests: RATE_LIMITS.generate.maxRequests,
        keyGenerator: (request: Request) => {
          const ip = request.headers.get('CF-Connecting-IP') ||
                    request.headers.get('X-Forwarded-For') ||
                    'unknown';
          return `generate:${ip}`;
        }
      }, db),

      download: new DistributedRateLimiter('download', {
        windowMs: RATE_LIMITS.download.windowMs,
        maxRequests: RATE_LIMITS.download.maxRequests,
        keyGenerator: (request: Request) => {
          const ip = request.headers.get('CF-Connecting-IP') ||
                    request.headers.get('X-Forwarded-For') ||
                    'unknown';
          const url = new URL(request.url);
          return `download:${ip}:${url.pathname}`;
        }
      }, db)
    };
  }
}

/**
 * Middleware helper for adding rate limit headers
 */
export function addRateLimitHeaders(
  response: Response,
  rateLimitResult: RateLimitResult
): Response {
  const headers = new Headers(response.headers);

  headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

  if (rateLimitResult.retryAfter) {
    headers.set('Retry-After', rateLimitResult.retryAfter.toString());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Initialize rate limiter database schema
 */
export const RATE_LIMITER_SCHEMA = `
  CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    limiter_name TEXT NOT NULL,
    key TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    INDEX idx_limiter_key_timestamp (limiter_name, key, timestamp)
  );

  -- Cleanup trigger to remove old entries
  CREATE TRIGGER IF NOT EXISTS cleanup_old_rate_limits
  AFTER INSERT ON rate_limits
  BEGIN
    DELETE FROM rate_limits
    WHERE timestamp < (NEW.timestamp - 300000) -- 5 minutes
    AND limiter_name = NEW.limiter_name;
  END;
`;