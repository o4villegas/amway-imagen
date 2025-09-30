import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://amway-imagen.lando555.workers.dev';
const TEST_PRODUCT_URL = 'https://www.amway.com/en_US/nutrilite-double-x-vitamin-mineral-phytonutrient-p-110237';

test.describe('Phase 1c API Verification', () => {

  test('Verify marketing copy generation and storage', async ({ request }) => {
    console.log('🧪 Testing marketing copy via API...');

    // 1. Load product data
    const loadResponse = await request.post(`${PRODUCTION_URL}/api/products/load`, {
      data: { url: TEST_PRODUCT_URL }
    });

    expect(loadResponse.ok()).toBeTruthy();
    const productData = await loadResponse.json();
    console.log('✓ Product loaded:', productData.product?.name || 'Unknown');

    // 2. Generate campaign with default preferences
    const generateResponse = await request.post(`${PRODUCTION_URL}/api/campaign/generate`, {
      data: {
        product_url: TEST_PRODUCT_URL,
        preferences: {
          campaign_type: 'lifestyle',
          brand_style: 'professional',
          color_scheme: 'product_inspired',
          text_overlay: 'moderate',
          campaign_size: 5,
          image_formats: ['instagram_post', 'facebook_post'],
          // Phase 1c preferences
          moodProfile: 'professional',
          lightingType: 'natural',
          compositionStyle: 'rule_of_thirds',
          colorMood: 'warm',
          visualFocus: 'outcome_lifestyle',
          sceneType: 'individual_focus',
          environmentType: 'indoor_home',
          timeOfDay: 'morning'
        }
      },
      timeout: 180000 // 3 minutes for generation
    });

    expect(generateResponse.ok()).toBeTruthy();
    const campaignData = await generateResponse.json();
    console.log('✓ Campaign generated:', campaignData.campaignId);

    // 3. Fetch images for campaign
    const imagesResponse = await request.get(`${PRODUCTION_URL}/api/campaign/${campaignData.campaignId}/images`);
    expect(imagesResponse.ok()).toBeTruthy();

    const imagesData = await imagesResponse.json();
    expect(imagesData.images).toBeDefined();
    expect(imagesData.images.length).toBeGreaterThan(0);

    // 4. CRITICAL: Verify marketing_copy exists and is valid
    const firstImage = imagesData.images[0];
    console.log('  Checking image:', firstImage.id, firstImage.format);

    expect(firstImage.marketing_copy).toBeDefined();
    expect(firstImage.marketing_copy).not.toBeNull();
    expect(firstImage.marketing_copy).not.toBe('');

    // 5. Parse and validate marketing copy structure
    const marketingCopy = JSON.parse(firstImage.marketing_copy);

    expect(marketingCopy.text).toBeDefined();
    expect(marketingCopy.text.length).toBeGreaterThan(0);

    console.log('✓ VERIFIED: Marketing copy saved to database');
    console.log('  - Text length:', marketingCopy.text.length);
    console.log('  - Text preview:', marketingCopy.text.substring(0, 60) + '...');
    console.log('  - Has hashtags:', Array.isArray(marketingCopy.hashtags) && marketingCopy.hashtags.length > 0);
    console.log('  - Has CTA:', !!marketingCopy.callToAction);
    console.log('  - Has disclaimer:', !!marketingCopy.disclaimer);

    // Validate structure
    expect(typeof marketingCopy.text).toBe('string');
    expect(Array.isArray(marketingCopy.hashtags)).toBe(true);

    console.log('✅ Marketing copy API test PASSED');
  });

  test('Verify preferences affect prompt generation', async ({ request }) => {
    console.log('🧪 Testing preferences impact via API...');

    // Load product once
    const loadResponse = await request.post(`${PRODUCTION_URL}/api/products/load`, {
      data: { url: TEST_PRODUCT_URL }
    });
    expect(loadResponse.ok()).toBeTruthy();

    // Campaign A: Default preferences
    console.log('--- Campaign A: Default Preferences ---');
    const campaignA = await request.post(`${PRODUCTION_URL}/api/campaign/generate`, {
      data: {
        product_url: TEST_PRODUCT_URL,
        preferences: {
          campaign_type: 'lifestyle',
          brand_style: 'professional',
          color_scheme: 'product_inspired',
          text_overlay: 'moderate',
          campaign_size: 5,
          image_formats: ['instagram_post'],
          moodProfile: 'professional',
          lightingType: 'natural',
          compositionStyle: 'rule_of_thirds',
          colorMood: 'warm',
          visualFocus: 'outcome_lifestyle',
          sceneType: 'individual_focus',
          environmentType: 'indoor_home',
          timeOfDay: 'morning'
        }
      },
      timeout: 180000
    });

    expect(campaignA.ok()).toBeTruthy();
    const dataA = await campaignA.json();
    console.log('  Campaign A ID:', dataA.campaignId);

    const imagesA = await request.get(`${PRODUCTION_URL}/api/campaign/${dataA.campaignId}/images`);
    const imagesDataA = await imagesA.json();
    const promptA = imagesDataA.images[0].prompt;
    console.log('  Prompt A preview:', promptA.substring(0, 100) + '...');

    // Campaign B: Different preferences
    console.log('--- Campaign B: Custom Preferences ---');
    const campaignB = await request.post(`${PRODUCTION_URL}/api/campaign/generate`, {
      data: {
        product_url: TEST_PRODUCT_URL,
        preferences: {
          campaign_type: 'lifestyle',
          brand_style: 'professional',
          color_scheme: 'product_inspired',
          text_overlay: 'moderate',
          campaign_size: 5,
          image_formats: ['instagram_post'],
          moodProfile: 'energetic', // CHANGED
          lightingType: 'golden_hour', // CHANGED
          compositionStyle: 'dynamic', // CHANGED
          colorMood: 'vibrant', // CHANGED
          visualFocus: 'outcome_lifestyle',
          sceneType: 'family_moment', // CHANGED
          environmentType: 'outdoor_nature', // CHANGED
          timeOfDay: 'golden_hour' // CHANGED
        }
      },
      timeout: 180000
    });

    expect(campaignB.ok()).toBeTruthy();
    const dataB = await campaignB.json();
    console.log('  Campaign B ID:', dataB.campaignId);

    const imagesB = await request.get(`${PRODUCTION_URL}/api/campaign/${dataB.campaignId}/images`);
    const imagesDataB = await imagesB.json();
    const promptB = imagesDataB.images[0].prompt;
    console.log('  Prompt B preview:', promptB.substring(0, 100) + '...');

    // Verify prompts are different
    expect(promptA).not.toBe(promptB);
    console.log('✓ VERIFIED: Prompts are different');

    // Check for Phase 1c terminology
    const hasEnergeticB = promptB.toLowerCase().includes('energetic') || promptB.toLowerCase().includes('vibrant') || promptB.toLowerCase().includes('dynamic');
    const hasGoldenHourB = promptB.toLowerCase().includes('golden hour') || promptB.toLowerCase().includes('golden');
    const hasFamilyB = promptB.toLowerCase().includes('family') || promptB.toLowerCase().includes('together');
    const hasOutdoorB = promptB.toLowerCase().includes('outdoor') || promptB.toLowerCase().includes('nature');

    console.log('  Phase 1c terms in Prompt B:');
    console.log('    - Energetic/Vibrant/Dynamic:', hasEnergeticB);
    console.log('    - Golden Hour:', hasGoldenHourB);
    console.log('    - Family:', hasFamilyB);
    console.log('    - Outdoor/Nature:', hasOutdoorB);

    const hasAnyPhase1cTerms = hasEnergeticB || hasGoldenHourB || hasFamilyB || hasOutdoorB;
    expect(hasAnyPhase1cTerms).toBe(true);

    console.log('✓ VERIFIED: Phase 1c preferences reflected in prompts');
    console.log('✅ Preferences impact API test PASSED');
  });

  test('Health check', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_URL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.services.database).toBe(true);
    expect(data.services.ai).toBe(true);

    console.log('✅ Production health check PASSED');
  });
});