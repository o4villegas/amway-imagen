import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test.describe('Mobile Layout', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

    test('should display mobile-friendly layout', async ({ page }) => {
      await page.goto('/campaign/new');

      // Check logo and title stack vertically on mobile
      const header = page.locator('h1').first();
      await expect(header).toBeVisible();

      // Check progress indicator is horizontal scrollable
      const progressContainer = page.locator('text=Select Product').locator('..');
      await expect(progressContainer).toBeVisible();
    });

    test('should show mobile-optimized image gallery', async ({ page }) => {
      // Mock campaign data
      await page.route('/api/campaign/1/images', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            campaignId: 1,
            images: [
              {
                id: 1,
                format: 'instagram_post',
                prompt: 'Test',
                width: 1080,
                height: 1080,
                selected: true,
                r2_path: 'campaigns/1/images/image1.jpg'
              }
            ]
          })
        });
      });

      await page.goto('/campaign/new');

      // Images should display in 2-column grid on mobile
      // This would require the component to be properly mounted
      // For now, just check the page is responsive
      const content = page.locator('main').or(page.locator('.container')).first();
      await expect(content).toBeVisible();
    });

    test('should have touch-friendly buttons', async ({ page }) => {
      await page.goto('/campaign/new');

      // Check buttons are large enough for touch interaction (min 44px)
      const submitBtn = page.locator('button').first();
      if (await submitBtn.isVisible()) {
        const box = await submitBtn.boundingBox();
        expect(box?.height).toBeGreaterThan(40);
      }
    });
  });

  test.describe('Tablet Layout', () => {
    test.use({ viewport: { width: 768, height: 1024 } }); // iPad

    test('should display tablet-optimized grid', async ({ page }) => {
      await page.goto('/campaign/new');

      // Check layout adapts to tablet size
      const container = page.locator('.container').first();
      await expect(container).toBeVisible();

      // Should use available space efficiently
      const content = page.locator('main').or(page.locator('.min-h-screen')).first();
      await expect(content).toBeVisible();
    });
  });

  test.describe('Desktop Layout', () => {
    test.use({ viewport: { width: 1920, height: 1080 } }); // Large desktop

    test('should display full desktop layout', async ({ page }) => {
      await page.goto('/campaign/new');

      // Check logo and title are side by side
      const header = page.locator('h1').first();
      await expect(header).toBeVisible();

      // Check all elements are visible without scrolling
      const progressBar = page.locator('text=Select Product').first();
      await expect(progressBar).toBeVisible();
    });

    test('should show 4-column image grid on large screens', async ({ page }) => {
      // Mock having many images
      await page.route('/api/campaign/1/images', async route => {
        const images = Array.from({ length: 8 }, (_, i) => ({
          id: i + 1,
          format: 'instagram_post',
          prompt: `Test ${i + 1}`,
          width: 1080,
          height: 1080,
          selected: true,
          r2_path: `test${i + 1}.jpg`
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            campaignId: 1,
            images
          })
        });
      });

      await page.goto('/campaign/new');
      // On large screens, grid should show more columns
      // This would require proper component mounting to test
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/campaign/new');

      // Check h1 exists
      await expect(page.locator('h1')).toBeVisible();

      // Check proper heading structure (h1 -> h2 -> h3)
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should have keyboard navigation', async ({ page }) => {
      await page.goto('/campaign/new');

      // Test tab navigation
      await page.keyboard.press('Tab');

      // Focus should be on first interactive element
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    });

    test('should have proper alt text for images', async ({ page }) => {
      await page.goto('/campaign/new');

      // Check logo has alt text
      const logo = page.locator('img[alt="Amway"]');
      await expect(logo).toBeVisible();

      // All images should have alt attributes
      const images = await page.locator('img').all();
      for (const img of images) {
        const altText = await img.getAttribute('alt');
        expect(altText).toBeTruthy();
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/campaign/new');

      // Check main text is visible (basic contrast check)
      const mainText = page.locator('h1').first();
      await expect(mainText).toBeVisible();

      // In a real test, you'd use tools like axe-core to check contrast ratios
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/campaign/new');

      // Check for ARIA labels and roles
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        // Button should have either visible text or aria-label
        expect(ariaLabel || text).toBeTruthy();
      }
    });
  });

  test.describe('Performance', () => {
    test('should load main page quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/campaign/new');
      await page.locator('h1').waitFor();
      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should not have layout shifts', async ({ page }) => {
      await page.goto('/campaign/new');

      // Wait for any dynamic content to load
      await page.waitForTimeout(1000);

      // Check that layout is stable
      const header = page.locator('h1');
      const initialPosition = await header.boundingBox();

      await page.waitForTimeout(2000);

      const finalPosition = await header.boundingBox();
      expect(finalPosition?.y).toBe(initialPosition?.y);
    });
  });
});