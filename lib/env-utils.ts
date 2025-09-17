/**
 * Safe environment variable utilities for edge runtime
 */

/**
 * Safely get environment variable with fallback
 * Works in both Node.js and edge runtime environments
 */
export function getEnvVar(key: string, defaultValue: string = ''): string {
  try {
    // Try process.env first (works in Node.js)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }

    // Try global env (works in some edge runtimes)
    if (typeof globalThis !== 'undefined' && (globalThis as any).env && (globalThis as any).env[key]) {
      return (globalThis as any).env[key];
    }

    // Return default value if not found
    return defaultValue;
  } catch (error) {
    // If any error occurs, return default value
    return defaultValue;
  }
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  const env = getEnvVar('NODE_ENV', 'production').toLowerCase();
  return env === 'development' || env === 'dev';
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  const env = getEnvVar('NODE_ENV', 'production').toLowerCase();
  return env === 'production' || env === 'prod';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  const env = getEnvVar('NODE_ENV', 'production').toLowerCase();
  return env === 'test' || env === 'testing';
}

/**
 * Safe console logger that only logs in development
 */
export const devLog = {
  log: (...args: any[]) => {
    if (isDevelopment()) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment()) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment()) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment()) {
      console.info(...args);
    }
  }
};

/**
 * Production-safe error logger
 */
export function logError(error: Error | unknown, context?: Record<string, any>): void {
  const errorInfo = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString()
  };

  if (isProduction()) {
    // In production, log to external service or structured logging
    // For now, just console.error with minimal info
    console.error('[ERROR]', errorInfo.message, errorInfo.timestamp);
  } else {
    // In development, log full details
    console.error('[ERROR]', errorInfo);
  }
}