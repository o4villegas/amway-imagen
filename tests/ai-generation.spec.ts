import { test, expect } from '@playwright/test';

test.describe('AI Generation Optimization Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to campaign creation page
    await page.goto('/campaign/new');
  });

  test('should handle AI generation failures gracefully with optimized error messages', async ({ page }) => {
    // Test the optimized error handling by attempting campaign generation
    // This will likely fail due to AI service load, but should fail faster and with better errors

    // Enter a product URL (using mock data)
    await page.fill('input[placeholder*="Enter product URL"]', 'https://www.amway.com/product/123456');
    await page.click('button:has-text("Extract Product")');

    // Wait for product extraction to complete (should work)
    await expect(page.locator('text=Configure Campaign')).toBeVisible({ timeout: 30000 });

    // Configure campaign with minimal settings to reduce AI load
    await page.selectOption('select[name="brand_style"]', 'professional');
    await page.selectOption('select[name="color_scheme"]', 'amway_brand');
    await page.selectOption('select[name="text_overlay"]', 'moderate');

    // Select only one format to minimize AI load
    await page.uncheck('input[value="instagram_post"]');
    await page.uncheck('input[value="pinterest"]');
    await page.uncheck('input[value="snapchat_ad"]');
    await page.uncheck('input[value="linkedin_post"]');
    // Keep only facebook_post checked

    const startTime = Date.now();
    await page.click('button:has-text("Generate Campaign")');

    // Should get better error message within 30 seconds (down from 60+ seconds)
    await expect(page.locator('text*="AI image generation service is currently unavailable"')).toBeVisible({
      timeout: 35000
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify the optimization: should fail faster than before (< 30 seconds vs previous 60+ seconds)
    expect(duration).toBeLessThan(30000);

    // Should show retry suggestion
    await expect(page.locator('text*="try again in a few minutes"')).toBeVisible();
  });

  test('should display campaign generation progress with optimized parameters', async ({ page }) => {
    // Mock a successful generation to test the progress display
    await page.route('/api/campaign/generate', async (route) => {
      // Simulate faster response due to optimized parameters
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          campaignId: 123,
          downloadUrl: '/api/campaign/download/test.zip',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          totalImages: 5,
          successfulImages: 5,
          requestedImages: 5,
          generationTimeSeconds: 15, // Faster than before due to optimizations
          successRate: 100,
          isPartialSuccess: false,
          failedImages: 0
        })
      });
    });

    // Set up mocks for product extraction
    await page.route('/api/products/load', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          fromCache: false,
          product: {
            id: 1,
            name: 'Test Product',
            description: 'A test product for campaign generation',
            benefits: 'Great benefits',
            category: 'nutrition',
            brand: 'Amway',
            price: 50,
            currency: 'USD',
            main_image_url: null,
            product_url: 'https://www.amway.com/product/123456'
          }
        })
      });
    });

    // Start the flow
    await page.fill('input[placeholder*="Enter product URL"]', 'https://www.amway.com/product/123456');
    await page.click('button:has-text("Extract Product")');

    await expect(page.locator('text=Configure Campaign')).toBeVisible({ timeout: 10000 });

    // Keep default settings and generate
    await page.click('button:has-text("Generate Campaign")');

    // Should show generation progress
    await expect(page.locator('text*="Generating"')).toBeVisible({ timeout: 5000 });

    // Should complete and show success message
    await expect(page.locator('text*="Campaign generated successfully"')).toBeVisible({ timeout: 10000 });

    // Should show download option
    await expect(page.locator('button:has-text("Download Campaign")')).toBeVisible();
  });

  test('should handle partial success scenarios correctly', async ({ page }) => {
    // Mock a partial success response
    await page.route('/api/campaign/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          campaignId: 124,
          downloadUrl: '/api/campaign/download/partial.zip',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          totalImages: 3, // Only 3 out of 5 generated
          successfulImages: 3,
          requestedImages: 5,
          generationTimeSeconds: 25,
          successRate: 60, // 60% success rate
          isPartialSuccess: true,
          failedImages: 2
        })
      });
    });

    await page.route('/api/products/load', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          fromCache: false,
          product: {
            id: 2,
            name: 'Another Test Product',
            description: 'Another test product',
            benefits: 'More benefits',
            category: 'beauty',
            brand: 'Amway',
            price: 75,
            currency: 'USD',
            main_image_url: null,
            product_url: 'https://www.amway.com/product/789'
          }
        })
      });
    });

    await page.fill('input[placeholder*="Enter product URL"]', 'https://www.amway.com/product/789');
    await page.click('button:has-text("Extract Product")');

    await expect(page.locator('text=Configure Campaign')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Generate Campaign")');

    // Should show partial success message
    await expect(page.locator('text*="3 out of 5 images"')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text*="60% success"')).toBeVisible();

    // Should still allow download of partial campaign
    await expect(page.locator('button:has-text("Download Campaign")')).toBeVisible();
  });

  test('should respect new rate limiting and timeout configurations', async ({ page }) => {
    // Test that multiple rapid requests show appropriate rate limiting
    await page.route('/api/campaign/generate', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Too many generation requests. Please try again later.',
          retryAfter: 300
        })
      });
    });

    await page.route('/api/products/load', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          fromCache: false,
          product: {
            id: 3,
            name: 'Rate Limit Test Product',
            description: 'For testing rate limits',
            benefits: 'Testing benefits',
            category: 'home',
            brand: 'Amway',
            price: 25,
            currency: 'USD',
            main_image_url: null,
            product_url: 'https://www.amway.com/product/rate-test'
          }
        })
      });
    });

    await page.fill('input[placeholder*="Enter product URL"]', 'https://www.amway.com/product/rate-test');
    await page.click('button:has-text("Extract Product")');

    await expect(page.locator('text=Configure Campaign')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Generate Campaign")');

    // Should show rate limit error message
    await expect(page.locator('text*="Too many generation requests"')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text*="try again later"')).toBeVisible();
  });

  test('should show improved error codes and suggestions', async ({ page }) => {
    // Test different types of AI service errors
    const errorScenarios = [
      {
        error: 'AI image generation service is currently unavailable. Please try again in a few minutes.',
        code: 'AI_SERVICE_UNAVAILABLE',
        retryAfter: 300
      },
      {
        error: 'Campaign partially failed: Generated only 1/5 images. Minimum 2 required for campaign success.',
        code: 'PARTIAL_GENERATION_FAILED',
        suggestion: 'Try reducing the campaign size or try again when AI service load is lower'
      }
    ];

    for (const scenario of errorScenarios) {
      await page.route('/api/campaign/generate', async (route) => {
        const status = scenario.code === 'AI_SERVICE_UNAVAILABLE' ? 503 : 422;
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(scenario)
        });
      });

      await page.route('/api/products/load', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            fromCache: false,
            product: {
              id: 4,
              name: 'Error Test Product',
              description: 'For testing errors',
              benefits: 'Error testing',
              category: 'nutrition',
              brand: 'Amway',
              price: 40,
              currency: 'USD',
              main_image_url: null,
              product_url: 'https://www.amway.com/product/error-test'
            }
          })
        });
      });

      await page.fill('input[placeholder*="Enter product URL"]', 'https://www.amway.com/product/error-test');
      await page.click('button:has-text("Extract Product")');

      await expect(page.locator('text=Configure Campaign')).toBeVisible({ timeout: 10000 });

      await page.click('button:has-text("Generate Campaign")');

      // Should show the specific error message
      await expect(page.locator(`text*="${scenario.error.split('.')[0]}"`)).toBeVisible({ timeout: 15000 });

      if (scenario.suggestion) {
        await expect(page.locator(`text*="${scenario.suggestion.split('.')[0]}"`)).toBeVisible();
      }

      // Reset for next iteration
      await page.reload();
    }
  });
});