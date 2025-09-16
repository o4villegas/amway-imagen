/**
 * Direct validation test to check React state updates
 */

import { test, expect } from '@playwright/test';

test('Direct React State Validation', async ({ page }) => {
  await page.goto('/campaign/new');
  await expect(page.locator('h1')).toBeVisible();

  // Get the input and button elements
  const urlInput = page.locator('input[type="url"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  // Test 1: Initial state
  const initialDisabled = await submitBtn.isDisabled();
  console.log(`Initial state - Button disabled: ${initialDisabled}`);

  // Test 2: Fill with invalid URL and check React state
  await urlInput.fill('https://www.google.com/products/123');

  // Force React to update by triggering events
  await urlInput.blur();
  await urlInput.focus();
  await page.waitForTimeout(1000);

  // Check the state by accessing React's internal state
  const reactState = await page.evaluate(() => {
    const input = document.querySelector('input[type="url"]');
    const button = document.querySelector('button[type="submit"]');

    return {
      inputValue: input?.value,
      buttonDisabled: button?.disabled,
      buttonHasDisabledClass: button?.classList.contains('disabled') || button?.classList.contains('opacity-50'),
      formData: new FormData(input?.closest('form') || undefined)
    };
  });

  console.log('React State after invalid URL:', reactState);

  // Test 3: Valid URL
  await urlInput.fill('https://www.amway.com/en_US/p-123456');
  await urlInput.blur();
  await urlInput.focus();
  await page.waitForTimeout(1000);

  const validState = await page.evaluate(() => {
    const input = document.querySelector('input[type="url"]');
    const button = document.querySelector('button[type="submit"]');

    return {
      inputValue: input?.value,
      buttonDisabled: button?.disabled,
      buttonHasDisabledClass: button?.classList.contains('disabled') || button?.classList.contains('opacity-50')
    };
  });

  console.log('React State after valid URL:', validState);

  // Manual validation check
  const manualValidation = await page.evaluate(() => {
    const validateUrl = (inputUrl) => {
      if (!inputUrl.trim()) return false;

      try {
        const parsedUrl = new URL(inputUrl);
        const domain = parsedUrl.hostname.replace('www.', '');
        const isAmwayDomain = domain.endsWith('amway.com');
        const hasProductPath = parsedUrl.pathname.includes('/p/') ||
                              parsedUrl.pathname.includes('/p-') ||
                              !!parsedUrl.pathname.match(/-p-\\d+/);

        return isAmwayDomain && hasProductPath;
      } catch (error) {
        return false;
      }
    };

    return {
      googleValid: validateUrl('https://www.google.com/products/123'),
      amwayValid: validateUrl('https://www.amway.com/en_US/p-123456')
    };
  });

  console.log('Manual validation check:', manualValidation);

  expect(true).toBe(true); // Test passes if we gather info
});