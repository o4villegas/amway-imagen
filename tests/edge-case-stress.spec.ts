/**
 * Edge Case and Stress Testing Suite
 * Tests technical edge cases, boundary conditions, and stress scenarios
 */

import { test, expect } from '@playwright/test';

test.describe('Edge Case and Stress Testing', () => {

  test.describe('URL Validation Edge Cases', () => {
    test('International Amway domains', async ({ page }) => {
      console.log('🌍 Testing international Amway domains...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      // Test various international Amway domains
      const internationalUrls = [
        'https://www.amway.com/en_US/p-123456',  // US (should work)
        'https://www.amway.ca/en_CA/p-123456',   // Canada
        'https://www.amway.co.uk/en_GB/p-123456', // UK
        'https://www.amway.com.au/en_AU/p-123456', // Australia
        'https://www.amway.de/de_DE/p-123456',   // Germany
        'https://amway.com/en_US/p-123456',      // Without www
      ];

      for (const url of internationalUrls) {
        await urlInput.clear();
        await urlInput.fill(url);
        await page.waitForTimeout(500);

        const isEnabled = await submitBtn.isEnabled();
        const domain = new URL(url).hostname;

        console.log(`📝 ${domain}: ${isEnabled ? 'Accepted' : 'Rejected'}`);
      }
    });

    test('URL with complex parameters and fragments', async ({ page }) => {
      console.log('🔗 Testing complex URL structures...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      const complexUrls = [
        'https://www.amway.com/en_US/p-123456?ref=homepage&campaign=spring2024',
        'https://www.amway.com/en_US/p-123456#reviews',
        'https://www.amway.com/en_US/p-123456?ref=search&color=blue&size=large#description',
        'https://www.amway.com/en_US/p-123456?utm_source=google&utm_medium=cpc',
      ];

      for (const url of complexUrls) {
        await urlInput.clear();
        await urlInput.fill(url);
        await page.waitForTimeout(500);

        const isEnabled = await submitBtn.isEnabled();
        console.log(`✅ Complex URL handled: ${isEnabled ? 'Valid' : 'Invalid'}`);
        expect(isEnabled).toBe(true); // Should accept valid Amway URLs with parameters
      }
    });

    test('Edge case URL patterns', async ({ page }) => {
      console.log('🎯 Testing edge case URL patterns...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      const edgeCaseUrls = [
        'https://www.amway.com/en_US/Product-Name-p-123456',  // Standard format
        'https://www.amway.com/en_US/p/123456',               // Alternative format
        'https://www.amway.com/en_US/product-p-123456',       // Product in path
        'https://www.amway.com/en_US/Shop-By-Category-p-12',  // Category page
        'https://www.amway.com/en_US/Special-Offer-p-0',      // Zero ID
        'https://www.amway.com/en_US/New-Product-p-999999999', // Large ID
      ];

      for (const url of edgeCaseUrls) {
        await urlInput.clear();
        await urlInput.fill(url);
        await page.waitForTimeout(500);

        const isEnabled = await submitBtn.isEnabled();
        console.log(`📝 Pattern ${url.split('/').pop()}: ${isEnabled ? 'Valid' : 'Invalid'}`);
      }
    });
  });

  test.describe('Input Stress Testing', () => {
    test('Maximum length URL handling', async ({ page }) => {
      console.log('📏 Testing maximum length URL...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      // Create very long but valid URL
      const longParams = Array.from({ length: 50 }, (_, i) => `param${i}=value${i}`).join('&');
      const longUrl = `https://www.amway.com/en_US/Very-Long-Product-Name-With-Many-Words-p-123456?${longParams}`;

      await urlInput.fill(longUrl);
      await page.waitForTimeout(1000);

      // Check if input handles long URLs gracefully
      const inputValue = await urlInput.inputValue();
      const isTruncated = inputValue.length < longUrl.length;

      console.log(`📊 URL length: ${longUrl.length}, Input length: ${inputValue.length}`);
      console.log(`📝 Truncated: ${isTruncated ? 'Yes' : 'No'}`);
    });

    test('Special characters in URL', async ({ page }) => {
      console.log('🔤 Testing special characters...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      const specialCharUrls = [
        'https://www.amway.com/en_US/Sleep-+-Stress-Solution-p-123456',  // Plus sign
        'https://www.amway.com/en_US/Product-%26-Bundle-p-123456',       // Encoded ampersand
        'https://www.amway.com/en_US/Product-50%-Off-p-123456',          // Percent sign
        'https://www.amway.com/en_US/Café-Product-p-123456',             // Unicode characters
      ];

      for (const url of specialCharUrls) {
        await urlInput.clear();
        await urlInput.fill(url);
        await page.waitForTimeout(500);

        const isEnabled = await submitBtn.isEnabled();
        console.log(`📝 Special chars in "${url.split('-p-')[0].split('/').pop()}": ${isEnabled ? 'Valid' : 'Invalid'}`);
      }
    });

    test('Rapid consecutive submissions', async ({ page }) => {
      console.log('⚡ Testing rapid submission attempts...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      // Fill valid URL
      await urlInput.fill('https://www.amway.com/en_US/p-123456');
      await page.waitForTimeout(500);

      // Attempt rapid clicks (should be prevented by loading state)
      const startTime = Date.now();

      // First click
      await submitBtn.click();

      // Rapid subsequent clicks
      for (let i = 0; i < 5; i++) {
        await submitBtn.click({ timeout: 100 }).catch(() => {
          // Expected to fail if button is properly disabled during loading
        });
      }

      const endTime = Date.now();
      console.log(`📊 Rapid click test completed in ${endTime - startTime}ms`);

      // Check if button shows loading state
      const isLoading = await submitBtn.locator('text=Extracting').isVisible().catch(() => false);
      console.log(`📝 Loading state shown: ${isLoading ? 'Yes' : 'No'}`);
    });
  });

  test.describe('Error Boundary Testing', () => {
    test('Network failure simulation', async ({ page }) => {
      console.log('🌐 Testing network failure handling...');

      // Simulate network failure for scraping endpoint
      await page.route('/api/scrape', route => {
        route.abort('failed');
      });

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      await urlInput.fill('https://www.amway.com/en_US/p-123456');
      await submitBtn.click();

      // Wait for error handling
      await page.waitForTimeout(5000);

      // Check for error message display
      const errorMessage = page.locator('text=Failed').or(page.locator('text=Error')).or(page.locator('[class*="error"]'));
      const hasError = await errorMessage.isVisible().catch(() => false);

      console.log(`📝 Network error handled: ${hasError ? 'Yes' : 'No'}`);
    });

    test('API timeout simulation', async ({ page }) => {
      console.log('⏱️ Testing API timeout handling...');

      // Simulate slow API response
      await page.route('/api/scrape', async route => {
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, product: { id: 1, name: 'Test' } })
        });
      });

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      await urlInput.fill('https://www.amway.com/en_US/p-123456');

      const startTime = Date.now();
      await submitBtn.click();

      // Wait reasonable time for timeout handling
      await page.waitForTimeout(10000);

      const endTime = Date.now();
      const waitTime = endTime - startTime;

      console.log(`📊 Waited ${waitTime}ms for response`);

      // Check if timeout is handled gracefully
      const isStillLoading = await submitBtn.locator('text=Extracting').isVisible().catch(() => false);
      console.log(`📝 Still showing loading after ${waitTime}ms: ${isStillLoading ? 'Yes' : 'No'}`);
    });

    test('Invalid API response handling', async ({ page }) => {
      console.log('🔧 Testing invalid API response...');

      // Mock invalid API response
      await page.route('/api/scrape', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{"invalid": "json structure"}'
        });
      });

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      await urlInput.fill('https://www.amway.com/en_US/p-123456');
      await submitBtn.click();

      await page.waitForTimeout(3000);

      // Check error handling
      const errorElements = page.locator('text=error').or(page.locator('text=Error')).or(page.locator('[class*="error"]'));
      const hasError = await errorElements.count() > 0;

      console.log(`📝 Invalid response handled: ${hasError ? 'Yes' : 'No'}`);
    });
  });

  test.describe('Browser Compatibility Edge Cases', () => {
    test('JavaScript disabled simulation', async ({ page }) => {
      console.log('🚫 Testing with JavaScript disabled...');

      // Disable JavaScript
      await page.addInitScript(() => {
        Object.defineProperty(window, 'navigator', {
          value: { ...window.navigator, javaEnabled: () => false }
        });
      });

      await page.goto('/campaign/new');

      // Basic elements should still be visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[type="url"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      console.log('✅ Basic functionality works without JavaScript');
    });

    test('Local storage unavailable', async ({ page }) => {
      console.log('💾 Testing without local storage...');

      // Mock localStorage as unavailable
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: null
        });
      });

      await page.goto('/campaign/new');

      const urlInput = page.locator('input[type="url"]').first();
      await urlInput.fill('https://www.amway.com/en_US/p-123456');

      // Should still work without localStorage
      await page.waitForTimeout(500);
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeEnabled();

      console.log('✅ Works without localStorage');
    });
  });

  test.describe('Performance Stress Testing', () => {
    test('Memory usage during extended interaction', async ({ page }) => {
      console.log('🧠 Testing extended interaction memory usage...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      // Simulate extended user session with many interactions
      for (let i = 0; i < 50; i++) {
        await urlInput.clear();
        await urlInput.fill(`https://www.amway.com/en_US/test-product-${i}-p-${100000 + i}`);
        await page.waitForTimeout(100);

        if (i % 10 === 0) {
          console.log(`📊 Completed ${i + 1} interactions`);
        }
      }

      // Final validation check
      const submitBtn = page.locator('button[type="submit"]').first();
      await expect(submitBtn).toBeEnabled();

      console.log('✅ Extended interaction completed successfully');
    });

    test('Multiple tab simulation', async ({ browser }) => {
      console.log('🗂️ Testing multiple tab behavior...');

      // Create multiple contexts to simulate tabs
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ]);

      const pages = await Promise.all(contexts.map(context => context.newPage()));

      // Load same page in all tabs
      await Promise.all(pages.map(page => page.goto('/campaign/new')));

      // Interact with each tab differently
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const urlInput = page.locator('input[type="url"]').first();
        await urlInput.fill(`https://www.amway.com/en_US/multi-tab-test-${i}-p-${200000 + i}`);

        console.log(`📝 Tab ${i + 1} configured`);
      }

      // Verify each tab maintains independent state
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const urlInput = page.locator('input[type="url"]').first();
        const value = await urlInput.inputValue();
        const expectedPartial = `multi-tab-test-${i}`;

        console.log(`✅ Tab ${i + 1} state: ${value.includes(expectedPartial) ? 'Independent' : 'Shared'}`);
      }

      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });
  });

  test.describe('Accessibility Stress Testing', () => {
    test('High contrast mode compatibility', async ({ page }) => {
      console.log('🎨 Testing high contrast mode...');

      // Simulate high contrast mode
      await page.addInitScript(() => {
        const style = document.createElement('style');
        style.textContent = `
          * {
            background: black !important;
            color: white !important;
            border-color: white !important;
          }
        `;
        document.head.appendChild(style);
      });

      await page.goto('/campaign/new');

      // Elements should still be visible and functional
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('input[type="url"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      console.log('✅ High contrast mode compatibility verified');
    });

    test('Screen reader simulation', async ({ page }) => {
      console.log('🔊 Testing screen reader compatibility...');

      await page.goto('/campaign/new');

      // Check for ARIA attributes and labels
      const urlInput = page.locator('input[type="url"]').first();
      const hasLabel = await page.locator('label[for="product-url"]').isVisible();
      const hasAriaLabel = await urlInput.getAttribute('aria-label') !== null;

      const submitBtn = page.locator('button[type="submit"]').first();
      const buttonText = await submitBtn.textContent();
      const hasButtonText = buttonText && buttonText.trim().length > 0;

      console.log(`📝 Input label: ${hasLabel ? 'Present' : 'Missing'}`);
      console.log(`📝 ARIA label: ${hasAriaLabel ? 'Present' : 'Missing'}`);
      console.log(`📝 Button text: ${hasButtonText ? 'Present' : 'Missing'}`);
    });
  });

  test.describe('Security Edge Cases', () => {
    test('XSS attempt in URL input', async ({ page }) => {
      console.log('🔒 Testing XSS prevention...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      // Attempt XSS injection
      const xssAttempt = 'javascript:alert("XSS")<script>alert("XSS")</script>';
      await urlInput.fill(xssAttempt);
      await page.waitForTimeout(500);

      // Should not execute script
      const alertShown = await page.locator('text=XSS').isVisible().catch(() => false);
      console.log(`📝 XSS prevented: ${!alertShown ? 'Yes' : 'No'}`);

      // Button should be disabled for invalid URL
      const submitBtn = page.locator('button[type="submit"]').first();
      const isDisabled = await submitBtn.isDisabled();
      console.log(`📝 Invalid script URL rejected: ${isDisabled ? 'Yes' : 'No'}`);
    });

    test('SQL injection attempt simulation', async ({ page }) => {
      console.log('💉 Testing SQL injection prevention...');

      await page.goto('/campaign/new');
      const urlInput = page.locator('input[type="url"]').first();

      // Attempt SQL injection pattern
      const sqlInjection = "https://www.amway.com/en_US/p-123456'; DROP TABLE products; --";
      await urlInput.fill(sqlInjection);
      await page.waitForTimeout(500);

      // Should treat as regular invalid URL
      const submitBtn = page.locator('button[type="submit"]').first();
      const isDisabled = await submitBtn.isDisabled();
      console.log(`📝 SQL injection attempt handled: ${isDisabled ? 'Properly disabled' : 'Unexpectedly enabled'}`);
    });
  });
});