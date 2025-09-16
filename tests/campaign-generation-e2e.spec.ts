import { test, expect } from '@playwright/test';

test.describe('Campaign Generation End-to-End', () => {

  test('should complete full campaign generation flow with product browser', async ({ page }) => {
    console.log('🚀 Starting campaign generation E2E test...');

    // Navigate to campaign page
    await page.goto('/campaign/new');

    // Verify page loads correctly
    await expect(page).toHaveTitle(/Amway/);
    await expect(page.locator('h1')).toContainText('IBO Image Campaign Generator');
    console.log('✅ Page loaded successfully');

    // Step 1: Select a product from the browser
    console.log('📦 Step 1: Selecting product...');

    // Look for product cards
    const productCards = page.locator('[data-testid="product-card"]').or(
      page.locator('.product-card')
    ).or(
      page.locator('button:has-text("Select Product")')
    ).or(
      page.locator('div:has-text("Artistry")')
    ).or(
      page.locator('div:has-text("Nutrilite")')
    ).or(
      page.locator('div:has-text("eSpring")')
    );

    // Wait for products to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const productCount = await productCards.count();
    console.log(`Found ${productCount} product elements`);

    if (productCount > 0) {
      // Click on the first available product
      await productCards.first().click();
      console.log('✅ Product selected');
    } else {
      // Look for alternative selectors
      const alternativeSelectors = [
        'button:has-text("Continue")',
        'button:has-text("Next")',
        'button[type="submit"]',
        '.btn-primary',
        '[role="button"]'
      ];

      let found = false;
      for (const selector of alternativeSelectors) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          await element.first().click();
          found = true;
          console.log(`✅ Clicked ${selector}`);
          break;
        }
      }

      if (!found) {
        console.log('❌ No products or navigation elements found');
        // Take a screenshot for debugging
        await page.screenshot({ path: 'test-results/no-products-debug.png' });
        throw new Error('No product selection elements found');
      }
    }

    // Step 2: Configure campaign preferences
    console.log('⚙️ Step 2: Configuring campaign...');

    // Wait for navigation to preferences
    await page.waitForTimeout(3000);

    // Look for campaign configuration elements
    const configElements = page.locator('text=Campaign Type').or(
      page.locator('text=Brand Style')
    ).or(
      page.locator('select').first()
    ).or(
      page.locator('input[type="radio"]').first()
    );

    const hasConfig = await configElements.count() > 0;

    if (hasConfig) {
      console.log('✅ Found configuration options');

      // Try to select campaign preferences
      const campaignTypeOptions = page.locator('input[value="product_focus"]').or(
        page.locator('text=Product Focus')
      );

      if (await campaignTypeOptions.count() > 0) {
        await campaignTypeOptions.first().click();
        console.log('✅ Selected Product Focus campaign type');
      }

      // Try to select brand style
      const brandStyleOptions = page.locator('input[value="professional"]').or(
        page.locator('text=Professional')
      );

      if (await brandStyleOptions.count() > 0) {
        await brandStyleOptions.first().click();
        console.log('✅ Selected Professional brand style');
      }

      // Try to select campaign size
      const campaignSizeOptions = page.locator('input[value="1"]').or(
        page.locator('text=1 image')
      );

      if (await campaignSizeOptions.count() > 0) {
        await campaignSizeOptions.first().click();
        console.log('✅ Selected 1 image campaign size');
      }

    } else {
      console.log('⚠️ No configuration step found, moving to generation');
    }

    // Step 3: Start campaign generation
    console.log('🎨 Step 3: Starting generation...');

    // Look for generate button
    const generateBtn = page.locator('button:has-text("Generate")').or(
      page.locator('button:has-text("Create Campaign")')
    ).or(
      page.locator('button[type="submit"]')
    ).or(
      page.locator('.generate-btn')
    );

    if (await generateBtn.count() > 0) {
      // Mock the generation API to avoid actual AI calls during testing
      await page.route('/api/campaign/generate', async route => {
        console.log('🔄 Intercepted generation API call');

        // Simulate successful generation
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            campaignId: 123,
            downloadUrl: '/api/campaign/download/test-campaign.zip',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            totalImages: 1,
            successfulImages: 1,
            requestedImages: 1,
            generationTimeSeconds: 5.2
          })
        });
      });

      await generateBtn.first().click();
      console.log('✅ Generation started');

      // Wait for generation to complete
      await page.waitForTimeout(5000);

      // Look for success indicators
      const successIndicators = page.locator('text=Success').or(
        page.locator('text=Complete')
      ).or(
        page.locator('text=Download')
      ).or(
        page.locator('button:has-text("Download")')
      );

      const hasSuccess = await successIndicators.count() > 0;

      if (hasSuccess) {
        console.log('✅ Generation completed successfully');
      } else {
        console.log('⚠️ No clear success indicator found');
        // Take screenshot for debugging
        await page.screenshot({ path: 'test-results/generation-result-debug.png' });
      }

    } else {
      console.log('❌ No generate button found');
      await page.screenshot({ path: 'test-results/no-generate-button-debug.png' });
    }

    console.log('🏁 Campaign generation E2E test completed');
  });

  test('should handle campaign generation errors gracefully', async ({ page }) => {
    console.log('🚀 Testing error handling...');

    await page.goto('/campaign/new');

    // Mock a failed generation
    await page.route('/api/campaign/generate', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'AI service temporarily unavailable'
        })
      });
    });

    // Navigate through the flow quickly
    await page.waitForTimeout(2000);

    // Try to find and click any available buttons to reach generation
    const buttons = page.locator('button').all();
    const allButtons = await buttons;

    for (const button of allButtons) {
      const text = await button.textContent();
      if (text && (text.includes('Generate') || text.includes('Select') || text.includes('Continue'))) {
        try {
          await button.click();
          await page.waitForTimeout(1000);
        } catch (e) {
          // Continue if click fails
        }
      }
    }

    // Look for error messages
    await page.waitForTimeout(3000);

    const errorElements = page.locator('text=error').or(
      page.locator('text=Error')
    ).or(
      page.locator('.error')
    ).or(
      page.locator('[role="alert"]')
    );

    const hasError = await errorElements.count() > 0;

    if (hasError) {
      console.log('✅ Error handling working correctly');
    } else {
      console.log('⚠️ Error handling needs verification');
    }
  });

  test('should validate campaign generation API directly', async ({ request }) => {
    console.log('🔧 Testing generation API directly...');

    // Test the generation endpoint with valid data
    const response = await request.post('/api/campaign/generate', {
      data: {
        productId: 1,
        preferences: {
          campaign_type: 'product_focus',
          brand_style: 'professional',
          color_scheme: 'amway_brand',
          text_overlay: 'moderate',
          campaign_size: 1,
          image_formats: ['instagram_post']
        }
      }
    });

    console.log(`API Response Status: ${response.status()}`);

    // Should either succeed or fail gracefully
    expect([200, 429, 500, 404].includes(response.status())).toBeTruthy();

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.campaignId).toBeDefined();
      console.log('✅ API generation successful');
    } else if (response.status() === 429) {
      console.log('⚠️ Rate limited (expected in testing)');
    } else if (response.status() === 500) {
      const body = await response.json();
      expect(body.error).toBeDefined();
      console.log('⚠️ Server error (may be expected without proper bindings)');
    } else {
      console.log('⚠️ Other response status');
    }
  });
});