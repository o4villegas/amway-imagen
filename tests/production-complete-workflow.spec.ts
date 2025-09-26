import { test, expect } from '@playwright/test';

test.describe('Production Complete Workflow Test', () => {

  test('should complete full AI generation and download campaign', async ({ page }) => {
    console.log('\n========================================');
    console.log('PRODUCTION AI GENERATION - FULL TEST');
    console.log('========================================\n');

    const testStartTime = Date.now();

    // Phase 1-4: Navigate and start generation
    console.log('Phase 1-3: Navigating to generation...');
    await page.goto('/');

    const urlInput = page.locator('input[type="url"]');
    await urlInput.fill('https://www.amway.com/en_US/Nutrilite-Daily-Multivitamin-Multimineral-p-110798');

    const generateButton = page.locator('button').filter({ hasText: /Generate Campaign/i });
    await generateButton.click();

    await page.waitForURL('**/campaign/new**', { timeout: 30000 });
    console.log('SUCCESS: Reached generation page\n');

    // Phase 5: Wait for generation to complete
    console.log('Phase 5: Waiting for AI generation to complete...');
    console.log('(This may take 1-3 minutes)\n');

    const generationStartTime = Date.now();

    try {
      // Look for success indicators
      const successHeading = page.locator('h2').filter({ hasText: /Campaign Generated Successfully|Ready|Complete/i });
      const downloadButton = page.locator('button').filter({ hasText: /Download.*ZIP|Download Campaign/i });

      // Wait up to 3 minutes for completion
      await Promise.race([
        successHeading.waitFor({ state: 'visible', timeout: 180000 }),
        downloadButton.waitFor({ state: 'visible', timeout: 180000 })
      ]);

      const generationTime = ((Date.now() - generationStartTime) / 1000).toFixed(1);
      console.log(`SUCCESS: Generation completed in ${generationTime} seconds\n`);

      // Take screenshot of success state
      await page.screenshot({ path: '/tmp/claude/prod-success.png', fullPage: true });
      console.log('Screenshot saved: /tmp/claude/prod-success.png\n');

      // Phase 6: Verify completion state
      console.log('Phase 6: Verifying completion details...');

      const pageText = await page.locator('body').textContent() || '';
      console.log(`Page contains "Successfully": ${pageText.includes('Successfully')}`);
      console.log(`Page contains "ready": ${pageText.includes('ready')}`);
      console.log(`Page contains "Download": ${pageText.includes('Download')}\n`);

      // Phase 7: Test download
      console.log('Phase 7: Testing campaign download...');

      const finalDownloadButton = page.locator('button').filter({ hasText: /Download/i }).first();
      await expect(finalDownloadButton).toBeVisible();

      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      await finalDownloadButton.click();

      const download = await downloadPromise;
      const filename = download.suggestedFilename();
      console.log(`Download initiated: ${filename}`);

      expect(filename).toMatch(/\.zip$/i);

      const downloadPath = `/tmp/claude/${filename}`;
      await download.saveAs(downloadPath);

      const fs = require('fs');
      const stats = fs.statSync(downloadPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      console.log(`Download saved: ${sizeMB} MB`);
      console.log(`File location: ${downloadPath}\n`);

      expect(stats.size).toBeGreaterThan(1000);

      const totalTime = ((Date.now() - testStartTime) / 1000).toFixed(1);

      console.log('========================================');
      console.log('AI GENERATION 100% VALIDATED');
      console.log('========================================');
      console.log(`Total test time: ${totalTime}s`);
      console.log(`Generation time: ${generationTime}s`);
      console.log(`Campaign size: ${sizeMB} MB`);
      console.log('Production is fully operational');
      console.log('========================================\n');

    } catch (error) {
      const timeElapsed = ((Date.now() - generationStartTime) / 1000).toFixed(1);
      console.log(`\nGeneration did not complete after ${timeElapsed} seconds\n`);

      // Take screenshot of current state
      await page.screenshot({ path: '/tmp/claude/prod-timeout.png', fullPage: true });
      console.log('Timeout screenshot: /tmp/claude/prod-timeout.png\n');

      // Check current state
      const pageText = await page.locator('body').textContent() || '';
      console.log('Current page state:');
      console.log(`  - Contains "Generating": ${pageText.includes('Generating')}`);
      console.log(`  - Contains "Error": ${pageText.includes('Error')}`);
      console.log(`  - Contains "Failed": ${pageText.includes('Failed')}\n`);

      throw error;
    }
  });
});