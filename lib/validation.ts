import { z } from 'zod';
import { isDevelopment } from './env-utils';

// URL validation schema
export const urlSchema = z.object({
  productUrl: z.string()
    .url('Invalid URL format')
    .refine(
      (url) => {
        try {
          const parsedUrl = new URL(url);
          const domain = parsedUrl.hostname.replace('www.', '');
          return domain.endsWith('amway.com');
        } catch {
          return false;
        }
      },
      'URL must be from amway.com domain'
    )
    .refine(
      (url) => {
        try {
          const parsedUrl = new URL(url);
          return parsedUrl.pathname.includes('/p/') ||
                 parsedUrl.pathname.includes('/p-') ||
                 !!parsedUrl.pathname.match(/-p-\d+/);
        } catch {
          return false;
        }
      },
      'URL must be an Amway product page'
    )
});

// Campaign preferences validation
export const campaignPreferencesSchema = z.object({
  campaign_type: z.literal('lifestyle'), // Fixed to lifestyle with benefit-focused approach
  brand_style: z.enum(['professional', 'casual', 'wellness', 'luxury']),
  color_scheme: z.enum(['amway_brand', 'product_inspired', 'custom']),
  text_overlay: z.enum(['minimal', 'moderate', 'heavy']),
  campaign_size: z.literal(5),
  image_formats: z.array(z.enum(['facebook_post', 'instagram_post', 'pinterest', 'snapchat_ad', 'linkedin_post']))
    .min(1, 'At least one image format is required')
    .max(5, 'Maximum 5 image formats allowed')
});

// Backward compatible campaign preferences validation - allows legacy sizes but normalizes to 5
export const campaignPreferencesSchemaLegacy = z.object({
  campaign_type: z.enum(['product_focus', 'lifestyle']).transform(val => 'lifestyle' as const), // Normalize to lifestyle
  brand_style: z.enum(['professional', 'casual', 'wellness', 'luxury']),
  color_scheme: z.enum(['amway_brand', 'product_inspired', 'custom']),
  text_overlay: z.enum(['minimal', 'moderate', 'heavy']),
  campaign_size: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10), z.literal(15)])
    .transform(val => 5 as const), // Always normalize to 5 images
  image_formats: z.array(z.enum(['facebook_post', 'instagram_post', 'pinterest', 'snapchat_ad', 'linkedin_post']))
    .min(1, 'At least one image format is required')
    .max(5, 'Maximum 5 image formats allowed')
});

// Campaign generation request validation
export const generateCampaignSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  preferences: campaignPreferencesSchema
});

// Legacy campaign generation request validation
export const generateCampaignSchemaLegacy = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  preferences: campaignPreferencesSchemaLegacy
});

// Image selection validation
export const imageSelectionSchema = z.object({
  selected: z.boolean()
});

// Database ID validation
export const idSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val);
    if (isNaN(num) || num <= 0) {
      throw new Error('ID must be a positive integer');
    }
    return num;
  })
});

// Sanitize string input (prevent XSS)
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>\"'&]/g, (match) => {
      // HTML entity encoding
      switch (match) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        case '&': return '&amp;';
        default: return match;
      }
    })
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/script/gi, '') // Remove script tags
    .trim()
    .substring(0, 1000); // Limit length
};

// Sanitize HTML content (for rich text fields)
export const sanitizeHtml = (input: string): string => {
  // Remove script tags and their content
  let clean = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove on* event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove dangerous protocols
  clean = clean.replace(/javascript:|data:text\/html/gi, '');

  return clean.trim();
};

// Sanitize SQL-like input (prevent SQL injection in search queries)
export const sanitizeSearchQuery = (input: string): string => {
  return input
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL multi-line comments
    .replace(/\*\//g, '')
    .trim()
    .substring(0, 200); // Limit search query length
};

// Safe logging function
export const safeLog = (message: string, data?: any, sensitiveFields: string[] = []) => {
  if (isDevelopment()) {
    if (data && typeof data === 'object') {
      const sanitizedData = { ...data };

      // Remove sensitive fields
      sensitiveFields.forEach(field => {
        if (field in sanitizedData) {
          sanitizedData[field] = '[REDACTED]';
        }
      });

      console.log(message, sanitizedData);
    } else {
      console.log(message, data);
    }
  }
};

// Validate and sanitize request data
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: any): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${message}`);
    }
    throw error;
  }
};

// Validate campaign request with backward compatibility
export const validateCampaignRequest = (data: any) => {
  try {
    // Try strict validation first
    return validateRequest(generateCampaignSchema, data);
  } catch (strictError) {
    safeLog('Strict validation failed, trying legacy validation', {
      error: strictError instanceof Error ? strictError.message : 'Unknown error'
    });

    try {
      // Fall back to legacy validation with transformations
      const result = validateRequest(generateCampaignSchemaLegacy, data);
      safeLog('Legacy validation succeeded - data normalized', {
        originalSize: data.preferences?.campaign_size,
        normalizedSize: result.preferences.campaign_size
      });
      return result;
    } catch (legacyError) {
      // If both fail, throw the original strict error
      throw strictError;
    }
  }
};