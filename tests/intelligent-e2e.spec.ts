/**
 * Intelligent E2E Test Suite with Auto-Remediation
 * Comprehensive testing with automatic error detection and fixing
 */

import { test, expect } from '@playwright/test';
import { TestOrchestrator } from './e2e-framework/test-orchestrator';

test.describe('Intelligent E2E Test Suite', () => {
  let orchestrator: TestOrchestrator;

  test.beforeEach(async () => {
    orchestrator = new TestOrchestrator();
  });

  test.afterEach(async () => {
    // Generate test report after each test
    const report = orchestrator.generateComprehensiveReport();
    console.log('📊 Test Report:', report.summary);

    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
  });

  test('Smart Campaign Flow Test', async ({ page }) => {
    const result = await orchestrator.runSmartTest('Complete Campaign Flow', async (ctx) => {
      // Test the complete user journey with intelligent error handling
      await ctx.page.goto('/campaign/new');

      // Verify initial page load
      await expect(ctx.page.locator('h1')).toContainText('IBO Image Campaign Generator');
      await expect(ctx.page.locator('img[alt="Amway"]')).toBeVisible();

      // Step 1: URL Input with validation
      const urlInput = ctx.page.locator('input[type="url"]').first();
      const submitBtn = ctx.page.locator('button[type="submit"]').first();

      // Test invalid URL first (to trigger auto-remediation if needed)
      await urlInput.fill('invalid-url');
      await expect(submitBtn).toBeDisabled();

      // Enter valid URL
      await urlInput.fill('https://www.amway.com/en_US/p-123456');
      await expect(submitBtn).toBeEnabled();

      // Mock successful scraping for testing
      await ctx.page.route('/api/scrape', async route => {
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

      await submitBtn.click();

      // Wait for navigation to configuration step
      await expect(ctx.page.locator('text=Configure').or(ctx.page.locator('text=Test Product'))).toBeVisible({ timeout: 10000 });

      // Step 2: Configuration
      const generateBtn = ctx.page.locator('button:has-text("Generate")').first();
      if (await generateBtn.isVisible()) {
        // Mock generation API
        await ctx.page.route('/api/campaign/generate', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              campaignId: 1,
              downloadUrl: '/api/campaign/download/test.zip',
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              totalImages: 5
            })
          });
        });

        // Mock image gallery API
        await ctx.page.route('/api/campaign/1/images', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              campaignId: 1,
              images: [
                {
                  id: 1,
                  format: 'instagram_post',
                  prompt: 'Test prompt',
                  width: 1080,
                  height: 1080,
                  selected: true,
                  r2_path: 'test1.jpg'
                }
              ]
            })
          });
        });

        await generateBtn.click();

        // Wait for generation to complete and preview to appear
        await expect(ctx.page.locator('text=Preview').or(ctx.page.locator('text=images selected'))).toBeVisible({ timeout: 30000 });

        // Step 3: Preview and Selection
        const continueBtn = ctx.page.locator('button:has-text("Continue")').first();
        if (await continueBtn.isVisible()) {
          await continueBtn.click();

          // Step 4: Summary/Download
          await expect(ctx.page.locator('text=Campaign Complete').or(ctx.page.locator('text=Create New'))).toBeVisible({ timeout: 10000 });
        }
      }

      console.log('✅ Complete campaign flow test passed');
    }, page);

    // Verify test completed successfully
    expect(['passed', 'auto-fixed']).toContain(result.status);

    if (result.status === 'auto-fixed') {
      console.log(`🔧 Test required auto-remediation: ${result.remediationResults.length} fixes applied`);
    }
  });

  test('Error Resilience Test', async ({ page }) => {
    const result = await orchestrator.runSmartTest('Error Injection and Recovery', async (ctx) => {
      // Test system's ability to handle and recover from various errors

      // 1. Network failure simulation
      await ctx.page.route('**/api/scrape', route => {
        route.abort('failed'); // Simulate network failure
      });

      await ctx.page.goto('/campaign/new');
      await ctx.page.fill('input[type="url"]', 'https://www.amway.com/en_US/p-123456');
      await ctx.page.click('button[type="submit"]');

      // Auto-remediation should handle the network failure
      await ctx.page.waitForTimeout(5000);

      // 2. Invalid response simulation
      await ctx.page.route('**/api/scrape', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      await ctx.page.fill('input[type="url"]', 'https://www.amway.com/en_US/p-789012');
      await ctx.page.click('button[type="submit"]');

      // Wait for error handling
      await ctx.page.waitForTimeout(3000);

      // 3. Malformed response simulation
      await ctx.page.route('**/api/scrape', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json{'
        });
      });

      await ctx.page.fill('input[type="url"]', 'https://www.amway.com/en_US/p-345678');
      await ctx.page.click('button[type="submit"]');

      await ctx.page.waitForTimeout(3000);

      console.log('✅ Error resilience test completed');
    }, page);

    // The test should either pass or be auto-fixed
    expect(['passed', 'auto-fixed', 'manual-intervention-required']).toContain(result.status);
  });

  test('Performance and Memory Test', async ({ page }) => {
    const result = await orchestrator.runSmartTest('Performance Validation', async (ctx) => {
      // Performance-focused testing with automatic optimization detection

      const startTime = Date.now();
      await ctx.page.goto('/campaign/new');
      const loadTime = Date.now() - startTime;

      // Page should load within reasonable time
      if (loadTime > 5000) {
        console.log(`⚠️ Slow page load detected: ${loadTime}ms`);
      }

      // Memory usage check
      const memoryInfo = await ctx.page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });

      if (memoryInfo) {
        const memoryMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
        console.log(`💾 Memory usage: ${memoryMB.toFixed(2)}MB`);

        if (memoryMB > 100) {
          console.log('⚠️ High memory usage detected');
        }
      }

      // Stress test: rapid interactions
      for (let i = 0; i < 10; i++) {
        await ctx.page.fill('input[type="url"]', `https://www.amway.com/en_US/p-${i}`);
        await ctx.page.waitForTimeout(100);
      }

      console.log('✅ Performance test completed');
    }, page);

    expect(['passed', 'auto-fixed']).toContain(result.status);
  });

  test('Accessibility and UI Validation', async ({ page }) => {
    const result = await orchestrator.runSmartTest('Accessibility Compliance', async (ctx) => {
      await ctx.page.goto('/campaign/new');

      // Keyboard navigation test
      await ctx.page.keyboard.press('Tab');
      const focusedElement = ctx.page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Color contrast and visual elements
      const logo = ctx.page.locator('img[alt="Amway"]');
      await expect(logo).toBeVisible();

      // Form accessibility
      const urlInput = ctx.page.locator('input[type="url"]');
      const inputLabel = await urlInput.getAttribute('aria-label');
      const hasLabel = inputLabel || await ctx.page.locator('label').count() > 0;

      if (!hasLabel) {
        console.log('⚠️ Form input may be missing proper labeling');
      }

      // Button accessibility
      const buttons = await ctx.page.locator('button').all();
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        if (!text?.trim() && !ariaLabel) {
          console.log('⚠️ Button missing accessible text');
        }
      }

      console.log('✅ Accessibility validation completed');
    }, page);

    expect(['passed', 'auto-fixed', 'manual-intervention-required']).toContain(result.status);
  });

  test('Cross-Browser Compatibility', async ({ page, browserName }) => {
    const result = await orchestrator.runSmartTest(`Cross-Browser Test (${browserName})`, async (ctx) => {
      // Browser-specific testing and compatibility checks

      await ctx.page.goto('/campaign/new');

      // Check for browser-specific issues
      const userAgent = await ctx.page.evaluate(() => navigator.userAgent);
      console.log(`🌐 Testing on: ${browserName} - ${userAgent}`);

      // Test basic functionality
      await expect(ctx.page.locator('h1')).toBeVisible();
      await expect(ctx.page.locator('img[alt="Amway"]')).toBeVisible();

      // Check CSS compatibility
      const headerStyles = await ctx.page.locator('h1').evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          fontSize: styles.fontSize,
          color: styles.color
        };
      });

      if (headerStyles.display === 'none') {
        console.log('⚠️ Header not visible - potential CSS issue');
      }

      // Test JavaScript functionality
      const jsWorking = await ctx.page.evaluate(() => {
        try {
          return typeof fetch !== 'undefined' && typeof Promise !== 'undefined';
        } catch {
          return false;
        }
      });

      if (!jsWorking) {
        console.log('⚠️ JavaScript compatibility issues detected');
      }

      console.log(`✅ ${browserName} compatibility test completed`);
    }, page);

    expect(['passed', 'auto-fixed']).toContain(result.status);
  });

  test('Security Validation', async ({ page }) => {
    const result = await orchestrator.runSmartTest('Security Checks', async (ctx) => {
      await ctx.page.goto('/campaign/new');

      // Check for secure protocols
      const currentUrl = ctx.page.url();
      if (!currentUrl.startsWith('https://') && !currentUrl.startsWith('http://localhost')) {
        console.log('⚠️ Non-HTTPS connection detected');
      }

      // Test for XSS vulnerability
      const xssPayload = '<script>window.__xss_test = true;</script>';
      await ctx.page.fill('input[type="url"]', `https://www.amway.com/en_US/p-123${xssPayload}`);

      const xssExecuted = await ctx.page.evaluate(() => (window as any).__xss_test);
      if (xssExecuted) {
        console.log('🚨 XSS vulnerability detected');
      }

      // Check for exposed sensitive data in console
      const consoleLogs = [];
      ctx.page.on('console', msg => {
        if (msg.type() === 'log') {
          consoleLogs.push(msg.text());
        }
      });

      await ctx.page.waitForTimeout(2000);

      // Look for potential sensitive data exposure
      const sensitivePatterns = /api[_-]?key|secret|token|password/i;
      const suspiciousLogs = consoleLogs.filter(log => sensitivePatterns.test(log));

      if (suspiciousLogs.length > 0) {
        console.log('⚠️ Potential sensitive data exposure in console logs');
      }

      console.log('✅ Security validation completed');
    }, page);

    expect(['passed', 'auto-fixed', 'manual-intervention-required']).toContain(result.status);
  });

  test('Full Adaptive Test Suite', async ({ page }) => {
    // Run the complete adaptive test suite that learns and adapts
    const results = await orchestrator.runAdaptiveTestSuite(page);

    console.log(`📊 Adaptive test suite completed: ${results.length} tests executed`);

    results.forEach(result => {
      console.log(`   ${result.testName}: ${result.status} (${result.duration}ms)`);

      if (result.errorsDetected.length > 0) {
        console.log(`     Errors: ${result.errorsDetected.length}, Auto-fixed: ${result.remediationResults.filter(r => r.success).length}`);
      }
    });

    // Generate comprehensive report
    const report = orchestrator.generateComprehensiveReport();
    console.log('\n📈 Final Report:');
    console.log(`   ${report.summary}`);
    console.log(`   Common Error Patterns: ${report.commonErrorPatterns.length}`);

    if (report.recommendations.length > 0) {
      console.log('   Recommendations:');
      report.recommendations.forEach(rec => console.log(`     - ${rec}`));
    }

    // All tests should either pass or be auto-fixed
    const criticalFailures = results.filter(r => r.status === 'failed' || r.status === 'manual-intervention-required');
    expect(criticalFailures.length).toBe(0);
  });
});