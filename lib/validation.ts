import { z } from 'zod';

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
  campaign_type: z.enum(['product_focus', 'lifestyle']),
  brand_style: z.enum(['professional', 'casual', 'wellness', 'luxury']),
  color_scheme: z.enum(['amway_brand', 'product_inspired', 'custom']),
  text_overlay: z.enum(['minimal', 'moderate', 'heavy']),
  campaign_size: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  image_formats: z.array(z.enum(['instagram_post', 'instagram_story', 'facebook_cover', 'pinterest']))
    .min(1, 'At least one image format is required')
    .max(4, 'Maximum 4 image formats allowed')
});

// Campaign generation request validation
export const generateCampaignSchema = z.object({
  productId: z.number().int().positive('Product ID must be a positive integer'),
  preferences: campaignPreferencesSchema
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
    .replace(/[<>\"']/g, '') // Remove potential HTML/JS injection chars
    .trim()
    .substring(0, 1000); // Limit length
};

// Safe logging function
export const safeLog = (message: string, data?: any, sensitiveFields: string[] = []) => {
  if (process.env.NODE_ENV === 'development') {
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