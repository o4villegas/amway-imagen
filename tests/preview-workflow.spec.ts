import { test, expect } from '@playwright/test';

test.describe('Preview Workflow - Phase 1a', () => {
  test('should complete full workflow: generation → preview → package → download', async ({ page }) => {
    const testUrl = 'https://www.amway.com/en_US/nutrilite-double-x-vitamin-mineral-phytonutrient-p-110237';

    await page.goto('/campaign/new');
    await expect(page.getByRole('heading', { name: /campaign/i })).toBeVisible();

    await page.getByPlaceholder(/paste.*url/i).fill(testUrl);
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/fetching/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: /nutrilite/i })).toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: /generate/i }).click();

    await expect(page.getByText(/generating/i)).toBeVisible({ timeout: 5000 });

    await expect(page.getByText(/preview.*select/i)).toBeVisible({ timeout: 120000 });

    const imageElements = page.locator('img[alt*="Generated"]');
    await expect(imageElements.first()).toBeVisible({ timeout: 10000 });
    const imageCount = await imageElements.count();
    expect(imageCount).toBeGreaterThan(0);

    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();
    await expect(firstCheckbox).toBeChecked();

    const packageButton = page.getByRole('button', { name: /create.*package/i });
    await expect(packageButton).toBeEnabled();

    await packageButton.click();

    await expect(page.getByText(/packaging/i)).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('link', { name: /download/i })).toBeVisible({ timeout: 30000 });

    const downloadLink = page.getByRole('link', { name: /download/i });
    const href = await downloadLink.getAttribute('href');
    expect(href).toContain('/api/campaign/download/campaigns/');
    expect(href).toContain('.zip');
  });

  test('should not allow packaging without selected images', async ({ page }) => {
    await page.goto('/campaign/new');

    await page.getByPlaceholder(/paste.*url/i).fill('https://www.amway.com/en_US/nutrilite-double-x-vitamin-mineral-phytonutrient-p-110237');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /nutrilite/i })).toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: /generate/i }).click();

    await expect(page.getByText(/preview.*select/i)).toBeVisible({ timeout: 120000 });

    await expect(page.locator('img[alt*="Generated"]').first()).toBeVisible();

    const packageButton = page.getByRole('button', { name: /create.*package/i });
    await expect(packageButton).toBeDisabled();
  });

  test('should display 5 progress steps including preview', async ({ page }) => {
    await page.goto('/campaign/new');

    await page.getByPlaceholder(/paste.*url/i).fill('https://www.amway.com/en_US/nutrilite-double-x-vitamin-mineral-phytonutrient-p-110237');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /nutrilite/i })).toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: /generate/i }).click();

    await expect(page.getByText(/preview.*select/i)).toBeVisible({ timeout: 120000 });

    await expect(page.getByText(/product.*information/i)).toBeVisible();
    await expect(page.getByText(/preferences/i)).toBeVisible();
    await expect(page.getByText(/generation/i)).toBeVisible();
    await expect(page.getByText(/preview/i)).toBeVisible();
    await expect(page.getByText(/download/i)).toBeVisible();
  });

  test('should show correct image count in preview', async ({ page }) => {
    await page.goto('/campaign/new');

    await page.getByPlaceholder(/paste.*url/i).fill('https://www.amway.com/en_US/nutrilite-double-x-vitamin-mineral-phytonutrient-p-110237');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /nutrilite/i })).toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: /generate/i }).click();

    await expect(page.getByText(/preview.*select/i)).toBeVisible({ timeout: 120000 });

    const imageElements = page.locator('img[alt*="Generated"]');
    const imageCount = await imageElements.count();

    expect(imageCount).toBe(5);

    await expect(page.getByText(/5.*image/i)).toBeVisible();
  });

  test('should update selected count when checking images', async ({ page }) => {
    await page.goto('/campaign/new');

    await page.getByPlaceholder(/paste.*url/i).fill('https://www.amway.com/en_US/nutrilite-double-x-vitamin-mineral-phytonutrient-p-110237');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /nutrilite/i })).toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: /generate/i }).click();

    await expect(page.getByText(/preview.*select/i)).toBeVisible({ timeout: 120000 });

    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes.first()).toBeVisible();

    await checkboxes.nth(0).check();
    await expect(page.getByText(/1.*selected/i)).toBeVisible();

    await checkboxes.nth(1).check();
    await expect(page.getByText(/2.*selected/i)).toBeVisible();

    await checkboxes.nth(0).uncheck();
    await expect(page.getByText(/1.*selected/i)).toBeVisible();
  });

  test('should handle packaging errors gracefully', async ({ page }) => {
    await page.route('**/api/campaign/*/package', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Packaging failed' })
      });
    });

    await page.goto('/campaign/new');

    await page.getByPlaceholder(/paste.*url/i).fill('https://www.amway.com/en_US/nutrilite-double-x-vitamin-mineral-phytonutrient-p-110237');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByRole('heading', { name: /nutrilite/i })).toBeVisible({ timeout: 30000 });

    await page.getByRole('button', { name: /generate/i }).click();

    await expect(page.getByText(/preview.*select/i)).toBeVisible({ timeout: 120000 });

    await page.locator('input[type="checkbox"]').first().check();

    await page.getByRole('button', { name: /create.*package/i }).click();

    await expect(page.getByText(/error|fail/i)).toBeVisible({ timeout: 10000 });
  });
});