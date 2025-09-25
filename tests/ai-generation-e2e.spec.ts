import { test, expect } from '@playwright/test';

test.describe('AI Generation End-to-End Validation', () => {

  test('should complete full AI generation pipeline in production', async ({ page }) => {
    console.log('🤖 Starting REAL AI generation end-to-end test...');

    // Navigate to homepage
    await page.goto('/');
    console.log('📍 Homepage loaded');

    // Enter the real product URL
    const productUrl = 'https://www.amway.com/en_US/Nutrilite%E2%84%A2-Organics-All-in-One-Meal-Powder-%E2%80%93-Vanilla-p-318671';
    await page.fill('input[placeholder*="Amway product URL"]', productUrl);
    console.log('📍 Real product URL entered');

    // Submit to start campaign creation
    await page.getByRole('button', { name: /Generate Campaign/i }).click();
    console.log('📍 Campaign creation started');

    // Wait for processing to complete (should be fast without delays)
    await expect(page.locator('text=Processing & Setup')).toBeVisible({ timeout: 15000 });
    console.log('✅ Processing stage reached');

    // Wait for generation stage to begin
    await expect(page.locator('text=Generating Your Campaign')).toBeVisible({ timeout: 30000 });
    console.log('✅ AI generation stage started');

    // Check that the generation is actually happening
    await expect(page.locator('text=Creating.*professional images')).toBeVisible();
    console.log('✅ Generation progress confirmed');

    // Wait for completion or timeout (AI generation can take 30-60 seconds)
    const startTime = Date.now();
    const maxWaitTime = 120000; // 2 minutes max wait

    try {
      // Wait for either success or failure
      await Promise.race([
        // Success case: Download stage appears
        page.waitForSelector('text=Campaign Generated Successfully', { timeout: maxWaitTime }),
        // Failure case: Error message appears
        page.waitForSelector('text=Generation Failed', { timeout: maxWaitTime }),
        // Timeout case: Generation is taking too long
        page.waitForSelector('text=Try Again', { timeout: maxWaitTime })
      ]);

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      console.log(`⏱️ Generation completed in ${totalTime.toFixed(1)} seconds`);

      // Check for success
      if (await page.locator('text=Campaign Generated Successfully').isVisible()) {
        console.log('🎉 AI GENERATION SUCCESS!');

        // Verify download is available
        await expect(page.locator('text=Download Campaign ZIP')).toBeVisible();
        console.log('✅ Download button available');

        // Verify campaign details are shown
        await expect(page.locator('text=images')).toBeVisible();
        console.log('✅ Campaign details displayed');

        // Test the actual download functionality
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: /Download Campaign ZIP/i }).click();
        const download = await downloadPromise;

        console.log('✅ Download initiated:', download.suggestedFilename());
        expect(download.suggestedFilename()).toMatch(/\.zip$/);

        // Verify ZIP file size (should be substantial if images are included)
        const path = await download.path();
        if (path) {
          const fs = require('fs');
          const stats = fs.statSync(path);
          console.log(`📦 ZIP file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          expect(stats.size).toBeGreaterThan(100000); // At least 100KB
        }

        return { success: true, generationTime: totalTime };

      } else if (await page.locator('text=Generation Failed').isVisible()) {
        console.log('❌ AI generation failed');

        // Get error details
        const errorText = await page.locator('[class*="red"]').textContent();
        console.log('Error details:', errorText);

        throw new Error(`AI Generation Failed: ${errorText}`);

      } else {
        throw new Error('AI generation timed out or encountered unknown state');
      }

    } catch (error) {
      console.log('❌ AI generation test failed:', error.message);

      // Take screenshot for debugging
      await page.screenshot({ path: 'ai-generation-failure.png', fullPage: true });

      throw error;
    }
  });

  test('should validate AI service bindings and configuration', async ({ page }) => {
    console.log('🔍 Testing AI service configuration...');

    // Test direct API call to generation endpoint
    const response = await page.request.post('/api/campaign/generate', {
      data: {
        productId: 1, // Use seeded product
        preferences: {
          campaign_type: 'lifestyle',
          brand_style: 'professional',
          color_scheme: 'product_inspired',
          text_overlay: 'minimal',
          campaign_size: 1, // Single image for speed
          image_formats: ['facebook_post']
        },
        forceRealAI: true // Force real AI generation for this test
      }
    });

    console.log('📡 API response status:', response.status());

    if (response.status() === 200) {
      const result = await response.json();
      console.log('✅ AI generation API working');
      console.log('Response:', JSON.stringify(result, null, 2));

      expect(result.success).toBe(true);
      expect(result.totalImages).toBeGreaterThan(0);
      expect(result.downloadUrl).toBeTruthy();

    } else {
      const errorText = await response.text();
      console.log('❌ AI API failed:', errorText);

      // Check for specific error patterns
      if (errorText.includes('AI binding not available')) {
        throw new Error('CRITICAL: AI binding not configured in production');
      }
      if (errorText.includes('model_overloaded')) {
        console.log('⚠️ AI model temporarily overloaded - this is expected during high usage');
        // This is not a failure of our implementation
      }
      if (errorText.includes('Product not found')) {
        throw new Error('Database seeding required - product data missing');
      }

      throw new Error(`AI Generation API failed: ${response.status()} - ${errorText}`);
    }
  });

});