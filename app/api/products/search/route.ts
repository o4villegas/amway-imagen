import { NextRequest, NextResponse } from 'next/server';
import { DatabaseManager } from '@/lib/db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    // In test/development environment, return mock products
    // Simple check: if we can't access real Cloudflare bindings, use mock data
    const env = process.env as any;
    const hasRealDB = env.DB && typeof env.DB.prepare === 'function';

    if (!hasRealDB) {
      const mockProducts = [
        {
          id: 1,
          name: 'Artistry Exact Fit Powder Foundation',
          description: 'Perfect coverage with a natural, seamless finish',
          brand: 'Artistry',
          category: 'beauty',
          price: 42.00,
          currency: 'USD',
          main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
          benefits: 'Long-lasting coverage, natural finish, suitable for all skin types'
        },
        {
          id: 2,
          name: 'Nutrilite Women\'s Pack',
          description: 'Complete nutritional support for women',
          brand: 'Nutrilite',
          category: 'nutrition',
          price: 89.95,
          currency: 'USD',
          main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
          benefits: 'Essential vitamins and minerals, immune support, energy enhancement'
        },
        {
          id: 3,
          name: 'eSpring Water Purifier',
          description: 'Advanced water filtration system',
          brand: 'eSpring',
          category: 'home',
          price: 1199.00,
          currency: 'USD',
          main_image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=',
          benefits: 'Pure, clean water, advanced filtration, long-lasting filters'
        }
      ];

      // Apply filtering
      let filteredProducts = mockProducts;

      if (category && category !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === category);
      }

      if (query) {
        filteredProducts = filteredProducts.filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
        );
      }

      return NextResponse.json({
        products: filteredProducts.slice(0, limit)
      });
    }

    // Production environment - use actual database
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