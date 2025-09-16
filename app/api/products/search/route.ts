import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get environment bindings
    const env = process.env as any;
    const db = new DatabaseManager(env.DB);

    let products;

    if (category && category !== 'all') {
      // Search by category
      const results = await env.DB.prepare(`
        SELECT * FROM products
        WHERE category = ?
        ORDER BY updated_at DESC
        LIMIT ?
      `).bind(category, limit).all();

      products = results.results;
    } else if (query) {
      // Search by name or description
      const results = await env.DB.prepare(`
        SELECT * FROM products
        WHERE name LIKE ? OR description LIKE ?
        ORDER BY updated_at DESC
        LIMIT ?
      `).bind(`%${query}%`, `%${query}%`, limit).all();

      products = results.results;
    } else {
      // Get all products
      const results = await env.DB.prepare(`
        SELECT * FROM products
        ORDER BY updated_at DESC
        LIMIT ?
      `).bind(limit).all();

      products = results.results;
    }

    // Format products for frontend
    const formattedProducts = products.map((product: any) => ({
      id: product.id,
      amway_product_id: product.amway_product_id,
      name: product.name,
      description: product.description,
      category: product.category,
      brand: product.brand,
      price: product.price,
      currency: product.currency,
      main_image_url: product.main_image_url,
      inventory_status: product.inventory_status,
      product_url: product.product_url
    }));

    return NextResponse.json({
      products: formattedProducts,
      total: formattedProducts.length,
      query,
      category
    });

  } catch (error) {
    console.error('Product search error:', error);
    return NextResponse.json({
      error: 'Failed to search products',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}