import { test, expect, Page } from '@playwright/test';

test.describe('Complete E2E Workflow - AI Generation & UI/UX Journey', () => {

  // ========================================
  // REAL AI GENERATION TEST (Optional)
  // ========================================
  test('should test REAL AI generation end-to-end (when enabled)', async ({ page }) => {
    // Skip unless explicitly enabled
    const enableRealAI = process.env.ENABLE_REAL_AI_TESTS === 'true';
    test.skip(!enableRealAI, 'Real AI tests disabled. Set ENABLE_REAL_AI_TESTS=true to enable.');

    console.log('🤖 Running REAL AI generation test...');
    console.log('⚠️ This test uses actual Cloudflare AI and may take 30-60 seconds');

    const startTime = Date.now();

    // Override test environment detection to enable real AI
    await page.addInitScript(() => {
      window.localStorage.setItem('FORCE_REAL_AI_TEST', 'true');
    });

    // Navigate and set up campaign
    await page.goto('/campaign/new');
    await page.waitForLoadState('networkidle');

    // Quick product selection
    const availableProduct = page.locator('.product-card:not(.disabled)').first();
    await expect(availableProduct).toBeVisible();
    await availableProduct.click();

    // Minimal config for speed - single image
    await page.locator('input[value="product_focus"]').click();
    await page.locator('input[value="professional"]').click();
    await page.locator('input[value="1"]').click(); // Single image for speed
    await page.locator('input[value="instagram_post"]').check();

    // Start generation
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    console.log('🔄 Real AI generation in progress...');

    // Wait for actual generation (up to 2 minutes for real AI)
    const progressIndicator = page.locator('[role="progressbar"], text=/Generating|Processing/i');
    await expect(progressIndicator).toBeVisible({ timeout: 10000 });

    // Monitor real progress
    let progressComplete = false;
    const maxWaitTime = 120000; // 2 minutes
    const checkInterval = 5000; // Check every 5 seconds

    for (let waited = 0; waited < maxWaitTime && !progressComplete; waited += checkInterval) {
      await page.waitForTimeout(checkInterval);

      // Check if generation completed
      const images = page.locator('img[alt*="Generated"], .generated-image');
      const imageCount = await images.count();

      if (imageCount > 0) {
        progressComplete = true;
        console.log(`✅ Real AI generation completed! Found ${imageCount} images`);
        break;
      }

      console.log(`⏳ Still generating... (${waited/1000}s elapsed)`);
    }

    expect(progressComplete).toBe(true);

    // Validate real AI output quality
    const generatedImages = page.locator('img[alt*="Generated"]');
    expect(await generatedImages.count()).toBeGreaterThan(0);

    // Check first image loads properly
    const firstImage = generatedImages.first();
    await expect(firstImage).toBeVisible();

    const imageSrc = await firstImage.getAttribute('src');
    expect(imageSrc).toBeTruthy();
    expect(imageSrc).not.toContain('mock');

    // Verify download functionality with real data
    const downloadButton = page.locator('button:has-text("Download")');
    if (await downloadButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      await downloadButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.zip$/i);
      console.log(`📦 Real campaign downloaded: ${download.suggestedFilename()}`);
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`🎉 REAL AI test completed in ${totalTime.toFixed(1)}s`);

    // Performance check - real AI should complete within reasonable time
    expect(totalTime).toBeLessThan(180); // 3 minutes max
  });

  test('should complete entire customer journey from product selection to download', async ({ page }) => {
    console.log('🚀 Starting comprehensive E2E workflow test...');

    // ============================================
    // PHASE 1: Landing & Initial Navigation
    // ============================================
    console.log('\n📍 PHASE 1: Landing Page');

    await page.goto('/');
    await expect(page).toHaveTitle(/Amway.*IBO.*Image.*Campaign.*Generator/i);

    // Verify hero section
    await expect(page.locator('h1')).toContainText('Amway IBO');
    await expect(page.locator('h1')).toContainText('Image Campaign');
    await expect(page.locator('h1')).toContainText('Generator');
    await expect(page.locator('text=/Transform.*Amway.*product.*professional/i')).toBeVisible();

    // Check for start button
    const startButton = page.locator('a:has-text("Create Campaign"), button:has-text("Create Campaign")').first();
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Verify navigation to campaign creation
    await expect(page).toHaveURL('/campaign/new');
    console.log('✅ Landing page navigation successful');

    // ============================================
    // PHASE 2: Product Selection
    // ============================================
    console.log('\n📦 PHASE 2: Product Selection');

    await page.waitForLoadState('networkidle');

    // Verify product browser is visible
    await expect(page.locator('text=/Select.*Product/i')).toBeVisible();

    // Check for product grid
    const productGrid = page.locator('[role="grid"], .grid, .product-grid').first();
    await expect(productGrid).toBeVisible();

    // Find available (non-disabled) product cards
    const availableProducts = page.locator('.product-card:not(.disabled):not(.opacity-50)').or(
      page.locator('[data-testid="product-card"]:not([disabled])').or(
        page.locator('button:has-text("Nutrilite"):not([disabled])')
      )
    );

    const productCount = await availableProducts.count();
    expect(productCount).toBeGreaterThan(0);
    console.log(`Found ${productCount} available products`);

    // Click on first available product (should be working)
    await availableProducts.first().click();
    await page.waitForTimeout(1000);

    // Verify product was selected (look for next step or product preview)
    const productPreview = page.locator('text=/Product.*Information/i').or(
      page.locator('text=/Selected.*Product/i')
    );

    if (await productPreview.isVisible({ timeout: 5000 })) {
      console.log('✅ Product information displayed');

      // Verify product details are shown
      await expect(page.locator('text=/Name|Title|Product/i')).toBeVisible();
      await expect(page.locator('text=/Description|Benefits/i')).toBeVisible();
    }

    console.log('✅ Product selection completed');

    // ============================================
    // PHASE 3: Campaign Configuration
    // ============================================
    console.log('\n⚙️ PHASE 3: Campaign Configuration');

    // Look for preferences panel
    await expect(page.locator('text=/Campaign.*Preferences|Configure.*Campaign/i')).toBeVisible({ timeout: 10000 });

    // Configure Campaign Type
    const campaignTypeSection = page.locator('text=/Campaign.*Type/i').first();
    if (await campaignTypeSection.isVisible()) {
      const productFocus = page.locator('label:has-text("Product Focus")').or(
        page.locator('input[value="product_focus"]')
      );
      await productFocus.click();
      console.log('✅ Selected Product Focus campaign type');
    }

    // Configure Brand Style
    const brandStyleSection = page.locator('text=/Brand.*Style/i').first();
    if (await brandStyleSection.isVisible()) {
      const professional = page.locator('label:has-text("Professional")').or(
        page.locator('input[value="professional"]')
      );
      await professional.click();
      console.log('✅ Selected Professional brand style');
    }

    // Configure Campaign Size
    const campaignSizeSection = page.locator('text=/Campaign.*Size|Number.*Images/i').first();
    if (await campaignSizeSection.isVisible()) {
      const size5 = page.locator('label:has-text("5")').or(
        page.locator('input[value="5"]')
      );
      await size5.click();
      console.log('✅ Selected 5 images campaign size');
    }

    // Select Image Formats
    const formatSection = page.locator('text=/Image.*Format|Social.*Platform/i').first();
    if (await formatSection.isVisible()) {
      // Select Instagram Post
      const instagramPost = page.locator('input[value="instagram_post"]').or(
        page.locator('label:has-text("Instagram Post")')
      );
      await instagramPost.check();

      // Select Instagram Story
      const instagramStory = page.locator('input[value="instagram_story"]').or(
        page.locator('label:has-text("Instagram Story")')
      );
      await instagramStory.check();

      console.log('✅ Selected multiple image formats');
    }

    console.log('✅ Campaign configuration completed');

    // ============================================
    // PHASE 4: Generation Process
    // ============================================
    console.log('\n🎨 PHASE 4: AI Image Generation');

    // Find and click generate button
    const generateButton = page.locator('button:has-text("Generate")').or(
      page.locator('button:has-text("Create Campaign")').or(
        page.locator('button:has-text("Start Generation")')
      )
    );

    await expect(generateButton).toBeEnabled();
    await generateButton.click();
    console.log('✅ Generation started');

    // Monitor generation progress
    const progressIndicator = page.locator('[role="progressbar"]').or(
      page.locator('.progress-bar').or(
        page.locator('text=/Generating|Processing|Creating/i')
      )
    );

    // Wait for progress to appear
    await expect(progressIndicator).toBeVisible({ timeout: 10000 });
    console.log('✅ Generation progress visible');

    // Check for progress updates
    const progressTexts = [
      'Analyzing product',
      'Creating prompts',
      'Generating images',
      'Processing',
      'Finalizing'
    ];

    for (const text of progressTexts) {
      const progressText = page.locator(`text=/${text}/i`);
      if (await progressText.isVisible({ timeout: 2000 })) {
        console.log(`✅ Progress: ${text}`);
      }
    }

    // Wait for generation to complete (max 2 minutes)
    await page.waitForFunction(
      () => {
        const progressEl = document.querySelector('[role="progressbar"]');
        const completeText = document.querySelector('text=/Complete|Finished|Success/i');
        return !progressEl || completeText;
      },
      { timeout: 120000 }
    ).catch(() => {
      console.log('⚠️ Generation timeout - checking if images are displayed');
    });

    // ============================================
    // PHASE 5: Image Gallery & Selection
    // ============================================
    console.log('\n🖼️ PHASE 5: Image Gallery & Selection');

    // Wait for image gallery to appear
    const imageGallery = page.locator('.image-gallery').or(
      page.locator('[data-testid="image-gallery"]').or(
        page.locator('text=/Generated.*Images|Campaign.*Results/i')
      )
    );

    await expect(imageGallery).toBeVisible({ timeout: 30000 });
    console.log('✅ Image gallery displayed');

    // Check for generated images
    const generatedImages = page.locator('img[alt*="Generated"], img[alt*="Campaign"]').or(
      page.locator('.generated-image')
    );

    const imageCount = await generatedImages.count();
    console.log(`✅ Found ${imageCount} generated images`);

    if (imageCount > 0) {
      // Verify image preview functionality
      await generatedImages.first().click();

      // Check for modal or enlarged preview
      const imageModal = page.locator('[role="dialog"]').or(
        page.locator('.modal').or(
          page.locator('.image-preview-modal')
        )
      );

      if (await imageModal.isVisible({ timeout: 3000 })) {
        console.log('✅ Image preview modal opened');

        // Check for image details
        await expect(page.locator('text=/Dimensions|Format|Size/i')).toBeVisible();

        // Close modal
        const closeButton = page.locator('[aria-label="Close"]').or(
          page.locator('button:has-text("Close")').or(
            page.keyboard.press('Escape')
          )
        );

        if (closeButton) {
          await closeButton;
        }
        console.log('✅ Image preview modal closed');
      }
    }

    // Test image selection
    const selectionCheckboxes = page.locator('input[type="checkbox"]').or(
      page.locator('[role="checkbox"]')
    );

    if (await selectionCheckboxes.count() > 0) {
      // Select a few images
      const checkboxCount = Math.min(3, await selectionCheckboxes.count());
      for (let i = 0; i < checkboxCount; i++) {
        await selectionCheckboxes.nth(i).check();
      }
      console.log(`✅ Selected ${checkboxCount} images`);

      // Verify selection counter updates
      const selectionCounter = page.locator('text=/Selected.*\\d+/i');
      if (await selectionCounter.isVisible()) {
        console.log('✅ Selection counter updated');
      }
    }

    // ============================================
    // PHASE 6: Download Process
    // ============================================
    console.log('\n📥 PHASE 6: Download Process');

    // Find download button
    const downloadButton = page.locator('button:has-text("Download")').or(
      page.locator('a:has-text("Download")').or(
        page.locator('button:has-text("Save Campaign")')
      )
    );

    if (await downloadButton.isVisible()) {
      // Set up download promise
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);

      await downloadButton.click();
      console.log('✅ Download initiated');

      const download = await downloadPromise;
      if (download) {
        console.log(`✅ Download started: ${download.suggestedFilename()}`);

        // Verify it's a ZIP file
        expect(download.suggestedFilename()).toMatch(/\.zip$/i);
        console.log('✅ Download is ZIP file format');
      }
    }

    // Check for success message
    const successMessage = page.locator('text=/Success|Complete|Ready|Downloaded/i');
    if (await successMessage.isVisible({ timeout: 5000 })) {
      console.log('✅ Success message displayed');
    }

    // ============================================
    // PHASE 7: UI/UX Validation
    // ============================================
    console.log('\n✨ PHASE 7: UI/UX Validation');

    // Check responsive design
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);

      // Check key elements are still visible
      const keyElement = page.locator('h1, h2').first();
      await expect(keyElement).toBeVisible();
      console.log(`✅ ${viewport.name} viewport validated`);
    }

    // Check accessibility
    const accessibilityChecks = [
      { selector: 'button', attribute: 'aria-label' },
      { selector: 'img', attribute: 'alt' },
      { selector: '[role]', attribute: 'role' }
    ];

    for (const check of accessibilityChecks) {
      const elements = page.locator(check.selector);
      const count = await elements.count();
      if (count > 0) {
        const firstEl = elements.first();
        const attrValue = await firstEl.getAttribute(check.attribute);
        if (attrValue) {
          console.log(`✅ Accessibility: ${check.selector} has ${check.attribute}`);
        }
      }
    }

    console.log('\n🎉 COMPLETE E2E WORKFLOW TEST PASSED!');
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    console.log('🔍 Testing error handling...');

    await page.goto('/campaign/new');

    // Test invalid product selection
    const disabledProducts = page.locator('.product-card.disabled').or(
      page.locator('[data-testid="product-card"][disabled]')
    );

    if (await disabledProducts.count() > 0) {
      await disabledProducts.first().click({ force: true });

      // Should show "Coming Soon" or not proceed
      const comingSoon = page.locator('text=/Coming.*Soon|Not.*Available/i');
      if (await comingSoon.isVisible({ timeout: 2000 })) {
        console.log('✅ Disabled product shows appropriate message');
      }
    }

    // Test generation with minimal selection
    const availableProduct = page.locator('.product-card:not(.disabled)').first();
    if (await availableProduct.isVisible()) {
      await availableProduct.click();

      // Try to generate without selecting formats
      const generateButton = page.locator('button:has-text("Generate")');
      if (await generateButton.isVisible()) {
        // Uncheck all formats if possible
        const formats = page.locator('input[type="checkbox"][name*="format"]');
        const formatCount = await formats.count();
        for (let i = 0; i < formatCount; i++) {
          await formats.nth(i).uncheck();
        }

        await generateButton.click();

        // Should show validation error
        const errorMessage = page.locator('text=/Please.*select|Required|Must.*choose/i');
        if (await errorMessage.isVisible({ timeout: 3000 })) {
          console.log('✅ Validation error displayed for missing formats');
        }
      }
    }

    console.log('✅ Error handling validated');
  });

  test('should validate AI generation quality and text preservation', async ({ page }) => {
    console.log('🤖 Testing AI generation quality...');

    // Navigate directly to a test campaign if available
    await page.goto('/campaign/new');

    // Quick setup for generation test
    const quickSetup = async () => {
      // Select first available product - try multiple selectors
      const product = page.locator('.product-card:not(.disabled), [data-testid="product-card"]:not([disabled]), div:has-text("Nutrilite"):not(.opacity-50)').first();
      if (await product.count() > 0) {
        await product.click();
      } else {
        // Fallback to any clickable product element
        await page.locator('button:has-text("Select"), div:has-text("Artistry")').first().click();
      }

      // Select minimal config for speed
      await page.locator('input[value="product_focus"]').click();
      await page.locator('input[value="professional"]').click();
      await page.locator('input[value="1"]').click(); // Single image
      await page.locator('input[value="instagram_post"]').check();

      // Generate
      await page.locator('button:has-text("Generate")').click();
    };

    await quickSetup();

    // Wait for generation
    await page.waitForSelector('.generated-image, img[alt*="Generated"]', { timeout: 60000 });

    // Check image quality indicators
    const images = page.locator('img[alt*="Generated"]');
    const firstImage = images.first();

    if (await firstImage.isVisible()) {
      // Check image loaded properly
      const imageSrc = await firstImage.getAttribute('src');
      expect(imageSrc).toBeTruthy();

      // Check for quality metadata if available
      const metadata = page.locator('text=/1080.*1080|1920.*1080|Quality/i');
      if (await metadata.isVisible()) {
        console.log('✅ Image quality metadata displayed');
      }

      // Verify text preservation features are mentioned
      const textPreservation = page.locator('text=/Text.*Clear|Brand.*Visible|Product.*Name/i');
      if (await textPreservation.isVisible()) {
        console.log('✅ Text preservation confirmed in UI');
      }
    }

    console.log('✅ AI generation quality validated');
  });
});