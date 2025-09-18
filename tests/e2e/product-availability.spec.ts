/**
 * E2E Tests for Product Availability Functionality
 * Tests the visual and functional differences between available and unavailable products
 */

import { test, expect } from '@playwright/test';
import { mockProducts, selectors, timeouts } from '../helpers/test-data';

test.describe('Product Availability Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to campaign creation page
    await page.goto('/campaign/new');
    await expect(page.locator('h1')).toContainText('Create New Campaign');

    // Wait for products to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow UI to stabilize
  });

  test('should display available products as clickable', async ({ page }) => {
    // Find available products
    const availableProducts = page.locator('.product-card:not(.disabled):not(.opacity-50)');

    // Should have exactly 3 available products based on our test data
    await expect(availableProducts).toHaveCount(3);

    // Check that available products are clickable
    const firstAvailable = availableProducts.first();
    await expect(firstAvailable).toBeVisible();
    await expect(firstAvailable).not.toHaveClass(/disabled/);
    await expect(firstAvailable).not.toHaveClass(/opacity-50/);

    // Should have normal cursor
    const cursor = await firstAvailable.evaluate(el =>
      window.getComputedStyle(el).cursor
    );
    expect(cursor).not.toBe('not-allowed');
  });

  test('should display unavailable products with "Coming Soon" state', async ({ page }) => {
    // Find disabled/unavailable products
    const unavailableProducts = page.locator('.product-card.disabled, .product-card.opacity-50');

    // Should have exactly 8 unavailable products
    await expect(unavailableProducts).toHaveCount(8);

    // Check visual styling of unavailable products
    const firstUnavailable = unavailableProducts.first();
    await expect(firstUnavailable).toBeVisible();

    // Should have disabled styling
    const hasDisabledClass = await firstUnavailable.evaluate(el =>
      el.classList.contains('disabled') || el.classList.contains('opacity-50')
    );
    expect(hasDisabledClass).toBe(true);

    // Should show "Coming Soon" badge or text
    const comingSoonElement = firstUnavailable.locator('text="Coming Soon"');
    await expect(comingSoonElement).toBeVisible();
  });

  test('should prevent selection of unavailable products', async ({ page }) => {
    // Try to click on a disabled product
    const disabledProduct = page.locator('.product-card.disabled, .product-card.opacity-50').first();
    await expect(disabledProduct).toBeVisible();

    // Check that it has not-allowed cursor
    const cursor = await disabledProduct.evaluate(el =>
      window.getComputedStyle(el).cursor
    );
    expect(cursor).toBe('not-allowed');

    // Click should not progress the flow
    await disabledProduct.click({ force: true });

    // Should still be on the same step (product selection)
    await expect(page.locator('text="Choose from available products"')).toBeVisible();

    // Product preview section should not appear
    const productPreview = page.locator('[data-testid="product-preview"]');
    await expect(productPreview).not.toBeVisible();
  });

  test('should allow selection of available products', async ({ page }) => {
    // Click on an available product
    const availableProduct = page.locator('.product-card:not(.disabled):not(.opacity-50)').first();
    await expect(availableProduct).toBeVisible();

    await availableProduct.click();

    // Should proceed to product preview step
    await expect(page.locator('[data-testid="product-preview"]')).toBeVisible({ timeout: timeouts.medium });

    // Should show product details
    await expect(page.locator('text="Product Details"')).toBeVisible();

    // Continue button should be available
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")');
    await expect(continueButton).toBeVisible();
    await expect(continueButton).toBeEnabled();
  });

  test('should show correct product counts in UI', async ({ page }) => {
    // Check that the UI shows the correct breakdown
    const totalProducts = await page.locator('.product-card').count();
    expect(totalProducts).toBe(11); // 3 available + 8 coming soon

    // Verify specific products by name
    const artistryFoundation = page.locator('text="Artistry Exact Fit Powder Foundation"');
    await expect(artistryFoundation).toBeVisible();

    const nutriliteWomen = page.locator('text="Nutrilite™ Women\'s Pack"');
    await expect(nutriliteWomen).toBeVisible();

    const eSpring = page.locator('text="eSpring® Water Purifier"');
    await expect(eSpring).toBeVisible();
  });

  test('should handle API response with mixed availability', async ({ page }) => {
    // Mock API response to test different scenarios
    await page.route('/api/products/load', async route => {
      const mockResponse = {
        products: [
          { ...mockProducts[0], available: true },  // Available
          { ...mockProducts[1], available: false }, // Unavailable
          { ...mockProducts[2], available: undefined }, // Should default to true
          { ...mockProducts[3], available: null },  // Should default to true
        ]
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });

    // Reload to use mocked data
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show 3 available products (true, undefined defaults to true, null defaults to true)
    const availableProducts = page.locator('.product-card:not(.disabled):not(.opacity-50)');
    await expect(availableProducts).toHaveCount(3);

    // Should show 1 unavailable product
    const unavailableProducts = page.locator('.product-card.disabled, .product-card.opacity-50');
    await expect(unavailableProducts).toHaveCount(1);
  });

  test('should maintain accessibility standards for disabled products', async ({ page }) => {
    const disabledProduct = page.locator('.product-card.disabled, .product-card.opacity-50').first();

    // Should have proper ARIA attributes
    const ariaDisabled = await disabledProduct.getAttribute('aria-disabled');
    expect(ariaDisabled).toBe('true');

    // Should have descriptive text for screen readers
    const ariaLabel = await disabledProduct.getAttribute('aria-label');
    expect(ariaLabel).toContain('Coming Soon');
  });

  test('should handle edge case with empty product list', async ({ page }) => {
    // Mock empty response
    await page.route('/api/products/load', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products: [] })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show appropriate message
    await expect(page.locator('text="No products available"')).toBeVisible();
  });

  test('should complete full workflow with available product', async ({ page }) => {
    // Select an available product
    const availableProduct = page.locator('.product-card:not(.disabled):not(.opacity-50)').first();
    await availableProduct.click();

    // Complete the workflow
    await expect(page.locator('[data-testid="product-preview"]')).toBeVisible({ timeout: timeouts.medium });

    // Continue to preferences
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")');
    await continueButton.click();

    // Should reach preferences panel
    await expect(page.locator('[data-testid="preferences-panel"]')).toBeVisible({ timeout: timeouts.medium });

    // Verify campaign size is set to 5 (standardized)
    const campaignSizeFive = page.locator('input[value="5"]');
    await expect(campaignSizeFive).toBeChecked();
  });
});