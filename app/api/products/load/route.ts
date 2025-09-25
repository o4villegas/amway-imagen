import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseManager } from '@/lib/db';
import { ClaudeProductScraper, ScrapingRateLimiter } from '@/lib/ai-scraper';
import { ProductCacheManager } from '@/lib/cache-manager';
import { EnhancedProductScraper } from '@/lib/enhanced-scraper';


// This API route is dynamic and should not be statically generated
export const dynamic = 'force-dynamic';

// Rate limiter instance (in production, this should be stored in a persistent cache)
const rateLimiter = new ScrapingRateLimiter();

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB as D1Database | undefined;
    const CLAUDE_API_KEY = env.CLAUDE_API_KEY as string | undefined;

    // Check for required API key
    if (!CLAUDE_API_KEY) {
      return NextResponse.json({
        error: 'Claude API key not configured',
        message: 'Please configure CLAUDE_API_KEY environment variable'
      }, { status: 500 });
    }

    // Mock database in development
    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => null,
          run: async () => ({
            success: true,
            meta: { last_row_id: Math.floor(Math.random() * 1000000), changes: 1 }
          }),
          all: async () => ({ results: [] })
        })
      })
    };

    const db = new DatabaseManager(DB || mockDb as any);
    const scraper = new ClaudeProductScraper(CLAUDE_API_KEY);
    const cache = new ProductCacheManager(db);

    const requestData = await request.json() as { url: string; userId?: string };
    const { url, userId = 'anonymous' } = requestData;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({
        error: 'Invalid request format. Expected URL string.'
      }, { status: 400 });
    }

    // Rate limiting check
    if (!rateLimiter.checkRateLimit(userId)) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: 'Too many scraping requests. Please wait before trying again.',
        remaining: rateLimiter.getRemainingRequests(userId)
      }, { status: 429 });
    }

    console.log(`[SCRAPING] Starting extraction for URL: ${url}`);

    try {
      // Stage 1: Check cache first
      console.log(`[SCRAPING] Stage 1: Checking cache...`);
      const cachedProduct = await db.getCachedProduct(url);

      if (cachedProduct) {
        console.log(`[SCRAPING] Cache hit! Returning cached product: ${cachedProduct.name}`);
        return NextResponse.json({
          success: true,
          fromCache: true,
          product: {
            id: cachedProduct.id,
            name: cachedProduct.name,
            description: cachedProduct.description,
            benefits: cachedProduct.benefits ? cachedProduct.benefits.split('. ').filter(b => b.trim()) : [],
            category: cachedProduct.category,
            brand: cachedProduct.brand,
            price: cachedProduct.price,
            currency: cachedProduct.currency,
            main_image_url: cachedProduct.main_image_url,
            product_url: cachedProduct.product_url
          }
        });
      }

      // Stage 2: Try enhanced scraper first (uses Claude's knowledge base)
      console.log(`[SCRAPING] Stage 2: Using enhanced extraction with Claude knowledge base...`);
      let extractionResult;

      try {
        const enhancedScraper = new EnhancedProductScraper(CLAUDE_API_KEY);
        const enhancedInfo = await enhancedScraper.extractProductInfo(url);

        // Convert enhanced format to standard format
        extractionResult = {
          name: enhancedInfo.name,
          description: enhancedInfo.description,
          benefits: enhancedInfo.benefits,
          category: enhancedInfo.category,
          brand: enhancedInfo.brand,
          price: enhancedInfo.price,
          currency: enhancedInfo.currency,
          imageUrl: enhancedInfo.imageUrl,
          confidence: enhancedInfo.confidence
        };

        console.log(`[SCRAPING] Enhanced extraction successful: ${enhancedInfo.name} (confidence: ${enhancedInfo.confidence})`);
      } catch (enhancedError) {
        console.log(`[SCRAPING] Enhanced extraction failed, falling back to traditional scraping...`);

        // Fallback to original scraper
        extractionResult = await scraper.scrapeProduct(url);
      }

      console.log(`[SCRAPING] Stage 3: Extraction complete - ${extractionResult.name} (${extractionResult.confidence} confidence)`);

      // Stage 4: Cache the result
      console.log(`[SCRAPING] Stage 4: Caching result...`);
      await cache.cacheProduct(url, extractionResult);

      // Try to get the stored product for consistent response format
      const normalizedUrl = new URL(url).href;
      console.log(`[SCRAPING] Retrieving stored product - Original URL: ${url}`);
      console.log(`[SCRAPING] Retrieving stored product - Normalized URL: ${normalizedUrl}`);
      const storedProduct = await db.getProduct(normalizedUrl);

      console.log(`[SCRAPING] Successfully completed extraction for: ${extractionResult.name}`);

      // If we can't retrieve the stored product, return the extraction result directly
      if (!storedProduct) {
        console.log(`[SCRAPING] Warning: Could not retrieve stored product, returning extraction result directly`);

        return NextResponse.json({
          success: true,
          fromCache: false,
          product: {
            id: -1, // Temporary ID
            name: extractionResult.name,
            description: extractionResult.description,
            benefits: Array.isArray(extractionResult.benefits) ? extractionResult.benefits : extractionResult.benefits.split('. '),
            category: extractionResult.category,
            brand: extractionResult.brand,
            price: extractionResult.price,
            currency: extractionResult.currency,
            main_image_url: extractionResult.imageUrl,
            product_url: url
          },
          extraction: {
            confidence: extractionResult.confidence,
            cached_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        });
      }

      return NextResponse.json({
        success: true,
        fromCache: false,
        product: {
          id: storedProduct.id,
          name: storedProduct.name,
          description: storedProduct.description,
          benefits: storedProduct.benefits,
          category: storedProduct.category,
          brand: storedProduct.brand,
          price: storedProduct.price,
          currency: storedProduct.currency,
          main_image_url: storedProduct.main_image_url,
          product_url: storedProduct.product_url
        },
        extraction: {
          confidence: extractionResult.confidence,
          cached_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });

    } catch (error) {
      console.error('[SCRAPING] Extraction failed:', error);

      if (error && typeof error === 'object' && 'type' in error) {
        // This is a ScrapingError
        const scrapingError = error as any;
        return NextResponse.json({
          success: false,
          error: scrapingError.type,
          message: scrapingError.message,
          retryable: scrapingError.retryable
        }, { status: scrapingError.type === 'rate_limited' ? 429 : 400 });
      }

      // Generic error
      return NextResponse.json({
        success: false,
        error: 'extraction_failed',
        message: error instanceof Error ? error.message : 'Unknown extraction error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Product scraping error:', error);
    return NextResponse.json({
      error: 'Failed to process scraping request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB as D1Database | undefined;

    // In test/development environment, return mock products
    // Simplify: If there's no real DB binding, use mock data
    const hasRealDB = DB && typeof DB.prepare === 'function';

    if (!hasRealDB) {
      // Enhanced mock products dataset - includes available and disabled products
      const mockProducts = [
        // AVAILABLE PRODUCTS (3 working products)
        {
          id: 1,
          available: true,
          name: 'Artistry Exact Fit Powder Foundation',
          description: 'Perfect coverage with a natural, seamless finish that looks like your skin, only better',
          brand: 'Artistry',
          category: 'beauty',
          price: 42.00,
          currency: 'USD',
          main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
          benefits: 'Long-lasting coverage, natural finish, suitable for all skin types, SPF 15 protection',
          inventory_status: 'In Stock',
          product_url: 'https://www.amway.com/product/123',
          amway_product_id: 'ART001',
          scraped_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          available: true,
          name: 'Nutrilite™ Women\'s Pack',
          description: 'Complete nutritional support specifically formulated for women\'s health needs',
          brand: 'Nutrilite',
          category: 'nutrition',
          price: 89.95,
          currency: 'USD',
          main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
          benefits: 'Essential vitamins and minerals, immune support, energy enhancement, bone health',
          inventory_status: 'In Stock',
          product_url: 'https://www.amway.com/product/456',
          amway_product_id: 'NUT001',
          scraped_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 3,
          available: true,
          name: 'eSpring® Water Purifier',
          description: 'Advanced water filtration system that removes over 140 contaminants',
          brand: 'eSpring',
          category: 'home',
          price: 1199.00,
          currency: 'USD',
          main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
          benefits: 'Pure, clean water, advanced filtration, long-lasting filters, UV light technology',
          inventory_status: 'In Stock',
          product_url: 'https://www.amway.com/product/789',
          amway_product_id: 'ESP001',
          scraped_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },

        // DISABLED PRODUCTS (Coming Soon - Professional appearance)
        {
          id: 4,
          available: false,
          name: 'Artistry Supreme LX™ Regenerating Eye Cream',
          description: 'Luxurious anti-aging eye cream with advanced peptide technology',
          brand: 'Artistry',
          category: 'beauty',
          price: 95.00,
          currency: 'USD',
          main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
          benefits: 'Reduces fine lines, firms skin, brightens dark circles, premium ingredients',
          inventory_status: 'Coming Soon',
          product_url: 'https://www.amway.com/product/art-002',
          amway_product_id: 'ART002',
          scraped_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 5,
          available: false,
          name: 'Nutrilite™ Vitamin D',
          description: 'Essential vitamin D3 supplement for bone health and immune support',
          brand: 'Nutrilite',
          category: 'nutrition',
          price: 24.95,
          currency: 'USD',
          main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
          benefits: 'Bone strength, immune function, calcium absorption, high potency',
          inventory_status: 'Coming Soon',
          product_url: 'https://www.amway.com/product/nut-002',
          amway_product_id: 'NUT002',
          scraped_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 6,
          available: false,
          name: 'Legacy of Clean™ Multi-Purpose Cleaner',
          description: 'Biodegradable, concentrated cleaner safe for your family and the environment',
          brand: 'Legacy of Clean',
          category: 'home',
          price: 12.99,
          currency: 'USD',
          main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
          benefits: 'Eco-friendly, versatile cleaning, concentrated formula, plant-based ingredients',
          inventory_status: 'Coming Soon',
          product_url: 'https://www.amway.com/product/loc-001',
          amway_product_id: 'LOC001',
          scraped_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 7,
          available: false,
          name: 'XS™ Energy Drink - Variety Pack',
          description: 'Sugar-free energy drinks with natural caffeine and B-vitamins',
          brand: 'XS',
          category: 'nutrition',
          price: 32.95,
          currency: 'USD',
          main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
          benefits: 'Natural energy boost, zero sugar, B-vitamin complex, variety of flavors',
          inventory_status: 'Coming Soon',
          product_url: 'https://www.amway.com/product/xs-001',
          amway_product_id: 'XS001',
          scraped_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      return NextResponse.json({
        products: mockProducts
      });
    }

    // Production environment - use actual database
    const db = new DatabaseManager(DB!);
    const products = await db.getAllProducts();

    return NextResponse.json({
      products
    });

  } catch (error) {
    console.error('Failed to load products:', error);
    return NextResponse.json({
      error: 'Failed to load products',
      products: []
    }, { status: 500 });
  }
}