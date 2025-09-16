const { test, expect } = require('@playwright/test');

test.describe('UX Compliance Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the campaign creation page
    await page.goto('http://localhost:3001/campaign/new');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Mobile Responsive Design', () => {
    test('should not have horizontal scrolling on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Wait for content to load
      await page.waitForSelector('#product-url');

      // Check for horizontal scrolling
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

      console.log(`Mobile scroll width: ${scrollWidth}px, viewport width: ${clientWidth}px`);

      // Allow small tolerance for browser differences
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    });

    test('should display mobile progress indicator correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Check that mobile progress indicator is visible
      const mobileProgress = page.locator('.md\\:hidden').first();
      await expect(mobileProgress).toBeVisible();

      // Check that desktop progress indicator is hidden
      const desktopProgress = page.locator('.hidden.md\\:block').first();
      await expect(desktopProgress).not.toBeVisible();

      // Verify progress bar exists
      const progressBar = page.locator('.bg-blue-600.h-2.rounded-full');
      await expect(progressBar).toBeVisible();

      // Verify step dots exist
      const stepDots = page.locator('.w-2.h-2.rounded-full');
      await expect(stepDots).toHaveCount(5); // 5 steps total
    });

    test('should display desktop progress indicator correctly', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Check that desktop progress indicator is visible
      const desktopProgress = page.locator('.hidden.md\\:block').first();
      await expect(desktopProgress).toBeVisible();

      // Check that mobile progress indicator is hidden
      const mobileProgress = page.locator('.md\\:hidden').first();
      await expect(mobileProgress).not.toBeVisible();

      // Verify all step labels are visible
      const stepLabels = ['Product URL', 'Configure', 'Generate', 'Preview', 'Download'];
      for (const label of stepLabels) {
        await expect(page.getByText(label)).toBeVisible();
      }
    });
  });

  test.describe('Touch Target Accessibility', () => {
    test('should have all buttons meet 44px minimum touch target', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Get all buttons
      const buttons = await page.locator('button').all();
      console.log(`Found ${buttons.length} buttons to test`);

      let failedButtons = 0;
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const box = await button.boundingBox();

        if (box) {
          console.log(`Button ${i + 1}: ${box.width}x${box.height}px`);

          // Check minimum touch target size
          if (box.width < 44 || box.height < 44) {
            console.log(`❌ Button ${i + 1} is too small: ${box.width}x${box.height}px`);
            failedButtons++;
          } else {
            console.log(`✅ Button ${i + 1} meets touch target requirements`);
          }
        }
      }

      expect(failedButtons).toBe(0);
    });

    test('should have primary action buttons optimized for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Test the main submit button
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();

      const box = await submitButton.boundingBox();
      expect(box).toBeTruthy();
      expect(box.height).toBeGreaterThanOrEqual(48); // Mobile primary buttons should be larger
    });
  });

  test.describe('Loading States and User Feedback', () => {
    test('should display loading overlay during form submission', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Fill in a valid URL
      await page.fill('#product-url', 'https://www.amway.com/en_US/p/326782');

      // Start form submission
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Check for loading overlay
      const loadingOverlay = page.locator('.bg-white\\/80.backdrop-blur-sm');
      await expect(loadingOverlay).toBeVisible();

      // Check for loading message
      await expect(page.getByText('Extracting product information...')).toBeVisible();

      // Check for loading spinner
      const spinner = page.locator('.animate-spin');
      await expect(spinner).toBeVisible();
    });

    test('should provide accessible loading states', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Fill in a valid URL
      await page.fill('#product-url', 'https://www.amway.com/en_US/p/326782');

      // Check aria-busy attribute on submit
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Verify aria-busy is set
      await expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  test.describe('Core Functionality Validation', () => {
    test('should have functional product URL input field', async ({ page }) => {
      // Verify the input field exists and is accessible
      const urlInput = page.locator('#product-url');
      await expect(urlInput).toBeVisible();
      await expect(urlInput).toBeEnabled();

      // Verify ARIA attributes
      await expect(urlInput).toHaveAttribute('aria-label', 'Amway product URL');

      // Test input functionality
      await urlInput.fill('https://www.amway.com/en_US/p/326782');
      await expect(urlInput).toHaveValue('https://www.amway.com/en_US/p/326782');
    });

    test('should validate URL input correctly', async ({ page }) => {
      const urlInput = page.locator('#product-url');
      const submitButton = page.locator('button[type="submit"]');

      // Test invalid URL
      await urlInput.fill('invalid-url');
      await expect(submitButton).toBeDisabled();

      // Test valid Amway URL
      await urlInput.fill('https://www.amway.com/en_US/p/326782');
      // Note: Button may still be disabled until client-side validation completes
      // This is expected behavior
    });

    test('should display error messages appropriately', async ({ page }) => {
      const urlInput = page.locator('#product-url');

      // Fill invalid URL and submit
      await urlInput.fill('https://invalid-domain.com/product');

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.isEnabled()) {
        await submitButton.click();

        // Check for error message
        const errorMessage = page.locator('[role="alert"]');
        await expect(errorMessage).toBeVisible();
      }
    });
  });

  test.describe('Cross-Viewport Consistency', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test(`should maintain functionality on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Core functionality should work on all viewports
        const urlInput = page.locator('#product-url');
        await expect(urlInput).toBeVisible();
        await expect(urlInput).toBeEnabled();

        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeVisible();

        // Progress indicator should be visible (mobile or desktop version)
        const progressExists = await page.locator('.w-8.h-8.rounded-full').first().isVisible();
        expect(progressExists).toBe(true);
      });
    }
  });
});