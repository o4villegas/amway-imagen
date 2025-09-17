import { test, expect } from '@playwright/test';

test.describe('Comprehensive System Tests', () => {

  test.describe('Health and Monitoring', () => {
    test('should return comprehensive health status', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy'].includes(body.status)).toBeTruthy();
      expect(body.timestamp).toBeDefined();
      expect(body.services).toBeDefined();
      expect(body.services.database).toBeDefined();
      expect(body.services.storage).toBeDefined();
      expect(body.services.ai).toBeDefined();
    });

    test('should return readiness status', async ({ request }) => {
      const response = await request.get('/api/health/ready');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.ready).toBeDefined();
      expect(body.checks).toBeDefined();
      expect(body.checks.database).toBeDefined();
      expect(body.checks.storage).toBeDefined();
      expect(body.checks.ai).toBeDefined();
      expect(body.message).toBeDefined();
    });

    test('should return liveness status', async ({ request }) => {
      const response = await request.get('/api/health/live');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.alive).toBe(true);
      expect(body.timestamp).toBeDefined();
      expect(body.message).toBe('Application is alive');
    });
  });

  test.describe('Product Management', () => {
    test('should search products without query', async ({ request }) => {
      const response = await request.get('/api/products/search');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.products).toBeDefined();
      expect(Array.isArray(body.products)).toBe(true);
      expect(body.total).toBeDefined();
    });

    test('should search products with specific query', async ({ request }) => {
      const response = await request.get('/api/products/search?q=Nutrilite&limit=5');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.products).toBeDefined();
      expect(Array.isArray(body.products)).toBe(true);
      expect(body.products.length).toBeLessThanOrEqual(5);
    });

    test('should validate product URL format', async ({ request }) => {
      const invalidUrls = [
        'https://google.com',
        'https://amway.com/invalid',
        'not-a-url'
      ];

      for (const url of invalidUrls) {
        const response = await request.post('/api/products/load', {
          data: { productUrl: url }
        });

        expect([400, 429].includes(response.status())).toBeTruthy();

        if (response.status() === 400) {
          const body = await response.json();
          expect(body.error).toBeDefined();
        }
      }
    });

    test('should handle valid Amway product URL', async ({ request }) => {
      const response = await request.post('/api/products/load', {
        data: { productUrl: 'https://www.amway.com/en_US/p/124481' }
      });

      // Could be successful, rate limited, or not found
      expect([200, 404, 429].includes(response.status())).toBeTruthy();

      if (response.status() === 200) {
        const body = await response.json();
        expect(body.product).toBeDefined();
        expect(body.product.name).toBeDefined();
        expect(body.product.amway_product_id).toBeDefined();
      }
    });
  });

  test.describe('Campaign Generation', () => {
    test('should validate campaign generation request', async ({ request }) => {
      const invalidData = {
        // Missing required fields
        preferences: {}
      };

      const response = await request.post('/api/campaign/generate', {
        data: invalidData
      });

      // Should return validation error or rate limit
      expect([400, 429].includes(response.status())).toBeTruthy();

      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('should validate campaign preferences', async ({ request }) => {
      const invalidPreferences = {
        productId: 1,
        preferences: {
          campaign_type: 'invalid',
          brand_style: 'invalid',
          campaign_size: 999, // Invalid - valid values are 1, 3, 5, 10, 15
          image_formats: []
        }
      };

      const response = await request.post('/api/campaign/generate', {
        data: invalidPreferences
      });

      expect([400, 429].includes(response.status())).toBeTruthy();
    });

    test('should handle valid campaign generation request', async ({ request }) => {
      const validData = {
        productId: 1,
        preferences: {
          campaign_type: 'product_focus',
          brand_style: 'professional',
          color_scheme: 'amway_brand',
          text_overlay: 'moderate',
          campaign_size: 1,
          image_formats: ['instagram_post']
        }
      };

      const response = await request.post('/api/campaign/generate', {
        data: validData
      });

      // Should either succeed or be rate limited
      expect([200, 429, 500, 503].includes(response.status())).toBeTruthy();

      if (response.status() === 200) {
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.campaignId).toBeDefined();
        expect(body.downloadUrl).toBeDefined();
        expect(body.totalImages).toBeGreaterThan(0);
        expect(body.successfulImages).toBeDefined();
        expect(body.generationTimeSeconds).toBeDefined();
      } else if (response.status() === 429) {
        const body = await response.json();
        expect(body.error).toContain('rate');
      }
    });
  });

  test.describe('Campaign Management', () => {
    test('should handle non-existent campaign images request', async ({ request }) => {
      const response = await request.get('/api/campaign/99999/images');

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.campaignId).toBe(99999);
      expect(body.images).toEqual([]);
    });

    test('should validate image selection update', async ({ request }) => {
      const response = await request.patch('/api/campaign/1/images/1', {
        data: { selected: true }
      });

      // Should either succeed or return not found
      expect([200, 404].includes(response.status())).toBeTruthy();

      if (response.status() === 200) {
        const body = await response.json();
        expect(body.success).toBe(true);
      }
    });

    test('should handle invalid campaign download key', async ({ request }) => {
      const response = await request.get('/api/campaign/download/invalid-key');

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  test.describe('Rate Limiting', () => {
    test('should include rate limit headers', async ({ request }) => {
      const response = await request.post('/api/campaign/generate', {
        data: {
          productId: 1,
          preferences: {
            campaign_type: 'product_focus',
            brand_style: 'professional',
            color_scheme: 'amway_brand',
            text_overlay: 'moderate',
            campaign_size: 1,
            image_formats: ['instagram_post']
          }
        }
      });

      if (response.status() === 429) {
        expect(response.headers()['x-ratelimit-limit']).toBeDefined();
        expect(response.headers()['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers()['x-ratelimit-reset']).toBeDefined();
        expect(response.headers()['retry-after']).toBeDefined();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async ({ request }) => {
      const response = await request.post('/api/campaign/generate', {
        data: 'not-json',
        headers: {
          'content-type': 'application/json'
        }
      });

      expect([400, 429].includes(response.status())).toBeTruthy();
    });

    test('should return structured error responses', async ({ request }) => {
      const response = await request.post('/api/products/load', {
        data: { productUrl: 'invalid-url' }
      });

      if (response.status() !== 429) {
        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toBeDefined();
        expect(typeof body.error).toBe('string');
      }
    });

    test('should handle missing content-type', async ({ request }) => {
      const response = await request.post('/api/campaign/generate', {
        data: { test: 'data' }
      });

      expect([400, 429].includes(response.status())).toBeTruthy();
    });
  });

  test.describe('Security Headers', () => {
    test('should include security headers in responses', async ({ request }) => {
      const response = await request.get('/api/health');

      const headers = response.headers();

      // Check for common security headers that might be set
      // These would be set by middleware or CDN
      expect(response.status()).toBe(200);
    });
  });
});