/**
 * Simple UX Analysis to identify critical issues
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const RESULTS_DIR = '/home/lando555/amway-imagen/ux-analysis-2025-09-15-182322';
const BASE_URL = 'http://localhost:3001';

async function runSimpleAnalysis() {
  console.log('🚀 Starting simple UX analysis...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        timestamp: new Date().toISOString(),
        message: msg.text(),
        location: msg.location()
      });
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });

  try {
    // Navigate to application
    console.log('📍 Navigating to application...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Take initial screenshot
    await page.screenshot({
      path: path.join(RESULTS_DIR, 'screenshots/desktop/initial-page.png'),
      fullPage: true
    });

    console.log('✅ Page loaded successfully');

    // Check if we're on home page or campaign page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Look for URL input field
    console.log('🔍 Looking for URL input field...');

    // Try different selectors for the URL input
    const urlInputSelectors = [
      'input[type="url"]',
      'input[placeholder*="amway"]',
      'input[placeholder*="URL"]',
      '#product-url',
      'input[name="url"]',
      'input[name="productUrl"]'
    ];

    let urlInput = null;
    let foundSelector = null;

    for (const selector of urlInputSelectors) {
      try {
        urlInput = await page.locator(selector).first();
        if (await urlInput.isVisible({ timeout: 1000 })) {
          foundSelector = selector;
          console.log(`✅ Found URL input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }

    if (!urlInput || !foundSelector) {
      console.log('❌ URL input field not found');

      // Check if we need to navigate to campaign creation
      const createCampaignLink = page.locator('a:has-text("Create Campaign"), a:has-text("Get Started"), a[href*="campaign"]');
      if (await createCampaignLink.isVisible({ timeout: 2000 })) {
        console.log('🔗 Found "Create Campaign" link, clicking...');
        await createCampaignLink.first().click();
        await page.waitForLoadState('networkidle');

        // Take screenshot of campaign page
        await page.screenshot({
          path: path.join(RESULTS_DIR, 'screenshots/desktop/campaign-page.png'),
          fullPage: true
        });

        // Try to find URL input again
        for (const selector of urlInputSelectors) {
          try {
            urlInput = await page.locator(selector).first();
            if (await urlInput.isVisible({ timeout: 1000 })) {
              foundSelector = selector;
              console.log(`✅ Found URL input on campaign page with selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue trying
          }
        }
      }
    }

    if (urlInput && foundSelector) {
      // Test URL input functionality
      console.log('🧪 Testing URL input functionality...');

      const testUrl = 'https://www.amway.com/en_US/p/326782';
      await urlInput.fill(testUrl);

      // Take screenshot with filled URL
      await page.screenshot({
        path: path.join(RESULTS_DIR, 'screenshots/desktop/url-filled.png'),
        fullPage: true
      });

      // Look for submit button
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Extract")',
        'button:has-text("Submit")',
        'button:has-text("Continue")',
        'form button'
      ];

      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = page.locator(selector).first();
          if (await submitButton.isVisible({ timeout: 1000 })) {
            console.log(`✅ Found submit button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }

      if (submitButton) {
        const isEnabled = await submitButton.isEnabled();
        console.log(`Submit button enabled: ${isEnabled}`);

        if (isEnabled) {
          console.log('🔄 Attempting to submit form...');
          await submitButton.click();

          // Wait a bit and see what happens
          await page.waitForTimeout(3000);

          // Take screenshot after submission
          await page.screenshot({
            path: path.join(RESULTS_DIR, 'screenshots/desktop/after-submit.png'),
            fullPage: true
          });

          // Check for any error messages or loading states
          const errorSelectors = [
            '[role="alert"]',
            '.error',
            '.alert-error',
            '[class*="error"]'
          ];

          for (const selector of errorSelectors) {
            try {
              const errorElement = page.locator(selector).first();
              if (await errorElement.isVisible({ timeout: 1000 })) {
                const errorText = await errorElement.textContent();
                console.log(`❌ Error found: ${errorText}`);
              }
            } catch (e) {
              // Continue
            }
          }

          // Check for loading indicators
          const loadingSelectors = [
            '[aria-busy="true"]',
            '.loading',
            '[class*="loading"]',
            'svg[class*="spin"]'
          ];

          for (const selector of loadingSelectors) {
            try {
              const loadingElement = page.locator(selector).first();
              if (await loadingElement.isVisible({ timeout: 1000 })) {
                console.log(`⏳ Loading indicator found with selector: ${selector}`);
              }
            } catch (e) {
              // Continue
            }
          }
        }
      } else {
        console.log('❌ Submit button not found');
      }
    } else {
      console.log('❌ Could not find URL input field on any page');
    }

    // Test accessibility basics
    console.log('♿ Testing basic accessibility...');

    // Check for headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    console.log(`Found ${headings} heading elements`);

    // Check for images without alt text
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    console.log(`Found ${imagesWithoutAlt} images without alt text`);

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => {
      const focused = document.activeElement;
      return {
        tagName: focused?.tagName,
        id: focused?.id,
        className: focused?.className,
        hasVisibleFocus: focused && getComputedStyle(focused).outline !== 'none'
      };
    });
    console.log('Focused element after Tab:', focusedElement);

    // Test responsive design
    console.log('📱 Testing responsive design...');

    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(RESULTS_DIR, `screenshots/${viewport.name}/responsive-${viewport.name}.png`),
        fullPage: true
      });

      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      console.log(`${viewport.name} viewport horizontal scroll: ${hasHorizontalScroll}`);
    }

  } catch (error) {
    console.error('❌ Critical error during analysis:', error.message);

    // Take error screenshot
    await page.screenshot({
      path: path.join(RESULTS_DIR, 'screenshots/desktop/error-state.png'),
      fullPage: true
    });
  }

  // Save console errors
  if (consoleErrors.length > 0) {
    await fs.writeFile(
      path.join(RESULTS_DIR, 'console-logs/errors.json'),
      JSON.stringify(consoleErrors, null, 2)
    );
    console.log(`💾 Saved ${consoleErrors.length} console errors to errors.json`);
  }

  await browser.close();

  console.log(`✅ Simple analysis complete! Check results in: ${RESULTS_DIR}`);
}

runSimpleAnalysis().catch(console.error);