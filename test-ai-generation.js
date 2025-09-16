#!/usr/bin/env node

/**
 * AI Generation Test Script
 * Tests the complete campaign generation workflow on Wrangler Preview environment
 */

async function testAIGeneration() {
  const BASE_URL = 'http://localhost:8788';

  console.log('🧪 Starting AI Generation Test...\n');

  try {
    // Step 1: Test product scraping first
    console.log('📦 Step 1: Testing product scraping...');
    const scrapeResponse = await fetch(`${BASE_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productUrl: 'https://www.amway.com/en_US/p/326782'
      })
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Scraping failed: ${scrapeResponse.status} ${scrapeResponse.statusText}`);
    }

    const productData = await scrapeResponse.json();
    console.log('✅ Product scraping successful');
    console.log(`   Product: ${productData.product?.name || 'Unknown'}`);
    console.log(`   Product ID: ${productData.product?.id}\n`);

    if (!productData.product?.id) {
      throw new Error('Product ID not found in scrape response');
    }

    // Step 2: Test AI generation
    console.log('🎨 Step 2: Testing AI campaign generation...');
    const generateResponse = await fetch(`${BASE_URL}/api/campaign/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: productData.product.id,
        preferences: {
          campaign_type: 'product_focus',
          brand_style: 'professional',
          color_scheme: 'amway_brand',
          text_overlay: 'moderate',
          campaign_size: 5,
          image_formats: ['instagram_post', 'facebook_cover']
        }
      })
    });

    const generateResult = await generateResponse.json();

    if (!generateResponse.ok) {
      console.log('❌ AI generation failed:');
      console.log(`   Status: ${generateResponse.status}`);
      console.log(`   Error: ${generateResult.error || 'Unknown error'}`);
      console.log('\n🔍 Debugging information:');
      console.log(`   Response body:`, generateResult);

      // Check if this is the expected AI configuration issue
      if (generateResult.error?.includes('AI image generation failed')) {
        console.log('\n💡 This appears to be the AI service configuration issue.');
        console.log('   The Wrangler preview environment should have AI bindings available.');
        console.log('   This might be due to:');
        console.log('   1. AI service not properly configured in wrangler.toml');
        console.log('   2. Missing Cloudflare account permissions');
        console.log('   3. Development environment limitations');
      }

      return false;
    }

    console.log('✅ AI generation successful!');
    console.log(`   Campaign ID: ${generateResult.campaignId}`);
    console.log(`   Images generated: ${generateResult.totalImages}`);
    console.log(`   Download URL: ${generateResult.downloadUrl}`);
    console.log(`   Generation time: ${generateResult.generationTimeSeconds}s\n`);

    // Step 3: Test download functionality
    console.log('📥 Step 3: Testing campaign download...');
    const downloadResponse = await fetch(`${BASE_URL}${generateResult.downloadUrl}`);

    if (!downloadResponse.ok) {
      console.log(`⚠️  Download test failed: ${downloadResponse.status}`);
    } else {
      const contentLength = downloadResponse.headers.get('content-length');
      console.log('✅ Download endpoint accessible');
      console.log(`   Content-Length: ${contentLength || 'Unknown'} bytes\n`);
    }

    console.log('🎉 Complete workflow test successful!');
    return true;

  } catch (error) {
    console.log('❌ Test failed with error:');
    console.log(`   ${error.message}\n`);

    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Connection refused - is the Wrangler preview server running?');
      console.log('   Expected URL: http://localhost:8788');
      console.log('   Run: npm run preview');
    }

    return false;
  }
}

// Wait for server to be ready
async function waitForServer(url, maxAttempts = 30) {
  console.log(`⏳ Waiting for server at ${url}...`);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        console.log('✅ Server is ready\n');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    process.stdout.write('.');
  }

  console.log('\n❌ Server failed to start within expected time');
  return false;
}

// Main execution
async function main() {
  const serverReady = await waitForServer('http://localhost:8788');

  if (!serverReady) {
    console.log('❌ Cannot proceed without server');
    process.exit(1);
  }

  const success = await testAIGeneration();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);