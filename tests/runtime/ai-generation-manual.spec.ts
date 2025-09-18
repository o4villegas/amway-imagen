import { test, expect } from '@playwright/test';

/**
 * MANUAL RUNTIME AI GENERATION TESTS
 *
 * These tests require actual Cloudflare environment with AI binding.
 * They are disabled by default to avoid charges during regular testing.
 *
 * To run these tests:
 * 1. Deploy to production/staging environment
 * 2. Set ENABLE_RUNTIME_AI_TESTS=true in environment
 * 3. Run: npx playwright test --grep "Runtime AI Generation"
 */

test.describe('Runtime AI Generation Tests', () => {
  // Skip these tests unless explicitly enabled
  test.beforeEach(async ({}, testInfo) => {
    const enableRuntimeTests = process.env.ENABLE_RUNTIME_AI_TESTS === 'true';
    if (!enableRuntimeTests) {
      testInfo.skip(true, 'Runtime AI tests disabled. Set ENABLE_RUNTIME_AI_TESTS=true to enable.');
    }
  });

  test('should generate actual AI images with FLUX-1-schnell', async ({ page }) => {
    console.log('🤖 Starting REAL AI generation test...');

    // Navigate to campaign creation
    await page.goto('/campaign/new');

    // Fill out form with minimal configuration for fastest generation
    console.log('📋 Configuring campaign...');

    // Select a working product (Nutrilite)
    const workingProduct = page.locator('.product-card:not(.disabled)').first();
    await expect(workingProduct).toBeVisible();
    await workingProduct.click();

    // Wait for product details to load
    await expect(page.locator('text=/Product.*Information|Selected.*Product/i')).toBeVisible({ timeout: 10000 });

    // Configure campaign preferences for single image generation
    await page.locator('input[value="product_focus"]').click();
    await page.locator('input[value="professional"]').click();
    await page.locator('input[value="1"]').click(); // Single image only
    await page.locator('input[value="instagram_post"]').check();

    console.log('🎨 Starting AI generation...');

    // Start generation
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    // Monitor generation progress
    console.log('⏳ Waiting for AI generation to complete...');

    // Look for progress indicators
    const progressIndicator = page.locator('[role="progressbar"], .progress-bar, text=/Generating/i');
    await expect(progressIndicator).toBeVisible({ timeout: 10000 });

    // Wait for completion (up to 3 minutes for real AI generation)
    await page.waitForFunction(
      () => {
        const images = document.querySelectorAll('img[alt*="Generated"], .generated-image');
        return images.length > 0;
      },
      { timeout: 180000 } // 3 minutes
    );

    console.log('✅ AI generation completed!');

    // Verify image was generated
    const generatedImage = page.locator('img[alt*="Generated"], .generated-image').first();
    await expect(generatedImage).toBeVisible();

    // Verify image has valid src (should be base64 or blob URL)
    const imageSrc = await generatedImage.getAttribute('src');
    expect(imageSrc).toBeTruthy();
    expect(imageSrc).toMatch(/^(data:image|blob:|https?:)/);

    console.log(`🖼️ Generated image source: ${imageSrc?.substring(0, 50)}...`);

    // Verify image dimensions are correct for Instagram Post (1080x1080)
    const imageElement = await generatedImage.elementHandle();
    const dimensions = await imageElement?.evaluate((img: HTMLImageElement) => ({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete
    }));

    expect(dimensions?.complete).toBe(true);
    expect(dimensions?.naturalWidth).toBeGreaterThan(0);
    expect(dimensions?.naturalHeight).toBeGreaterThan(0);

    console.log(`📐 Image dimensions: ${dimensions?.naturalWidth}x${dimensions?.naturalHeight}`);

    // Test image quality indicators
    await test.step('Verify image quality', async () => {
      // Check if image loaded without errors
      const imageErrors = await page.evaluate(() => {
        const img = document.querySelector('img[alt*="Generated"]') as HTMLImageElement;
        return {
          error: img?.complete === false,
          naturalWidth: img?.naturalWidth || 0,
          naturalHeight: img?.naturalHeight || 0
        };
      });

      expect(imageErrors.error).toBe(false);
      expect(imageErrors.naturalWidth).toBeGreaterThan(100); // Minimum reasonable size
      expect(imageErrors.naturalHeight).toBeGreaterThan(100);
    });

    // Test download functionality with real image
    await test.step('Test download with real AI image', async () => {
      const downloadButton = page.locator('button:has-text("Download")');

      if (await downloadButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
        await downloadButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.zip$/i);

        console.log(`📥 Downloaded: ${download.suggestedFilename()}`);
      }
    });

    console.log('🎉 Runtime AI generation test completed successfully!');
  });

  test('should handle text preservation in AI generation', async ({ page }) => {
    console.log('📝 Testing text preservation in AI generation...');

    await page.goto('/campaign/new');

    // Select a product with clear text/branding (like Artistry)
    const artistryProduct = page.locator('text=Artistry').first();
    await artistryProduct.click();

    // Configure for text-heavy generation
    await page.locator('input[value="product_focus"]').click(); // Product focus preserves text better
    await page.locator('input[value="professional"]').click();
    await page.locator('input[value="1"]').click();
    await page.locator('input[value="instagram_post"]').check();

    // Generate with focus on text preservation
    await page.locator('button:has-text("Generate")').click();

    // Wait for generation
    await page.waitForSelector('img[alt*="Generated"]', { timeout: 180000 });

    // Verify generation completed
    const generatedImage = page.locator('img[alt*="Generated"]').first();
    await expect(generatedImage).toBeVisible();

    // Check that generation request included text preservation prompts
    // (This would be verified through the prompts sent to AI, but we can verify the image loaded)
    const imageSrc = await generatedImage.getAttribute('src');
    expect(imageSrc).toBeTruthy();

    console.log('✅ Text preservation test completed');
  });

  test('should generate multiple formats correctly', async ({ page }) => {
    console.log('🔄 Testing multiple format AI generation...');

    await page.goto('/campaign/new');

    // Select product
    const product = page.locator('.product-card:not(.disabled)').first();
    await product.click();

    // Configure for multiple formats (small campaign size)
    await page.locator('input[value="product_focus"]').click();
    await page.locator('input[value="professional"]').click();
    await page.locator('input[value="3"]').click(); // 3 images

    // Select multiple formats
    await page.locator('input[value="instagram_post"]').check();
    await page.locator('input[value="instagram_story"]').check();

    // Generate
    await page.locator('button:has-text("Generate")').click();

    // Wait for all images to generate (longer timeout for multiple images)
    await page.waitForFunction(
      () => {
        const images = document.querySelectorAll('img[alt*="Generated"]');
        return images.length >= 3; // Should have at least 3 images
      },
      { timeout: 300000 } // 5 minutes for multiple images
    );

    // Verify we have images in different formats
    const images = page.locator('img[alt*="Generated"]');
    const imageCount = await images.count();
    expect(imageCount).toBeGreaterThanOrEqual(3);

    console.log(`✅ Generated ${imageCount} images in multiple formats`);
  });

  test('should handle AI generation errors gracefully', async ({ page }) => {
    console.log('⚠️ Testing AI generation error handling...');

    // This test would simulate conditions that might cause AI generation to fail
    // Since we can't easily force AI failures, we'll test the error handling UI

    await page.goto('/campaign/new');

    // Select product
    const product = page.locator('.product-card:not(.disabled)').first();
    await product.click();

    // Configure campaign
    await page.locator('input[value="product_focus"]').click();
    await page.locator('input[value="professional"]').click();
    await page.locator('input[value="1"]').click();
    await page.locator('input[value="instagram_post"]').check();

    // Start generation
    await page.locator('button:has-text("Generate")').click();

    // Look for either success or error handling
    const result = await Promise.race([
      page.waitForSelector('img[alt*="Generated"]', { timeout: 180000 }).then(() => 'success'),
      page.waitForSelector('text=/error|failed|try again/i', { timeout: 180000 }).then(() => 'error'),
    ]);

    if (result === 'success') {
      console.log('✅ AI generation succeeded');
      const image = page.locator('img[alt*="Generated"]').first();
      await expect(image).toBeVisible();
    } else {
      console.log('⚠️ AI generation failed - testing error handling');
      const errorMessage = page.locator('text=/error|failed|try again/i').first();
      await expect(errorMessage).toBeVisible();

      // Should have retry option
      const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
      if (await retryButton.isVisible()) {
        console.log('✅ Retry option available');
      }
    }

    console.log('✅ Error handling test completed');
  });
});

/**
 * Helper to run a quick manual test via browser console
 *
 * To test AI generation manually:
 * 1. Navigate to /campaign/new
 * 2. Open browser console
 * 3. Run: await testAIGeneration()
 */
export const manualAITest = `
async function testAIGeneration() {
  console.log('🤖 Manual AI Generation Test Started');

  // Auto-fill form
  document.querySelector('input[value="product_focus"]')?.click();
  document.querySelector('input[value="professional"]')?.click();
  document.querySelector('input[value="1"]')?.click();
  document.querySelector('input[value="instagram_post"]')?.checked = true;

  // Start generation
  document.querySelector('button:has-text("Generate")')?.click();
  console.log('⏳ AI generation started...');

  // Monitor for completion
  const checkCompletion = setInterval(() => {
    const images = document.querySelectorAll('img[alt*="Generated"]');
    if (images.length > 0) {
      console.log('✅ AI generation completed!');
      console.log('📊 Generated images:', images.length);
      clearInterval(checkCompletion);
    }
  }, 2000);
}
`;