#!/usr/bin/env node

/**
 * Minimal AI Generation Test - Debug specific issues
 */

async function testMinimal() {
  const BASE_URL = 'http://localhost:8788';

  console.log('🔍 Testing minimal AI generation request...\n');

  try {
    // Test just the generation endpoint with minimal payload
    const response = await fetch(`${BASE_URL}/api/campaign/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: 3,
        preferences: {
          campaign_type: 'product_focus',
          brand_style: 'professional',
          color_scheme: 'amway_brand',
          text_overlay: 'moderate',
          campaign_size: 5,
          image_formats: ['instagram_post']
        }
      })
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log(`Response body (raw): ${responseText}`);

    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
      console.log(`Response JSON:`, responseJson);
    } catch (e) {
      console.log('Failed to parse response as JSON');
    }

  } catch (error) {
    console.log('Request failed:', error.message);
  }
}

testMinimal();