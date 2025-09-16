import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { AmwayProductScraper, validateAmwayURL } from '@/lib/scraper';
import { DatabaseManager } from '@/lib/db';
import { rateLimiters } from '@/lib/rate-limiter';
import { urlSchema, validateRequest, safeLog } from '@/lib/validation';
import { withTimeout, withRetry, TIMEOUTS } from '@/lib/timeout-utils';

export const runtime = 'edge';

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
    const context = getRequestContext();
    const { DB } = context.env;

    // Validate and sanitize input with proper error handling
    let requestData;
    let productUrl;

    try {
      requestData = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    try {
      const validated = validateRequest(urlSchema, requestData);
      productUrl = validated.productUrl;
    } catch (validationError: any) {
      return NextResponse.json(
        { error: validationError.message || 'Invalid request format' },
        { status: 400 }
      );
    }

    safeLog('Product scraping request received', {
      url: productUrl.substring(0, 50) + '...' // Log only partial URL
    });

    const dbManager = new DatabaseManager(DB);

    // Check if we already have this product
    const existingProduct = await dbManager.getProduct(productUrl);
    if (existingProduct) {
      // Check if it's recent (less than 24 hours old)
      const lastScraped = new Date(existingProduct.updated_at);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastScraped.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate < 24) {
        return NextResponse.json({
          success: true,
          product: existingProduct,
          cached: true
        });
      }
    }

    // Scrape fresh data with retry logic
    const scraper = new AmwayProductScraper();
    const productData = await withRetry(
      async () => await withTimeout(
        scraper.scrapeProduct(productUrl),
        TIMEOUTS.SCRAPE,
        'Product scraping'
      ),
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        shouldRetry: (error) => {
          // Don't retry client errors
          if (error.message?.includes('Invalid Amway product URL')) return false;
          if (error.message?.includes('HTTP 404')) return false;
          if (error.message?.includes('HTTP 400')) return false;
          // Retry on timeout or server errors
          return true;
        },
        onRetry: (error, attempt, delayMs) => {
          safeLog(`Retrying scrape attempt ${attempt}`, {
            delay: delayMs,
            errorType: error?.name || 'Unknown'
          });
        }
      }
    );

    // Save to database with timeout
    const savedProduct = await withTimeout(
      dbManager.saveProduct(productUrl, productData),
      TIMEOUTS.DB_OPERATION,
      'Database save'
    );

    return NextResponse.json({
      success: true,
      product: savedProduct,
      cached: false
    });

  } catch (error: any) {
    safeLog('Scraping error occurred', {
      errorType: error?.name || 'Unknown',
      message: error?.message || 'No message'
    }, ['stack', 'productUrl']);

    // Return appropriate error messages
    if (error.message.includes('Invalid Amway product URL')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (error.message.includes('HTTP 404')) {
      return NextResponse.json(
        { error: 'Product not found. Please check the URL and try again.' },
        { status: 404 }
      );
    }

    if (error.message.includes('HTTP 403')) {
      return NextResponse.json(
        { error: 'Access denied. The product page may require authentication.' },
        { status: 403 }
      );
    }

    if (error.message.includes('HTTP 302') || error.message.includes('sso/prepare')) {
      return NextResponse.json(
        {
          error: 'Amway website requires authentication. Product scraping is currently unavailable.',
          code: 'AUTH_REQUIRED',
          suggestion: 'Please enter product information manually or try again later.'
        },
        { status: 503 }
      );
    }

    if (error.message.includes('Could not extract product name')) {
      return NextResponse.json(
        { error: 'Unable to parse product information. The page structure may have changed.' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to scrape product information. Please try again later.' },
      { status: 500 }
    );
  }
}