/**
 * Structured logging utility for Cloudflare Workers
 * Provides consistent logging format and observability
 */

export interface LogContext {
  userId?: string;
  campaignId?: number;
  productId?: number;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

export interface LogMetrics {
  duration?: number;
  memoryUsed?: number;
  apiCalls?: number;
  generatedImages?: number;
  errorCount?: number;
}

class Logger {
  private context: LogContext = {};

  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }

  private formatLog(level: string, message: string, data?: any, metrics?: LogMetrics) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      context: this.context,
      data,
      metrics,
      environment: process.env.NODE_ENV || 'development'
    };

    return JSON.stringify(logEntry);
  }

  info(message: string, data?: any, metrics?: LogMetrics) {
    console.log(this.formatLog('info', message, data, metrics));
  }

  warn(message: string, data?: any, metrics?: LogMetrics) {
    console.warn(this.formatLog('warn', message, data, metrics));
  }

  error(message: string, error?: Error | any, metrics?: LogMetrics) {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    console.error(this.formatLog('error', message, errorData, metrics));
  }

  // Performance tracking
  startTimer() {
    return Date.now();
  }

  endTimer(startTime: number, operation: string, additionalData?: any) {
    const duration = Date.now() - startTime;
    this.info(`Operation completed: ${operation}`, additionalData, { duration });
    return duration;
  }

  // Campaign-specific logging
  campaignStart(campaignId: number, productId: number, preferences: any) {
    this.setContext({ campaignId, productId });
    this.info('Campaign generation started', { preferences });
  }

  campaignProgress(step: string, progress: number, data?: any) {
    this.info(`Campaign progress: ${step}`, { progress, ...data });
  }

  campaignComplete(totalImages: number, successfulImages: number, duration: number) {
    this.info('Campaign generation completed', {
      totalImages,
      successfulImages,
      failureRate: ((totalImages - successfulImages) / totalImages) * 100
    }, { duration, generatedImages: successfulImages });
  }

  campaignError(step: string, error: Error, data?: any) {
    this.error(`Campaign failed at ${step}`, error, { errorCount: 1 });
  }

  // API-specific logging
  apiRequest(method: string, path: string, userAgent?: string, ip?: string) {
    this.setContext({ userAgent, ip });
    this.info(`API ${method} ${path}`, { method, path });
  }

  apiResponse(statusCode: number, duration: number, data?: any) {
    this.info('API response', { statusCode, ...data }, { duration });
  }

  // Database operation logging
  dbOperation(operation: string, table: string, duration: number, success: boolean) {
    this.info(`Database ${operation}`, { table, success }, { duration });
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience functions for common operations
export const withLogging = async <T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> => {
  if (context) {
    logger.setContext(context);
  }

  const startTime = logger.startTimer();

  try {
    const result = await fn();
    logger.endTimer(startTime, operation, { success: true });
    return result;
  } catch (error) {
    logger.endTimer(startTime, operation, { success: false });
    logger.error(`Failed operation: ${operation}`, error);
    throw error;
  }
};

// Middleware for request logging
export const logRequest = (request: Request) => {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || undefined;
  const ip = request.headers.get('cf-connecting-ip') ||
             request.headers.get('x-forwarded-for') ||
             undefined;

  logger.apiRequest(request.method, url.pathname, userAgent, ip);

  return logger.startTimer();
};

export const logResponse = (startTime: number, response: Response, additionalData?: any) => {
  const duration = logger.endTimer(startTime, 'API Request');
  logger.apiResponse(response.status, duration, additionalData);
};