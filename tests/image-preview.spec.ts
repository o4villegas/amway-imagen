import { test, expect } from '@playwright/test';

test.describe('Image Preview and Selection', () => {
  // Mock campaign data
  const mockCampaignImages = [
    {
      id: 1,
      format: 'instagram_post',
      prompt: 'Professional product shot',
      width: 1080,
      height: 1080,
      selected: true,
      r2_path: 'campaigns/1/images/image1.jpg'
    },
    {
      id: 2,
      format: 'instagram_story',
      prompt: 'Lifestyle shot',
      width: 1080,
      height: 1920,
      selected: true,
      r2_path: 'campaigns/1/images/image2.jpg'
    },
    {
      id: 3,
      format: 'facebook_cover',
      prompt: 'Brand banner',
      width: 1200,
      height: 630,
      selected: false,
      r2_path: 'campaigns/1/images/image3.jpg'
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Mock the image list API
    await page.route('/api/campaign/1/images', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          campaignId: 1,
          images: mockCampaignImages
        })
      });
    });

    // Mock individual image endpoints
    for (const image of mockCampaignImages) {
      await page.route(`/api/campaign/1/images/${image.id}`, async route => {
        if (route.request().method() === 'GET') {
          // Return a small test image
          await route.fulfill({
            status: 200,
            contentType: 'image/jpeg',
            body: Buffer.from('fake-image-data')
          });
        } else if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
      });
    }
  });

  test('should display image gallery with tabs by format', async ({ page }) => {
    // Navigate directly to preview step (simulating completed generation)
    await page.goto('/campaign/new');
    await page.evaluate(() => {
      // Simulate being on preview step with mock data
      (window as any).__mockCampaignData = {
        step: 'preview',
        campaignId: 1,
        totalImages: 3
      };
    });

    // Check tabs are visible
    await expect(page.locator('text=Instagram Post')).toBeVisible();
    await expect(page.locator('text=Instagram Story')).toBeVisible();
    await expect(page.locator('text=Facebook Cover')).toBeVisible();

    // Check image count in tabs
    await expect(page.locator('text=Instagram Post (1)')).toBeVisible();
    await expect(page.locator('text=Instagram Story (1)')).toBeVisible();
    await expect(page.locator('text=Facebook Cover (1)')).toBeVisible();
  });

  test('should show selection controls', async ({ page }) => {
    await page.goto('/campaign/new');

    // Mock being on preview step
    await page.evaluate(() => {
      (window as any).__mockPreviewStep = true;
    });

    // Check selection summary
    await expect(page.locator('text=2 of 3 images selected')).toBeVisible();

    // Check control buttons
    await expect(page.locator('button:has-text("Select All")')).toBeVisible();
    await expect(page.locator('button:has-text("Deselect All")')).toBeVisible();
    await expect(page.locator('button:has-text("Save Selected")')).toBeVisible();
  });

  test('should toggle image selection', async ({ page }) => {
    await page.goto('/campaign/new');

    // Find first checkbox (should be checked for selected image)
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeChecked();

    // Uncheck it
    await firstCheckbox.uncheck();

    // Verify API call was made
    await page.waitForRequest(req =>
      req.url().includes('/api/campaign/1/images/1') &&
      req.method() === 'PATCH'
    );

    // Check selection count updated
    await expect(page.locator('text=1 of 3 images selected')).toBeVisible();
  });

  test('should handle select all and deselect all', async ({ page }) => {
    await page.goto('/campaign/new');

    // Click Select All
    await page.locator('button:has-text("Select All")').click();

    // Should show all selected
    await expect(page.locator('text=3 of 3 images selected')).toBeVisible();

    // Click Deselect All
    await page.locator('button:has-text("Deselect All")').click();

    // Should show none selected
    await expect(page.locator('text=0 of 3 images selected')).toBeVisible();
  });

  test('should show image dimensions and format info', async ({ page }) => {
    await page.goto('/campaign/new');

    // Check image info is displayed
    await expect(page.locator('text=1080 × 1080px')).toBeVisible();
    await expect(page.locator('text=1080 × 1920px')).toBeVisible();
    await expect(page.locator('text=1200 × 630px')).toBeVisible();
  });

  test('should open preview modal when clicking preview button', async ({ page }) => {
    await page.goto('/campaign/new');

    // Click preview button (eye icon or Preview text)
    await page.locator('button:has-text("Preview")').or(page.locator('[data-testid="preview-btn"]')).first().click();

    // Check modal opens
    await expect(page.locator('[role="dialog"]').or(page.locator('.modal'))).toBeVisible();

    // Check modal contains image format info
    await expect(page.locator('text=Instagram Post - 1080 × 1080px')).toBeVisible();
  });

  test('should enable download selected button when images are selected', async ({ page }) => {
    await page.goto('/campaign/new');

    // Save Selected button should be enabled with 2 images selected
    const saveBtn = page.locator('button:has-text("Save Selected")');
    await expect(saveBtn).toBeEnabled();
    await expect(saveBtn).toContainText('Save Selected (2)');

    // Deselect all
    await page.locator('button:has-text("Deselect All")').click();

    // Save button should be hidden or disabled
    await expect(saveBtn).not.toBeVisible();
  });

  test('should show continue button and navigate to summary', async ({ page }) => {
    await page.goto('/campaign/new');

    // Continue button should be visible
    const continueBtn = page.locator('button:has-text("Continue to Summary")');
    await expect(continueBtn).toBeVisible();

    // Click continue
    await continueBtn.click();

    // Should navigate to summary step
    await expect(page.locator('text=Campaign Complete')).toBeVisible();
  });
});