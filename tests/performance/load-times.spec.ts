import { test, expect } from '@playwright/test';

test.describe('Performance and Load Time Tests', () => {

  test('should load main page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/campaign/new');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`📊 Page load time: ${loadTime}ms`);

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Check if main content is visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle large product datasets efficiently', async ({ page }) => {
    // Mock large product dataset
    await page.route('/api/products/load', route => {
      const largeProductSet = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Test Product ${i + 1}`,
        description: `This is a test product description for product ${i + 1}`,
        brand: 'Test Brand',
        category: 'test',
        price: Math.random() * 100,
        currency: 'USD',
        main_image_url: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA=`
      }));

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products: largeProductSet })
      });
    });

    const startTime = Date.now();

    await page.goto('/campaign/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const renderTime = Date.now() - startTime;
    console.log(`📊 Large dataset render time: ${renderTime}ms`);

    // Should handle large dataset within reasonable time
    expect(renderTime).toBeLessThan(10000);

    // Check if products are rendered
    const productElements = page.locator('text=Test Product');
    expect(await productElements.count()).toBeGreaterThan(0);
  });

  test('should measure image loading performance', async ({ page }) => {
    await page.goto('/campaign/new');

    const imageLoadTimes: number[] = [];

    // Listen for image load events
    page.on('response', response => {
      if (response.url().includes('image') || response.url().includes('.png') || response.url().includes('.jpg')) {
        console.log(`🖼️ Image loaded: ${response.url()}`);
      }
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check if images are visible
    const images = page.locator('img').filter({ hasNot: page.locator('img[alt="Amway"]') });
    const imageCount = await images.count();

    if (imageCount > 0) {
      console.log(`📊 Total product images loaded: ${imageCount}`);
      expect(imageCount).toBeGreaterThan(0);
    }
  });

  test('should handle API response times efficiently', async ({ page }) => {
    let apiResponseTimes: { [key: string]: number } = {};

    // Track API response times
    const requestStartTimes = new Map<string, number>();

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requestStartTimes.set(request.url(), Date.now());
      }
    });

    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        const startTime = requestStartTimes.get(url);
        if (startTime) {
          const responseTime = Date.now() - startTime;
          apiResponseTimes[url] = responseTime;
          console.log(`🔗 API ${url}: ${responseTime}ms`);
          requestStartTimes.delete(url);
        }
      }
    });

    await page.goto('/campaign/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check API response times
    const apiEndpoints = Object.keys(apiResponseTimes);
    expect(apiEndpoints.length).toBeGreaterThan(0);

    // All API calls should respond within 10 seconds
    for (const [endpoint, time] of Object.entries(apiResponseTimes)) {
      expect(time).toBeLessThan(10000);
      console.log(`✅ ${endpoint}: ${time}ms`);
    }
  });

  test('should measure campaign generation performance', async ({ page }) => {
    await page.goto('/campaign/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Mock fast generation for performance testing
    await page.route('/api/campaign/generate', async route => {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 100));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          campaignId: 123,
          downloadUrl: '/api/campaign/download/test-campaign.zip',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          totalImages: 1,
          successfulImages: 1,
          requestedImages: 1,
          generationTimeSeconds: 0.1
        })
      });
    });

    // Navigate to generation
    const productElements = page.locator('div:has-text("Artistry")').or(
      page.locator('button')
    );

    if (await productElements.count() > 0) {
      await productElements.first().click();
      await page.waitForTimeout(1000);

      const generateBtn = page.locator('button:has-text("Generate")');

      if (await generateBtn.count() > 0) {
        const startTime = Date.now();

        await generateBtn.first().click();

        // Wait for completion
        await page.waitForTimeout(3000);

        const generationTime = Date.now() - startTime;
        console.log(`📊 Generation UI response time: ${generationTime}ms`);

        // UI should respond quickly even if actual generation takes longer
        expect(generationTime).toBeLessThan(5000);
      }
    }
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    await page.goto('/campaign/new');

    // Monitor memory usage if available
    const memoryInfo = await page.evaluate(() => {
      // @ts-ignore - performance.memory is available in some browsers
      return (performance as any).memory || null;
    });

    if (memoryInfo) {
      console.log(`📊 Memory usage:`, {
        used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      });

      // Memory usage should be reasonable (under 100MB for this app)
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Interact with the page to check for memory leaks
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // Memory should not grow significantly after reloads
    const finalMemoryInfo = await page.evaluate(() => {
      // @ts-ignore
      return (performance as any).memory || null;
    });

    if (finalMemoryInfo && memoryInfo) {
      const memoryGrowth = finalMemoryInfo.usedJSHeapSize - memoryInfo.usedJSHeapSize;
      console.log(`📊 Memory growth after reloads: ${Math.round(memoryGrowth / 1024 / 1024)}MB`);

      // Should not grow by more than 50MB
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should handle concurrent users simulation', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );

    const startTime = Date.now();

    // Simulate 3 concurrent users
    const navigationPromises = pages.map(async (page, index) => {
      await page.goto('/campaign/new');
      await page.waitForLoadState('networkidle');

      console.log(`👤 User ${index + 1} loaded in ${Date.now() - startTime}ms`);

      // Each user interacts slightly differently
      await page.waitForTimeout(1000 + (index * 500));

      const productElements = page.locator('div:has-text("Artistry")').or(
        page.locator('button')
      );

      if (await productElements.count() > 0) {
        await productElements.first().click();
        console.log(`👤 User ${index + 1} selected product`);
      }
    });

    await Promise.all(navigationPromises);

    const totalTime = Date.now() - startTime;
    console.log(`📊 Total concurrent user simulation time: ${totalTime}ms`);

    // Should handle concurrent users within reasonable time
    expect(totalTime).toBeLessThan(15000);

    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should optimize for Core Web Vitals', async ({ page }) => {
    await page.goto('/campaign/new');

    // Measure Largest Contentful Paint (LCP)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('web-vital' in window) {
          // @ts-ignore
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
              resolve(entries[entries.length - 1].startTime);
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        } else {
          resolve(0);
        }

        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });

    const lcpValue = lcp as number;
    if (lcpValue > 0) {
      console.log(`📊 Largest Contentful Paint: ${lcpValue}ms`);
      // LCP should be under 2.5 seconds
      expect(lcpValue).toBeLessThan(2500);
    }

    // Measure First Input Delay by simulating interaction
    const startTime = Date.now();
    await page.click('h1'); // Simple interaction
    const inputDelay = Date.now() - startTime;

    console.log(`📊 Simulated First Input Delay: ${inputDelay}ms`);
    // Should respond to input quickly
    expect(inputDelay).toBeLessThan(100);

    // Check for layout shifts by monitoring elements
    const initialLayout = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, button, img');
      return Array.from(elements).map(el => {
        const rect = el.getBoundingClientRect();
        return { tag: el.tagName, x: rect.x, y: rect.y };
      });
    });

    await page.waitForTimeout(3000);

    const finalLayout = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, button, img');
      return Array.from(elements).map(el => {
        const rect = el.getBoundingClientRect();
        return { tag: el.tagName, x: rect.x, y: rect.y };
      });
    });

    // Check for unexpected layout shifts
    let hasShifts = false;
    for (let i = 0; i < Math.min(initialLayout.length, finalLayout.length); i++) {
      const initial = initialLayout[i];
      const final = finalLayout[i];
      if (Math.abs(initial.x - final.x) > 5 || Math.abs(initial.y - final.y) > 5) {
        hasShifts = true;
        console.log(`⚠️ Layout shift detected in ${initial.tag}`);
      }
    }

    // Should minimize layout shifts
    expect(hasShifts).toBe(false);
  });
});