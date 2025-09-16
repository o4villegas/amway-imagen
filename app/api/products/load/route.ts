import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/db';
import { ProductLoader } from '@/lib/product-loader';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Get environment bindings (with fallbacks for development)
    const env = process.env as any;

    // Mock database in development
    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => null,
          run: async () => ({
            success: true,
            meta: { last_row_id: Math.floor(Math.random() * 1000000) }
          })
        })
      })
    };

    const db = new DatabaseManager(env.DB || mockDb as any);
    const loader = new ProductLoader(db, env.CAMPAIGN_STORAGE || null);

    const requestData = await request.json() as { products?: any[] };
    const { products } = requestData;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({
        error: 'Invalid request format. Expected products array.'
      }, { status: 400 });
    }

    const results = [];

    for (const productData of products) {
      const { textContent, filename, imageBase64 } = productData;

      if (!textContent || !filename) {
        continue; // Skip invalid entries
      }

      // Convert base64 image to buffer if provided
      let imageBuffer: ArrayBuffer | undefined;
      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const binaryString = atob(base64Data);
        imageBuffer = new ArrayBuffer(binaryString.length);
        const uint8Array = new Uint8Array(imageBuffer);
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }
      }

      try {
        const stored = await loader.loadProduct(textContent, filename, imageBuffer);
        results.push({
          success: true,
          product: {
            id: stored.id,
            name: stored.name,
            category: stored.category,
            brand: stored.brand
          }
        });
      } catch (error) {
        results.push({
          success: false,
          filename,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Loaded ${successful} products successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      results,
      summary: {
        total: products.length,
        successful,
        failed
      }
    });

  } catch (error) {
    console.error('Product loading error:', error);
    return NextResponse.json({
      error: 'Failed to load products',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Product loading endpoint',
    usage: 'POST with products array containing textContent, filename, and optional imageBase64'
  });
}