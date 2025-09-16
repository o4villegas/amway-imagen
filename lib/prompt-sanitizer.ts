/**
 * Sanitization utilities for AI prompts to prevent injection attacks
 */

/**
 * Removes potentially harmful characters and patterns from prompts
 */
export function sanitizePrompt(prompt: string): string {
  // Remove any control characters
  let sanitized = prompt.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Minimal health term filtering - only replace truly problematic terms
  const healthTermReplacements: Record<string, string> = {
    'sexual': 'intimate',
    'fertility': 'reproductive'
  };

  // Apply health term replacements first
  for (const [term, replacement] of Object.entries(healthTermReplacements)) {
    sanitized = sanitized.replace(new RegExp(term, 'gi'), replacement);
  }

  // Remove potential injection patterns - preserve important marketing terms
  const injectionPatterns = [
    /\bignore\s+(previous|all|above)\b/gi,
    /\bforget\s+(everything|all|previous)\b/gi,
    /\bdisregard\s+(previous|all|instructions)\b/gi,
    /\bnew\s+instructions?\b/gi,
    /\bsystem\s+prompt\b/gi,
    /\bjailbreak\b/gi,
    /\bbypass\b/gi,
    /\boverride\b/gi,
    /<script[^>]*>.*?<\/script>/gi, // Script tags specifically
    /\${[^}]*}/g, // Template literals
    // Note: Removed bracket removal to preserve brand names and measurements
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Limit prompt length to prevent overflow
  const MAX_PROMPT_LENGTH = 1000;
  if (sanitized.length > MAX_PROMPT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_PROMPT_LENGTH);
  }

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Ensure prompt isn't empty after sanitization
  if (!sanitized || sanitized.length < 10) {
    return 'Generate a professional product marketing image';
  }

  return sanitized;
}

/**
 * Validates that a prompt contains expected marketing terms
 */
export function validateMarketingPrompt(prompt: string): boolean {
  const requiredTerms = [
    /product|item|goods/i,
    /photo|image|visual|shot/i,
    /quality|professional|marketing/i
  ];

  return requiredTerms.some(term => term.test(prompt));
}

/**
 * Sanitizes product data to prevent injection through product fields
 */
export function sanitizeProductData(data: any): any {
  if (typeof data === 'string') {
    // Remove special characters that could be used for injection
    return data
      .replace(/[<>\"'`]/g, '') // Remove potential HTML/JS injection
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .substring(0, 500); // Limit length
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeProductData(item));
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Only allow alphanumeric keys with underscores
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '');
      sanitized[safeKey] = sanitizeProductData(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Creates a safe prompt from product and preference data
 */
export function createSafePrompt(
  basePrompt: string,
  productName?: string,
  additionalContext?: string
): string {
  const parts = [
    sanitizePrompt(basePrompt),
    productName ? `featuring ${sanitizePrompt(productName)}` : '',
    additionalContext ? sanitizePrompt(additionalContext) : ''
  ].filter(Boolean);

  const combined = parts.join(', ');

  // Final validation
  if (!validateMarketingPrompt(combined)) {
    return 'Generate a professional product marketing image with high quality';
  }

  return combined;
}