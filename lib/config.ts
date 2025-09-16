/**
 * Application configuration constants
 * Centralizes all magic numbers and configuration values
 */

// Campaign generation settings
export const CAMPAIGN_CONFIG = {
  // Image generation
  MAX_CONCURRENT_GENERATIONS: 3,
  AI_GENERATION_STEPS: 4, // Fast generation for MVP
  AI_GUIDANCE_SCALE: 7.5,

  // Campaign sizes
  CAMPAIGN_SIZES: [1, 3, 5, 10, 15] as const,

  // Progress simulation
  PROGRESS_UPDATE_INTERVAL: 1500, // milliseconds
  MAX_SIMULATED_PROGRESS: 85, // percent

  // Cache and expiration
  PRODUCT_CACHE_HOURS: 24,
  DOWNLOAD_EXPIRY_HOURS: 24,

  // File limits
  MAX_PROMPT_LENGTH: 1000,
  MAX_FILENAME_LENGTH: 255,
} as const;

// Image format specifications
// Using AI-friendly dimensions (multiples of 64) for better generation
export const IMAGE_FORMATS = {
  instagram_post: { width: 1024, height: 1024, label: 'Instagram Post' },
  instagram_story: { width: 1024, height: 1792, label: 'Instagram Story' },
  facebook_cover: { width: 1152, height: 640, label: 'Facebook Cover' },
  pinterest: { width: 1024, height: 1536, label: 'Pinterest Pin' }
} as const;

// Database pagination and limits
export const DATABASE_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  QUERY_TIMEOUT_MS: 5000,
  MAX_RETRIES: 3,
  CONNECTION_POOL_SIZE: 10,
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  scrape: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many scraping requests'
  },
  generate: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3,
    message: 'Too many generation requests'
  },
  download: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Too many download requests'
  }
} as const;

// Security configuration
export const SECURITY_CONFIG = {
  MAX_URL_LENGTH: 2048,
  MAX_INPUT_LENGTH: 5000,
  ALLOWED_HOSTS: ['amway.com'],
  CSRF_TOKEN_LENGTH: 32,
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
} as const;

// User agent rotation for scraping
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0'
] as const;

// Performance monitoring thresholds
export const PERFORMANCE_THRESHOLDS = {
  SCRAPE_WARNING_MS: 10000, // 10 seconds
  GENERATION_WARNING_MS: 60000, // 1 minute
  API_TIMEOUT_MS: 120000, // 2 minutes

  // Memory usage warnings
  MEMORY_WARNING_MB: 100,
  MEMORY_CRITICAL_MB: 200,

  // Success rate thresholds
  MIN_SUCCESS_RATE: 0.8, // 80%
  CRITICAL_SUCCESS_RATE: 0.5, // 50%
} as const;

// UI/UX configuration
export const UI_CONFIG = {
  // Animation durations (ms)
  TRANSITION_FAST: 150,
  TRANSITION_NORMAL: 300,
  TRANSITION_SLOW: 500,

  // Debounce delays (ms)
  SEARCH_DEBOUNCE: 300,
  INPUT_VALIDATION_DEBOUNCE: 500,

  // Toast notification durations (ms)
  TOAST_SUCCESS: 3000,
  TOAST_ERROR: 5000,
  TOAST_WARNING: 4000,

  // Loading states
  SKELETON_ANIMATION_DURATION: 1500,
  PROGRESS_BAR_ANIMATION: 300,
} as const;

// File size limits
export const FILE_LIMITS = {
  MAX_IMAGE_SIZE_MB: 10,
  MAX_ZIP_SIZE_MB: 100,
  MAX_UPLOAD_SIZE_MB: 50,

  // Image quality settings
  JPEG_QUALITY: 85,
  PNG_COMPRESSION: 6,
  WEBP_QUALITY: 80,
} as const;

// Campaign validation rules
export const VALIDATION_RULES = {
  PRODUCT_NAME: {
    minLength: 2,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-_&'.()]+$/
  },
  CAMPAIGN_DESCRIPTION: {
    minLength: 10,
    maxLength: 1000,
  },
  URL_VALIDATION: {
    protocols: ['http:', 'https:'],
    maxLength: 2048,
  }
} as const;

// Environment-specific configurations
export const ENV_CONFIG = {
  development: {
    LOG_LEVEL: 'debug',
    ENABLE_MOCK_DATA: true,
    CACHE_ENABLED: false,
  },
  production: {
    LOG_LEVEL: 'error',
    ENABLE_MOCK_DATA: false,
    CACHE_ENABLED: true,
  },
  test: {
    LOG_LEVEL: 'silent',
    ENABLE_MOCK_DATA: true,
    CACHE_ENABLED: false,
  }
} as const;

// Type exports for better TypeScript support
export type CampaignSize = typeof CAMPAIGN_CONFIG.CAMPAIGN_SIZES[number];
export type ImageFormat = keyof typeof IMAGE_FORMATS;
export type RateLimitType = keyof typeof RATE_LIMITS;