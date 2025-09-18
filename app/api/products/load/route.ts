import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/db';
import { ProductLoader } from '@/lib/product-loader';


export async function POST(request: NextRequest) {
  try {
    // @ts-ignore - Cloudflare Workers bindings
    const DB = process.env.DB as D1Database | undefined;
    // @ts-ignore - Cloudflare Workers bindings
    const CAMPAIGN_STORAGE = process.env.CAMPAIGN_STORAGE as R2Bucket | undefined;

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

    const db = new DatabaseManager(DB || mockDb as any);
    const loader = new ProductLoader(db, CAMPAIGN_STORAGE || null as any);

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
  try {
    // @ts-ignore - Cloudflare Workers bindings
    const DB = process.env.DB as D1Database | undefined;

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