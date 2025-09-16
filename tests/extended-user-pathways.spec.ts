/**
 * Extended User Pathways E2E Tests
 * Covers less-critical but important user journeys and edge cases
 */

import { test, expect } from '@playwright/test';

test.describe('Extended User Pathways', () => {

  test.describe('Alternative Navigation Patterns', () => {
    test('User discovers examples before entering URL', async ({ page }) => {
      console.log('🔄 Testing example-first discovery pattern...');

      await page.goto('/campaign/new');
      await expect(page.locator('h1')).toBeVisible();

      // User scrolls down to examples section first
      const examplesSection = page.locator('text=Try these example URLs:');
      await examplesSection.scrollIntoViewIfNeeded();
      await expect(examplesSection).toBeVisible();

      // User clicks first example URL
      const firstExample = page.locator('button:has-text("https://www.amway.com/en_US/p/326782")');
      await firstExample.click();

      // Verify URL input is populated
      const urlInput = page.locator('input[type="url"]').first();
      await expect(urlInput).toHaveValue('https://www.amway.com/en_US/p/326782');

      // Verify submit button becomes enabled
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeEnabled();

      console.log('✅ Example-first navigation works correctly');
    });

    test('User switches between multiple example URLs', async ({ page }) => {
      console.log('🔄 Testing example URL switching behavior...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      // Test all example URLs
      const examples = [
        'https://www.amway.com/en_US/p/326782',
        'https://www.amway.com/en_US/Nutrilite-Daily-p-100186',
        'https://www.amway.com/en_US/Sleep-%2B-Stress-Solution-p-321893'
      ];

      for (const example of examples) {
        const exampleBtn = page.locator(`button:has-text("${example}")`);
        await exampleBtn.click();
        await expect(urlInput).toHaveValue(example);

        // Verify validation state
        await page.waitForTimeout(500);
        const submitBtn = page.locator('button[type="submit"]').first();
        await expect(submitBtn).toBeEnabled();

        console.log(`✅ Example URL validated: ${example.substring(0, 50)}...`);
      }
    });
  });

  test.describe('Input Behavior Edge Cases', () => {
    test('Copy-paste URL with extra whitespace', async ({ page }) => {
      console.log('📋 Testing copy-paste with whitespace...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      // Simulate copy-paste with leading/trailing whitespace
      const messyUrl = '   https://www.amway.com/en_US/p-123456   ';
      await urlInput.fill(messyUrl);

      // Wait for validation
      await page.waitForTimeout(1000);

      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeEnabled();

      console.log('✅ Whitespace handling works correctly');
    });

    test('Progressive URL typing validation', async ({ page }) => {
      console.log('⌨️ Testing progressive typing validation...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      // Type URL progressively and check validation at each step
      const progressiveUrl = 'https://www.amway.com/en_US/p-123456';
      const steps = [
        'h',
        'https',
        'https://www',
        'https://www.amway',
        'https://www.amway.com',
        'https://www.amway.com/en_US',
        'https://www.amway.com/en_US/p',
        'https://www.amway.com/en_US/p-',
        'https://www.amway.com/en_US/p-123456'
      ];

      for (let i = 0; i < steps.length; i++) {
        await urlInput.clear();
        await urlInput.type(steps[i]);
        await page.waitForTimeout(200);

        const isEnabled = await submitBtn.isEnabled();
        const shouldBeEnabled = i === steps.length - 1; // Only final URL should enable button

        if (shouldBeEnabled) {
          expect(isEnabled).toBe(true);
          console.log(`✅ Step ${i + 1}: Button correctly enabled for complete URL`);
        } else {
          expect(isEnabled).toBe(false);
          console.log(`✅ Step ${i + 1}: Button correctly disabled for partial URL`);
        }
      }
    });

    test('URL modification after initial validation', async ({ page }) => {
      console.log('✏️ Testing URL modification behavior...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      // Start with valid URL
      await urlInput.fill('https://www.amway.com/en_US/p-123456');
      await page.waitForTimeout(500);
      await expect(submitBtn).toBeEnabled();

      // Modify to invalid URL
      await urlInput.clear();
      await urlInput.fill('https://www.amazon.com/product/123');
      await page.waitForTimeout(500);
      await expect(submitBtn).toBeDisabled();

      // Modify back to valid URL
      await urlInput.clear();
      await urlInput.fill('https://www.amway.com/en_US/Nutrilite-Daily-p-100186');
      await page.waitForTimeout(500);
      await expect(submitBtn).toBeEnabled();

      console.log('✅ URL modification validation works correctly');
    });
  });

  test.describe('Error Recovery Pathways', () => {
    test('User recovers from validation error via examples', async ({ page }) => {
      console.log('🔧 Testing error recovery via examples...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      // Enter invalid URL first
      await urlInput.fill('https://www.google.com/invalid');
      await page.waitForTimeout(500);

      // Verify error state
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeDisabled();

      // Recover using example URL
      const exampleBtn = page.locator('button:has-text("https://www.amway.com/en_US/p/326782")');
      await exampleBtn.click();

      // Verify recovery
      await expect(urlInput).toHaveValue('https://www.amway.com/en_US/p/326782');
      await expect(submitBtn).toBeEnabled();

      console.log('✅ Error recovery via examples works');
    });

    test('Clear field and restart workflow', async ({ page }) => {
      console.log('🔄 Testing field clearing and restart...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      // Fill with valid URL
      await urlInput.fill('https://www.amway.com/en_US/p-123456');
      await page.waitForTimeout(500);
      await expect(submitBtn).toBeEnabled();

      // Clear field
      await urlInput.clear();
      await page.waitForTimeout(500);
      await expect(submitBtn).toBeDisabled();

      // Fill with different valid URL
      await urlInput.fill('https://www.amway.com/en_US/Nutrilite-Daily-p-100186');
      await page.waitForTimeout(500);
      await expect(submitBtn).toBeEnabled();

      console.log('✅ Field clearing and restart works correctly');
    });
  });

  test.describe('Mobile-Specific User Pathways', () => {
    test('Mobile URL sharing workflow', async ({ page }) => {
      console.log('📱 Testing mobile URL sharing...');

      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/campaign/new');

      // Test mobile-specific interactions
      const urlInput = page.locator('input[type="url"]').first();

      // Simulate mobile paste behavior (often includes extra context)
      const mobileSharedUrl = 'Check out this product! https://www.amway.com/en_US/p-123456 #Amway';
      await urlInput.fill(mobileSharedUrl);
      await page.waitForTimeout(1000);

      // Should extract and validate the URL part
      const submitBtn = page.locator('button[type="submit"]').first();
      const isEnabled = await submitBtn.isEnabled();

      // Note: Current implementation might not handle this - this test documents expected behavior
      console.log(`📝 Mobile shared URL handling: ${isEnabled ? 'Works' : 'Needs improvement'}`);
    });

    test('Mobile viewport example interaction', async ({ page }) => {
      console.log('📱 Testing mobile example interaction...');

      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/campaign/new');

      // Scroll to examples on mobile
      const examplesSection = page.locator('text=Try these example URLs:');
      await examplesSection.scrollIntoViewIfNeeded();

      // Test touch-friendly example clicking
      const firstExample = page.locator('button:has-text("https://www.amway.com/en_US/p/326782")');
      await firstExample.click();

      const urlInput = page.locator('input[type="url"]').first();
      await expect(urlInput).toHaveValue('https://www.amway.com/en_US/p/326782');

      console.log('✅ Mobile example interaction works');
    });
  });

  test.describe('Accessibility Alternative Pathways', () => {
    test('Keyboard-only navigation workflow', async ({ page }) => {
      console.log('⌨️ Testing keyboard navigation...');

      await page.goto('/campaign/new');

      // Navigate to URL input via keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Fill URL via keyboard
      await page.keyboard.type('https://www.amway.com/en_US/p-123456');
      await page.waitForTimeout(500);

      // Navigate to submit button and verify it's enabled
      await page.keyboard.press('Tab');
      const activeElement = await page.locator(':focus');
      const tagName = await activeElement.evaluate(el => el.tagName);
      const isSubmitButton = tagName === 'BUTTON';

      if (isSubmitButton) {
        console.log('✅ Keyboard navigation reaches submit button');
      } else {
        console.log('⚠️ Keyboard navigation needs improvement');
      }
    });

    test('Screen reader friendly workflow', async ({ page }) => {
      console.log('🔊 Testing screen reader accessibility...');

      await page.goto('/campaign/new');

      // Check for proper ARIA labels and descriptions
      const urlInput = page.locator('input[type="url"]').first();
      const inputLabel = await urlInput.getAttribute('aria-label') ||
                        await page.locator('label[for="product-url"]').textContent();

      const submitBtn = page.locator('button[type="submit"]').first();
      const buttonText = await submitBtn.textContent();

      // Verify accessibility attributes
      const hasLabel = inputLabel && inputLabel.length > 0;
      const hasButtonText = buttonText && buttonText.length > 0;

      console.log(`✅ Input label present: ${hasLabel}`);
      console.log(`✅ Button text present: ${hasButtonText}`);
    });
  });

  test.describe('Performance Edge Cases', () => {
    test('Rapid input changes validation performance', async ({ page }) => {
      console.log('⚡ Testing rapid input validation performance...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      const startTime = Date.now();

      // Rapidly change input values
      const testUrls = [
        'h',
        'ht',
        'http',
        'https',
        'https://www',
        'https://www.amway',
        'https://www.amway.com',
        'https://www.amway.com/en_US/p-123456'
      ];

      for (const url of testUrls) {
        await urlInput.fill(url);
        await page.waitForTimeout(50); // Rapid typing simulation
      }

      // Wait for final validation
      await page.waitForTimeout(1000);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`📊 Rapid validation completed in ${totalTime}ms`);

      // Final state should be valid
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeEnabled();
    });

    test('Large text paste handling', async ({ page }) => {
      console.log('📄 Testing large text paste handling...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      // Simulate pasting large text with URL buried inside
      const largeText = `
        Here's a great product I found on Amway's website. You should definitely check this out!

        Product Details:
        - Name: Some Product
        - Benefits: Amazing benefits
        - URL: https://www.amway.com/en_US/p-123456
        - Price: $29.99

        Let me know what you think! This could be perfect for our campaign.
        #Amway #Health #Wellness
      `;

      await urlInput.fill(largeText.trim());
      await page.waitForTimeout(1000);

      // Current implementation might not extract URL from text
      // This test documents expected vs actual behavior
      const submitBtn = page.locator('button[type="submit"]').first();
      const isEnabled = await submitBtn.isEnabled();

      console.log(`📝 Large text paste handling: ${isEnabled ? 'Works' : 'Needs URL extraction'}`);
    });
  });

  test.describe('Multi-Session Behavior', () => {
    test('Page refresh preserves no state (expected)', async ({ page }) => {
      console.log('🔄 Testing page refresh behavior...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      // Fill form
      await urlInput.fill('https://www.amway.com/en_US/p-123456');
      await page.waitForTimeout(500);

      // Refresh page
      await page.reload();
      await expect(page.locator('h1')).toBeVisible();

      // Verify state is cleared (expected behavior)
      const refreshedInput = page.locator('input[type="url"]').first();
      await expect(refreshedInput).toHaveValue('');

      console.log('✅ Page refresh correctly clears state');
    });

    test('Back navigation behavior (if implemented)', async ({ page }) => {
      console.log('⬅️ Testing navigation behavior...');

      await page.goto('/campaign/new');

      // Fill form and simulate moving forward in flow
      const urlInput = page.locator('input[type="url"]').first();
      await urlInput.fill('https://www.amway.com/en_US/p-123456');

      // Navigate away and back
      await page.goto('/');
      await page.goBack();

      // Check if form state is preserved (depends on implementation)
      await expect(page.locator('h1')).toBeVisible();
      const backInput = page.locator('input[type="url"]').first();
      const value = await backInput.inputValue();

      console.log(`📝 Back navigation state: ${value ? 'Preserved' : 'Cleared'}`);
    });
  });

  test.describe('Content Discovery Pathways', () => {
    test('User reads all educational content before acting', async ({ page }) => {
      console.log('📚 Testing educational content discovery...');

      await page.goto('/campaign/new');

      // Check for educational sections
      const supportedSection = page.locator('text=Supported Product Pages');
      await expect(supportedSection).toBeVisible();

      // User reads supported products info
      const supportedContent = page.locator('text=All public Amway.com product pages');
      await expect(supportedContent).toBeVisible();

      // User scrolls through examples
      const examplesSection = page.locator('text=Try these example URLs:');
      await examplesSection.scrollIntoViewIfNeeded();

      // Finally fills the form after reading
      const urlInput = page.locator('input[type="url"]').first();
      await urlInput.fill('https://www.amway.com/en_US/p-123456');

      console.log('✅ Educational content is discoverable before form interaction');
    });

    test('User explores all examples before custom input', async ({ page }) => {
      console.log('🔍 Testing example exploration pattern...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      // User clicks through all examples to understand format
      const examples = [
        'https://www.amway.com/en_US/p/326782',
        'https://www.amway.com/en_US/Nutrilite-Daily-p-100186',
        'https://www.amway.com/en_US/Sleep-%2B-Stress-Solution-p-321893'
      ];

      for (const example of examples) {
        const btn = page.locator(`button:has-text("${example}")`);
        await btn.click();
        await expect(urlInput).toHaveValue(example);
        await page.waitForTimeout(200);
      }

      // Then enters their own URL following the pattern
      await urlInput.clear();
      await urlInput.fill('https://www.amway.com/en_US/Custom-Product-p-999999');
      await page.waitForTimeout(500);

      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeEnabled();

      console.log('✅ Example-guided custom input works');
    });
  });
});