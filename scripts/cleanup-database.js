#!/usr/bin/env node

const API_ENDPOINT = process.argv[2] || 'http://localhost:3001/api/products/search';

console.log('Fetching current products...');

async function cleanupDatabase() {
  try {
    // Get all products
    const response = await fetch(API_ENDPOINT);
    const data = await response.json();
    const products = data.products || [];

    console.log(`Found ${products.length} total products`);

    // Identify products to keep (only those with real base64 images)
    const keepProducts = products.filter(p => {
      const img = p.main_image_url || '';
      const hasRealImage = img.startsWith('data:');
      const isRealProduct = [
        'Nutrilite™ Women\'s Pack',
        'Artistry Exact Fit™ Powder Foundation',
        'eSpring™ Above the Counter Unit'
      ].some(name => p.name.includes(name.split('™')[0]));

      return hasRealImage && isRealProduct;
    });

    console.log('\nProducts to KEEP:');
    keepProducts.forEach(p => {
      console.log(`  ✓ ID ${p.id}: ${p.name}`);
    });

    const removeProducts = products.filter(p =>
      !keepProducts.some(keep => keep.id === p.id)
    );

    console.log(`\nProducts to REMOVE: ${removeProducts.length}`);
    removeProducts.forEach(p => {
      console.log(`  ✗ ID ${p.id}: ${p.name}`);
    });

    console.log('\n⚠️  Database cleanup would require direct D1 access.');
    console.log('This script identified products for cleanup - manual removal needed.');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

cleanupDatabase();