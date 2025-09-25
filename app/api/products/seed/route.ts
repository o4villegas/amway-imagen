import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseManager } from '@/lib/db';
import { safeLog } from '@/lib/validation';


// Common Amway products for seeding when scraping is unavailable
// This API route is dynamic and should not be statically generated
export const dynamic = 'force-dynamic';

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
    main_image_url: '/api/placeholder-image',
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
    main_image_url: '/api/placeholder-image',
    inventory_status: 'available',
    available: true
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
    main_image_url: '/api/placeholder-image',
    inventory_status: 'available',
    available: false  // Coming soon
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
    main_image_url: '/api/placeholder-image',
    inventory_status: 'available',
    available: false  // Coming soon
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
    main_image_url: '/api/placeholder-image',
    inventory_status: 'available',
    available: false  // Coming soon
  }
];

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB as D1Database | undefined;

    if (!DB) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
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
          // Update existing product if it doesn't have an image URL
          if (!existingProduct.main_image_url || existingProduct.main_image_url === null) {
            try {
              await DB!.prepare(`
                UPDATE products
                SET main_image_url = ?
                WHERE id = ?
              `).bind('/api/placeholder-image', existingProduct.id).run();

              results.push({
                productId: productData.amway_product_id,
                status: 'updated',
                name: productData.name,
                id: existingProduct.id,
                message: 'Added placeholder image URL'
              });
            } catch (updateError: any) {
              results.push({
                productId: productData.amway_product_id,
                status: 'update_failed',
                name: productData.name,
                id: existingProduct.id,
                error: updateError.message
              });
            }
          } else {
            results.push({
              productId: productData.amway_product_id,
              status: 'already_exists',
              name: productData.name,
              id: existingProduct.id
            });
          }
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
    const updated = results.filter(r => r.status === 'updated');
    const existing = results.filter(r => r.status === 'already_exists');
    const failed = results.filter(r => r.status === 'failed' || r.status === 'update_failed');

    return NextResponse.json({
      success: true,
      message: 'Database seeding completed',
      summary: {
        total: SEED_PRODUCTS.length,
        created: successful.length,
        updated: updated.length,
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