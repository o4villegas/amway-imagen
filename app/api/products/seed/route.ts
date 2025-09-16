import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { DatabaseManager } from '@/lib/db';
import { safeLog } from '@/lib/validation';

export const runtime = 'edge';

// Common Amway products for seeding when scraping is unavailable
const SEED_PRODUCTS = [
  {
    amway_product_id: '119398',
    name: 'Nutrilite Double X Vitamin Mineral Phytonutrient',
    description: 'Comprehensive multivitamin with essential vitamins, minerals, and phytonutrients',
    benefits: 'Supports overall health with vitamins, minerals, and plant concentrates',
    category: 'nutrition',
    brand: 'Nutrilite',
    price: 89.95,
    currency: 'USD',
    main_image_url: null,
    inventory_status: 'available'
  },
  {
    amway_product_id: '100109',
    name: 'XS Energy Drink Cranberry Grape Blast',
    description: 'Sugar-free energy drink with B-vitamins and natural caffeine',
    benefits: 'Provides energy boost with B-vitamins and natural caffeine from guarana',
    category: 'nutrition',
    brand: 'XS',
    price: 32.50,
    currency: 'USD',
    main_image_url: null,
    inventory_status: 'available'
  },
  {
    amway_product_id: '137823',
    name: 'Artistry Studio Bangkok Edition Lipstick',
    description: 'Vibrant lipstick with rich color and smooth application',
    benefits: 'Long-lasting color with moisturizing properties',
    category: 'beauty',
    brand: 'Artistry',
    price: 24.00,
    currency: 'USD',
    main_image_url: null,
    inventory_status: 'available'
  },
  {
    amway_product_id: '326782',
    name: 'Nutrilite Begin 30 Nutrition Solution',
    description: 'Comprehensive 30-day nutrition program with supplements and meal replacement',
    benefits: 'Complete nutrition support for wellness journey',
    category: 'nutrition',
    brand: 'Nutrilite',
    price: 199.95,
    currency: 'USD',
    main_image_url: null,
    inventory_status: 'available'
  },
  {
    amway_product_id: '123001',
    name: 'SA8 Premium Concentrated Laundry Detergent',
    description: 'High-performance laundry detergent for effective cleaning',
    benefits: 'Removes tough stains while being gentle on fabrics',
    category: 'home',
    brand: 'SA8',
    price: 21.95,
    currency: 'USD',
    main_image_url: null,
    inventory_status: 'available'
  }
];

export async function POST(request: NextRequest) {
  try {
    const context = getRequestContext();
    const { DB } = context.env;

    if (!DB) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    safeLog('Seeding product database with fallback products');

    const dbManager = new DatabaseManager(DB);
    const results = [];

    for (const productData of SEED_PRODUCTS) {
      try {
        // Check if product already exists
        const seedUrl = `seed://product/${productData.amway_product_id}`;
        const existingProduct = await dbManager.getProduct(seedUrl);

        if (existingProduct) {
          results.push({
            productId: productData.amway_product_id,
            status: 'already_exists',
            name: productData.name
          });
          continue;
        }

        // Save seed product
        const savedProduct = await dbManager.saveProduct(seedUrl, productData);
        results.push({
          productId: productData.amway_product_id,
          status: 'created',
          name: productData.name,
          id: savedProduct.id
        });

        safeLog(`Seeded product: ${productData.name}`, {
          productId: productData.amway_product_id
        });

      } catch (error: any) {
        results.push({
          productId: productData.amway_product_id,
          status: 'failed',
          name: productData.name,
          error: error.message
        });

        safeLog(`Failed to seed product: ${productData.name}`, {
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.status === 'created');
    const existing = results.filter(r => r.status === 'already_exists');
    const failed = results.filter(r => r.status === 'failed');

    return NextResponse.json({
      success: true,
      message: 'Database seeding completed',
      summary: {
        total: SEED_PRODUCTS.length,
        created: successful.length,
        existing: existing.length,
        failed: failed.length
      },
      results: results
    });

  } catch (error: any) {
    safeLog('Database seeding failed', {
      errorType: error?.name || 'Unknown',
      message: error?.message || 'No message'
    }, ['stack']);

    return NextResponse.json(
      { error: 'Failed to seed database. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return information about available seed products
  return NextResponse.json({
    message: 'Product database seeder',
    availableProducts: SEED_PRODUCTS.map(p => ({
      id: p.amway_product_id,
      name: p.name,
      category: p.category,
      brand: p.brand
    })),
    usage: 'POST to this endpoint to seed the database with fallback products when scraping is unavailable'
  });
}