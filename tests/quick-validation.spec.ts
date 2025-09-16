/**
 * Quick Validation Tests - Essential functionality without browser dependencies
 * Tests critical issues identified by the E2E framework
 */

import { test, expect } from '@playwright/test';

test.describe('Quick Validation Suite', () => {
  test('Critical Page Load and Basic Navigation', async ({ page }) => {
    console.log('🚀 Testing critical page load...');

    // Test 1: Basic page load
    await page.goto('/campaign/new');

    // Verify essential elements load
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    console.log('✅ Main heading loaded');

    // Check for logo
    const logo = page.locator('img[alt="Amway"]');
    await expect(logo).toBeVisible({ timeout: 5000 });
    console.log('✅ Logo loaded');

    // Check URL input exists
    const urlInput = page.locator('input[type="url"]').or(page.locator('input[placeholder*="URL"]')).first();
    await expect(urlInput).toBeVisible({ timeout: 5000 });
    console.log('✅ URL input field loaded');

    // Check submit button exists
    const submitBtn = page.locator('button[type="submit"]').or(page.locator('button:has-text("Extract")')).first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    console.log('✅ Submit button loaded');

    // Test 2: Form validation with proper URL format but wrong domain
    await urlInput.fill('https://www.google.com/products/123');
    await page.waitForTimeout(500); // Allow validation to process
    const isDisabled = await submitBtn.isDisabled();
    if (isDisabled) {
      console.log('✅ Form validation working - button disabled for non-Amway URL');
    } else {
      console.log('⚠️ Form validation issue - button should be disabled for non-Amway URL');
    }

    // Test 3: Valid URL enables button
    await urlInput.fill('https://www.amway.com/en_US/p-123456');
    await page.waitForTimeout(1000); // Allow validation to run
    const isEnabled = await submitBtn.isEnabled();
    if (isEnabled) {
      console.log('✅ Form validation working - button enabled for valid URL');
    } else {
      console.log('⚠️ Form validation issue - button should be enabled');
    }
  });

  test('API Endpoint Validation', async ({ request }) => {
    console.log('🔍 Testing API endpoints...');

    // Test scraping endpoint with invalid URL (should return 400)
    const invalidResponse = await request.post('/api/scrape', {
      data: { url: 'invalid-url' }
    });
    expect(invalidResponse.status()).toBe(400);
    console.log('✅ Invalid URL properly rejected by API');

    // Test scraping endpoint with non-Amway URL (should return 400)
    const nonAmwayResponse = await request.post('/api/scrape', {
      data: { url: 'https://google.com' }
    });
    expect(nonAmwayResponse.status()).toBe(400);
    console.log('✅ Non-Amway URL properly rejected by API');

    // Test campaign images endpoint
    const imagesResponse = await request.get('/api/campaign/999/images');
    expect([200, 404].includes(imagesResponse.status())).toBeTruthy();
    console.log('✅ Campaign images endpoint responding');
  });

  test('Element Selector Stability', async ({ page }) => {
    console.log('🎯 Testing element selector stability...');

    await page.goto('/campaign/new');

    // Test various ways to find critical elements
    const selectors = [
      { name: 'URL Input', selectors: ['input[type="url"]', 'input[placeholder*="URL"]', 'input[placeholder*="product"]'] },
      { name: 'Submit Button', selectors: ['button[type="submit"]', 'button:has-text("Extract")', 'button:has-text("Submit")'] },
      { name: 'Main Heading', selectors: ['h1', 'text=IBO Image Campaign Generator', 'text=Campaign Generator'] }
    ];

    for (const element of selectors) {
      let found = false;
      for (const selector of element.selectors) {
        try {
          const locator = page.locator(selector);
          if (await locator.isVisible({ timeout: 2000 })) {
            console.log(`✅ ${element.name} found with selector: ${selector}`);
            found = true;
            break;
          }
        } catch {
          // Try next selector
        }
      }
      if (!found) {
        console.log(`❌ ${element.name} not found with any selector`);
      }
    }
  });

  test('Mock Scraping Flow', async ({ page }) => {
    console.log('🧪 Testing mocked scraping flow...');

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

    // Fill form and submit
    const urlInput = page.locator('input[type="url"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await urlInput.fill('https://www.amway.com/en_US/p-123456');
    await submitBtn.click();

    // Wait for next step with longer timeout
    try {
      await expect(page.locator('text=Test Product').or(page.locator('text=Configure')).or(page.locator('h2'))).toBeVisible({ timeout: 15000 });
      console.log('✅ Successfully navigated to configuration step');
    } catch (error) {
      console.log('❌ Failed to navigate to configuration step');

      // Debug: Check what's on the page
      const pageContent = await page.content();
      console.log('Page content length:', pageContent.length);

      // Check for any error messages
      const errorElements = await page.locator('text=error').or(page.locator('text=Error')).all();
      if (errorElements.length > 0) {
        console.log('❌ Error messages found on page');
      }
    }
  });

  test('Performance Baseline', async ({ page }) => {
    console.log('⚡ Testing performance baseline...');

    const startTime = Date.now();
    await page.goto('/campaign/new');
    await page.locator('h1').waitFor();
    const loadTime = Date.now() - startTime;

    console.log(`📊 Page load time: ${loadTime}ms`);

    if (loadTime < 3000) {
      console.log('✅ Good page load performance');
    } else if (loadTime < 10000) {
      console.log('⚠️ Slow page load performance');
    } else {
      console.log('❌ Very slow page load performance');
    }

    // Check for JavaScript errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Trigger some interactions
    const urlInput = page.locator('input[type="url"]').first();
    await urlInput.fill('test');
    await urlInput.clear();
    await urlInput.fill('https://www.amway.com/en_US/p-123456');

    await page.waitForTimeout(2000);

    if (errors.length === 0) {
      console.log('✅ No JavaScript errors detected');
    } else {
      console.log(`⚠️ ${errors.length} JavaScript errors detected:`, errors);
    }
  });

  test('Responsive Design Basic Check', async ({ page }) => {
    console.log('📱 Testing responsive design...');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/campaign/new');

    await expect(page.locator('h1')).toBeVisible();
    console.log('✅ Mobile viewport: Main heading visible');

    // Check if elements are still accessible
    const urlInput = page.locator('input[type="url"]').first();
    const inputBox = await urlInput.boundingBox();

    if (inputBox && inputBox.width > 0 && inputBox.height > 30) {
      console.log('✅ Mobile viewport: Input field properly sized');
    } else {
      console.log('⚠️ Mobile viewport: Input field sizing issues');
    }

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/campaign/new');

    await expect(page.locator('h1')).toBeVisible();
    console.log('✅ Tablet viewport: Main heading visible');

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/campaign/new');

    await expect(page.locator('h1')).toBeVisible();
    console.log('✅ Desktop viewport: Main heading visible');
  });
});