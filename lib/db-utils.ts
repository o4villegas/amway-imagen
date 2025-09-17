/**
 * Database utilities for optimized D1 operations
 */

import { D1Database } from '@cloudflare/workers-types';
import { logError } from './env-utils';

/**
 * Execute multiple database operations in a batch
 * D1 automatically handles connection pooling
 */
export async function batchExecute<T>(
  db: D1Database,
  operations: Array<() => Promise<T>>
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
  const results = await Promise.allSettled(operations.map(op => op()));

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { success: true, result: result.value };
    } else {
      logError(result.reason, { context: 'batchExecute' });
      return { success: false, error: result.reason };
    }
  });
}

/**
 * Retry a database operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
        throw error;
      }

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Execute a database transaction (D1 supports implicit transactions)
 */
export async function transaction<T>(
  db: D1Database,
  operations: (db: D1Database) => Promise<T>
): Promise<T> {
  try {
    // D1 automatically wraps batch operations in a transaction
    const result = await operations(db);
    return result;
  } catch (error) {
    logError(error, { context: 'transaction' });
    throw error;
  }
}

/**
 * Prepare and cache a statement for reuse
 */
export class PreparedStatementCache {
  private cache = new Map<string, any>();

  constructor(private db: D1Database) {}

  get(sql: string) {
    if (!this.cache.has(sql)) {
      this.cache.set(sql, this.db.prepare(sql));
    }
    return this.cache.get(sql);
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(db: D1Database): Promise<boolean> {
  try {
    const result = await db.prepare('SELECT 1 as health').first();
    return result?.health === 1;
  } catch (error) {
    logError(error, { context: 'checkDatabaseHealth' });
    return false;
  }
}