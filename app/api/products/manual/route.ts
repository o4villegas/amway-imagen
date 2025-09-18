import { NextRequest, NextResponse } from 'next/server';
// Cloudflare Workers context will be available via process.env
import { DatabaseManager } from '@/lib/db';
import { rateLimiters } from '@/lib/rate-limiter';
import { validateRequest, safeLog } from '@/lib/validation';
import { z } from 'zod';


// Manual product entry schema
const manualProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200, 'Product name too long'),
  category: z.enum(['nutrition', 'beauty', 'home', 'other']),
  brand: z.string().optional().default('Amway'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description too long'),
  benefits: z.string().optional().default(''),
  price: z.number().positive().optional(),
  currency: z.string().optional().default('USD'),
  amway_product_id: z.string().optional(),
  main_image_url: z.string().url().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimiters.scrape.isAllowed(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // @ts-ignore - Cloudflare Workers bindings
    const DB = process.env.DB as D1Database | undefined;

    if (!DB) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Validate and sanitize input
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    let productData;
    try {
      productData = validateRequest(manualProductSchema, requestData);
    } catch (validationError: any) {
      return NextResponse.json(
        { error: validationError.message || 'Invalid product data' },
        { status: 400 }
      );
    }

    safeLog('Manual product entry received', {
      name: productData.name,
      category: productData.category
    });

    const dbManager = new DatabaseManager(DB);

    // Create a manual product entry
    const manualProduct = {
      amway_product_id: productData.amway_product_id || `manual_${Date.now()}`,
      name: productData.name,
      description: productData.description,
      benefits: productData.benefits || '',
      category: productData.category,
      brand: productData.brand || 'Amway',
      price: productData.price || null,
      currency: productData.currency || 'USD',
      main_image_url: productData.main_image_url || null,
      inventory_status: 'available'
    };

    // Save to database with a manual URL identifier
    const manualUrl = `manual://product/${manualProduct.amway_product_id}`;
    const savedProduct = await dbManager.saveProduct(manualUrl, manualProduct);

    return NextResponse.json({
      success: true,
      product: savedProduct,
      source: 'manual_entry',
      message: 'Product manually added successfully'
    });

  } catch (error: any) {
    safeLog('Manual product entry error', {
      errorType: error?.name || 'Unknown',
      message: error?.message || 'No message'
    }, ['stack']);

    return NextResponse.json(
      { error: 'Failed to save product information. Please try again.' },
      { status: 500 }
    );
  }
}