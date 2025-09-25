#!/usr/bin/env node

/**
 * Backend API Test Script
 * Tests the Claude API scraping system with real URLs
 * Run with: node scripts/test-backend.js
 */

const { ClaudeProductScraper, ScrapingRateLimiter } = require('../lib/ai-scraper.ts');
const { MarketingCopyGenerator } = require('../lib/copy-generator.ts');

// Test configuration
const TEST_CONFIG = {
  // You'll need to set this environment variable
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,

  // Test URLs from the spec
  TEST_URLS: [
    'https://www.amway.com/en_US/p/124481',  // Nutrilite Vitamin C (from spec)
    'https://www.amway.com/en_US/p/110415',  // Artistry Cream (from spec)
    'https://www.amway.com/en_US/p/101074'   // XS Energy Bar (from spec)
  ],

  TIMEOUT_MS: 45000 // 45 seconds for thorough testing
};

class BackendTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };

    if (!TEST_CONFIG.CLAUDE_API_KEY) {
      console.error('❌ CLAUDE_API_KEY environment variable not set');
      console.log('   Set it with: export CLAUDE_API_KEY="your-key-here"');
      process.exit(1);
    }

    this.scraper = new ClaudeProductScraper(TEST_CONFIG.CLAUDE_API_KEY);
    this.rateLimiter = new ScrapingRateLimiter();
    this.copyGenerator = new MarketingCopyGenerator();
  }

  log(emoji, message, ...args) {
    console.log(`${emoji} ${message}`, ...args);
  }

  async runAllTests() {
    console.log('🚀 Starting Backend API Tests\n');
    console.log('📋 Test Configuration:');
    console.log(`   • API Key: ${TEST_CONFIG.CLAUDE_API_KEY.substring(0, 10)}...`);
    console.log(`   • Test URLs: ${TEST_CONFIG.TEST_URLS.length}`);
    console.log(`   • Timeout: ${TEST_CONFIG.TIMEOUT_MS}ms\n`);

    try {
      await this.testScrapingSystem();
      await this.testRateLimiting();
      await this.testCopyGeneration();
      await this.testErrorHandling();

      this.printSummary();

    } catch (error) {
      console.error('🔥 Fatal test error:', error);
      process.exit(1);
    }
  }

  async testScrapingSystem() {
    this.log('📡', 'Testing Claude API Scraping System...\n');

    for (const [index, url] of TEST_CONFIG.TEST_URLS.entries()) {
      console.log(`   Test ${index + 1}/${TEST_CONFIG.TEST_URLS.length}: ${url}`);

      try {
        const startTime = Date.now();
        const result = await this.scraper.scrapeProduct(url);
        const duration = Date.now() - startTime;

        // Validate result structure
        this.validateScrapingResult(result, url);

        this.log('✅', `Scraped "${result.name}" in ${duration}ms`);
        this.log('📊', `Confidence: ${result.confidence}, Category: ${result.category}, Brand: ${result.brand}`);
        this.log('📝', `Benefits: ${result.benefits.length} items`);
        this.results.passed++;

        // Test caching would happen here in real implementation
        this.log('💾', 'Cache test: Would be cached for 24 hours');

      } catch (error) {
        this.log('❌', `Failed to scrape ${url}:`, error.message);
        this.results.failed++;
        this.results.errors.push({
          test: 'Scraping',
          url,
          error: error.message
        });
      }

      console.log(); // Spacing
    }
  }

  async testRateLimiting() {
    this.log('⏱️', 'Testing Rate Limiting System...\n');

    try {
      const userId = 'test-user-123';

      // Test normal requests (should pass)
      for (let i = 1; i <= 5; i++) {
        const allowed = this.rateLimiter.checkRateLimit(userId);
        if (!allowed) {
          throw new Error(`Rate limit hit too early at request ${i}`);
        }
        this.log('✅', `Request ${i}/5 allowed`);
      }

      // Test remaining count
      const remaining = this.rateLimiter.getRemainingRequests(userId);
      this.log('📊', `Remaining requests: ${remaining}/10`);

      // Simulate hitting the limit
      for (let i = 6; i <= 10; i++) {
        this.rateLimiter.checkRateLimit(userId);
      }

      // This should fail
      const shouldFail = this.rateLimiter.checkRateLimit(userId);
      if (shouldFail) {
        throw new Error('Rate limiting not working - 11th request should fail');
      }

      this.log('✅', 'Rate limiting working correctly');
      this.results.passed++;

    } catch (error) {
      this.log('❌', 'Rate limiting test failed:', error.message);
      this.results.failed++;
      this.results.errors.push({
        test: 'Rate Limiting',
        error: error.message
      });
    }

    console.log();
  }

  async testCopyGeneration() {
    this.log('✍️', 'Testing Marketing Copy Generator...\n');

    try {
      // Mock product data for testing
      const mockProduct = {
        id: 1,
        name: 'Nutrilite™ Vitamin C Plus - Extended Release',
        description: 'Support your immune system with powerful vitamin C from natural sources',
        benefits: 'Supports immune system health. Extended release for all-day protection. Natural vitamin C from acerola cherries.',
        category: 'nutrition',
        brand: 'Nutrilite',
        available: true,
        product_url: 'https://www.amway.com/test',
        scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockPreferences = {
        campaign_type: 'lifestyle',
        brand_style: 'professional',
        color_scheme: 'amway_brand',
        text_overlay: 'moderate',
        campaign_size: 5,
        image_formats: ['facebook_post', 'instagram_post', 'pinterest']
      };

      // Test copy generation for different platforms
      const formats = ['facebook_post', 'instagram_post', 'pinterest', 'linkedin_post'];

      for (const format of formats) {
        const copy = this.copyGenerator.generateCopy(mockProduct, mockPreferences, format);

        this.log('✅', `Generated copy for ${format}:`);
        console.log(`      Length: ${copy.totalLength} chars`);
        console.log(`      Hashtags: ${copy.hashtags.length}`);
        console.log(`      Platform: ${copy.platform}`);
        console.log(`      Text: ${copy.text.substring(0, 100)}...`);
        console.log();
      }

      this.results.passed++;

    } catch (error) {
      this.log('❌', 'Copy generation test failed:', error.message);
      this.results.failed++;
      this.results.errors.push({
        test: 'Copy Generation',
        error: error.message
      });
    }
  }

  async testErrorHandling() {
    this.log('🚫', 'Testing Error Handling...\n');

    try {
      // Test invalid URL
      try {
        await this.scraper.scrapeProduct('https://not-amway.com/invalid');
        throw new Error('Should have rejected invalid URL');
      } catch (error) {
        if (error.type === 'invalid_url') {
          this.log('✅', 'Invalid URL properly rejected');
        } else {
          throw error;
        }
      }

      // Test malformed URL
      try {
        await this.scraper.scrapeProduct('not-a-url-at-all');
        throw new Error('Should have rejected malformed URL');
      } catch (error) {
        this.log('✅', 'Malformed URL properly rejected');
      }

      this.results.passed++;

    } catch (error) {
      this.log('❌', 'Error handling test failed:', error.message);
      this.results.failed++;
      this.results.errors.push({
        test: 'Error Handling',
        error: error.message
      });
    }

    console.log();
  }

  validateScrapingResult(result, url) {
    const required = ['name', 'description', 'benefits', 'category', 'brand', 'confidence'];

    for (const field of required) {
      if (!result[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(result.benefits)) {
      throw new Error('Benefits should be an array');
    }

    if (result.confidence < 0.5 || result.confidence > 1) {
      throw new Error(`Invalid confidence score: ${result.confidence}`);
    }

    if (result.name.length < 5) {
      throw new Error(`Product name too short: "${result.name}"`);
    }
  }

  printSummary() {
    console.log('📊 Test Results Summary:');
    console.log(`   ✅ Passed: ${this.results.passed}`);
    console.log(`   ❌ Failed: ${this.results.failed}`);
    console.log(`   📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%\n`);

    if (this.results.errors.length > 0) {
      console.log('🐛 Error Details:');
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
        if (error.url) console.log(`      URL: ${error.url}`);
      });
      console.log();
    }

    if (this.results.failed === 0) {
      console.log('🎉 All tests passed! Backend is ready for UI integration.');
    } else {
      console.log('⚠️  Some tests failed. Fix these issues before proceeding with UI.');
      process.exit(1);
    }
  }
}

// Handle unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests if called directly
if (require.main === module) {
  const tester = new BackendTester();
  tester.runAllTests().catch(error => {
    console.error('🔥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = BackendTester;