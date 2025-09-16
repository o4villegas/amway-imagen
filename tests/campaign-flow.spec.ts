import { test, expect } from '@playwright/test';

test.describe('Campaign Creation Flow', () => {
  test('should display the main campaign page with Amway logo', async ({ page }) => {
    await page.goto('/campaign/new');

    // Check page loads correctly
    await expect(page).toHaveTitle(/Amway/);

    // Check logo is displayed
    await expect(page.locator('img[alt="Amway"]')).toBeVisible();

    // Check main heading
    await expect(page.locator('h1')).toContainText('IBO Image Campaign Generator');

    // Check progress indicator shows step 1 active
    await expect(page.locator('[data-testid="step-1"]').or(page.locator('text=Product URL').first())).toBeVisible();
  });

  test('should show URL input form on initial load', async ({ page }) => {
    await page.goto('/campaign/new');

    // Check URL input is visible
    await expect(page.locator('input[type="url"]').or(page.locator('input[placeholder*="URL"]'))).toBeVisible();

    // Check submit button is disabled initially
    await expect(page.locator('button[type="submit"]').or(page.locator('button:has-text("Extract Product")'))).toBeDisabled();
  });

  test('should validate URL format', async ({ page }) => {
    await page.goto('/campaign/new');

    // Find URL input
    const urlInput = page.locator('input[type="url"]').or(page.locator('input[placeholder*="URL"]')).first();

    // Enter invalid URL
    await urlInput.fill('not-a-valid-url');

    // Check validation message appears (could be native browser validation or custom)
    await expect(page.locator('text=valid URL').or(page.locator('text=Invalid'))).toBeVisible();
  });

  test('should accept valid Amway URL format', async ({ page }) => {
    await page.goto('/campaign/new');

    // Find URL input and submit button
    const urlInput = page.locator('input[type="url"]').or(page.locator('input[placeholder*="URL"]')).first();
    const submitBtn = page.locator('button[type="submit"]').or(page.locator('button:has-text("Extract")')).first();

    // Enter valid Amway URL format
    await urlInput.fill('https://www.amway.com/en_US/p-123456');

    // Check submit button becomes enabled
    await expect(submitBtn).toBeEnabled();
  });

  test('should show loading state during scraping', async ({ page }) => {
    // Mock the scraping API to add delay
    await page.route('/api/scrape', async route => {
      // Add delay to simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          product: {
            id: 1,
            name: 'Test Product',
            description: 'Test Description',
            brand: 'Amway',
            price: 29.99,
            currency: 'USD'
          }
        })
      });
    });

    await page.goto('/campaign/new');

    // Enter valid URL and submit
    const urlInput = page.locator('input[type="url"]').or(page.locator('input[placeholder*="URL"]')).first();
    const submitBtn = page.locator('button[type="submit"]').or(page.locator('button:has-text("Extract")')).first();

    await urlInput.fill('https://www.amway.com/en_US/p-123456');
    await submitBtn.click();

    // Check loading indicator appears
    await expect(page.locator('text=Extracting').or(page.locator('[data-testid="loading"]'))).toBeVisible();
  });

  test('should navigate to configuration step after successful scraping', async ({ page }) => {
    // Mock successful scraping
    await page.route('/api/scrape', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          product: {
            id: 1,
            name: 'Test Product',
            description: 'Test Description',
            brand: 'Amway',
            price: 29.99,
            currency: 'USD',
            category: 'Health',
            main_image_url: 'https://www.amway.com/medias/test.jpg'
          }
        })
      });
    });

    await page.goto('/campaign/new');

    // Complete URL step
    const urlInput = page.locator('input[type="url"]').or(page.locator('input[placeholder*="URL"]')).first();
    const submitBtn = page.locator('button[type="submit"]').or(page.locator('button:has-text("Extract")')).first();

    await urlInput.fill('https://www.amway.com/en_US/p-123456');
    await submitBtn.click();

    // Wait for navigation to configuration step
    await expect(page.locator('text=Configure').or(page.locator('[data-testid="step-2"]'))).toBeVisible();
    await expect(page.locator('text=Test Product')).toBeVisible();
  });
});