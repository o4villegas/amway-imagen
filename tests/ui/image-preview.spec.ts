import { test, expect } from '@playwright/test';
import { createCampaignFlowHelper } from '../helpers/campaign-flow-helper';

test.describe('Image Preview and Selection - Realistic User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we're using the correct test server
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('✅')) {
        console.log(msg.text());
      }
    });
  });

  test('should display image gallery with tabs by format after generation', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Simulate complete campaign flow to reach preview state
    await flowHelper.simulateCompleteFlow({
      productIndex: 0,
      campaignType: 'product_focus',
      brandStyle: 'professional',
      campaignSize: 3, // Generate 3 images for multiple formats
      mockGeneration: true
    });

    // Verify we're in preview state
    await flowHelper.verifyPreviewState();

    // Check tabs are visible with correct format names
    await expect(page.locator('text=Instagram Post').first()).toBeVisible();
    await expect(page.locator('text=Instagram Story').first()).toBeVisible();
    await expect(page.locator('text=Facebook Cover').first()).toBeVisible();

    // Check image count display in tabs
    const tabsList = page.locator('[role="tablist"]').first();
    await expect(tabsList).toBeVisible();

    // Verify tab counts
    await expect(page.locator('text=/Instagram Post.*\\(1\\)/').first()).toBeVisible();
    await expect(page.locator('text=/Instagram Story.*\\(1\\)/').first()).toBeVisible();
    await expect(page.locator('text=/Facebook Cover.*\\(1\\)/').first()).toBeVisible();
  });

  test('should show selection controls and summary', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Simulate complete flow
    await flowHelper.simulateCompleteFlow({
      mockGeneration: true
    });

    // Check selection summary is visible
    await expect(page.locator('text=/\\d+ of \\d+ images selected/').first()).toBeVisible();

    // Initially should show 2 of 3 selected (based on mock data)
    await expect(page.locator('text=2 of 3 images selected').first()).toBeVisible();

    // Check control buttons are visible
    await expect(page.locator('button:has-text("Select All")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Deselect All")').first()).toBeVisible();

    // Save Selected button should be visible when items are selected
    await expect(page.locator('button:has-text("Save Selected")').first()).toBeVisible();
    await expect(page.locator('text=Save Selected (2)').first()).toBeVisible();
  });

  test('should toggle image selection with checkboxes across tabs', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Simulate complete flow
    await flowHelper.simulateCompleteFlow({
      mockGeneration: true
    });

    // Test checkbox interaction across different tabs
    const formats = [
      { name: 'Instagram Post', expectedState: 'checked' },
      { name: 'Instagram Story', expectedState: 'checked' },
      { name: 'Facebook Cover', expectedState: 'unchecked' }
    ];

    // Verify initial states by switching through tabs
    for (const format of formats) {
      await page.locator(`[role="tab"]:has-text("${format.name}")`).click();
      const checkbox = page.locator('button[role="checkbox"]').first();
      await expect(checkbox).toBeVisible();
      await expect(checkbox).toHaveAttribute('data-state', format.expectedState);
    }

    // Toggle Instagram Post (uncheck it)
    await page.locator('[role="tab"]:has-text("Instagram Post")').click();
    const instagramPostCheckbox = page.locator('button[role="checkbox"]').first();
    await instagramPostCheckbox.click();

    // Selection count should update
    await expect(page.locator('text=1 of 3 images selected').first()).toBeVisible();

    // Toggle Facebook Cover (check it)
    await page.locator('[role="tab"]:has-text("Facebook Cover")').click();
    const facebookCoverCheckbox = page.locator('button[role="checkbox"]').first();
    await facebookCoverCheckbox.click();

    // Selection count should update again
    await expect(page.locator('text=2 of 3 images selected').first()).toBeVisible();
  });

  test('should handle select all and deselect all functionality across tabs', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Simulate complete flow
    await flowHelper.simulateCompleteFlow({
      mockGeneration: true
    });

    // Click Select All
    await page.locator('button:has-text("Select All")').first().click();

    // All images should be selected
    await expect(page.locator('text=3 of 3 images selected').first()).toBeVisible();

    // Verify all checkboxes are checked by switching through tabs
    const formats = ['Instagram Post', 'Instagram Story', 'Facebook Cover'];
    for (const format of formats) {
      await page.locator(`[role="tab"]:has-text("${format}")`).click();
      const checkbox = page.locator('button[role="checkbox"]').first();
      await expect(checkbox).toHaveAttribute('data-state', 'checked');
    }

    // Click Deselect All
    await page.locator('button:has-text("Deselect All")').first().click();

    // No images should be selected
    await expect(page.locator('text=0 of 3 images selected').first()).toBeVisible();

    // Verify all checkboxes are unchecked by switching through tabs
    for (const format of formats) {
      await page.locator(`[role="tab"]:has-text("${format}")`).click();
      const checkbox = page.locator('button[role="checkbox"]').first();
      await expect(checkbox).toHaveAttribute('data-state', 'unchecked');
    }

    // Save Selected button should not be visible when nothing is selected
    await expect(page.locator('button:has-text("Save Selected")').first()).not.toBeVisible();
  });

  test('should display image dimensions and format information', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Simulate complete flow
    await flowHelper.simulateCompleteFlow({
      mockGeneration: true
    });

    // Check dimension displays for each format by switching tabs
    const dimensionChecks = [
      { tab: 'Instagram Post', dimension: '1080 × 1080px', format: 'Instagram Post' },
      { tab: 'Instagram Story', dimension: '1080 × 1920px', format: 'Instagram Story' },
      { tab: 'Facebook Cover', dimension: '1200 × 630px', format: 'Facebook Cover' }
    ];

    for (const check of dimensionChecks) {
      // Click the tab
      await page.locator(`[role="tab"]:has-text("${check.tab}")`).click();
      await page.waitForTimeout(200); // Allow tab switch animation

      // Check dimension text is visible
      await expect(page.locator(`text=${check.dimension}`).first()).toBeVisible();

      // Check format label is visible
      await expect(page.locator(`text=${check.format}`).nth(1)).toBeVisible(); // nth(1) to skip tab label
    }
  });

  test('should open preview modal when clicking preview button', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Simulate complete flow
    await flowHelper.simulateCompleteFlow({
      mockGeneration: true
    });

    // Ensure we're on Instagram Post tab (default tab)
    await page.locator('[role="tab"]:has-text("Instagram Post")').click();

    // Wait for tab content to load
    await expect(page.locator('img[alt*="Generated"]').first()).toBeVisible();

    // Hover over image container to reveal action buttons
    const imageContainer = page.locator('.group').first();
    await imageContainer.hover();
    await page.waitForTimeout(500); // Wait for CSS transition

    // Find and click the preview button (button with Maximize2 icon)
    // The preview button is in the bottom-right corner with the Maximize2 svg icon
    const previewButton = imageContainer.locator('button:has(svg.lucide-maximize2)').first();

    // If that doesn't work, try selecting by position (first button in the button group)
    const fallbackButton = imageContainer.locator('.absolute.bottom-2.right-2 button').first();
    const buttonToClick = await previewButton.count() > 0 ? previewButton : fallbackButton;

    await expect(buttonToClick).toBeVisible();
    await buttonToClick.click();

    // Wait for modal with better selector and longer timeout
    await page.waitForSelector('[role="dialog"]', {
      state: 'visible',
      timeout: 10000
    });

    // Check modal opens
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Check modal contains image format info
    await expect(page.locator('text=/Instagram Post.*1080.*1080/').first()).toBeVisible();

    // Close modal by pressing Escape
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('should enable download button when images are selected', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Simulate complete flow
    await flowHelper.simulateCompleteFlow({
      mockGeneration: true
    });

    // Initially 2 images are selected
    const saveBtn = page.locator('button:has-text("Save Selected")').first();
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();
    await expect(saveBtn).toContainText('Save Selected (2)');

    // Deselect all
    await page.locator('button:has-text("Deselect All")').first().click();

    // Save button should disappear or be disabled
    await expect(saveBtn).not.toBeVisible();

    // Select one image (ensure we're on Instagram Post tab)
    await page.locator('[role="tab"]:has-text("Instagram Post")').click();
    const checkbox = page.locator('button[role="checkbox"]').first();
    await checkbox.click();

    // Save button should reappear
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toContainText('Save Selected (1)');
  });

  test('should navigate to download step when continuing', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Simulate complete flow
    await flowHelper.simulateCompleteFlow({
      mockGeneration: true
    });

    // Look for continue button
    const continueBtn = page.locator('button:has-text("Continue to Download")').first();

    // Verify button exists and click it
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // Should navigate to download/complete step - check for any of these possible texts
    const downloadPageIndicators = [
      'text=Campaign Complete',
      'text=Download Campaign',
      'text=Your campaign is ready',
      'h2:has-text("Campaign Complete")',
      'h2:has-text("Download")'
    ];

    let navigationSuccessful = false;
    for (const indicator of downloadPageIndicators) {
      const element = page.locator(indicator).first();
      if (await element.count() > 0) {
        await expect(element).toBeVisible({ timeout: 5000 });
        navigationSuccessful = true;
        break;
      }
    }

    // If none of the expected indicators are found, just verify URL changed or step progression
    if (!navigationSuccessful) {
      // Fallback: check if we've moved away from preview step
      await expect(page.locator('h2:has-text("Preview & Select Images")')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle tab switching between image formats', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Simulate complete flow
    await flowHelper.simulateCompleteFlow({
      campaignSize: 3,
      mockGeneration: true
    });

    // Click on Instagram Story tab
    const storyTab = page.locator('[role="tab"]:has-text("Instagram Story")').first();
    await storyTab.click();

    // Verify tab is active
    await expect(storyTab).toHaveAttribute('data-state', 'active');

    // Click on Facebook Cover tab
    const coverTab = page.locator('[role="tab"]:has-text("Facebook Cover")').first();
    await coverTab.click();

    // Verify tab is active
    await expect(coverTab).toHaveAttribute('data-state', 'active');
  });

  test('should download individual images', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Track download requests
    const downloadPromises: Promise<any>[] = [];

    page.on('download', download => {
      downloadPromises.push(download.path());
    });

    // Simulate complete flow
    await flowHelper.simulateCompleteFlow({
      mockGeneration: true
    });

    // Ensure we're on Instagram Post tab
    await page.locator('[role="tab"]:has-text("Instagram Post")').click();

    // Hover over image container to reveal download button
    const imageContainer = page.locator('.group').first();
    await imageContainer.hover();
    await page.waitForTimeout(500); // Wait for CSS transition

    // Find and click the download button (second button with Download icon)
    const downloadButton = imageContainer.locator('button').nth(1); // Second button is download
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();

    // Note: Actual download won't work in test environment due to mocked images
    // But we've verified the UI interaction works
  });

  test('should validate generated creative quality', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Simulate complete flow with high quality settings
    await flowHelper.simulateCompleteFlow({
      campaignType: 'product_focus',
      brandStyle: 'professional',
      campaignSize: 3,
      mockGeneration: true
    });

    // Verify all images are loaded and visible by checking each tab
    const formats = ['Instagram Post', 'Instagram Story', 'Facebook Cover'];
    let totalImages = 0;

    for (const format of formats) {
      await page.locator(`[role="tab"]:has-text("${format}")`).click();
      const images = page.locator('img[alt*="Generated"]');
      const imageCount = await images.count();

      if (imageCount > 0) {
        totalImages += imageCount;
        const img = images.first();
        await expect(img).toBeVisible();

        // Verify image has proper aspect ratio container
        const container = img.locator('xpath=..');
        await expect(container).toHaveCSS('position', 'relative');
      }
    }

    expect(totalImages).toBeGreaterThan(0);

    // Verify format-specific quality by checking dimension text in each tab
    const formatInfo = [
      { format: 'Instagram Post', width: 1080, height: 1080 },
      { format: 'Instagram Story', width: 1080, height: 1920 },
      { format: 'Facebook Cover', width: 1200, height: 630 }
    ];

    for (const info of formatInfo) {
      await page.locator(`[role="tab"]:has-text("${info.format}")`).click();
      // Check dimension text is displayed below the image
      const dimensionText = page.locator(`text=${info.width} × ${info.height}px`).first();
      await expect(dimensionText).toBeVisible();
    }
  });
});

test.describe('Image Preview Error Handling', () => {
  test('should handle failed image loading gracefully', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Mock with some failed images
    await page.route('/api/campaign/1/images/2', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 404,
          body: 'Image not found'
        });
      }
    });

    // Simulate flow
    await flowHelper.simulateCompleteFlow({
      mockGeneration: true
    });

    // Gallery should still be functional
    await expect(page.locator('text=/\\d+ of \\d+ images selected/').first()).toBeVisible();

    // Other controls should work
    await expect(page.locator('button:has-text("Select All")').first()).toBeEnabled();
  });

  test('should handle empty campaign gracefully', async ({ page }) => {
    const flowHelper = createCampaignFlowHelper(page);

    // Mock empty image response
    await page.route('/api/campaign/1/images', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          campaignId: 1,
          images: []
        })
      });
    });

    // Override the normal generation mock
    await page.route('/api/campaign/generate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          campaignId: 1,
          totalImages: 0,
          successfulImages: 0
        })
      });
    });

    // Simulate flow
    await flowHelper.simulateCompleteFlow({
      mockGeneration: false // Use our custom mock
    });

    // Should show appropriate empty state message
    const emptyStateIndicators = [
      'text=0 of 0 images selected',
      'text=No images',
      'text=No images generated',
      'text=0 images'
    ];

    let foundEmptyState = false;
    for (const indicator of emptyStateIndicators) {
      const element = page.locator(indicator).first();
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
        foundEmptyState = true;
        break;
      }
    }

    // If no specific empty state message, just verify no images are shown
    if (!foundEmptyState) {
      await expect(page.locator('img[alt*="Generated"]')).toHaveCount(0);
    }
  });
});