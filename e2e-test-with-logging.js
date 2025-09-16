#!/usr/bin/env node

/**
 * End-to-End test with enhanced visibility
 * This will trigger our observability logging to capture detailed error information
 */

const DEPLOYMENT_URL = 'https://c7f6e263.amway-image-generator.pages.dev';
const PRODUCT_URLS = [
  'https://www.amway.com/en_US/p/326782',
  'https://www.amway.com/en_US/Nutrilite-Daily-p-100186'
];

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

async function testScraping(productUrl) {
  log(`\n📦 Testing product scraping...`, 'cyan');
  log(`   URL: ${productUrl}`, 'blue');

  try {
    const response = await fetch(`${DEPLOYMENT_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Run': 'e2e-with-logging'
      },
      body: JSON.stringify({ productUrl })
    });

    const data = await response.json();

    if (!response.ok) {
      log(`   ❌ Scraping failed: ${response.status}`, 'red');
      log(`   Error: ${JSON.stringify(data, null, 2)}`, 'red');
      return null;
    }

    log(`   ✅ Scraping successful`, 'green');
    log(`   Product: ${data.product.name}`, 'green');
    log(`   ID: ${data.product.id}`, 'green');
    return data.product.id;
  } catch (error) {
    log(`   ❌ Scraping error: ${error.message}`, 'red');
    return null;
  }
}

async function testGeneration(productId, testName) {
  log(`\n🎨 Testing AI generation (${testName})...`, 'cyan');

  const preferences = {
    campaign_type: 'product_focus',
    brand_style: 'professional',
    color_scheme: 'brand_colors',
    text_overlay: 'minimal',
    campaign_size: 5,
    image_formats: ['instagram_post']
  };

  try {
    const startTime = Date.now();
    const response = await fetch(`${DEPLOYMENT_URL}/api/campaign/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Run': 'e2e-with-logging',
        'X-Test-Name': testName
      },
      body: JSON.stringify({ productId, preferences })
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    log(`   Response time: ${responseTime}ms`, 'blue');
    log(`   Status: ${response.status}`, response.ok ? 'green' : 'red');

    if (!response.ok) {
      log(`\n   ❌ Generation failed:`, 'red');
      log(`   ${colors.bold}Error Response:${colors.reset}`, 'red');
      console.log(JSON.stringify(data, null, 2));

      // Check if it's our specific AI binding error
      if (data.error === 'AI service is not configured. Please contact support.') {
        log(`\n   ${colors.bold}🔍 DETECTED: AI Binding Not Available${colors.reset}`, 'magenta');
        log(`   This confirms the AI binding is not accessible in production.`, 'magenta');
      }

      // Log response headers for debugging
      log(`\n   Response Headers:`, 'yellow');
      response.headers.forEach((value, key) => {
        if (key.toLowerCase().includes('cf') || key.toLowerCase().includes('x-')) {
          log(`     ${key}: ${value}`, 'yellow');
        }
      });

      return false;
    }

    log(`   ✅ Generation successful`, 'green');
    log(`   Campaign ID: ${data.campaignId}`, 'green');
    log(`   Images generated: ${data.totalImages}`, 'green');
    log(`   Download URL: ${data.downloadUrl}`, 'green');
    return true;
  } catch (error) {
    log(`\n   ❌ Generation error: ${error.message}`, 'red');
    log(`   Stack: ${error.stack}`, 'red');
    return false;
  }
}

async function checkEndpointHealth() {
  log(`\n🏥 Checking endpoint health...`, 'cyan');

  const endpoints = [
    { path: '/', name: 'Homepage' },
    { path: '/campaign/new', name: 'Campaign Page' },
    { path: '/api/scrape', name: 'Scrape API', method: 'POST' },
    { path: '/api/campaign/generate', name: 'Generate API', method: 'POST' }
  ];

  for (const endpoint of endpoints) {
    try {
      const options = endpoint.method === 'POST'
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
        : {};

      const response = await fetch(`${DEPLOYMENT_URL}${endpoint.path}`, options);
      const status = response.status;
      const statusColor = status < 400 ? 'green' : status < 500 ? 'yellow' : 'red';
      log(`   ${endpoint.name}: ${status}`, statusColor);
    } catch (error) {
      log(`   ${endpoint.name}: ERROR - ${error.message}`, 'red');
    }
  }
}

async function main() {
  log(`\n${'='.repeat(60)}`, 'bold');
  log(`${colors.bold}🚀 E2E Test with Enhanced Observability Logging${colors.reset}`);
  log(`${'='.repeat(60)}`, 'bold');
  log(`\nDeployment: ${DEPLOYMENT_URL}`, 'cyan');
  log(`Timestamp: ${new Date().toISOString()}`, 'cyan');

  // Check endpoint health
  await checkEndpointHealth();

  // Test scraping and generation for multiple products
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < PRODUCT_URLS.length; i++) {
    const productUrl = PRODUCT_URLS[i];
    log(`\n${colors.bold}Test ${i + 1}/${PRODUCT_URLS.length}${colors.reset}`, 'magenta');

    const productId = await testScraping(productUrl);
    if (!productId) {
      failCount++;
      continue;
    }

    const success = await testGeneration(productId, `Test-${i + 1}`);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Summary
  log(`\n${'='.repeat(60)}`, 'bold');
  log(`${colors.bold}📊 Test Summary${colors.reset}`);
  log(`${'='.repeat(60)}`, 'bold');
  log(`✅ Successful: ${successCount}`, 'green');
  log(`❌ Failed: ${failCount}`, 'red');
  log(`📈 Success Rate: ${((successCount / PRODUCT_URLS.length) * 100).toFixed(1)}%`, 'blue');

  // Analysis
  log(`\n${colors.bold}🔍 Root Cause Analysis:${colors.reset}`);
  if (failCount > 0) {
    log(`\n1. Check Cloudflare Dashboard for detailed logs`, 'yellow');
    log(`2. Our enhanced logging should now show:`, 'yellow');
    log(`   - [CRITICAL] messages if AI binding is missing`, 'yellow');
    log(`   - [AI_GENERATION_FAILED] with detailed error info`, 'yellow');
    log(`   - [BINDINGS_CHECK] showing available bindings`, 'yellow');
    log(`\n3. Access logs at:`, 'cyan');
    log(`   https://dash.cloudflare.com/${process.env.CLOUDFLARE_ACCOUNT_ID || 'your-account'}/pages/view/amway-image-generator`, 'cyan');
  } else {
    log(`\n✨ All tests passed! AI generation is working correctly.`, 'green');
  }
}

// Run the test
main().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});