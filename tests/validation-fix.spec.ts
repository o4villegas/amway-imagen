import { test, expect } from '@playwright/test';

test.describe('Validation Fix Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/campaign/new');
  });

  test('should accept all 5 image formats without validation error', async ({ page }) => {
    // Mock product extraction to avoid external dependencies
    await page.route('/api/products/load', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          fromCache: false,
          product: {
            id: 999,
            name: 'Validation Test Product',
            description: 'Product for testing 5 image formats validation',
            benefits: 'Testing benefits for validation',
            category: 'nutrition',
            brand: 'Amway',
            price: 30,
            currency: 'USD',
            main_image_url: null, // Testing with null image
            product_url: 'https://www.amway.com/product/validation-test'
          }
        })
      });
    });

    // Mock campaign generation to test validation
    await page.route('/api/campaign/generate', async (route) => {
      const request = route.request();
      const postData = await request.postDataJSON();

      // Verify all 5 formats are received without validation error
      expect(postData.preferences.image_formats).toHaveLength(5);
      expect(postData.preferences.image_formats).toEqual([
        'facebook_post',
        'instagram_post',
        'pinterest',
        'snapchat_ad',
        'linkedin_post'
      ]);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          campaignId: 999,
          downloadUrl: '/api/campaign/download/validation-test.zip',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          totalImages: 5,
          successfulImages: 5,
          requestedImages: 5,
          generationTimeSeconds: 10,
          successRate: 100,
          isPartialSuccess: false,
          failedImages: 0
        })
      });
    });

    // Start campaign creation flow
    await page.fill('input[placeholder*="Enter product URL"]', 'https://www.amway.com/product/validation-test');
    await page.click('button:has-text("Extract Product")');

    // Wait for product extraction and verify no image is displayed
    await expect(page.locator('text=Configure Campaign')).toBeVisible({ timeout: 10000 });

    // Verify ProductPreview displays without empty image space
    await expect(page.locator('[alt*="Validation Test Product"]')).not.toBeVisible();

    // Verify category badge and inventory status are displayed properly
    await expect(page.locator('text=nutrition')).toBeVisible();
    await expect(page.locator('text=Unknown')).toBeVisible(); // Default inventory status

    // Keep all default settings (all 5 image formats selected)
    await page.click('button:has-text("Generate Campaign")');

    // Should succeed without validation error
    await expect(page.locator('text*="Campaign generated successfully"')).toBeVisible({ timeout: 15000 });

    // Should show download option
    await expect(page.locator('button:has-text("Download Campaign")')).toBeVisible();
  });

  test('should display ProductPreview with proper 2-column layout', async ({ page }) => {
    // Mock product extraction
    await page.route('/api/products/load', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          fromCache: false,
          product: {
            id: 998,
            name: 'Layout Test Product',
            description: 'Product for testing layout changes',
            benefits: 'Layout testing benefits',
            category: 'beauty',
            brand: 'Amway',
            price: 45,
            currency: 'USD',
            main_image_url: null,
            product_url: 'https://www.amway.com/product/layout-test',
            inventory_status: 'In Stock'
          }
        })
      });
    });

    await page.fill('input[placeholder*="Enter product URL"]', 'https://www.amway.com/product/layout-test');
    await page.click('button:has-text("Extract Product")');

    await expect(page.locator('text=Configure Campaign')).toBeVisible({ timeout: 10000 });

    // Verify the ProductPreview component layout
    const productCard = page.locator('[data-testid="product-preview"], .grid').first();

    // Check that the grid has proper spacing and layout
    await expect(page.locator('text=Layout Test Product')).toBeVisible();
    await expect(page.locator('text=beauty')).toBeVisible();
    await expect(page.locator('text=In Stock')).toBeVisible();

    // Verify no image placeholder is present
    await expect(page.locator('.aspect-square')).not.toBeVisible();
    await expect(page.locator('[data-testid="image-placeholder"]')).not.toBeVisible();
  });

  test('should handle edge case with single image format selection', async ({ page }) => {
    // Test that single format still works with new validation limit
    await page.route('/api/products/load', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          fromCache: false,
          product: {
            id: 997,
            name: 'Single Format Test',
            description: 'Testing single format validation',
            benefits: 'Single format benefits',
            category: 'home',
            brand: 'Amway',
            price: 20,
            currency: 'USD',
            main_image_url: null,
            product_url: 'https://www.amway.com/product/single-format'
          }
        })
      });
    });

    await page.route('/api/campaign/generate', async (route) => {
      const request = route.request();
      const postData = await request.postDataJSON();

      // Verify single format is accepted
      expect(postData.preferences.image_formats).toHaveLength(1);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          campaignId: 997,
          downloadUrl: '/api/campaign/download/single-format.zip',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          totalImages: 5,
          successfulImages: 5,
          requestedImages: 5,
          generationTimeSeconds: 8,
          successRate: 100,
          isPartialSuccess: false,
          failedImages: 0
        })
      });
    });

    await page.fill('input[placeholder*="Enter product URL"]', 'https://www.amway.com/product/single-format');
    await page.click('button:has-text("Extract Product")');

    await expect(page.locator('text=Configure Campaign')).toBeVisible({ timeout: 10000 });

    // Uncheck all formats except one
    await page.uncheck('input[value="instagram_post"]');
    await page.uncheck('input[value="pinterest"]');
    await page.uncheck('input[value="snapchat_ad"]');
    await page.uncheck('input[value="linkedin_post"]');
    // Keep facebook_post checked

    await page.click('button:has-text("Generate Campaign")');

    // Should succeed with single format
    await expect(page.locator('text*="Campaign generated successfully"')).toBeVisible({ timeout: 15000 });
  });
});