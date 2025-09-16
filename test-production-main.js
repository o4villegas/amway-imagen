#!/usr/bin/env node

/**
 * Test script to validate AI generation on main production deployment
 */

const MAIN_URL = 'https://amway-image-generator.pages.dev';
const PRODUCT_URL = 'https://www.amway.com/en_US/p/326782';

async function testScraping() {
  console.log('Testing product scraping on main deployment...');

  try {
    const response = await fetch(`${MAIN_URL}/api/scrape`, {
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
  console.log('\nTesting AI generation on main deployment...');

  const preferences = {
    campaign_type: 'product_focus',
    brand_style: 'professional',
    color_scheme: 'brand_colors',
    text_overlay: 'minimal',
    campaign_size: 5,
    image_formats: ['instagram_post']
  };

  try {
    const response = await fetch(`${MAIN_URL}/api/campaign/generate`, {
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

async function main() {
  console.log('=== Main Production AI Generation Test ===');
  console.log(`Testing deployment: ${MAIN_URL}`);
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
    console.log('\n✅ All tests passed! AI generation is working on main deployment.');
  } else {
    console.log('\n⚠️ Generation failed on main deployment.');
    console.log('\nThis indicates the AI binding issue is present in production.');
    console.log('\nRoot Cause Analysis:');
    console.log('1. The AI binding is not properly configured in Cloudflare Pages');
    console.log('2. Our observability logging should now capture detailed error information');
    console.log('3. Check the Cloudflare dashboard for AI Worker configuration');
  }
}

// Run the test
main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});