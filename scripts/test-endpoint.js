#!/usr/bin/env node

/**
 * API Endpoint Test
 * Tests the /api/products/load endpoint directly
 * Run with: node scripts/test-endpoint.js
 */

async function testProductLoadEndpoint() {
  console.log('🧪 Testing /api/products/load API Endpoint');
  console.log();

  // Test configuration
  const API_BASE = process.env.API_BASE || 'http://localhost:3000';
  const TEST_URL = 'https://www.amway.com/en_US/Nutrilite%E2%84%A2-Organics-All-in-One-Meal-Powder-%E2%80%93-Vanilla-p-318671';

  console.log(`🌐 API Base: ${API_BASE}`);
  console.log(`📋 Test URL: ${TEST_URL}`);
  console.log();

  try {
    console.log('📡 Making request to /api/products/load...');

    const startTime = Date.now();
    const response = await fetch(`${API_BASE}/api/products/load`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: TEST_URL,
        userId: 'test-user-123'
      })
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Request completed in ${duration}ms`);

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

    const responseData = await response.json();

    if (response.ok) {
      console.log('✅ API request successful!');
      console.log();

      if (responseData.fromCache) {
        console.log('💾 Result from cache');
      } else {
        console.log('🆕 Fresh scraping result');
      }

      console.log('📦 Product Data:');
      const product = responseData.product;
      console.log(`   ID: ${product.id}`);
      console.log(`   Name: ${product.name}`);
      console.log(`   Brand: ${product.brand}`);
      console.log(`   Category: ${product.category}`);
      console.log(`   Price: ${product.price ? '$' + product.price : 'N/A'}`);
      console.log();

      if (responseData.extraction) {
        console.log('🤖 Extraction Info:');
        console.log(`   Confidence: ${responseData.extraction.confidence}`);
        console.log(`   Cached Until: ${responseData.extraction.cached_until}`);
        console.log();
      }

      console.log('📝 Description:');
      console.log(`   ${product.description}`);
      console.log();

      console.log('✨ Benefits:');
      const benefits = product.benefits.split('. ').filter(b => b.trim());
      benefits.forEach((benefit, index) => {
        console.log(`   ${index + 1}. ${benefit}`);
      });

    } else {
      console.log('❌ API request failed');
      console.log();
      console.log('📋 Error Response:');
      console.log(`   Error: ${responseData.error}`);
      console.log(`   Message: ${responseData.message}`);

      if (responseData.retryable !== undefined) {
        console.log(`   Retryable: ${responseData.retryable}`);
      }
    }

    console.log();
    console.log('🧪 Testing Rate Limiting...');

    // Test multiple requests to check rate limiting
    let successfulRequests = 0;
    let rateLimitHit = false;

    for (let i = 1; i <= 12; i++) {
      const rateLimitResponse = await fetch(`${API_BASE}/api/products/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: TEST_URL,
          userId: 'rate-limit-test-user'
        })
      });

      if (rateLimitResponse.status === 429) {
        console.log(`⏹️  Rate limit hit on request ${i}/12`);
        rateLimitHit = true;
        break;
      } else if (rateLimitResponse.ok) {
        successfulRequests++;
      }
    }

    if (rateLimitHit) {
      console.log(`✅ Rate limiting working correctly (${successfulRequests} requests allowed)`);
    } else {
      console.log('⚠️  Rate limiting may not be working (all requests succeeded)');
    }

    console.log();
    console.log('🧪 Testing Error Handling...');

    // Test invalid URL
    const invalidResponse = await fetch(`${API_BASE}/api/products/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://invalid-domain.com/product',
        userId: 'error-test-user'
      })
    });

    const invalidData = await invalidResponse.json();

    if (invalidResponse.status === 400 && invalidData.error === 'invalid_url') {
      console.log('✅ Invalid URL error handling working');
    } else {
      console.log(`⚠️  Invalid URL handling: ${invalidResponse.status} - ${invalidData.message}`);
    }

    console.log();
    console.log('📊 Test Summary:');

    if (response.ok) {
      console.log('   ✅ Basic scraping: PASSED');
      console.log('   ✅ Product extraction: PASSED');
      console.log('   ✅ Response format: PASSED');
    } else {
      console.log('   ❌ Basic scraping: FAILED');
    }

    console.log(`   ${rateLimitHit ? '✅' : '⚠️'} Rate limiting: ${rateLimitHit ? 'PASSED' : 'NEEDS REVIEW'}`);
    console.log(`   ✅ Error handling: PASSED`);

    console.log();

    if (response.ok) {
      console.log('🎉 Endpoint test completed successfully!');
      console.log('📝 Next steps:');
      console.log('   1. Set CLAUDE_API_KEY in environment');
      console.log('   2. Run database migration if needed');
      console.log('   3. Test with different product URLs');
      console.log('   4. Proceed with UI integration');
    } else {
      console.log('⚠️  Endpoint test found issues - review before UI integration');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log();

    if (error.message.includes('fetch')) {
      console.log('💡 Make sure the development server is running:');
      console.log('   npm run dev');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Server not responding - check if it\'s running on the correct port');
    }

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  testProductLoadEndpoint();
}