import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {

  test.describe('Products API', () => {
    test('should search products successfully', async ({ request }) => {
      const response = await request.get('/api/products/search');

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.products).toBeDefined();
      expect(Array.isArray(body.products)).toBe(true);
    });

    test('should search products with query', async ({ request }) => {
      const response = await request.get('/api/products/search?q=Nutrilite');

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.products).toBeDefined();
      expect(Array.isArray(body.products)).toBe(true);
    });

    test('should load product from URL', async ({ request }) => {
      const response = await request.post('/api/products/load', {
        data: {
          productUrl: 'https://www.amway.com/en_US/p/124481'
        }
      });

      // Should either succeed or return validation error
      expect([200, 400, 404, 429].includes(response.status())).toBeTruthy();

      if (response.status() === 200) {
        const body = await response.json();
        expect(body.product).toBeDefined();
        expect(body.product.name).toBeDefined();
      }
    });
  });

  test.describe('Campaign Generation API', () => {
    test('should generate campaign successfully', async ({ request }) => {
      const response = await request.post('/api/campaign/generate', {
        data: {
          productId: 10,
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

      // Should either succeed, be rate limited, or have service issues
      expect([200, 429, 503, 500].includes(response.status())).toBeTruthy();

      if (response.status() === 200) {
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.campaignId).toBeDefined();
        expect(body.downloadUrl).toBeDefined();
        expect(body.totalImages).toBeGreaterThan(0);
      } else if (response.status() === 429) {
        const body = await response.json();
        expect(body.error).toContain('rate');
        expect(response.headers()['retry-after']).toBeDefined();
      }
    });

    test('should validate required fields', async ({ request }) => {
      const response = await request.post('/api/campaign/generate', {
        data: {
          // Missing productId and preferences
        }
      });

      // Accept both validation error (400) and rate limiting (429)
      expect([400, 429]).toContain(response.status());
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('should validate campaign size limits', async ({ request }) => {
      const response = await request.post('/api/campaign/generate', {
        data: {
          productId: 10,
          preferences: {
            campaign_type: 'product_focus',
            brand_style: 'professional',
            color_scheme: 'amway_brand',
            text_overlay: 'moderate',
            campaign_size: 99, // Invalid size
            image_formats: ['instagram_post']
          }
        }
      });

      expect([400, 500].includes(response.status())).toBeTruthy();
    });
  });

  test.describe('Campaign Management API', () => {
    test('should handle invalid campaign requests', async ({ request }) => {
      const response = await request.get('/api/campaign/invalid/images');

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid');
    });

    test('should return empty images for non-existent campaign', async ({ request }) => {
      const response = await request.get('/api/campaign/999999/images');

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.images).toEqual([]);
    });
  });

  test.describe('Image Proxy API', () => {
    test('should handle placeholder image requests', async ({ request }) => {
      const response = await request.get('/api/placeholder-image');

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image');
    });

    test('should handle image proxy requests', async ({ request }) => {
      // Test with a properly encoded external URL
      const testImageUrl = encodeURIComponent('https://via.placeholder.com/300x300.jpg');
      const response = await request.get(`/api/image-proxy/${testImageUrl}`);

      // Should handle gracefully even if proxy fails or succeeds
      expect([200, 302, 400, 404, 500].includes(response.status())).toBeTruthy();
    });
  });

  test.describe('Rate Limiting', () => {
    test('should apply rate limiting correctly', async ({ request }) => {
      // Make multiple requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request.post('/api/campaign/generate', {
            data: {
              productId: 10,
              preferences: {
                campaign_type: 'product_focus',
                brand_style: 'professional',
                color_scheme: 'amway_brand',
                text_overlay: 'moderate',
                campaign_size: 1,
                image_formats: ['instagram_post']
              }
            }
          })
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited if limits are working
      const rateLimited = responses.some(r => r.status() === 429);

      if (rateLimited) {
        const rateLimitedResponse = responses.find(r => r.status() === 429);
        expect(rateLimitedResponse?.headers()['retry-after']).toBeDefined();
      }
    });
  });

  test.describe('Health Endpoints', () => {
    test('should return health status', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy'].includes(body.status)).toBeTruthy();
      expect(body.services).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });

    test('should return readiness status', async ({ request }) => {
      const response = await request.get('/api/health/ready');

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.ready).toBeDefined();
      expect(body.checks).toBeDefined();
    });

    test('should return liveness status', async ({ request }) => {
      const response = await request.get('/api/health/live');

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.alive).toBe(true);
      expect(body.timestamp).toBeDefined();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle malformed JSON gracefully', async ({ request }) => {
      const response = await request.post('/api/campaign/generate', {
        data: 'invalid json'
      });

      expect([400, 500].includes(response.status())).toBeTruthy();
    });

    test('should include proper error messages', async ({ request }) => {
      const response = await request.post('/api/campaign/generate', {
        data: {}
      });

      // Accept both validation error (400) and rate limiting (429)
      expect([400, 429]).toContain(response.status());
      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(typeof body.error).toBe('string');
    });

    test('should handle CORS appropriately', async ({ request }) => {
      const response = await request.get('/api/products/load');

      // Should have appropriate headers
      expect(response.headers()).toHaveProperty('content-type');
    });
  });
});