/**
 * Test utility functions for common testing patterns
 */

import { Page, expect } from '@playwright/test';
import { mockApiResponses, selectors, timeouts } from './test-data';

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Navigate to campaign page and wait for load
   */
  async navigateToCampaign() {
    await this.page.goto('/campaign/new');
    await this.page.waitForLoadState('networkidle');
    await this.waitFor(timeouts.medium);
  }

  /**
   * Wait for specified time
   */
  async waitFor(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Mock API responses for testing
   */
  async mockApi(scenarios: {
    products?: 'success' | 'empty' | 'error';
    generation?: 'success' | 'rateLimit' | 'serverError' | 'validationError';
    search?: 'artistry' | 'empty';
  }) {
    if (scenarios.products) {
      const response = mockApiResponses.products[scenarios.products];
      await this.page.route('/api/products/load', route => {
        route.fulfill({
          status: response.status,
          contentType: 'application/json',
          headers: (response as any).headers || {},
          body: JSON.stringify(response.body)
        });
      });
    }

    if (scenarios.generation) {
      const response = mockApiResponses.generation[scenarios.generation];
      await this.page.route('/api/campaign/generate', route => {
        route.fulfill({
          status: response.status,
          contentType: 'application/json',
          headers: (response as any).headers || {},
          body: JSON.stringify(response.body)
        });
      });
    }

    if (scenarios.search) {
      const response = mockApiResponses.search[scenarios.search];
      await this.page.route('/api/products/search*', route => {
        route.fulfill({
          status: response.status,
          contentType: 'application/json',
          body: JSON.stringify(response.body)
        });
      });
    }
  }

  /**
   * Select a product from the browser
   */
  async selectProduct(productName?: string) {
    await this.page.waitForLoadState('networkidle');
    await this.waitFor(timeouts.medium);

    const productSelector = productName
      ? `text=${productName}`
      : selectors.productName;

    const productElements = this.page.locator(productSelector).or(
      this.page.locator(selectors.selectButton)
    ).or(
      this.page.locator(selectors.productCard)
    );

    const count = await productElements.count();
    expect(count).toBeGreaterThan(0);

    await productElements.first().click();
    await this.waitFor(timeouts.short);

    return true;
  }

  /**
   * Configure campaign preferences
   */
  async configureCampaign(config: {
    campaignType?: 'product_focus' | 'lifestyle';
    brandStyle?: 'professional' | 'casual' | 'wellness' | 'luxury';
    campaignSize?: 1 | 3 | 5;
  } = {}) {
    const {
      campaignType = 'product_focus',
      brandStyle = 'professional',
      campaignSize = 1
    } = config;

    // Select campaign type (convert snake_case to camelCase for selector mapping)
    const campaignTypeKey = campaignType === 'product_focus' ? 'productFocus' : campaignType;
    const campaignTypeSelector = selectors.campaignType[campaignTypeKey as keyof typeof selectors.campaignType];
    const campaignTypeElement = this.page.locator(campaignTypeSelector);
    if (await campaignTypeElement.count() > 0) {
      await campaignTypeElement.first().click();
      console.log(`✅ Selected ${campaignType} campaign type`);
    }

    // Select brand style
    const brandStyleSelector = selectors.brandStyle[brandStyle];
    const brandStyleElement = this.page.locator(brandStyleSelector);
    if (await brandStyleElement.count() > 0) {
      await brandStyleElement.first().click();
      console.log(`✅ Selected ${brandStyle} brand style`);
    }

    // Select campaign size
    const sizeKey = campaignSize === 1 ? 'one' : campaignSize === 3 ? 'three' : 'five';
    const campaignSizeSelector = selectors.campaignSize[sizeKey];
    const campaignSizeElement = this.page.locator(campaignSizeSelector);
    if (await campaignSizeElement.count() > 0) {
      await campaignSizeElement.first().click();
      console.log(`✅ Selected ${campaignSize} image campaign size`);
    }

    await this.waitFor(timeouts.short);
  }

  /**
   * Start campaign generation
   */
  async startGeneration() {
    const generateBtn = this.page.locator(selectors.generateButton);

    const count = await generateBtn.count();
    expect(count).toBeGreaterThan(0);

    await generateBtn.first().click();
    console.log('✅ Generation started');

    await this.waitFor(timeouts.short);
  }

  /**
   * Wait for generation completion
   */
  async waitForGenerationComplete(timeout: number = timeouts.long) {
    const successElements = this.page.locator(selectors.success);
    const errorElements = this.page.locator(selectors.error);

    await this.waitFor(timeout);

    const hasSuccess = await successElements.count() > 0;
    const hasError = await errorElements.count() > 0;

    return { hasSuccess, hasError };
  }

  /**
   * Complete full campaign flow
   */
  async completeFullFlow(config?: {
    productName?: string;
    campaignType?: 'product_focus' | 'lifestyle';
    brandStyle?: 'professional' | 'casual' | 'wellness' | 'luxury';
    campaignSize?: 1 | 3 | 5;
    mockGeneration?: boolean;
  }) {
    const {
      productName,
      campaignType,
      brandStyle,
      campaignSize,
      mockGeneration = true
    } = config || {};

    console.log('🚀 Starting complete campaign flow...');

    // Step 1: Navigate
    await this.navigateToCampaign();
    console.log('✅ Step 1: Navigated to campaign page');

    // Step 2: Mock APIs if needed
    if (mockGeneration) {
      await this.mockApi({ generation: 'success' });
    }

    // Step 3: Select product
    await this.selectProduct(productName);
    console.log('✅ Step 2: Product selected');

    // Step 4: Configure campaign
    await this.configureCampaign({ campaignType, brandStyle, campaignSize });
    console.log('✅ Step 3: Campaign configured');

    // Step 5: Start generation
    await this.startGeneration();
    console.log('✅ Step 4: Generation started');

    // Step 6: Wait for completion
    const result = await this.waitForGenerationComplete();
    console.log('✅ Step 5: Generation completed');

    return result;
  }

  /**
   * Check for accessibility violations
   */
  async checkAccessibility() {
    // Check for proper heading hierarchy
    const headings = this.page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);

    // Check for alt text on images
    const images = this.page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      const imagesWithAlt = this.page.locator('img[alt]');
      const altTextCount = await imagesWithAlt.count();
      expect(altTextCount).toBeGreaterThan(0);
    }

    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    await this.waitFor(500);

    let focusableElements = 0;
    for (let i = 0; i < 5; i++) {
      const focused = await this.page.locator(':focus').count();
      if (focused > 0) {
        focusableElements++;
      }
      await this.page.keyboard.press('Tab');
      await this.waitFor(200);
    }

    expect(focusableElements).toBeGreaterThan(0);

    return {
      headings: headingCount,
      imagesWithAlt: imageCount > 0 ? await this.page.locator('img[alt]').count() : 0,
      totalImages: imageCount,
      focusableElements
    };
  }

  /**
   * Check responsive design
   */
  async checkResponsiveDesign(viewport: { width: number; height: number }) {
    await this.page.setViewportSize(viewport);
    await this.waitFor(timeouts.short);

    // Check no horizontal scrolling
    const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await this.page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // Allow small tolerance

    // Check touch targets on mobile
    if (viewport.width < 768) {
      const buttons = this.page.locator('button, [role="button"]');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        const firstButton = buttons.first();
        const boundingBox = await firstButton.boundingBox();

        if (boundingBox) {
          expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(40);
        }
      }
    }

    return {
      bodyWidth,
      viewportWidth,
      hasHorizontalScroll: bodyWidth > viewportWidth + 5
    };
  }

  /**
   * Monitor performance metrics
   */
  async measurePerformance() {
    const navigationStart = await this.page.evaluate(() => performance.timeOrigin);
    const loadEnd = await this.page.evaluate(() => performance.timing?.loadEventEnd || 0);

    const loadTime = loadEnd ? loadEnd - navigationStart : 0;

    // Get memory info if available
    const memoryInfo = await this.page.evaluate(() => {
      // @ts-ignore
      return (performance as any).memory || null;
    });

    return {
      loadTime,
      memory: memoryInfo ? {
        used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)
      } : null
    };
  }

  /**
   * Simulate network conditions
   */
  async simulateSlowNetwork() {
    await this.page.route('**/*', route => {
      setTimeout(() => route.continue(), 500); // Add 500ms delay
    });
  }

  /**
   * Check for console errors
   */
  async monitorConsoleErrors() {
    const errors: string[] = [];

    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    return () => {
      const criticalErrors = errors.filter(error =>
        !error.includes('favicon') &&
        !error.includes('404') &&
        !error.includes('image')
      );
      return { errors, criticalErrors };
    };
  }

  /**
   * Take screenshot for debugging
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }
}

/**
 * Factory function to create test utils
 */
export function createTestUtils(page: Page) {
  return new TestUtils(page);
}