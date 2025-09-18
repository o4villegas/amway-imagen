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
      // Use consistent mock data matching the main product loader
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
        // DISABLED PRODUCTS (Coming Soon)
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
      product_url: product.product_url,
      available: product.available !== undefined ? product.available : true
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