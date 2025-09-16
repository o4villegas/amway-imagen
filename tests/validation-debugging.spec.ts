/**
 * Debugging test to understand the form validation issue
 */

import { test, expect } from '@playwright/test';

test('Debug Form Validation', async ({ page }) => {
  const logs: string[] = [];

  // Capture console logs
  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
  });

  await page.goto('/campaign/new');

  // Wait for page to load
  await expect(page.locator('h1')).toBeVisible();

  const urlInput = page.locator('input[type="url"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  // Test 1: Empty field should disable button
  console.log('Testing empty field...');
  await urlInput.clear();
  await page.waitForTimeout(500);
  const emptyDisabled = await submitBtn.isDisabled();
  console.log(`Empty field - Button disabled: ${emptyDisabled}`);

  // Test 2: Invalid URL should disable button
  console.log('Testing invalid URL...');
  await urlInput.fill('https://www.google.com/products/123');
  await page.waitForTimeout(1000);
  const invalidDisabled = await submitBtn.isDisabled();
  console.log(`Invalid URL - Button disabled: ${invalidDisabled}`);

  // Check what validation logs we got
  const validationLogs = logs.filter(log => log.includes('URL Validation'));
  console.log('Validation logs:', validationLogs);

  // Test 3: Valid URL should enable button
  console.log('Testing valid URL...');
  await urlInput.fill('https://www.amway.com/en_US/p-123456');
  await page.waitForTimeout(1000);
  const validEnabled = await submitBtn.isEnabled();
  console.log(`Valid URL - Button enabled: ${validEnabled}`);

  // Get final validation logs
  const finalValidationLogs = logs.filter(log => log.includes('URL Validation'));
  console.log('Final validation logs:', finalValidationLogs);

  // Check button state in DOM
  const buttonAttributes = await submitBtn.evaluate(btn => ({
    disabled: btn.disabled,
    className: btn.className,
    textContent: btn.textContent
  }));
  console.log('Button attributes:', buttonAttributes);

  // Test passes if we gathered debugging info
  expect(true).toBe(true);
});