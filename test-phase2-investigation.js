#!/usr/bin/env node

/**
 * Phase 2 Investigation: Test real campaign generation with enhanced logging
 */

const DEPLOYMENT_URL = 'https://712879d3.amway-image-generator.pages.dev';
const PRODUCT_URL = 'https://www.amway.com/en_US/p/326782';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRealGenerationWithLogging() {
  try {
    log('\n🔬 PHASE 2: Testing Real Campaign Generation with Enhanced Logging', 'bold');
    log('='.repeat(80), 'bold');

    // Step 1: Scrape product
    log('\n1️⃣ Scraping product...', 'cyan');
    const scrapeResponse = await fetch(`${DEPLOYMENT_URL}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productUrl: PRODUCT_URL })
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Scraping failed: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json();
    log(`✅ Product: ${scrapeData.product.name}`, 'green');
    log(`   ID: ${scrapeData.product.id}`, 'green');

    // Step 2: Trigger real generation (this will now log detailed info)
    log('\n2️⃣ Triggering REAL campaign generation...', 'cyan');
    log('   This will now log detailed prompt and error information!', 'yellow');

    const preferences = {
      campaign_type: 'product_focus',
      brand_style: 'professional',
      color_scheme: 'amway_brand',
      text_overlay: 'minimal',
      campaign_size: 5,
      image_formats: ['instagram_post']
    };

    const startTime = Date.now();
    const generateResponse = await fetch(`${DEPLOYMENT_URL}/api/campaign/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Phase2-Debug': 'true'
      },
      body: JSON.stringify({
        productId: scrapeData.product.id,
        preferences
      })
    });

    const responseTime = Date.now() - startTime;
    const generateData = await generateResponse.json();

    log(`\n📊 Generation Results:`, 'magenta');
    log(`   Status: ${generateResponse.status}`, generateResponse.ok ? 'green' : 'red');
    log(`   Response Time: ${responseTime}ms`, 'blue');

    if (generateResponse.ok) {
      log('\n🎉 SUCCESS! Campaign generated successfully!', 'green');
      log(`   Campaign ID: ${generateData.campaignId}`, 'green');
      log(`   Images generated: ${generateData.totalImages}`, 'green');
      log(`   Generation time: ${generateData.generationTimeSeconds}s`, 'green');

      return { success: true, data: generateData };
    } else {
      log('\n❌ GENERATION FAILED', 'red');
      log('Response:', 'red');
      console.log(JSON.stringify(generateData, null, 2));

      return { success: false, data: generateData };
    }

  } catch (error) {
    log(`\n💥 Test failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function explainLoggingStrategy() {
  log('\n📋 Enhanced Logging Strategy:', 'cyan');
  log('='.repeat(50), 'cyan');

  log('\nThe campaign generation endpoint now logs:', 'blue');
  log('  ✅ [PHASE2_DEBUG] Full prompts sent to AI', 'green');
  log('  ✅ [PHASE2_DEBUG] AI input parameters', 'green');
  log('  ✅ [PHASE2_DEBUG] Detailed error information', 'green');
  log('  ✅ [PHASE2_DEBUG] NSFW error detection', 'green');
  log('  ✅ [PHASE2_DEBUG] Exact failure points', 'green');

  log('\nTo view these logs:', 'yellow');
  log('  1. Check the Cloudflare dashboard after running this test', 'yellow');
  log('  2. Look for [PHASE2_DEBUG] prefixed messages', 'yellow');
  log('  3. The logs will show exact prompts and error details', 'yellow');

  log('\nIf generation fails, we\'ll see:', 'magenta');
  log('  • The exact prompt that triggered the error', 'magenta');
  log('  • Whether it\'s an NSFW error (code 3030)', 'magenta');
  log('  • Which specific prompt in the batch failed', 'magenta');
  log('  • The full error context and stack trace', 'magenta');
}

async function main() {
  log('🎯 PHASE 2 INVESTIGATION: Enhanced Campaign Generation Logging', 'bold');
  log('='.repeat(80), 'bold');
  log(`Testing: ${DEPLOYMENT_URL}`, 'blue');
  log(`Product: ${PRODUCT_URL}`, 'blue');

  await explainLoggingStrategy();

  log('\n⏳ Running test in 3 seconds...', 'yellow');
  await delay(3000);

  const result = await testRealGenerationWithLogging();

  log('\n' + '='.repeat(80), 'bold');
  log('📝 PHASE 2 SUMMARY', 'bold');
  log('='.repeat(80), 'bold');

  if (result.success) {
    log('\n✅ BREAKTHROUGH: Campaign generation is now working!', 'green');
    log('   The issue may have been resolved by our previous changes.', 'green');
  } else {
    log('\n🔍 INVESTIGATION DATA CAPTURED', 'yellow');
    log('   Enhanced logs are now available in Cloudflare dashboard.', 'yellow');
    log('   Look for [PHASE2_DEBUG] messages to see:', 'yellow');
    log('   • Exact prompts sent to AI', 'yellow');
    log('   • Specific error details', 'yellow');
    log('   • NSFW trigger identification', 'yellow');
  }

  log('\n🔧 Next Steps:', 'cyan');
  if (result.success) {
    log('   1. Verify the solution works consistently', 'cyan');
    log('   2. Remove debug logging after confirmation', 'cyan');
    log('   3. Test with different products to ensure stability', 'cyan');
  } else {
    log('   1. Review the [PHASE2_DEBUG] logs in Cloudflare dashboard', 'cyan');
    log('   2. Identify the exact prompt causing NSFW errors', 'cyan');
    log('   3. Implement targeted fixes based on the logged data', 'cyan');
    log('   4. Test the fixes with the same prompts', 'cyan');
  }

  log('\n📊 Dashboard Access:', 'blue');
  log('   https://dash.cloudflare.com/pages/view/amway-image-generator', 'blue');
  log('   Look for logs from the last few minutes with [PHASE2_DEBUG] prefix', 'blue');
}

main().catch(console.error);