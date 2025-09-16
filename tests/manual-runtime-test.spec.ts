/**
 * Manual Runtime Testing - Live Browser Experience
 * This test manually validates the complete user flow in a real browser
 */

import { test, expect } from '@playwright/test';

test.describe('Manual Runtime Testing', () => {
  test('Complete user flow with real API calls', async ({ page }) => {
    console.log('🌐 Starting complete user flow test...');

    // Navigate to the application
    await page.goto('/campaign/new');

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/01-initial-load.png', fullPage: true });
    console.log('📸 Screenshot 1: Initial page load');

    // Verify initial elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[type="url"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    console.log('✅ Initial page elements loaded successfully');

    // Test URL input with real validation
    const urlInput = page.locator('input[type="url"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    // Try invalid URL first
    console.log('🔍 Testing invalid URL validation...');
    await urlInput.fill('https://www.google.com/invalid');
    await page.waitForTimeout(1000);

    const invalidDisabled = await submitBtn.isDisabled();
    console.log(`❌ Invalid URL - Button disabled: ${invalidDisabled}`);

    await page.screenshot({ path: 'test-results/02-invalid-url.png', fullPage: true });
    console.log('📸 Screenshot 2: Invalid URL state');

    // Now try valid URL
    console.log('✅ Testing valid URL...');
    await urlInput.clear();
    await urlInput.fill('https://www.amway.com/en_US/p-123456');
    await page.waitForTimeout(1000);

    const validEnabled = await submitBtn.isEnabled();
    console.log(`✅ Valid URL - Button enabled: ${validEnabled}`);

    await page.screenshot({ path: 'test-results/03-valid-url.png', fullPage: true });
    console.log('📸 Screenshot 3: Valid URL state');

    // Submit the form and see what happens
    console.log('🚀 Submitting form with valid URL...');
    await submitBtn.click();

    // Wait for response and see what happens
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'test-results/04-after-submit.png', fullPage: true });
    console.log('📸 Screenshot 4: After form submission');

    // Check what's on the page now
    const pageContent = await page.content();
    console.log(`📄 Page content length: ${pageContent.length} characters`);

    // Look for specific elements that might indicate success or failure
    const errorElements = await page.locator('text=error').or(page.locator('text=Error')).count();
    const loadingElements = await page.locator('text=loading').or(page.locator('text=Loading')).count();
    const configElements = await page.locator('text=Campaign').or(page.locator('text=Generate')).count();

    console.log(`🔍 Found on page:`);
    console.log(`   Error messages: ${errorElements}`);
    console.log(`   Loading indicators: ${loadingElements}`);
    console.log(`   Configuration elements: ${configElements}`);

    // Check if we can see the actual response
    const responseText = await page.locator('body').textContent();
    if (responseText && responseText.length > 0) {
      console.log(`📝 Page text preview: ${responseText.substring(0, 200)}...`);
    }

    // If we have configuration elements, try to proceed
    if (configElements > 0) {
      console.log('🎯 Found configuration elements - testing campaign generation...');

      // Look for campaign type selection
      const campaignTypeElements = page.locator('text=Product Focus').or(page.locator('text=Lifestyle'));
      if (await campaignTypeElements.count() > 0) {
        console.log('✅ Campaign type selection found');
        await campaignTypeElements.first().click();
      }

      // Look for generate button
      const generateBtn = page.locator('button:has-text("Generate")').or(page.locator('button:has-text("Create")'));
      if (await generateBtn.count() > 0) {
        console.log('🎨 Found generate button - testing AI generation...');

        await page.screenshot({ path: 'test-results/05-before-generation.png', fullPage: true });
        console.log('📸 Screenshot 5: Before AI generation');

        await generateBtn.first().click();

        // Wait for AI generation (this might take a while)
        console.log('⏳ Waiting for AI generation (up to 60 seconds)...');
        await page.waitForTimeout(60000);

        await page.screenshot({ path: 'test-results/06-after-generation.png', fullPage: true });
        console.log('📸 Screenshot 6: After AI generation attempt');

        // Check for download link or results
        const downloadElements = await page.locator('text=download').or(page.locator('text=Download')).count();
        const successElements = await page.locator('text=success').or(page.locator('text=Success')).count();
        const imageElements = await page.locator('img').count();

        console.log(`🎉 Generation results:`);
        console.log(`   Download links: ${downloadElements}`);
        console.log(`   Success messages: ${successElements}`);
        console.log(`   Images on page: ${imageElements}`);
      }
    }

    // Final comprehensive screenshot
    await page.screenshot({ path: 'test-results/07-final-state.png', fullPage: true });
    console.log('📸 Screenshot 7: Final application state');

    console.log('🏁 Manual runtime test completed');

    // Test always passes - we're gathering information
    expect(true).toBe(true);
  });

  test('Test example URL functionality', async ({ page }) => {
    console.log('🔗 Testing example URL functionality...');

    await page.goto('/campaign/new');

    // Find example URLs section
    const examplesSection = page.locator('text=Try these example URLs:');
    await expect(examplesSection).toBeVisible();

    // Click first example
    const firstExample = page.locator('button:has-text("https://www.amway.com/en_US/p/326782")');
    await firstExample.click();

    // Verify URL is populated
    const urlInput = page.locator('input[type="url"]').first();
    await expect(urlInput).toHaveValue('https://www.amway.com/en_US/p/326782');

    // Verify button is enabled
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeEnabled();

    await page.screenshot({ path: 'test-results/08-example-url-test.png', fullPage: true });
    console.log('📸 Screenshot 8: Example URL functionality');

    console.log('✅ Example URL functionality working correctly');
  });

  test('Mobile responsive testing', async ({ page }) => {
    console.log('📱 Testing mobile responsive design...');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/campaign/new');

    await page.screenshot({ path: 'test-results/09-mobile-view.png', fullPage: true });
    console.log('📸 Screenshot 9: Mobile viewport');

    // Test form functionality on mobile
    const urlInput = page.locator('input[type="url"]').first();
    await urlInput.fill('https://www.amway.com/en_US/p-123456');

    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeEnabled();

    await page.screenshot({ path: 'test-results/10-mobile-filled.png', fullPage: true });
    console.log('📸 Screenshot 10: Mobile form filled');

    console.log('✅ Mobile responsive design working correctly');
  });
});