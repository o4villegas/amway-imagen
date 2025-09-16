import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { DatabaseManager } from '@/lib/db';
import { PromptGenerator } from '@/lib/prompt-generator';
import { validateRequest, generateCampaignSchema } from '@/lib/validation';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG_PROMPTS] Starting prompt generation debug');

    const context = getRequestContext();
    const { DB } = context.env;

    // Validate input
    const requestData = await request.json();
    const { productId, preferences } = validateRequest(generateCampaignSchema, requestData);

    const dbManager = new DatabaseManager(DB);

    // Get product information
    const product = await dbManager.getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    console.log('[DEBUG_PROMPTS] Product loaded:', {
      id: product.id,
      name: product.name?.substring(0, 50),
      category: product.category,
      hasBenefits: !!product.benefits
    });

    // Generate prompts using the same logic as the real generation
    const promptGenerator = new PromptGenerator();
    const imagePrompts = promptGenerator.generateCampaignPrompts(product, preferences);

    console.log('[DEBUG_PROMPTS] Generated prompts:', {
      count: imagePrompts.length,
      formats: imagePrompts.map(p => p.format)
    });

    // Analyze prompts for potential NSFW triggers
    const promptAnalysis = imagePrompts.map((prompt, index) => {
      const analysis = analyzePromptForNSFW(prompt.text);

      return {
        index: index + 1,
        format: prompt.format,
        prompt: prompt.text,
        length: prompt.text.length,
        dimensions: `${prompt.width}x${prompt.height}`,
        potentialTriggers: analysis.triggers,
        riskLevel: analysis.riskLevel,
        suggestions: analysis.suggestions
      };
    });

    // Log detailed analysis
    promptAnalysis.forEach((analysis, index) => {
      console.log(`[DEBUG_PROMPTS] Prompt ${index + 1}:`, {
        format: analysis.format,
        riskLevel: analysis.riskLevel,
        triggerCount: analysis.potentialTriggers.length,
        promptPreview: analysis.prompt.substring(0, 100) + '...'
      });
    });

    return NextResponse.json({
      success: true,
      productInfo: {
        id: product.id,
        name: product.name,
        category: product.category,
        benefits: product.benefits?.substring(0, 200)
      },
      campaignConfig: {
        type: preferences.campaign_type,
        style: preferences.brand_style,
        size: preferences.campaign_size,
        formats: preferences.image_formats
      },
      promptAnalysis,
      summary: {
        totalPrompts: imagePrompts.length,
        highRisk: promptAnalysis.filter(p => p.riskLevel === 'high').length,
        mediumRisk: promptAnalysis.filter(p => p.riskLevel === 'medium').length,
        lowRisk: promptAnalysis.filter(p => p.riskLevel === 'low').length,
        mostCommonTriggers: getMostCommonTriggers(promptAnalysis)
      }
    });

  } catch (error: any) {
    console.error('[DEBUG_PROMPTS] Error:', error);

    return NextResponse.json({
      error: 'Debug prompt generation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Analyze a prompt for potential NSFW triggers
 */
function analyzePromptForNSFW(prompt: string): {
  triggers: string[];
  riskLevel: 'low' | 'medium' | 'high';
  suggestions: string[];
} {
  const triggers: string[] = [];
  const suggestions: string[] = [];

  // Known problematic terms that might trigger NSFW filters
  const potentialTriggers = [
    // Body-related terms
    { pattern: /\b(body|bodies|skin|flesh|naked|nude|bare)\b/gi, category: 'body' },
    { pattern: /\b(breast|chest|bust|cleavage)\b/gi, category: 'body' },
    { pattern: /\b(curves|curvy|shapely|figure)\b/gi, category: 'body' },

    // Health/wellness that might be misinterpreted
    { pattern: /\b(intimate|personal|private|sensitive)\b/gi, category: 'personal' },
    { pattern: /\b(sexual|sensual|erotic|arousal)\b/gi, category: 'sexual' },
    { pattern: /\b(pleasure|satisfaction|climax|peak)\b/gi, category: 'suggestive' },

    // Wellness terms that might combine poorly
    { pattern: /\b(massage|rub|stroke|caress|touch)\b/gi, category: 'physical' },
    { pattern: /\b(penetration|absorption|deep|intense)\b/gi, category: 'intensity' },

    // Beauty/cosmetic terms
    { pattern: /\b(lips|mouth|kiss|lick)\b/gi, category: 'beauty' },
    { pattern: /\b(tight|firm|smooth|soft|silky)\b/gi, category: 'texture' },

    // Demographic/lifestyle terms
    { pattern: /\b(young|teen|minor|child|baby)\b/gi, category: 'age' },
    { pattern: /\b(hot|steamy|wet|moist|dripping)\b/gi, category: 'descriptive' },

    // Action words that might be problematic
    { pattern: /\b(penetrate|insert|thrust|pump|squeeze)\b/gi, category: 'action' },
    { pattern: /\b(expose|reveal|strip|undress|remove)\b/gi, category: 'reveal' }
  ];

  for (const trigger of potentialTriggers) {
    const matches = prompt.match(trigger.pattern);
    if (matches) {
      triggers.push(...matches.map(match => `${match} (${trigger.category})`));
    }
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  if (triggers.length === 0) {
    riskLevel = 'low';
  } else if (triggers.length <= 2) {
    riskLevel = 'medium';
    suggestions.push('Consider replacing flagged terms with safer alternatives');
  } else {
    riskLevel = 'high';
    suggestions.push('High risk - recommend significant prompt revision');
    suggestions.push('Focus on product features rather than body/personal terms');
  }

  // Check for dangerous combinations
  const hasBodyTerm = /\b(body|skin|beauty)\b/gi.test(prompt);
  const hasActionTerm = /\b(massage|rub|touch|apply)\b/gi.test(prompt);
  const hasIntensityTerm = /\b(deep|intense|penetrating|powerful)\b/gi.test(prompt);

  if (hasBodyTerm && hasActionTerm && hasIntensityTerm) {
    riskLevel = 'high';
    suggestions.push('Dangerous combination detected: body + action + intensity terms');
  }

  return { triggers, riskLevel, suggestions };
}

/**
 * Get the most common trigger categories
 */
function getMostCommonTriggers(analyses: any[]): string[] {
  const triggerCounts: Record<string, number> = {};

  analyses.forEach(analysis => {
    analysis.potentialTriggers.forEach((trigger: string) => {
      const category = trigger.match(/\(([^)]+)\)/)?.[1] || 'unknown';
      triggerCounts[category] = (triggerCounts[category] || 0) + 1;
    });
  });

  return Object.entries(triggerCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => `${category} (${count})`);
}