/**
 * Timeout utilities for handling async operations with time limits
 */

export class TimeoutError extends Error {
  constructor(message: string, public readonly operation: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string = 'Operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${operation} timed out after ${timeoutMs}ms`, operation, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delayMs: number) => void;
}

/**
 * Retries an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    shouldRetry = (error) => !(error instanceof TimeoutError && error.timeoutMs >= 30000),
    onRetry = () => {}
  } = options;

  let lastError: any;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      const currentDelay = Math.min(delayMs, maxDelayMs);
      onRetry(error, attempt, currentDelay);

      await new Promise(resolve => setTimeout(resolve, currentDelay));
      delayMs *= backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Timeout configurations for different operations
 */
export const TIMEOUTS = {
  SCRAPE: 15000,        // 15 seconds for web scraping
  AI_GENERATION: 60000, // 60 seconds per AI image (FLUX needs more time)
  DB_OPERATION: 5000,   // 5 seconds for database ops
  R2_UPLOAD: 20000,     // 20 seconds for R2 uploads
  ZIP_CREATION: 60000,  // 60 seconds for ZIP file creation
  API_REQUEST: 180000,  // 3 minutes for full API request
} as const;

/**
 * Creates a timeout controller for managing multiple timeouts
 */
export class TimeoutController {
  private activeTimeouts = new Set<NodeJS.Timeout>();

  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation?: string
  ): Promise<T> {
    const result = await withTimeout(promise, timeoutMs, operation);
    return result;
  }

  clearAll(): void {
    this.activeTimeouts.forEach(timeout => clearTimeout(timeout));
    this.activeTimeouts.clear();
  }
}