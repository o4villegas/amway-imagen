/**
 * Request deduplication to prevent duplicate API calls
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

export class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private cacheTimeout = 5000; // 5 seconds default

  constructor(cacheTimeout?: number) {
    if (cacheTimeout) {
      this.cacheTimeout = cacheTimeout;
    }
  }

  /**
   * Deduplicate a request by key
   * If a request with the same key is already pending, return the existing promise
   */
  async dedupe<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Clean expired cache entries
    this.cleanExpired();

    // Check if we have a pending request for this key
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing.promise;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Remove from pending after completion
      setTimeout(() => {
        this.pendingRequests.delete(key);
      }, 100); // Small delay to handle rapid successive calls
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  /**
   * Clean expired pending requests
   */
  private cleanExpired() {
    const now = Date.now();
    const entries = Array.from(this.pendingRequests.entries());
    for (const [key, request] of entries) {
      if (now - request.timestamp > this.cacheTimeout) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }

  /**
   * Get the number of pending requests
   */
  get size() {
    return this.pendingRequests.size;
  }
}

/**
 * Global deduplicator instances for different use cases
 */
export const apiDeduplicator = new RequestDeduplicator(5000); // 5 seconds for API calls
export const imageDeduplicator = new RequestDeduplicator(10000); // 10 seconds for images
export const scraperDeduplicator = new RequestDeduplicator(30000); // 30 seconds for scraping

/**
 * Hook for React components to use deduplication
 */
export function useDeduplicatedRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  deduplicator = apiDeduplicator
): () => Promise<T> {
  return () => deduplicator.dedupe(key, requestFn);
}

/**
 * Decorator for class methods to add deduplication
 */
export function deduplicate(keyPrefix: string = '', timeout: number = 5000) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const deduplicator = new RequestDeduplicator(timeout);

    descriptor.value = async function (...args: any[]) {
      const key = `${keyPrefix}:${propertyKey}:${JSON.stringify(args)}`;
      return deduplicator.dedupe(key, () =>
        originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}