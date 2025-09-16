/**
 * Test utilities and helpers for Playwright tests
 */

import { expect } from '@playwright/test';

export const TEST_URLS = {
  VALID_AMWAY: 'https://www.amway.com/en_US/p-123456',
  INVALID_DOMAIN: 'https://invalid-domain.com/product',
  INVALID_FORMAT: 'https://www.amway.com/invalid-format'
};

export const MOCK_PRODUCT = {
  id: 1,
  name: 'Test Product',
  description: 'A test product for automated testing',
  brand: 'Amway',
  price: 29.99,
  currency: 'USD',
  category: 'Health',
  main_image_url: 'https://www.amway.com/medias/test.jpg',
  benefits: 'Test benefits',
  inventory_status: 'In Stock'
};

export const MOCK_CAMPAIGN_PREFERENCES = {
  campaign_type: 'product_focus' as const,
  brand_style: 'professional' as const,
  color_scheme: 'amway_brand' as const,
  text_overlay: 'moderate' as const,
  campaign_size: 3 as const,
  image_formats: ['instagram_post', 'instagram_story'] as const
};

export const MOCK_GENERATED_IMAGES = [
  {
    id: 1,
    format: 'instagram_post',
    prompt: 'Professional product shot with clean background',
    width: 1080,
    height: 1080,
    selected: true,
    r2_path: 'campaigns/1/images/image1.jpg'
  },
  {
    id: 2,
    format: 'instagram_story',
    prompt: 'Lifestyle shot showing product in use',
    width: 1080,
    height: 1920,
    selected: true,
    r2_path: 'campaigns/1/images/image2.jpg'
  },
  {
    id: 3,
    format: 'facebook_cover',
    prompt: 'Brand banner with product highlight',
    width: 1200,
    height: 630,
    selected: false,
    r2_path: 'campaigns/1/images/image3.jpg'
  }
];

/**
 * Set up API mocks for successful scraping
 */
export async function mockSuccessfulScraping(page: any) {
  await page.route('/api/scrape', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        product: MOCK_PRODUCT
      })
    });
  });
}

/**
 * Set up API mocks for campaign images
 */
export async function mockCampaignImages(page: any, campaignId: number = 1) {
  await page.route(`/api/campaign/${campaignId}/images`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        campaignId,
        images: MOCK_GENERATED_IMAGES
      })
    });
  });

  // Mock individual image endpoints
  for (const image of MOCK_GENERATED_IMAGES) {
    await page.route(`/api/campaign/${campaignId}/images/${image.id}`, async (route: any) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'image/jpeg',
          body: Buffer.from('fake-image-data')
        });
      } else if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });
  }
}

/**
 * Set up API mocks for failed scenarios
 */
export async function mockFailedScraping(page: any, errorMessage: string = 'Scraping failed') {
  await page.route('/api/scrape', async (route: any) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: errorMessage
      })
    });
  });
}

/**
 * Complete the URL input step
 */
export async function completeUrlStep(page: any, url: string = TEST_URLS.VALID_AMWAY) {
  const urlInput = page.locator('input[type="url"]').or(page.locator('input[placeholder*="URL"]')).first();
  const submitBtn = page.locator('button[type="submit"]').or(page.locator('button:has-text("Extract")')).first();

  await urlInput.fill(url);
  await submitBtn.click();
}

/**
 * Wait for a specific step to be active
 */
export async function waitForStep(page: any, stepName: string) {
  await page.locator(`text=${stepName}`).first().waitFor();
}

/**
 * Get viewport dimensions for responsive testing
 */
export const VIEWPORTS = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 768, height: 1024 },
  DESKTOP: { width: 1920, height: 1080 }
};

/**
 * Check if element is visible and has minimum touch target size
 */
export async function checkTouchTarget(element: any, minSize: number = 44) {
  const box = await element.boundingBox();
  if (box) {
    expect(box.width).toBeGreaterThanOrEqual(minSize);
    expect(box.height).toBeGreaterThanOrEqual(minSize);
  }
}

/**
 * Wait for API request with timeout
 */
export async function waitForApiCall(page: any, urlPattern: string, method: string = 'GET', timeout: number = 5000) {
  return page.waitForRequest(
    (req: any) => req.url().includes(urlPattern) && req.method() === method,
    { timeout }
  );
}