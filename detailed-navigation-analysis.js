/**
 * Detailed Navigation Analysis for Critical Issue Investigation
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const RESULTS_DIR = '/home/lando555/amway-imagen/ux-analysis-2025-09-15-182322';
const BASE_URL = 'http://localhost:3001';

async function investigateNavigation() {
  console.log('🔍 Starting detailed navigation investigation...');

  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();

  // Monitor all navigation events
  page.on('framenavigated', frame => {
    console.log(`📍 Navigation: ${frame.url()}`);
  });

  // Monitor console messages
  page.on('console', msg => {
    console.log(`🔊 Console [${msg.type()}]: ${msg.text()}`);
  });

  // Monitor network requests
  page.on('request', request => {
    if (request.url().includes('campaign') || request.url().includes('api')) {
      console.log(`🌐 Request: ${request.method()} ${request.url()}`);
    }
  });

  try {
    // 1. Load home page and analyze navigation
    console.log('\n🏠 Testing home page navigation...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Capture home page
    await page.screenshot({
      path: path.join(RESULTS_DIR, 'screenshots/desktop/detailed-home-page.png'),
      fullPage: true
    });

    // Check all links on the page
    const allLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.map(link => ({
        text: link.textContent.trim(),
        href: link.href,
        isVisible: link.offsetParent !== null
      }));
    });

    console.log('\n📋 All links found on home page:');
    allLinks.forEach((link, index) => {
      console.log(`${index + 1}. "${link.text}" -> ${link.href} (${link.isVisible ? 'visible' : 'hidden'})`);
    });

    // 2. Test direct navigation to campaign page
    console.log('\n🔗 Testing direct navigation to /campaign/new...');
    await page.goto(`${BASE_URL}/campaign/new`);
    await page.waitForLoadState('networkidle');

    // Capture campaign page
    await page.screenshot({
      path: path.join(RESULTS_DIR, 'screenshots/desktop/direct-campaign-page.png'),
      fullPage: true
    });

    const campaignPageUrl = page.url();
    console.log(`Current URL after direct navigation: ${campaignPageUrl}`);

    if (campaignPageUrl.includes('/campaign/new')) {
      console.log('✅ Direct navigation to campaign page works');

      // Analyze the campaign page structure
      const pageStructure = await page.evaluate(() => {
        const structure = {
          title: document.title,
          headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
            tag: h.tagName,
            text: h.textContent.trim()
          })),
          forms: Array.from(document.querySelectorAll('form')).length,
          inputs: Array.from(document.querySelectorAll('input')).map(input => ({
            type: input.type,
            id: input.id,
            name: input.name,
            placeholder: input.placeholder,
            required: input.required,
            visible: input.offsetParent !== null
          })),
          buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
            text: btn.textContent.trim(),
            type: btn.type,
            disabled: btn.disabled,
            visible: btn.offsetParent !== null
          })),
          progressIndicators: Array.from(document.querySelectorAll('.step, .progress, [role="progressbar"]')).length
        };
        return structure;
      });

      console.log('\n📊 Campaign page structure:');
      console.log('Title:', pageStructure.title);
      console.log('Headings:', pageStructure.headings);
      console.log('Forms:', pageStructure.forms);
      console.log('Inputs:', pageStructure.inputs);
      console.log('Buttons:', pageStructure.buttons);
      console.log('Progress indicators:', pageStructure.progressIndicators);

      // Look for the URL input field specifically
      const urlInputs = pageStructure.inputs.filter(input =>
        input.type === 'url' ||
        input.id?.includes('url') ||
        input.name?.includes('url') ||
        input.placeholder?.toLowerCase().includes('url') ||
        input.placeholder?.toLowerCase().includes('amway')
      );

      console.log('\n🔍 URL-related inputs found:', urlInputs);

      if (urlInputs.length === 0) {
        console.log('❌ No URL input fields found on campaign page');

        // Check if this is a multi-step form and we need to navigate further
        const nextButtons = pageStructure.buttons.filter(btn =>
          btn.text.toLowerCase().includes('next') ||
          btn.text.toLowerCase().includes('continue') ||
          btn.text.toLowerCase().includes('start')
        );

        if (nextButtons.length > 0) {
          console.log('🔄 Found navigation buttons, attempting to proceed through flow...');
          // Try clicking the first navigation button
          await page.click(`button:has-text("${nextButtons[0].text}")`);
          await page.waitForLoadState('networkidle');

          await page.screenshot({
            path: path.join(RESULTS_DIR, 'screenshots/desktop/campaign-step-2.png'),
            fullPage: true
          });

          // Re-analyze the page after navigation
          const step2Structure = await page.evaluate(() => {
            return {
              url: window.location.href,
              inputs: Array.from(document.querySelectorAll('input')).map(input => ({
                type: input.type,
                id: input.id,
                name: input.name,
                placeholder: input.placeholder,
                visible: input.offsetParent !== null
              }))
            };
          });

          console.log('Step 2 URL:', step2Structure.url);
          console.log('Step 2 inputs:', step2Structure.inputs);
        }

      } else {
        console.log('✅ URL input field found on campaign page');
      }

    } else {
      console.log('❌ Direct navigation failed - redirected to:', campaignPageUrl);
    }

    // 3. Test clicking the Create Campaign button from home page
    console.log('\n🖱️ Testing Create Campaign button click from home page...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find the first Create Campaign link
    const createCampaignButton = page.locator('a:has-text("Create Campaign")').first();

    if (await createCampaignButton.isVisible()) {
      console.log('✅ Create Campaign button found and visible');

      // Check the href attribute
      const href = await createCampaignButton.getAttribute('href');
      console.log(`Button href: ${href}`);

      // Click the button and monitor what happens
      console.log('🖱️ Clicking Create Campaign button...');
      await createCampaignButton.click();

      // Wait a bit for navigation
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');

      const finalUrl = page.url();
      console.log(`Final URL after button click: ${finalUrl}`);

      await page.screenshot({
        path: path.join(RESULTS_DIR, 'screenshots/desktop/after-button-click.png'),
        fullPage: true
      });

      if (finalUrl === BASE_URL || finalUrl === `${BASE_URL}/`) {
        console.log('❌ Button click redirected back to home page - possible JavaScript issue');

        // Check for JavaScript errors that might prevent navigation
        const jsErrors = await page.evaluate(() => {
          // Look for any error indicators in the console or page
          return {
            hasErrorBoundary: !!document.querySelector('[data-error-boundary]'),
            hasJSErrors: window.jsErrors || [],
            reactVersion: window.React?.version || 'Not found'
          };
        });

        console.log('JavaScript diagnostics:', jsErrors);
      } else if (finalUrl.includes('/campaign/new')) {
        console.log('✅ Button click successfully navigated to campaign page');
      } else {
        console.log('⚠️ Unexpected navigation destination:', finalUrl);
      }
    } else {
      console.log('❌ Create Campaign button not found or not visible');
    }

    // 4. Test if there are any client-side errors
    console.log('\n🛠️ Checking for client-side errors...');

    // Check if Next.js is working properly
    const nextJsInfo = await page.evaluate(() => {
      return {
        nextVersion: window.__NEXT_DATA__?.buildId || 'Not found',
        routerReady: !!window.__NEXT_DATA__,
        currentRoute: window.__NEXT_DATA__?.page || 'Unknown',
        hasHydrationErrors: !!document.querySelector('[data-nextjs-hydration-error]')
      };
    });

    console.log('Next.js diagnostics:', nextJsInfo);

    // 5. Generate detailed findings
    const findings = {
      timestamp: new Date().toISOString(),
      homePageNavigation: {
        allLinksFound: allLinks.length,
        campaignLinks: allLinks.filter(link => link.href.includes('/campaign')).length
      },
      directNavigation: {
        works: campaignPageUrl.includes('/campaign/new'),
        finalUrl: campaignPageUrl
      },
      buttonClickNavigation: {
        buttonFound: await createCampaignButton.isVisible().catch(() => false),
        navigationSuccessful: false // Will be updated based on results
      },
      technicalIssues: {
        nextJsInfo,
        pageStructure: pageStructure || {}
      }
    };

    await fs.writeFile(
      path.join(RESULTS_DIR, 'navigation-investigation.json'),
      JSON.stringify(findings, null, 2)
    );

  } catch (error) {
    console.error('❌ Critical error during navigation investigation:', error);

    await page.screenshot({
      path: path.join(RESULTS_DIR, 'screenshots/desktop/navigation-error.png'),
      fullPage: true
    });
  }

  await browser.close();
  console.log('✅ Navigation investigation complete');
}

investigateNavigation().catch(console.error);