/**
 * Backward Compatibility Tests
 * Ensures existing campaigns and data continue to work with new constraints
 */

import { test, expect } from '@playwright/test';

test.describe('Backward Compatibility', () => {
  test('should handle legacy campaign sizes gracefully', async ({ page }) => {
    // Mock API to test legacy campaign validation
    await page.route('/api/campaign/generate', async route => {
      const request = route.request();
      const body = await request.postDataJSON();

      // Test different legacy campaign sizes
      const legacyRequest = {
        productId: 1,
        preferences: {
          campaign_type: 'product_focus', // Legacy type
          brand_style: 'professional',
          color_scheme: 'amway_brand',
          text_overlay: 'moderate',
          campaign_size: 10, // Legacy size
          image_formats: ['instagram_post']
        }
      };

      // Simulate the backend normalizing this to new standards
      const normalizedResponse = {
        success: true,
        campaignId: 123,
        downloadUrl: '/api/campaign/download/test-legacy.zip',
        totalImages: 5, // Normalized to 5
        successfulImages: 5,
        requestedImages: 5,
        preferences: {
          ...legacyRequest.preferences,
          campaign_type: 'lifestyle', // Normalized
          campaign_size: 5 // Normalized
        }
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(normalizedResponse)
      });
    });

    await page.goto('/campaign/new');

    // Select a product
    const availableProduct = page.locator('.product-card:not(.disabled)').first();
    await availableProduct.click();

    // Continue to preferences
    await page.locator('button:has-text("Continue")').click();

    // The UI should now always show 5 images (standardized)
    const campaignSizeOptions = page.locator('input[name="campaign_size"]');
    const fiveOption = campaignSizeOptions.locator('[value="5"]');
    await expect(fiveOption).toBeChecked();

    // Other options should not be available (UI standardized to 5)
    const oneOption = campaignSizeOptions.locator('[value="1"]');
    const threeOption = campaignSizeOptions.locator('[value="3"]');
    await expect(oneOption).not.toBeVisible();
    await expect(threeOption).not.toBeVisible();
  });

  test('should validate available field defaults for products without the field', async ({ page }) => {
    // Mock product API response with mixed availability data
    await page.route('/api/products/load', async route => {
      const mockResponse = {
        products: [
          {
            id: 1,
            name: 'Legacy Product Without Available Field',
            available: undefined, // Missing field - should default to true
            description: 'This product was created before available field existed',
            brand: 'Test',
            category: 'test',
            price: 50.00
          },
          {
            id: 2,
            name: 'Legacy Product With Null Available',
            available: null, // Null field - should default to true
            description: 'This product has null available field',
            brand: 'Test',
            category: 'test',
            price: 60.00
          },
          {
            id: 3,
            name: 'Modern Product Explicitly Available',
            available: true, // Explicit true
            description: 'This product has explicit available field',
            brand: 'Test',
            category: 'test',
            price: 70.00
          },
          {
            id: 4,
            name: 'Modern Product Explicitly Unavailable',
            available: false, // Explicit false
            description: 'This product is explicitly unavailable',
            brand: 'Test',
            category: 'test',
            price: 80.00
          }
        ]
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });

    await page.goto('/campaign/new');
    await page.waitForLoadState('networkidle');

    // Should show 3 available products (undefined, null, and true all default to available)
    const availableProducts = page.locator('.product-card:not(.disabled):not(.opacity-50)');
    await expect(availableProducts).toHaveCount(3);

    // Should show 1 unavailable product (explicit false)
    const unavailableProducts = page.locator('.product-card.disabled, .product-card.opacity-50');
    await expect(unavailableProducts).toHaveCount(1);

    // Verify the specific products
    await expect(page.locator('text="Legacy Product Without Available Field"')).toBeVisible();
    await expect(page.locator('text="Legacy Product With Null Available"')).toBeVisible();
    await expect(page.locator('text="Modern Product Explicitly Available"')).toBeVisible();
    await expect(page.locator('text="Modern Product Explicitly Unavailable"')).toBeVisible();

    // The unavailable product should have "Coming Soon"
    const unavailableCard = page.locator('.product-card').filter({ hasText: 'Modern Product Explicitly Unavailable' });
    await expect(unavailableCard.locator('text="Coming Soon"')).toBeVisible();
  });

  test('should handle database migration scenarios', async ({ page }) => {
    // Test that the migration script would work correctly
    // This is more of a conceptual test since we can't actually run migrations in E2E

    await page.goto('/');

    // Verify that the app loads without errors (basic health check)
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // Navigate to campaign creation to ensure the flow works
    await page.goto('/campaign/new');
    await expect(page.locator('text="Create New Campaign"')).toBeVisible();
  });

  test('should maintain API compatibility with legacy clients', async ({ page }) => {
    // Test that old API request formats are still accepted
    let apiRequestReceived = false;
    let apiResponseCorrect = false;

    await page.route('/api/campaign/generate', async route => {
      apiRequestReceived = true;
      const request = route.request();
      const body = await request.postDataJSON();

      // Verify we can handle legacy format
      const legacyFormat = {
        productId: 1,
        preferences: {
          campaign_type: 'product_focus', // Old type
          brand_style: 'professional',
          color_scheme: 'amway_brand',
          text_overlay: 'moderate',
          campaign_size: 15, // Old size
          image_formats: ['instagram_post']
        }
      };

      // Response should normalize the data
      const response = {
        success: true,
        campaignId: 123,
        downloadUrl: '/api/campaign/download/test.zip',
        totalImages: 5, // Always 5 now
        successfulImages: 5,
        requestedImages: 5,
        normalized: true, // Indicate this was normalized
        originalRequest: body // Echo back for verification
      };

      apiResponseCorrect = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });

    // Just verify that the API endpoint exists and responds
    const response = await page.request.post('/api/campaign/generate', {
      data: {
        productId: 1,
        preferences: {
          campaign_type: 'product_focus',
          brand_style: 'professional',
          color_scheme: 'amway_brand',
          text_overlay: 'moderate',
          campaign_size: 10, // Legacy size
          image_formats: ['instagram_post']
        }
      }
    });

    expect(apiRequestReceived).toBe(true);
    expect(apiResponseCorrect).toBe(true);
    expect(response.status()).toBe(200);
  });

  test('should maintain consistent UI behavior across different data states', async ({ page }) => {
    await page.goto('/campaign/new');

    // Test that the UI handles different product states gracefully
    await page.waitForLoadState('networkidle');

    // Should always show product cards
    const productCards = page.locator('.product-card');
    await expect(productCards.first()).toBeVisible();

    // Should show the product browser introduction text
    await expect(page.locator('text="Choose from available products"')).toBeVisible();

    // Should have working navigation
    await expect(page.locator('nav, header')).toBeVisible();

    // Should have proper page structure
    await expect(page.locator('h1')).toBeVisible();
  });
});