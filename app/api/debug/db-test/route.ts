import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { DatabaseManager } from '@/lib/db';

// Test endpoint to isolate database write operations
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB as D1Database | undefined;

    if (!DB) {
      return NextResponse.json({
        success: false,
        error: 'No D1 database binding found',
        step: 'binding_check'
      }, { status: 500 });
    }

    const db = new DatabaseManager(DB);
    const timestamp = Date.now();
    const testData = {
      product_url: `https://test.amway.com/debug-${timestamp}`,
      amway_product_id: `DEBUG_${timestamp}`,
      name: 'Debug Test Product',
      description: 'Minimal test product for database debugging',
      benefits: 'Test benefit 1. Test benefit 2',
      category: 'nutrition',
      brand: 'Amway',
      price: 99.99,
      currency: 'USD',
      main_image_url: null,
      inventory_status: 'in_stock'
    };

    console.log(`[DB_TEST] Starting database write test with data:`, testData);

    // Test 1: Direct raw INSERT
    try {
      const insertResult = await DB.prepare(`
        INSERT INTO products (
          product_url,
          amway_product_id,
          name,
          description,
          benefits,
          category,
          brand,
          price,
          currency,
          main_image_url,
          inventory_status,
          available,
          scraping_method,
          cached_until
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'debug-test', datetime('now', '+1 day'))
      `).bind(
        testData.product_url,
        testData.amway_product_id,
        testData.name,
        testData.description,
        testData.benefits,
        testData.category,
        testData.brand,
        testData.price,
        testData.currency,
        testData.main_image_url,
        testData.inventory_status
      ).run();

      console.log(`[DB_TEST] Raw INSERT result:`, insertResult);

      if (!insertResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Raw INSERT failed',
          step: 'raw_insert',
          result: insertResult,
          testData
        }, { status: 500 });
      }

      // Test 2: Retrieve the inserted product
      const retrieveResult = await DB.prepare(
        'SELECT * FROM products WHERE product_url = ?'
      ).bind(testData.product_url).first();

      console.log(`[DB_TEST] Retrieve result:`, retrieveResult);

      if (!retrieveResult) {
        return NextResponse.json({
          success: false,
          error: 'Product inserted but not retrievable',
          step: 'retrieve_after_insert',
          insertResult,
          testData
        }, { status: 500 });
      }

      // Test 3: Test DatabaseManager method
      const dmResult = await db.saveProductWithCache(
        `https://test.amway.com/dm-test-${timestamp}`,
        {
          ...testData,
          product_url: `https://test.amway.com/dm-test-${timestamp}`,
          amway_product_id: `DM_${timestamp}`
        },
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      );

      console.log(`[DB_TEST] DatabaseManager result:`, dmResult);

      return NextResponse.json({
        success: true,
        tests: {
          raw_insert: {
            success: true,
            result: insertResult,
            inserted_id: insertResult.meta?.last_row_id
          },
          retrieve_test: {
            success: true,
            product: retrieveResult
          },
          database_manager: {
            success: true,
            product_id: dmResult.id
          }
        },
        testData
      });

    } catch (insertError) {
      console.error(`[DB_TEST] INSERT failed:`, insertError);

      return NextResponse.json({
        success: false,
        error: 'INSERT operation threw error',
        step: 'raw_insert_exception',
        error_message: insertError instanceof Error ? insertError.message : String(insertError),
        error_stack: insertError instanceof Error ? insertError.stack : undefined,
        testData
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[DB_TEST] Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test endpoint failed',
      step: 'setup',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database test endpoint - use POST to run tests',
    available_tests: [
      'raw_insert - Direct D1 INSERT operation',
      'retrieve_test - Verify product retrieval after insert',
      'database_manager - Test DatabaseManager.saveProductWithCache method'
    ]
  });
}