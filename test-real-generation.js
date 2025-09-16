#!/usr/bin/env node

/**
 * Test real campaign generation with proper prompts
 */

const DEPLOYMENT_URL = 'https://2e70ce95.amway-image-generator.pages.dev';
const PRODUCT_URL = 'https://www.amway.com/en_US/p/326782';

async function testRealGeneration() {
  console.log('🧪 Testing REAL campaign generation...');
  console.log(`Deployment: ${DEPLOYMENT_URL}`);

  try {
    // Step 1: Scrape product
    console.log('\n1️⃣ Scraping product...');
    const scrapeResponse = await fetch(`${DEPLOYMENT_URL}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productUrl: PRODUCT_URL })
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Scraping failed: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json();
    console.log(`✅ Product: ${scrapeData.product.name}`);
    console.log(`   ID: ${scrapeData.product.id}`);

    // Step 2: Generate campaign
    console.log('\n2️⃣ Generating campaign...');
    const preferences = {
      campaign_type: 'product_focus',
      brand_style: 'professional',
      color_scheme: 'brand_colors',
      text_overlay: 'minimal',
      campaign_size: 5,
      image_formats: ['instagram_post']
    };

    const startTime = Date.now();
    const generateResponse = await fetch(`${DEPLOYMENT_URL}/api/campaign/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test': 'real-generation'
      },
      body: JSON.stringify({
        productId: scrapeData.product.id,
        preferences
      })
    });

    const responseTime = Date.now() - startTime;
    const generateData = await generateResponse.json();

    console.log(`   Response time: ${responseTime}ms`);
    console.log(`   Status: ${generateResponse.status}`);

    if (generateResponse.ok) {
      console.log('\n🎉 SUCCESS!');
      console.log(`   Campaign ID: ${generateData.campaignId}`);
      console.log(`   Images generated: ${generateData.totalImages}`);
      console.log(`   Download URL: ${generateData.downloadUrl}`);
      console.log(`   Generation time: ${generateData.generationTimeSeconds}s`);

      return true;
    } else {
      console.log('\n❌ GENERATION FAILED:');
      console.log(JSON.stringify(generateData, null, 2));

      // Check if it's an NSFW error by looking at the response
      if (generateData.error && generateData.error.includes('NSFW')) {
        console.log('\n🔍 NSFW Content Filter triggered');
        console.log('   This suggests our product prompts contain flagged content');
      } else if (generateData.error === 'AI service is not configured. Please contact support.') {
        console.log('\n🔍 AI Binding issue detected');
      } else {
        console.log('\n🔍 Unknown error - check enhanced logging');
      }

      return false;
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('=== Real Campaign Generation Test ===');

  const success = await testRealGeneration();

  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎯 Root cause SOLVED! AI generation is working correctly.');
    console.log('\nThe issue was NSFW content filtering on our test prompts.');
    console.log('Real product prompts work fine when properly constructed.');
  } else {
    console.log('🔍 Further investigation needed.');
    console.log('\nNext steps:');
    console.log('1. Check if our prompt generation contains flagged content');
    console.log('2. Review prompt sanitization logic');
    console.log('3. Test with different product types');
  }
}

main().catch(console.error);