#!/usr/bin/env node

/**
 * Test to check what bindings are actually available in production
 */

const TEST_URL = 'https://c7f6e263.amway-image-generator.pages.dev';

async function testBindings() {
  console.log('🔍 Testing binding availability...');

  try {
    // Test if we can reach the scrape endpoint which should work
    const scrapeResponse = await fetch(`${TEST_URL}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productUrl: 'https://www.amway.com/en_US/p/326782' })
    });

    console.log(`Scrape endpoint status: ${scrapeResponse.status}`);

    if (scrapeResponse.ok) {
      const scrapeData = await scrapeResponse.json();
      console.log('✅ Scrape endpoint working');
      console.log(`Product extracted: ${scrapeData.product.name}`);

      // Now test the generate endpoint to see what specific error we get
      console.log('\n🎯 Testing generate endpoint for binding info...');

      const generateResponse = await fetch(`${TEST_URL}/api/campaign/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: scrapeData.product.id,
          preferences: {
            campaign_type: 'product_focus',
            brand_style: 'professional',
            color_scheme: 'brand_colors',
            text_overlay: 'minimal',
            campaign_size: 5,
            image_formats: ['instagram_post']
          }
        })
      });

      console.log(`Generate endpoint status: ${generateResponse.status}`);
      const generateData = await generateResponse.json();

      if (generateData.error === 'AI service is not configured. Please contact support.') {
        console.log('🔍 CONFIRMED: AI binding is not available');
        console.log('   Our defensive check is working correctly');
        console.log('   The issue is definitely the AI binding configuration');
      } else {
        console.log('Response:', JSON.stringify(generateData, null, 2));
      }

    } else {
      const errorData = await scrapeResponse.json();
      console.log('❌ Scrape endpoint failed:', errorData);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

async function checkWorkerInfo() {
  console.log('\n📋 Checking worker deployment info...');

  try {
    // Test a basic GET on the homepage to see if Functions are working at all
    const homeResponse = await fetch(`${TEST_URL}/`);
    console.log(`Homepage status: ${homeResponse.status}`);

    // Check if we can access any API endpoint
    const endpoints = ['/api/scrape', '/api/campaign/generate'];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${TEST_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
        console.log(`${endpoint}: ${response.status}`);
      } catch (err) {
        console.log(`${endpoint}: ERROR - ${err.message}`);
      }
    }

  } catch (error) {
    console.error('Worker info check failed:', error);
  }
}

async function main() {
  console.log('=== Binding Test Results ===');
  console.log(`Testing: ${TEST_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  await checkWorkerInfo();
  await testBindings();

  console.log('\n=== Summary ===');
  console.log('If the tests show:');
  console.log('- Scrape endpoint returns 500: Issue with Pages Functions deployment');
  console.log('- Scrape works, Generate fails with AI error: AI binding not configured');
  console.log('- Both fail: General deployment issue');
}

main().catch(console.error);