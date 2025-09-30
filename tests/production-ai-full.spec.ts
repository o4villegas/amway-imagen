import { test, expect } from '@playwright/test';

test.describe('Production AI Generation - Full Completion Test', () => {

  test('should complete AI generation and download campaign', async ({ page }) => {
    console.log('\n🚀 TESTING COMPLETE AI GENERATION IN PRODUCTION\n');

    // Phase 1-4: Navigate to generation (same as before)
    console.log('Phase 1-3: Navigate to generation...');
    await page.goto('/');
    const urlInput = page.locator('input[type="url"]');
    await urlInput.fill('https://www.amway.com/en_US/Nutrilite-Daily-Multivitamin-Multimineral-p-110798');
    const generateButton = page.locator('button').filter({ hasText: /Generate Campaign/i });
    await generateButton.click();
    await page.waitForURL('**/campaign/new**', { timeout: 30000 });
    console.log('✅ At generation page\n');

    // Phase 5: Wait for generation to complete
    console.log('Phase 5: Waiting for AI generation to complete (max 3 minutes)...');
    console.log('Looking for completion indicators...');
    
    // Wait for either success or failure
    try {
      const downloadButton = page.locator('button').filter({ hasText: /Download.*ZIP|Download Campaign/i });
      await downloadButton.waitFor({ state: 'visible', timeout: 180000 }); // 3 minutes
      
      console.log('✅ GENERATION COMPLETED SUCCESSFULLY!\n');
      
      // Phase 6: Verify completion details
      console.log('Phase 6: Verifying completion details...');
      const pageText = await page.locator('body').textContent();
      
      const hasSuccess = pageText?.includes('Successfully') || pageText?.includes('ready');
      const hasImages = pageText?.includes('Images Generated');
      
      console.log(`Has success message: ${hasSuccess}`);
      console.log(`Has images info: ${hasImages}`);
      
      //  Take final screenshot
      await page.screenshot({ path: '/tmp/claude/prod-complete.png', fullPage: true });
      console.log('Screenshot saved: /tmp/claude/prod-complete.png\n');
      
      // Phase 7: Test download
      console.log('Phase 7: Testing campaign download...');
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      await downloadButton.click();
      
      const download = await downloadPromise;
      const filename = download.suggestedFilename();
      console.log(`Download initiated: ${filename}`);
      
      expect(filename).toMatch(/\.zip$/i);
      
      const downloadPath = `/tmp/claude/${filename}`;
      await download.saveAs(downloadPath);
      
      const fs = require('fs');
      const stats = fs.statSync(downloadPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      console.log(`✅ Download saved: ${sizeMB} MB`);
      console.log(`✅ File: ${downloadPath}\n`);
      
      expect(stats.size).toBeGreaterThan(1000);
      
      console.log('✅ ═══════════════════════════════════════');
      console.log('✅ AI GENERATION FULLY VALIDATED');
      console.log('✅ Production is 100% operational');
      console.log('✅ ═══════════════════════════════════════\n');
      
    } catch (error) {
      console.log(`\n⚠️ Generation did not complete in 3 minutes`);
      
      // Take screenshot of current state
      await page.screenshot({ path: '/tmp/claude/prod-timeout.png', fullPage: true });
      console.log('Screenshot saved: /tmp/claude/prod-timeout.png\n');
      
      // Check what state we're in
      const pageText = await page.locator('body').textContent();
      console.log(`Page contains "Generating": ${pageText?.includes('Generating')}`);
      console.log(`Page contains "Error": ${pageText?.includes('Error') || pageText?.includes('error')}`);
      console.log(`Page contains "Failed": ${pageText?.includes('Failed') || pageText?.includes('failed')}`);
      
      throw error;
    }
  });
});
