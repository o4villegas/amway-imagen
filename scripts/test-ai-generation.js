#!/usr/bin/env node

/**
 * Manual AI Generation Test Script
 *
 * This script tests the AI generation endpoint directly
 * to verify FLUX-1-schnell is working properly.
 *
 * Usage:
 *   node scripts/test-ai-generation.js [environment]
 *
 * Environments:
 *   local    - Test against localhost:8788 (wrangler dev)
 *   staging  - Test against staging URL
 *   prod     - Test against production URL
 */

const environments = {
  local: 'http://localhost:8788',
  staging: 'https://your-staging-url.pages.dev',
  prod: 'https://your-production-url.pages.dev'
};

const environment = process.argv[2] || 'local';
const baseUrl = environments[environment];

if (!baseUrl) {
  console.error('❌ Invalid environment. Use: local, staging, or prod');
  process.exit(1);
}

console.log(`🧪 Testing AI Generation against: ${baseUrl}`);
console.log('⚠️  WARNING: This will incur Cloudflare AI charges in production!');

async function testAIGeneration() {
  try {
    console.log('\n📝 Step 1: Testing product search...');

    // Test product search first
    const productResponse = await fetch(`${baseUrl}/api/products/search?limit=1`);
    if (!productResponse.ok) {
      throw new Error(`Product search failed: ${productResponse.status}`);
    }

    const productData = await productResponse.json();
    if (!productData.products || productData.products.length === 0) {
      throw new Error('No products found');
    }

    const product = productData.products[0];
    console.log(`✅ Found product: ${product.name} (ID: ${product.id})`);

    console.log('\n🎨 Step 2: Testing AI generation...');

    // Test AI generation
    const campaignData = {
      productId: product.id,
      preferences: {
        campaign_type: 'product_focus',
        brand_style: 'professional',
        color_scheme: 'amway_brand',
        text_overlay: 'moderate',
        campaign_size: 1, // Single image for testing
        image_formats: ['instagram_post']
      }
    };

    console.log('📤 Sending generation request...');
    console.log('📊 Campaign config:', JSON.stringify(campaignData, null, 2));

    const startTime = Date.now();
    const generationResponse = await fetch(`${baseUrl}/api/campaign/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaignData)
    });

    const generationTime = (Date.now() - startTime) / 1000;
    console.log(`⏱️  Request completed in ${generationTime}s`);

    if (!generationResponse.ok) {
      const errorData = await generationResponse.json().catch(() => ({}));

      if (generationResponse.status === 429) {
        console.log('🚧 Rate limited - this is expected behavior');
        console.log(`⏳ Retry after: ${generationResponse.headers.get('retry-after')} seconds`);
        return;
      }

      throw new Error(`Generation failed: ${generationResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await generationResponse.json();
    console.log('\n🎉 AI Generation Success!');
    console.log('📊 Results:');
    console.log(`   Campaign ID: ${result.campaignId}`);
    console.log(`   Total Images: ${result.totalImages}`);
    console.log(`   Successful Images: ${result.successfulImages}`);
    console.log(`   Generation Time: ${result.generationTimeSeconds}s`);
    console.log(`   Download URL: ${result.downloadUrl}`);

    // Test image retrieval
    console.log('\n🖼️  Step 3: Testing image retrieval...');

    const imagesResponse = await fetch(`${baseUrl}/api/campaign/${result.campaignId}/images`);
    if (imagesResponse.ok) {
      const imagesData = await imagesResponse.json();
      console.log(`✅ Retrieved ${imagesData.images?.length || 0} images`);

      if (imagesData.images && imagesData.images.length > 0) {
        const image = imagesData.images[0];
        console.log(`   Format: ${image.format}`);
        console.log(`   Dimensions: ${image.width}x${image.height}`);
        console.log(`   R2 Path: ${image.r2_path}`);
      }
    }

    // Test download
    console.log('\n📥 Step 4: Testing download...');

    const downloadResponse = await fetch(`${baseUrl}${result.downloadUrl}`);
    if (downloadResponse.ok) {
      const contentType = downloadResponse.headers.get('content-type');
      const contentLength = downloadResponse.headers.get('content-length');
      console.log(`✅ Download available`);
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Size: ${contentLength} bytes`);
    } else {
      console.log(`⚠️  Download not ready: ${downloadResponse.status}`);
    }

    console.log('\n🎉 All tests passed! AI generation is working properly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);

    if (error.message.includes('AI binding not available')) {
      console.log('\n💡 This error suggests you\'re testing against a local environment');
      console.log('   without Cloudflare AI binding. Try testing against staging/prod:');
      console.log('   node scripts/test-ai-generation.js staging');
    }

    if (error.message.includes('rate')) {
      console.log('\n💡 Rate limiting is active - this is expected behavior');
      console.log('   Try again after the rate limit window expires');
    }

    process.exit(1);
  }
}

async function testHealthCheck() {
  try {
    console.log('\n🏥 Testing health check...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);

    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health check passed');
      console.log(`   Status: ${health.status}`);
      console.log(`   AI Service: ${health.services?.ai ? '✅' : '❌'}`);
      console.log(`   Database: ${health.services?.database ? '✅' : '❌'}`);
      console.log(`   Storage: ${health.services?.storage ? '✅' : '❌'}`);
    } else {
      console.log('⚠️  Health check failed');
    }
  } catch (error) {
    console.log('⚠️  Health check error:', error.message);
  }
}

// Run tests
(async () => {
  await testHealthCheck();
  await testAIGeneration();
})();