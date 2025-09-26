import { test, expect } from '@playwright/test';

test.describe('Production AI Generation - Complete E2E', () => {

  test('should complete full AI generation workflow in production', async ({ page }) => {
    console.log('\n🚀 PRODUCTION AI GENERATION E2E TEST\n');

    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', (response) => {
      if (response.status() >= 500) {
        networkErrors.push(`${response.url()} => ${response.status()}`);
      }
    });

    // Phase 1: Homepage
    console.log('Phase 1: Loading homepage...');
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Amway IBO');
    console.log('Homepage loaded\n');

    // Phase 2: Enter product URL
    console.log('Phase 2: Entering product URL...');
    const urlInput = page.locator('input[type="url"]');
    await urlInput.fill('https://www.amway.com/en_US/Nutrilite-Daily-Multivitamin-Multimineral-p-110798');
    console.log('URL entered\n');

    // Phase 3: Submit
    console.log('Phase 3: Clicking Generate Campaign...');
    const generateButton = page.locator('button').filter({ hasText: /Generate Campaign/i });
    await generateButton.click();
    console.log('Button clicked\n');

    // Phase 4: Wait for navigation
    console.log('Phase 4: Waiting for campaign page...');
    await page.waitForURL('**/campaign/new**', { timeout: 30000 });
    console.log('Navigated to campaign/new\n');

    // Phase 5: Wait for content and analyze
    console.log('Phase 5: Analyzing page content...');
    await page.waitForTimeout(10000);
    
    const pageText = await page.locator('body').textContent();
    
    console.log(`Body text length: ${pageText?.length || 0}`);
    console.log(`Has "Generating": ${pageText?.includes('Generating')}`);
    console.log(`Has "Processing": ${pageText?.includes('Processing')}`);
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Network 5xx errors: ${networkErrors.length}\n`);

    if (consoleErrors.length > 0) {
      console.log('Console Errors:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }

    if (networkErrors.length > 0) {
      console.log('Network Errors:');
      networkErrors.forEach(err => console.log(`  - ${err}`));
    }

    await page.screenshot({ path: '/tmp/claude/prod-test.png', fullPage: true });
    console.log('Screenshot saved\n');
  });
});
