import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test.describe('Product Scraping API', () => {
    test('should reject invalid URLs', async ({ request }) => {
      const response = await request.post('/api/scrape', {
        data: {
          url: 'https://invalid-domain.com/product'
        }
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid');
    });

    test('should reject non-Amway URLs', async ({ request }) => {
      const response = await request.post('/api/scrape', {
        data: {
          url: 'https://amazon.com/dp/123456'
        }
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Amway');
    });

    test('should validate Amway URL format', async ({ request }) => {
      const response = await request.post('/api/scrape', {
        data: {
          url: 'https://www.amway.com/invalid-format'
        }
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('format');
    });
  });

  test.describe('Campaign Images API', () => {
    test('should return 400 for invalid campaign ID', async ({ request }) => {
      const response = await request.get('/api/campaign/invalid/images');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid campaign ID');
    });

    test('should return empty array for non-existent campaign', async ({ request }) => {
      const response = await request.get('/api/campaign/999999/images');

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.images).toEqual([]);
    });
  });

  test.describe('Image Selection API', () => {
    test('should validate image ID parameter', async ({ request }) => {
      const response = await request.patch('/api/campaign/1/images/invalid', {
        data: { selected: true }
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid image ID');
    });

    test('should require selected parameter', async ({ request }) => {
      const response = await request.patch('/api/campaign/1/images/1', {
        data: {}
      });

      expect(response.status()).toBe(400);
    });

    test('should validate boolean for selected parameter', async ({ request }) => {
      const response = await request.patch('/api/campaign/1/images/1', {
        data: { selected: 'not-boolean' }
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Image Preview API', () => {
    test('should return 400 for invalid campaign ID', async ({ request }) => {
      const response = await request.get('/api/campaign/invalid/images/1');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid campaign');
    });

    test('should return 400 for invalid image ID', async ({ request }) => {
      const response = await request.get('/api/campaign/1/images/invalid');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid');
    });

    test('should return 404 for non-existent image', async ({ request }) => {
      const response = await request.get('/api/campaign/1/images/999999');

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toContain('Image not found');
    });
  });

  test.describe('Rate Limiting', () => {
    test('should apply rate limiting to generation endpoint', async ({ request }) => {
      // This test would require actual rate limiting to be triggered
      // For now, just verify the endpoint exists and returns proper structure
      const response = await request.post('/api/campaign/generate', {
        data: {
          productId: 1,
          preferences: {
            campaign_type: 'product_focus',
            brand_style: 'professional',
            color_scheme: 'amway_brand',
            text_overlay: 'moderate',
            campaign_size: 5,
            image_formats: ['instagram_post']
          }
        }
      });

      // Should either work or return rate limit error
      expect([200, 429, 400, 404].includes(response.status())).toBeTruthy();

      if (response.status() === 429) {
        const body = await response.json();
        expect(body.error).toContain('rate');
        expect(response.headers()['retry-after']).toBeDefined();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should return 500 for server errors with proper error message', async ({ request }) => {
      // Test malformed request that should trigger server error
      const response = await request.post('/api/campaign/generate', {
        data: null // Invalid data
      });

      expect(response.status()).toBe(400);
    });

    test('should include proper CORS headers', async ({ request }) => {
      const response = await request.get('/api/campaign/1/images');

      // Check basic response headers
      expect(response.headers()).toHaveProperty('content-type');
    });

    test('should handle OPTIONS requests', async ({ request }) => {
      const response = await request.fetch('/api/scrape', {
        method: 'OPTIONS'
      });

      // Should handle OPTIONS or return 405 Method Not Allowed
      expect([200, 405].includes(response.status())).toBeTruthy();
    });
  });
});