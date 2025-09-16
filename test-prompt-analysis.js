#!/usr/bin/env node

/**
 * Test script to analyze generated prompts and identify NSFW triggers
 */

const DEPLOYMENT_URL = 'https://209847f6.amway-image-generator.pages.dev';
const PRODUCT_URL = 'https://www.amway.com/en_US/p/326782';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function analyzePrompts() {
  try {
    // Step 1: Get product
    log('\n🔍 Step 1: Scraping product...', 'cyan');
    const scrapeResponse = await fetch(`${DEPLOYMENT_URL}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productUrl: PRODUCT_URL })
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Scraping failed: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json();
    log(`✅ Product: ${scrapeData.product.name}`, 'green');

    // Step 2: Analyze prompts
    log('\n🧠 Step 2: Analyzing generated prompts...', 'cyan');
    const preferences = {
      campaign_type: 'product_focus',
      brand_style: 'professional',
      color_scheme: 'amway_brand',
      text_overlay: 'minimal',
      campaign_size: 5,
      image_formats: ['instagram_post']
    };

    const debugResponse = await fetch(`${DEPLOYMENT_URL}/api/debug-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: scrapeData.product.id,
        preferences
      })
    });

    if (!debugResponse.ok) {
      const errorData = await debugResponse.json();
      throw new Error(`Debug failed: ${debugResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const analysis = await debugResponse.json();

    // Display results
    log('\n' + '='.repeat(80), 'bold');
    log('📊 PROMPT ANALYSIS RESULTS', 'bold');
    log('='.repeat(80), 'bold');

    log(`\n📦 Product: ${analysis.productInfo.name}`, 'blue');
    log(`   Category: ${analysis.productInfo.category}`, 'blue');
    log(`   Benefits: ${analysis.productInfo.benefits || 'None'}`, 'blue');

    log(`\n⚙️ Campaign Config:`, 'blue');
    log(`   Type: ${analysis.campaignConfig.type}`, 'blue');
    log(`   Style: ${analysis.campaignConfig.style}`, 'blue');
    log(`   Size: ${analysis.campaignConfig.size}`, 'blue');

    log(`\n📈 Risk Summary:`, 'magenta');
    log(`   Total Prompts: ${analysis.summary.totalPrompts}`, 'blue');
    log(`   High Risk: ${analysis.summary.highRisk}`, 'red');
    log(`   Medium Risk: ${analysis.summary.mediumRisk}`, 'yellow');
    log(`   Low Risk: ${analysis.summary.lowRisk}`, 'green');

    if (analysis.summary.mostCommonTriggers.length > 0) {
      log(`\n⚠️ Most Common Trigger Categories:`, 'yellow');
      analysis.summary.mostCommonTriggers.forEach(trigger => {
        log(`   • ${trigger}`, 'yellow');
      });
    }

    log('\n🔬 Detailed Prompt Analysis:', 'cyan');
    analysis.promptAnalysis.forEach((prompt, index) => {
      const riskColor = prompt.riskLevel === 'high' ? 'red' :
                       prompt.riskLevel === 'medium' ? 'yellow' : 'green';

      log(`\n   ${index + 1}. ${prompt.format.toUpperCase()} (${prompt.dimensions})`, 'bold');
      log(`      Risk Level: ${prompt.riskLevel.toUpperCase()}`, riskColor);

      if (prompt.potentialTriggers.length > 0) {
        log(`      Triggers Found:`, 'red');
        prompt.potentialTriggers.forEach(trigger => {
          log(`        • ${trigger}`, 'red');
        });
      }

      if (prompt.suggestions.length > 0) {
        log(`      Suggestions:`, 'yellow');
        prompt.suggestions.forEach(suggestion => {
          log(`        • ${suggestion}`, 'yellow');
        });
      }

      log(`      Prompt Preview:`, 'cyan');
      const preview = prompt.prompt.length > 150 ?
        prompt.prompt.substring(0, 150) + '...' : prompt.prompt;
      log(`        "${preview}"`, 'cyan');
    });

    // Recommendations
    log('\n' + '='.repeat(80), 'bold');
    log('💡 RECOMMENDATIONS', 'bold');
    log('='.repeat(80), 'bold');

    const highRiskCount = analysis.summary.highRisk;
    const mediumRiskCount = analysis.summary.mediumRisk;

    if (highRiskCount > 0) {
      log(`\n🚨 HIGH PRIORITY: ${highRiskCount} prompts have high NSFW risk`, 'red');
      log('   Action: Implement enhanced sanitization immediately', 'red');
      log('   Focus: Remove body/personal/action term combinations', 'red');
    }

    if (mediumRiskCount > 0) {
      log(`\n⚠️ MEDIUM PRIORITY: ${mediumRiskCount} prompts have medium NSFW risk`, 'yellow');
      log('   Action: Review and replace flagged terms with safer alternatives', 'yellow');
    }

    if (highRiskCount === 0 && mediumRiskCount === 0) {
      log('\n✅ GOOD NEWS: All prompts appear to have low NSFW risk', 'green');
      log('   The issue might be elsewhere - check for other triggering factors', 'green');
    }

    log('\n🔧 Next Steps:', 'cyan');
    log('   1. Implement enhanced NSFW filtering based on identified triggers', 'cyan');
    log('   2. Create safe synonym replacements for flagged terms', 'cyan');
    log('   3. Test with sanitized prompts', 'cyan');
    log('   4. Monitor success rates after changes', 'cyan');

  } catch (error) {
    log(`\n💥 Analysis failed: ${error.message}`, 'red');
    console.error(error);
  }
}

async function main() {
  log('🎯 NSFW PROMPT ANALYSIS TOOL', 'bold');
  log('='.repeat(50), 'bold');
  log(`Testing: ${DEPLOYMENT_URL}`, 'blue');
  log(`Product: ${PRODUCT_URL}`, 'blue');

  await analyzePrompts();
}

main().catch(console.error);