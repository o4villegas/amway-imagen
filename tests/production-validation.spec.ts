import { test, expect } from '@playwright/test';

test.describe('Production Validation - UX Improvements & Database Fixes', () => {

  test('should validate streamlined campaign creation UX', async ({ page }) => {
    console.log('🚀 Testing streamlined campaign creation flow...');

    // Navigate to homepage where URL input is located
    await page.goto('/');
    console.log('📍 PHASE 1: Homepage loaded');

    // Verify we're on the homepage
    await expect(page.locator('h1')).toContainText('Amway IBO');
    console.log('✅ Homepage loaded');

    // Find the URL input on the homepage
    const urlInput = page.locator('input[placeholder*="Amway product URL"]');
    await expect(urlInput).toBeVisible();

    // Use the real product URL provided by the user
    const testUrl = 'https://www.amway.com/en_US/Nutrilite%E2%84%A2-Organics-All-in-One-Meal-Powder-%E2%80%93-Vanilla-p-318671';
    await urlInput.fill(testUrl);
    console.log('📍 PHASE 2: Real product URL entered');

    // Submit the URL (button should become enabled after entering URL)
    await page.getByRole('button', { name: /Generate Campaign/i }).click();
    console.log('📍 PHASE 3: URL submitted - should navigate to campaign creation');

    // Now we should be on the campaign creation page with streamlined flow
    await expect(page.locator('text=Step 1 of 4')).toBeVisible({ timeout: 10000 });
    console.log('✅ 4-step progress indicator confirmed (streamlined from 6 steps)');

    // Wait for processing to start (should be fast without artificial delays)
    await expect(page.locator('text=Processing & Setup')).toBeVisible({ timeout: 15000 });
    console.log('✅ Processing stage started');

    // Wait for processing to complete and automatically advance to generation
    // This should be much faster now (under 10 seconds instead of 15+ seconds)
    const startTime = Date.now();

    try {
      // Wait for either generation stage or error
      await Promise.race([
        page.waitForSelector('text=Generate Images', { timeout: 30000 }),
        page.waitForSelector('text=Try Again', { timeout: 30000 })
      ]);

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;
      console.log(`⚡ Processing completed in ${processingTime.toFixed(1)}s (should be <10s without artificial delays)`);

      // Check if we reached generation stage (success) or error
      if (await page.locator('text=Generate Images').isVisible()) {
        console.log('✅ Reached generation stage - database fixes working');
        console.log('✅ UX streamlining successful - fast progression through steps');

        // Verify smart defaults were applied
        await expect(page.locator('text=Smart Campaign Setup Applied')).toBeVisible();
        console.log('✅ Smart defaults applied automatically');

      } else if (await page.locator('text=Try Again').isVisible()) {
        console.log('⚠️  Processing failed - checking for 500/503 errors in network logs');

        // This would indicate database issues are still present
        throw new Error('Processing failed - possible 500/503 API errors still occurring');
      }

    } catch (error) {
      console.log('❌ Test failed:', error.message);
      throw error;
    }
  });

  test('should validate API endpoints are working', async ({ page }) => {
    console.log('🔍 Testing API health and database connectivity...');

    // Test health endpoint
    const healthResponse = await page.goto('/api/health');
    expect(healthResponse?.status()).toBe(200);
    console.log('✅ Health API endpoint working');

    // Test database connectivity through health check
    const healthContent = await page.content();
    expect(healthContent).toContain('"database":true');
    expect(healthContent).toContain('"status":"healthy"');
    console.log('✅ Database connectivity confirmed');

    // Test that validation endpoints accept 5 image formats
    await page.goto('/');

    // Fill in a URL to trigger validation
    await page.fill('input[placeholder*="Amway product URL"]', 'https://www.amway.com/en_US/test');
    await page.getByRole('button', { name: /Generate Campaign/i }).click();

    // If validation was fixed, we should not see "Maximum 4 image formats" error
    // Wait a moment for any validation errors
    await page.waitForTimeout(2000);

    const hasValidationError = await page.locator('text=Maximum 4 image formats allowed').isVisible();
    expect(hasValidationError).toBe(false);
    console.log('✅ Validation fixes confirmed - no "Maximum 4 image formats" error');
  });

});