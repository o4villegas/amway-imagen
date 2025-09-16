/**
 * Manual User Workflow Testing
 * Tests core API functionality and user pathways
 */

const BASE_URL = 'http://localhost:3003';
const TEST_URLS = [
  'https://www.amway.com/en_US/p/326782',
  'https://www.amway.com/en_US/Nutrilite-Daily-p-100186',
  'https://www.amway.com/en_US/Sleep-%2B-Stress-Solution-p-321893'
];

async function testUserWorkflow() {
  console.log('🔍 Starting Manual User Workflow Testing...\n');

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      critical: 0
    }
  };

  // Test 1: Application Accessibility
  console.log('1. Testing Application Accessibility...');
  try {
    const response = await fetch(`${BASE_URL}/campaign/new`);
    const html = await response.text();

    const hasUrlInput = html.includes('id="product-url"') && html.includes('type="url"');
    const hasSubmitButton = html.includes('type="submit"') && html.includes('Extract Product Information');
    const hasProgressIndicator = html.includes('Step 1 of 5');
    const hasExampleUrls = TEST_URLS.every(url => html.includes(url));

    results.tests.push({
      name: 'Application Accessibility',
      status: hasUrlInput && hasSubmitButton ? 'PASSED' : 'FAILED',
      details: {
        urlInput: hasUrlInput,
        submitButton: hasSubmitButton,
        progressIndicator: hasProgressIndicator,
        exampleUrls: hasExampleUrls
      },
      critical: !hasUrlInput || !hasSubmitButton
    });

    console.log(`   ✅ Application loads: ${response.status === 200}`);
    console.log(`   ${hasUrlInput ? '✅' : '❌'} URL input field present`);
    console.log(`   ${hasSubmitButton ? '✅' : '❌'} Submit button present`);
    console.log(`   ${hasProgressIndicator ? '✅' : '❌'} Progress indicator present`);

  } catch (error) {
    results.tests.push({
      name: 'Application Accessibility',
      status: 'FAILED',
      error: error.message,
      critical: true
    });
    console.log(`   ❌ Failed to access application: ${error.message}`);
  }

  // Test 2: Product Scraping API
  console.log('\n2. Testing Product Scraping API...');
  for (const testUrl of TEST_URLS) {
    try {
      console.log(`   Testing URL: ${testUrl}`);

      const response = await fetch(`${BASE_URL}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productUrl: testUrl }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const product = data.product;
        const hasRequiredFields = product.name && product.description && product.category;

        results.tests.push({
          name: `Product Scraping - ${testUrl}`,
          status: hasRequiredFields ? 'PASSED' : 'FAILED',
          details: {
            productName: product.name,
            hasDescription: !!product.description,
            hasCategory: !!product.category,
            hasPrice: !!product.price,
            hasImage: !!product.main_image_url,
            cached: data.cached
          },
          critical: !hasRequiredFields
        });

        console.log(`   ✅ Product scraped successfully`);
        console.log(`      Name: ${product.name}`);
        console.log(`      Category: ${product.category}`);
        console.log(`      Has description: ${!!product.description}`);
        console.log(`      Has image: ${!!product.main_image_url}`);
        console.log(`      Cached: ${data.cached}`);

      } else {
        results.tests.push({
          name: `Product Scraping - ${testUrl}`,
          status: 'FAILED',
          error: data.error || 'Unknown error',
          critical: true
        });
        console.log(`   ❌ Scraping failed: ${data.error || 'Unknown error'}`);
      }

    } catch (error) {
      results.tests.push({
        name: `Product Scraping - ${testUrl}`,
        status: 'FAILED',
        error: error.message,
        critical: true
      });
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }

  // Test 3: Error Handling
  console.log('\n3. Testing Error Handling...');
  const errorTests = [
    {
      name: 'Invalid URL',
      url: 'https://invalid-url.com/product',
      expectedStatus: 400
    },
    {
      name: 'Non-Amway URL',
      url: 'https://www.amazon.com/product',
      expectedStatus: 400
    },
    {
      name: 'Malformed URL',
      url: 'not-a-url',
      expectedStatus: 400
    }
  ];

  for (const test of errorTests) {
    try {
      const response = await fetch(`${BASE_URL}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productUrl: test.url }),
      });

      const data = await response.json();
      const correctError = response.status === test.expectedStatus && !data.success;

      results.tests.push({
        name: `Error Handling - ${test.name}`,
        status: correctError ? 'PASSED' : 'FAILED',
        details: {
          expectedStatus: test.expectedStatus,
          actualStatus: response.status,
          errorMessage: data.error
        },
        critical: false
      });

      console.log(`   ${correctError ? '✅' : '❌'} ${test.name}: Status ${response.status}, Error: ${data.error}`);

    } catch (error) {
      results.tests.push({
        name: `Error Handling - ${test.name}`,
        status: 'FAILED',
        error: error.message,
        critical: false
      });
      console.log(`   ❌ ${test.name} request failed: ${error.message}`);
    }
  }

  // Test 4: Campaign Generation (with valid product)
  console.log('\n4. Testing Campaign Generation API...');
  try {
    // First, get a valid product
    const scrapeResponse = await fetch(`${BASE_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productUrl: TEST_URLS[0] }),
    });

    const scrapeData = await scrapeResponse.json();

    if (scrapeData.success && scrapeData.product) {
      console.log(`   Using product: ${scrapeData.product.name}`);

      const generateResponse = await fetch(`${BASE_URL}/api/campaign/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: scrapeData.product.id,
          preferences: {
            campaign_type: 'product_focus',
            brand_style: 'professional',
            color_scheme: 'amway_brand',
            text_overlay: 'moderate',
            campaign_size: 5,
            image_formats: ['instagram_post']
          }
        }),
      });

      if (generateResponse.ok) {
        const generateData = await generateResponse.json();

        results.tests.push({
          name: 'Campaign Generation API',
          status: generateData.success ? 'PASSED' : 'FAILED',
          details: {
            campaignId: generateData.campaignId,
            totalImages: generateData.totalImages,
            downloadUrl: generateData.downloadUrl,
            generationTime: generateData.generationTimeSeconds
          },
          critical: !generateData.success
        });

        if (generateData.success) {
          console.log(`   ✅ Campaign generated successfully`);
          console.log(`      Campaign ID: ${generateData.campaignId}`);
          console.log(`      Total Images: ${generateData.totalImages}`);
          console.log(`      Generation Time: ${generateData.generationTimeSeconds}s`);
          console.log(`      Download URL: ${generateData.downloadUrl}`);
        } else {
          console.log(`   ❌ Generation failed: ${generateData.error}`);
        }
      } else {
        const errorData = await generateResponse.json();
        results.tests.push({
          name: 'Campaign Generation API',
          status: 'FAILED',
          error: errorData.error || 'HTTP error',
          critical: true
        });
        console.log(`   ❌ Generation API failed: ${errorData.error || 'HTTP error'}`);
      }
    } else {
      results.tests.push({
        name: 'Campaign Generation API',
        status: 'SKIPPED',
        reason: 'No valid product available for testing',
        critical: false
      });
      console.log(`   ⚠️  Skipped - no valid product available`);
    }

  } catch (error) {
    results.tests.push({
      name: 'Campaign Generation API',
      status: 'FAILED',
      error: error.message,
      critical: true
    });
    console.log(`   ❌ Generation test failed: ${error.message}`);
  }

  // Calculate summary
  results.tests.forEach(test => {
    results.summary.total++;
    if (test.status === 'PASSED') {
      results.summary.passed++;
    } else if (test.status === 'FAILED') {
      results.summary.failed++;
      if (test.critical) {
        results.summary.critical++;
      }
    }
  });

  // Generate summary report
  console.log('\n📊 Test Summary:');
  console.log(`   Total Tests: ${results.summary.total}`);
  console.log(`   Passed: ${results.summary.passed}`);
  console.log(`   Failed: ${results.summary.failed}`);
  console.log(`   Critical Issues: ${results.summary.critical}`);

  const successRate = Math.round((results.summary.passed / results.summary.total) * 100);
  console.log(`   Success Rate: ${successRate}%`);

  if (results.summary.critical === 0) {
    console.log('\n🎉 No critical issues found! Core user workflow is functional.');
  } else {
    console.log(`\n🚨 ${results.summary.critical} critical issues block core user workflows.`);
  }

  return results;
}

// Identify specific pathway issues
function analyzePathwayIssues(results) {
  console.log('\n🔍 Analyzing User Pathway Issues...\n');

  const pathwayIssues = [];

  // Check for application access issues
  const accessTest = results.tests.find(t => t.name === 'Application Accessibility');
  if (accessTest && accessTest.status === 'FAILED') {
    pathwayIssues.push({
      type: 'APPLICATION_ACCESS_FAILURE',
      severity: 'Critical',
      blocking: 'Users cannot access the application interface',
      userGoal: 'Access campaign creation workflow',
      brokenWorkflow: [
        '1. User navigates to application URL',
        '2. FAILURE: Application fails to load or missing UI elements',
        '3. User cannot proceed with any campaign creation tasks'
      ],
      remediation: 'Fix application deployment and ensure all UI components render correctly'
    });
  }

  // Check for scraping pathway issues
  const scrapingTests = results.tests.filter(t => t.name.includes('Product Scraping'));
  const failedScraping = scrapingTests.filter(t => t.status === 'FAILED');

  if (failedScraping.length > 0) {
    pathwayIssues.push({
      type: 'PRODUCT_EXTRACTION_FAILURE',
      severity: 'Critical',
      blocking: 'Users cannot extract product information from Amway URLs',
      userGoal: 'Transform Amway product URLs into campaign input data',
      brokenWorkflow: [
        '1. User enters valid Amway product URL',
        '2. User clicks "Extract Product Information"',
        '3. FAILURE: System cannot scrape or process product data',
        '4. User cannot proceed to campaign configuration'
      ],
      remediation: 'Fix web scraping service, improve error handling, add fallback mechanisms'
    });
  }

  // Check for generation pathway issues
  const generationTest = results.tests.find(t => t.name === 'Campaign Generation API');
  if (generationTest && generationTest.status === 'FAILED') {
    pathwayIssues.push({
      type: 'CAMPAIGN_GENERATION_FAILURE',
      severity: 'Critical',
      blocking: 'Users cannot generate marketing images',
      userGoal: 'Create professional marketing images for their products',
      brokenWorkflow: [
        '1. User successfully configures campaign preferences',
        '2. User initiates image generation',
        '3. FAILURE: AI generation fails or times out',
        '4. User cannot complete core workflow or download results'
      ],
      remediation: 'Fix AI service integration, improve timeout handling, add retry mechanisms'
    });
  }

  // Check for error handling gaps
  const errorTests = results.tests.filter(t => t.name.includes('Error Handling'));
  const failedErrorHandling = errorTests.filter(t => t.status === 'FAILED');

  if (failedErrorHandling.length > 0) {
    pathwayIssues.push({
      type: 'POOR_ERROR_RECOVERY',
      severity: 'High',
      blocking: 'Users get stuck when they make mistakes or encounter errors',
      userGoal: 'Recover from input errors and continue workflow',
      brokenWorkflow: [
        '1. User enters invalid or incorrect URL',
        '2. System provides unclear or missing error messages',
        '3. User cannot understand what went wrong or how to fix it',
        '4. User abandons workflow or gets frustrated'
      ],
      remediation: 'Improve error messages, add input validation, provide clear recovery paths'
    });
  }

  if (pathwayIssues.length === 0) {
    console.log('✅ No major pathway issues identified!');
  } else {
    console.log(`🚨 Found ${pathwayIssues.length} pathway issues:\n`);

    pathwayIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.type} (${issue.severity})`);
      console.log(`   User Goal: ${issue.userGoal}`);
      console.log(`   Blocking: ${issue.blocking}`);
      console.log(`   Remediation: ${issue.remediation}\n`);
    });
  }

  return pathwayIssues;
}

// Run the tests
if (require.main === module) {
  testUserWorkflow()
    .then(results => {
      // Save detailed results
      const fs = require('fs').promises;
      fs.writeFile('./manual-test-results.json', JSON.stringify(results, null, 2));

      // Analyze pathway issues
      const pathwayIssues = analyzePathwayIssues(results);

      // Save pathway analysis
      fs.writeFile('./pathway-issues.json', JSON.stringify(pathwayIssues, null, 2));
    })
    .catch(console.error);
}

module.exports = { testUserWorkflow, analyzePathwayIssues };