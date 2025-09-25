#!/usr/bin/env node

/**
 * Simple Claude API Scraping Test
 * Tests the core functionality without TypeScript dependencies
 * Run with: CLAUDE_API_KEY="your-key" node scripts/test-scraping.js
 */

async function testClaudeAPIScraping() {
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!CLAUDE_API_KEY) {
    console.error('❌ Please set CLAUDE_API_KEY environment variable');
    console.log('   Usage: CLAUDE_API_KEY="your-key" node scripts/test-scraping.js');
    process.exit(1);
  }

  console.log('🧪 Testing Claude API Scraping System');
  console.log(`📋 API Key: ${CLAUDE_API_KEY.substring(0, 10)}...`);
  console.log();

  // Test URL with correct Amway format
  const testUrl = 'https://www.amway.com/en_US/Nutrilite%E2%84%A2-Organics-All-in-One-Meal-Powder-%E2%80%93-Vanilla-p-318671';

  try {
    console.log('📡 Stage 1: Fetching product page...');
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`✅ Successfully fetched ${html.length} characters of HTML`);

    if (html.length < 1000) {
      console.log('⚠️  HTML content seems too short - might be blocked');
      console.log('First 500 chars:', html.substring(0, 500));
    }

    console.log();
    console.log('🤖 Stage 2: Testing Claude API extraction...');

    const extractionPrompt = `You are an expert product data extractor. Extract information from this Amway product page HTML.

Return a JSON object with these exact fields:
{
  "name": "Full product name including brand and specific details",
  "description": "Detailed product description highlighting key features and benefits",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "category": "One of: nutrition, beauty, home, personal_care, other",
  "brand": "Brand name (Nutrilite, Artistry, eSpring, Legacy of Clean, XS, or Amway)",
  "price": number or null,
  "currency": "USD" or null,
  "imageUrl": "Main product image URL or null",
  "confidence": 0.95
}

Focus on:
1. Accurate product name with brand and specific variant
2. Rich description that captures key selling points
3. 3-5 specific benefits the product provides
4. Correct category classification
5. Extract price if clearly visible
6. Find main product image URL

HTML Content:
${html.substring(0, 8000)}...`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: extractionPrompt
        }]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error ${claudeResponse.status}: ${errorText}`);
    }

    const claudeData = await claudeResponse.json();
    const extractedContent = claudeData.content?.[0]?.text;

    if (!extractedContent) {
      throw new Error('No content in Claude API response');
    }

    console.log('✅ Claude API responded successfully');
    console.log();

    console.log('🔍 Stage 3: Parsing extracted data...');

    // Parse JSON from Claude response
    const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ Could not find JSON in Claude response');
      console.log('Raw response:', extractedContent);
      return;
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    console.log('✅ Successfully extracted product data:');
    console.log();
    console.log('📦 Product Information:');
    console.log(`   Name: ${extractedData.name}`);
    console.log(`   Brand: ${extractedData.brand}`);
    console.log(`   Category: ${extractedData.category}`);
    console.log(`   Price: ${extractedData.price ? '$' + extractedData.price : 'Not found'}`);
    console.log(`   Confidence: ${extractedData.confidence}`);
    console.log();
    console.log('📝 Description:');
    console.log(`   ${extractedData.description}`);
    console.log();
    console.log('✨ Benefits:');
    extractedData.benefits.forEach((benefit, index) => {
      console.log(`   ${index + 1}. ${benefit}`);
    });
    console.log();

    console.log('🎯 Testing Marketing Copy Generation...');

    // Simple copy generation test
    const mockPreferences = {
      campaign_type: 'lifestyle',
      brand_style: 'professional',
      image_formats: ['facebook_post', 'instagram_post']
    };

    const sampleCopy = generateSimpleMarketingCopy(extractedData, 'facebook_post', mockPreferences.brand_style);
    console.log('✅ Sample Facebook copy generated:');
    console.log();
    console.log(sampleCopy);
    console.log();

    console.log('🎉 All tests passed! Backend scraping system is working correctly.');
    console.log();
    console.log('📊 Summary:');
    console.log('   ✅ Fetch: Product page retrieved successfully');
    console.log('   ✅ Extract: Claude API extraction working');
    console.log('   ✅ Parse: JSON parsing successful');
    console.log('   ✅ Copy: Marketing copy generation working');
    console.log();
    console.log('✨ Ready for UI integration!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.message.includes('HTTP 403') || error.message.includes('HTTP 429')) {
      console.log('💡 This might be a rate limiting or blocking issue with Amway\'s website');
    } else if (error.message.includes('Claude API')) {
      console.log('💡 Check your Claude API key and quota');
    }

    process.exit(1);
  }
}

function generateSimpleMarketingCopy(productData, format, style) {
  const benefits = productData.benefits || [];
  const primaryBenefit = benefits[0] || 'support your wellness goals';

  let copy = '';

  switch (style) {
    case 'professional':
      copy = `Enhance your wellness journey with ${productData.name}. `;
      copy += `Designed to ${primaryBenefit.toLowerCase()}, this premium ${productData.brand} product delivers results you can trust.`;
      break;
    case 'casual':
      copy = `✨ Ready to feel amazing? ${productData.name} is here to help! `;
      copy += `Perfect for those days when you want to ${primaryBenefit.toLowerCase()}. 💪`;
      break;
    case 'wellness':
      copy = `🌿 Nourish your body naturally with ${productData.name}. `;
      copy += `When you choose to ${primaryBenefit.toLowerCase()}, you're choosing to invest in yourself. 🌱`;
      break;
    default:
      copy = `Discover what ${productData.name} can do for you. ${primaryBenefit}.`;
  }

  if (format === 'facebook_post') {
    copy += `\n\nReady to take the next step in your wellness journey?\n\n#AmwayWellness #HealthyLiving #WellnessJourney`;
  } else if (format === 'instagram_post') {
    copy += `\n\nDM for more info! 👆\n\n#AmwayWellness #HealthyLiving #Lifestyle #SelfCare #Motivation`;
  }

  copy += `\n\nThese statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure or prevent any disease.`;

  return copy;
}

// Run the test
testClaudeAPIScraping();