import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { AmwayProductScraper, validateAmwayURL } from '@/lib/scraper';
import { DatabaseManager } from '@/lib/db';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const context = getRequestContext();
    const { DB } = context.env;

    const { productUrl } = await request.json() as { productUrl: string };

    if (!productUrl || typeof productUrl !== 'string') {
      return NextResponse.json(
        { error: 'Product URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    if (!validateAmwayURL(productUrl)) {
      return NextResponse.json(
        {
          error: 'Invalid Amway product URL. Please provide a valid amway.com product page URL.'
        },
        { status: 400 }
      );
    }

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

    // Scrape fresh data
    const scraper = new AmwayProductScraper();
    const productData = await scraper.scrapeProduct(productUrl);

    // Save to database
    const savedProduct = await dbManager.saveProduct(productUrl, productData);

    return NextResponse.json({
      success: true,
      product: savedProduct,
      cached: false
    });

  } catch (error: any) {
    console.error('Scraping error:', error);

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