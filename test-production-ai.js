#!/usr/bin/env node

/**
 * Test script to validate AI generation in production
 * This will test the complete flow and capture detailed error logs
 */

const TEST_URL = 'https://98e2c277.amway-image-generator.pages.dev';
const PRODUCT_URL = 'https://www.amway.com/en_US/p/326782';

async function testScraping() {
  console.log('Testing product scraping...');

  try {
    const response = await fetch(`${TEST_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productUrl: PRODUCT_URL })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Scraping failed:', response.status, data);
      return null;
    }

    console.log('✓ Scraping successful');
    console.log('Product:', data.product.name);
    return data.product.id;
  } catch (error) {
    console.error('Scraping error:', error);
    return null;
  }
}

async function testGeneration(productId) {
  console.log('\nTesting AI generation...');

  const preferences = {
    campaign_type: 'product_focus',
    brand_style: 'professional',
    color_scheme: 'brand_colors',
    text_overlay: 'minimal',
    campaign_size: 5,
    image_formats: ['instagram_post']
  };

  try {
    const response = await fetch(`${TEST_URL}/api/campaign/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId, preferences })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Generation failed:');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));

      // Check response headers for additional info
      console.error('\nResponse headers:');
      response.headers.forEach((value, key) => {
        console.error(`  ${key}: ${value}`);
      });

      return false;
    }

    console.log('✓ Generation successful');
    console.log('Campaign ID:', data.campaignId);
    console.log('Images generated:', data.totalImages);
    console.log('Download URL:', data.downloadUrl);
    return true;
  } catch (error) {
    console.error('\n❌ Generation error:', error);
    return false;
  }
}

async function checkLogs() {
  console.log('\n=== Checking Cloudflare Logs ===');
  console.log('To view real-time logs, run:');
  console.log('wrangler pages deployment tail --project-name amway-image-generator');
  console.log('\nOr visit: https://dash.cloudflare.com/ba25cc127ae80aeb6c869b4dba8088c3/pages/view/amway-image-generator/deployments');
}

async function main() {
  console.log('=== Production AI Generation Test ===');
  console.log(`Testing deployment: ${TEST_URL}`);
  console.log(`Product URL: ${PRODUCT_URL}`);
  console.log('');

  // Step 1: Test scraping
  const productId = await testScraping();
  if (!productId) {
    console.error('\n❌ Test failed at scraping step');
    process.exit(1);
  }

  // Step 2: Test generation
  const success = await testGeneration(productId);

  if (success) {
    console.log('\n✅ All tests passed! AI generation is working.');
  } else {
    console.log('\n⚠️ Generation failed. Check the error details above.');
    await checkLogs();
  }
}

// Run the test
main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});