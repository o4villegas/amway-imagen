// AI prompt generation system for Amway product campaigns

import { StoredProduct } from './db';
import { CampaignPreferences } from '@/app/campaign/new/page';
import { sanitizePrompt, sanitizeProductData, createSafePrompt } from './prompt-sanitizer';
import { PromptTemplateEngine } from './prompt-templates';
import { IMAGE_FORMATS, CAMPAIGN_CONFIG } from './config';

export interface ImagePrompt {
  text: string;
  format: 'facebook_post' | 'instagram_post' | 'pinterest' | 'snapchat_ad' | 'linkedin_post';
  width: number;
  height: number;
  overlay: TextOverlay;
}

export interface TextOverlay {
  productName: string;
  brandName: string;
  callToAction: string;
  disclaimer: string;
  style: 'minimal';
}

// Use centralized IMAGE_FORMATS from config for consistency
const FORMAT_DIMENSIONS = IMAGE_FORMATS;

const STYLE_MODIFIERS = {
  professional: {
    lighting: 'professional studio lighting, clean and crisp',
    composition: 'symmetrical composition, minimalist background',
    color: 'corporate color palette, high contrast',
    mood: 'trustworthy, authoritative, polished'
  },
  casual: {
    lighting: 'natural lighting, soft and warm',
    composition: 'relaxed composition, everyday setting',
    color: 'friendly color palette, approachable tones',
    mood: 'friendly, approachable, everyday'
  },
  wellness: {
    lighting: 'natural sunlight, bright and airy',
    composition: 'organic composition, natural elements',
    color: 'earth tones, greens and whites, natural palette',
    mood: 'peaceful, healthy, mindful, rejuvenating'
  },
  luxury: {
    lighting: 'dramatic lighting, sophisticated shadows',
    composition: 'elegant composition, premium setting',
    color: 'rich color palette, gold accents, deep tones',
    mood: 'sophisticated, exclusive, premium, elegant'
  }
} as const;

const COLOR_SCHEMES = {
  amway_brand: 'Amway brand colors (blue, white, gold accents)',
  product_inspired: 'colors inspired by the product packaging and category',
  custom: 'complementary color palette that enhances the product'
} as const;

const CAMPAIGN_TYPES = {
  product_focus: {
    basePrompt: 'Professional lifestyle photography representing',
    emphasis: 'benefit visualization, conceptual representation, brand messaging',
    background: 'clean modern environment or natural brand-appropriate setting',
    angle: 'aspirational lifestyle concepts showcasing benefit outcomes'
  },
  lifestyle: {
    basePrompt: 'Authentic lifestyle scene showcasing',
    emphasis: 'real-life benefit application, emotional connection, lifestyle enhancement',
    background: 'natural environments, home settings, daily life contexts',
    angle: 'people experiencing benefit outcomes, aspirational moments'
  }
} as const;

const COMPLIANCE_DISCLAIMERS = {
  nutrition: 'These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure or prevent any disease.',
  beauty: 'Individual results may vary. Use as directed.',
  home: 'Follow label instructions for best results.',
  other: 'Individual results may vary.',
  income: 'Earnings as an Amway IBO are based on individual effort and results may vary.'
} as const;

// Benefit-focused concepts to avoid product recreation
const BENEFIT_CONCEPTS = {
  energy: ['vitality visualization', 'active lifestyle imagery', 'morning energy concepts', 'dynamic wellness scenes'],
  wellness: ['holistic health imagery', 'balanced lifestyle scenes', 'wellness journey visuals', 'harmony concepts'],
  beauty: ['natural radiance concepts', 'confidence imagery', 'self-care moments', 'inner glow visualization'],
  nutrition: ['wholesome nutrition concepts', 'healthy choices imagery', 'nutritional wellness', 'balanced living'],
  immunity: ['strength and protection concepts', 'resilience imagery', 'wellness foundation visuals', 'vitality support'],
  cleanliness: ['purity and freshness concepts', 'clean living imagery', 'organized wellness spaces', 'fresh environment'],
  skincare: ['healthy skin concepts', 'natural beauty imagery', 'radiant complexion visuals', 'skincare routine aesthetics'],
  fitness: ['active lifestyle concepts', 'strength and endurance imagery', 'fitness journey visuals', 'healthy movement'],
  haircare: ['healthy hair concepts', 'confidence and beauty imagery', 'hair wellness visuals', 'natural shine aesthetics']
} as const;

// Visual metaphors for benefit representation
const VISUAL_METAPHORS = {
  energy: ['sunrise energy dynamics', 'flowing water movements', 'vibrant natural elements', 'light and motion'],
  strength: ['mountain stability imagery', 'strong foundation concepts', 'growth and resilience', 'solid support'],
  purity: ['crystal clear environments', 'fresh natural settings', 'clean modern spaces', 'pristine conditions'],
  balance: ['harmonious compositions', 'equilibrium visuals', 'centered wellness', 'peaceful stability'],
  growth: ['flourishing nature', 'positive transformation', 'progressive development', 'upward momentum'],
  confidence: ['empowered posture', 'self-assured presence', 'inner strength display', 'personal radiance']
} as const;

// Compliance safeguards to prevent product misrepresentation
const COMPLIANCE_SAFEGUARDS = [
  'avoid recreating exact product appearance',
  'focus on benefit concepts rather than product replication',
  'represent brand values without product simulation',
  'maintain Amway brand aesthetic guidelines',
  'ensure professional commercial quality',
  'focus on lifestyle enhancement rather than product features'
] as const;

// DEPRECATED: FLUX-1-schnell doesn't support negative prompts
// These terms are kept for reference but converted to positive guidance
// See lifestyleInstructions in generateBasePrompt() for actual implementation
const LIFESTYLE_NEGATIVE_PROMPTS = [
  'no visible product bottles',
  'no product containers',
  'no supplement bottles',
  'no product packaging',
  'no branded containers',
  'no product labels',
  'no pills or capsules',
  'no cosmetic containers',
  'no cream jars',
  'no cleaning product bottles',
  'avoid product-focused imagery',
  'no commercial product displays',
  'no product placement'
] as const;

// FLUX-1-schnell specific text preservation techniques
const TEXT_PRESERVATION_TECHNIQUES = {
  // Core techniques for text clarity
  clarity: [
    'crystal clear text',
    'razor-sharp typography',
    'perfectly legible labels',
    'high-contrast text elements',
    'crisp label printing',
    'undistorted text'
  ],

  // Positioning and composition
  positioning: [
    'text clearly visible and readable',
    'label facing camera directly',
    'optimal text viewing angle',
    'unobscured product labeling',
    'front-facing product orientation',
    'text in sharp focus'
  ],

  // Technical quality
  technical: [
    'commercial photography quality text',
    'print-ready text clarity',
    'original typography preserved',
    'manufacturer label design intact',
    'authentic product text rendering',
    'professional label photography'
  ],

  // Brand-specific
  brand: [
    'brand name clearly readable',
    'logo text unmodified',
    'trademark symbols preserved',
    'product name typography intact',
    'original font styling maintained',
    'brand identity text preserved'
  ]
} as const;

export class PromptGenerator {
  private templateEngine = new PromptTemplateEngine();

  private generateSceneDescription(product: StoredProduct, preferences: CampaignPreferences): string {
    const category = (product.category || 'other').toLowerCase();
    const benefitText = (product.benefits || '').toLowerCase();

    // Scene types based on category and benefits
    const scenes = {
      nutrition: [
        'Energetic person in their 30s at mountain peak during golden hour, arms raised in triumphant pose',
        'Family enjoying active outdoor adventure, hiking through scenic nature trail together',
        'Morning yoga session in sunlit home studio, person in peaceful meditation pose'
      ],
      beauty: [
        'Woman in early 30s with glowing radiant skin, natural morning light streaming through sheer curtains',
        'Person touching their face gently with confidence, soft natural makeup emphasizing healthy glow',
        'Authentic beauty moment in bright airy bathroom, person admiring their reflection with genuine smile'
      ],
      home: [
        'Modern kitchen with family preparing healthy meal together, bright and organized space',
        'Peaceful living room with natural light, person relaxing in clean harmonious environment',
        'Fresh and organized bedroom space, morning sunlight highlighting pristine surfaces'
      ],
      personal_care: [
        'Person in luxurious spa-like bathroom, enjoying self-care routine with serene expression',
        'Active lifestyle scene with person post-workout, confident and refreshed',
        'Morning routine in modern bathroom, person starting day with energy and confidence'
      ],
      other: [
        'Person experiencing wellness benefits in everyday life setting',
        'Lifestyle transformation moment showing confidence and vitality',
        'Natural environment with person embodying health and happiness'
      ]
    };

    const categoryScenes = scenes[category as keyof typeof scenes] || scenes.other;

    // Select scene based on lifestyle vs product focus
    if (preferences.campaign_type === 'lifestyle') {
      // Add people and action to scenes
      const selectedScene = categoryScenes[Math.floor(Math.random() * categoryScenes.length)];
      return selectedScene + ', wearing modern casual attire, expressing genuine joy and accomplishment';
    } else {
      // More abstract/conceptual scenes without specific products
      const selectedScene = categoryScenes[Math.floor(Math.random() * categoryScenes.length)];
      return selectedScene.replace(/person/gi, 'individual').replace(/their/gi, 'the');
    }
  }

  private generateMoodFromBenefits(product: StoredProduct): string {
    const benefitText = (product.benefits || '').toLowerCase();
    const moods = [];

    // Map benefits to mood descriptors
    if (benefitText.includes('energy') || benefitText.includes('vitality')) {
      moods.push('energized', 'vital', 'dynamic');
    }
    if (benefitText.includes('immune') || benefitText.includes('protect')) {
      moods.push('protected', 'strong', 'resilient');
    }
    if (benefitText.includes('beauty') || benefitText.includes('radiant')) {
      moods.push('radiant', 'confident', 'glowing');
    }
    if (benefitText.includes('clean') || benefitText.includes('fresh')) {
      moods.push('fresh', 'pure', 'pristine');
    }
    if (benefitText.includes('wellness') || benefitText.includes('health')) {
      moods.push('healthy', 'balanced', 'harmonious');
    }

    // Add default moods
    moods.push('confident', 'accomplished', 'optimistic');

    // Return unique moods as comma-separated string
    return Array.from(new Set(moods)).slice(0, 5).join(', ');
  }

  private generateVisualStyle(brandStyle: string): string {
    const styles = {
      professional: 'Clean professional lifestyle photography, crisp focus, high contrast, corporate aesthetic',
      casual: 'Relaxed authentic photography, natural tones, approachable feel, everyday scenarios',
      wellness: 'Bright airy photography, natural elements, organic composition, mindful aesthetic',
      luxury: 'Elegant sophisticated photography, premium quality, rich tones, exclusive feel'
    };

    return styles[brandStyle as keyof typeof styles] || styles.professional;
  }

  private getFormatSpecification(format: keyof typeof FORMAT_DIMENSIONS): string {
    const dims = FORMAT_DIMENSIONS[format];
    const formatNames = {
      facebook_post: 'Facebook post',
      instagram_post: 'Instagram post',
      pinterest: 'Pinterest pin',
      snapchat_ad: 'Snapchat ad',
      linkedin_post: 'LinkedIn post'
    };

    return `${formatNames[format]}, ${dims.width}x${dims.height}px, ${dims.width > dims.height ? 'horizontal' : dims.width === dims.height ? 'square' : 'vertical'} format`;
  }

  private extractPrimaryBenefit(product: StoredProduct): string {
    const benefits = product.benefits || '';
    const benefitList = benefits.split('.').filter(b => b.trim());

    if (benefitList.length > 0) {
      // Convert first benefit to outcome-focused statement
      const primaryBenefit = benefitList[0].toLowerCase().trim();

      // Transform benefit to outcome
      if (primaryBenefit.includes('energy')) {
        return 'feeling energized and ready to tackle any challenge';
      }
      if (primaryBenefit.includes('immune')) {
        return 'feeling protected and resilient in daily life';
      }
      if (primaryBenefit.includes('beauty') || primaryBenefit.includes('skin')) {
        return 'radiating confidence with healthy glowing skin';
      }
      if (primaryBenefit.includes('clean')) {
        return 'living in a fresh, pristine environment';
      }
      if (primaryBenefit.includes('wellness') || primaryBenefit.includes('health')) {
        return 'achieving optimal health and balanced wellness';
      }

      // Generic transformation
      return primaryBenefit.replace(/supports?/gi, 'experiencing')
                           .replace(/provides?/gi, 'enjoying')
                           .replace(/helps?/gi, 'achieving');
    }

    return 'experiencing enhanced wellness and vitality';
  }

  private sanitizeProductName(name: string): string {
    return name
      .replace(/™|®|©/g, '') // Remove trademark symbols
      .replace(/\b(holistic|wellness|program|solution|begin|30)\b/gi, '') // Remove trigger words
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 50) // Limit length
      .trim();
  }


  private validatePromptLength(prompt: string, product: StoredProduct, campaignType: string): string {
    const maxLength = CAMPAIGN_CONFIG.MAX_PROMPT_LENGTH;

    if (prompt.length <= maxLength) {
      return prompt;
    }

    // Prompt is too long - apply fallback with description format
    console.warn(`[PROMPT_VALIDATION] Prompt length ${prompt.length} exceeds ${maxLength}, applying fallback`);

    // Simplified description-based fallback
    const primaryBenefit = this.extractPrimaryBenefit(product);
    const category = product.category || 'wellness';

    const fallbackPrompt = `
Professional lifestyle photography for ${category} campaign.

SCENE: Person experiencing wellness benefits in natural setting

MOOD & FEELING: Confident, healthy, accomplished

VISUAL STYLE: Clean professional photography

NO PRODUCTS VISIBLE. Focus on: ${primaryBenefit}

FORMAT: Social media optimized
`.trim();

    const finalPrompt = sanitizePrompt(fallbackPrompt);

    // If still too long, truncate gracefully
    if (finalPrompt.length > maxLength) {
      const truncated = finalPrompt.substring(0, maxLength - 20) + '...';
      console.warn(`[PROMPT_VALIDATION] Applied truncation to ${truncated.length} characters`);
      return truncated;
    }

    return finalPrompt;
  }


  private generateBasePrompt(
    product: StoredProduct,
    preferences: CampaignPreferences,
    format: keyof typeof FORMAT_DIMENSIONS
  ): string {
    // Sanitize product data first
    const safeProduct = sanitizeProductData(product) as StoredProduct;

    // Generate description-based prompt per specification
    const scene = this.generateSceneDescription(safeProduct, preferences);
    const mood = this.generateMoodFromBenefits(safeProduct);
    const visualStyle = this.generateVisualStyle(preferences.brand_style);
    const lighting = STYLE_MODIFIERS[preferences.brand_style].lighting;
    const formatSpec = this.getFormatSpecification(format);
    const primaryBenefit = this.extractPrimaryBenefit(safeProduct);

    // Build description-based prompt structure as per prompt_examples.md
    const rawPrompt = `
Professional lifestyle photography for ${safeProduct.category || 'wellness'} campaign.

SCENE: ${scene}

MOOD & FEELING: ${mood}

VISUAL STYLE: ${visualStyle}, ${lighting}

NO PRODUCTS VISIBLE. Focus entirely on the outcome: ${primaryBenefit}

FORMAT: ${formatSpec}
BRAND ALIGNMENT: ${preferences.brand_style} aesthetic, Amway brand values
`.trim();

    // Sanitize the final prompt
    const sanitizedPrompt = sanitizePrompt(rawPrompt);

    // Validate prompt length and apply fallback if needed
    return this.validatePromptLength(sanitizedPrompt, safeProduct, preferences.campaign_type);
  }

  private getFormatDescription(format: keyof typeof FORMAT_DIMENSIONS): string {
    switch (format) {
      case 'facebook_post':
        return 'landscape Facebook post optimized';
      case 'instagram_post':
        return 'square Instagram post optimized';
      case 'pinterest':
        return 'vertical Pinterest pin optimized';
      case 'snapchat_ad':
        return 'vertical Snapchat ad optimized';
      case 'linkedin_post':
        return 'landscape LinkedIn post optimized';
      default:
        return 'social media optimized';
    }
  }

  private generatePromptVariations(
    basePrompt: string,
    product: StoredProduct,
    preferences: CampaignPreferences,
    format: keyof typeof FORMAT_DIMENSIONS,
    count: number = 5
  ): string[] {
    const variations: string[] = [];

    // Generate variations with different scene elements
    for (let i = 0; i < count; i++) {
      // Create variation by modifying scene details
      const variationElements = [
        'different time of day lighting',
        'alternative angle and composition',
        'varied emotional expression',
        'adjusted environmental details',
        'modified action or pose'
      ];

      // Add slight variations to the base prompt
      const variation = basePrompt.replace(
        /SCENE: ([^\n]+)/,
        (match, scene) => `SCENE: ${scene}, ${variationElements[i % variationElements.length]}`
      );

      variations.push(variation);
    }

    return variations;
  }

  private generateBasicVariations(
    basePrompt: string,
    campaignType: string,
    format: keyof typeof FORMAT_DIMENSIONS,
    count: number
  ): string[] {
    const variations: string[] = [];

    if (campaignType === 'product_focus') {
      const benefitFocusVariations = [
        `${basePrompt}, aspirational lifestyle hero composition, benefit-centered imagery`,
        `${basePrompt}, wellness concept visualization, brand values representation`,
        `${basePrompt}, lifestyle enhancement focus, conceptual benefit illustration`,
        `${basePrompt}, holistic wellness imagery, brand aesthetic harmony`,
        `${basePrompt}, benefit outcome visualization, inspiring lifestyle concepts`,
        `${basePrompt}, wellness journey representation, brand story illustration`,
        `${basePrompt}, lifestyle transformation concepts, aspirational benefit imagery`
      ];
      variations.push(...benefitFocusVariations.slice(0, count));
    } else {
      const lifestyleVariations = [
        `${basePrompt}, person experiencing wellness benefits, genuine joy and confidence`,
        `${basePrompt}, lifestyle transformation journey, inspiring personal growth story`,
        `${basePrompt}, family wellness moments, shared healthy living experiences`,
        `${basePrompt}, active wellness lifestyle, daily benefit integration scenes`,
        `${basePrompt}, peaceful home wellness environment, harmonious living spaces`,
        `${basePrompt}, morning wellness routine, fresh start energy and vitality`,
        `${basePrompt}, wellness community moments, shared benefit experiences`
      ];
      variations.push(...lifestyleVariations.slice(0, count));
    }

    // Add format-specific enhancements
    return variations.map(variation => {
      let enhanced = variation;
      if (format === 'snapchat_ad') {
        enhanced += ', vertical composition, mobile-first design, engaging visual hierarchy';
      } else if (format === 'pinterest') {
        enhanced += ', Pinterest-style graphic, text overlay friendly, pin-worthy composition';
      } else if (format === 'facebook_post') {
        enhanced += ', social media optimized, brand story visual, engaging post style';
      } else if (format === 'linkedin_post') {
        enhanced += ', professional composition, business-focused, corporate social style';
      }
      return enhanced;
    });
  }

  private generateTextOverlay(
    product: StoredProduct,
    preferences: CampaignPreferences
  ): TextOverlay {
    const disclaimer = COMPLIANCE_DISCLAIMERS[product.category as keyof typeof COMPLIANCE_DISCLAIMERS] ||
                     COMPLIANCE_DISCLAIMERS.other;

    // Use sanitized product name for overlay text too
    const sanitizedProductName = this.sanitizeProductName(product.name);

    // Clean images approach - minimal text overlay data for separate marketing copy
    const callToAction = 'Learn More';

    return {
      productName: sanitizedProductName,
      brandName: product.brand || 'Amway',
      callToAction,
      disclaimer,
      style: 'minimal' as const
    };
  }

  public generateCampaignPrompts(
    product: StoredProduct,
    preferences: CampaignPreferences
  ): ImagePrompt[] {
    const prompts: ImagePrompt[] = [];
    const totalImages = preferences.campaign_size;
    const formatsCount = preferences.image_formats.length;
    const imagesPerFormat = Math.ceil(totalImages / formatsCount);

    for (const format of preferences.image_formats) {
      const dimensions = FORMAT_DIMENSIONS[format];
      const basePrompt = this.generateBasePrompt(product, preferences, format);
      const variations = this.generatePromptVariations(basePrompt, product, preferences, format);
      const textOverlay = this.generateTextOverlay(product, preferences);

      // Generate the exact number of variations we need for this format
      const selectedVariations = this.generatePromptVariations(
        basePrompt,
        product,
        preferences,
        format,
        imagesPerFormat
      );

      for (const promptText of selectedVariations) {
        if (prompts.length < totalImages) {
          // Sanitize each variation before adding
          const sanitizedText = sanitizePrompt(promptText);
          prompts.push({
            text: sanitizedText,
            format,
            width: dimensions.width,
            height: dimensions.height,
            overlay: textOverlay
          });
        }
      }
    }

    // If we still need more prompts, fill with repeated variations
    while (prompts.length < totalImages) {
      const format = preferences.image_formats[prompts.length % formatsCount];
      const dimensions = FORMAT_DIMENSIONS[format];
      const basePrompt = this.generateBasePrompt(product, preferences, format);
      const textOverlay = this.generateTextOverlay(product, preferences);

      prompts.push({
        text: `${basePrompt}, creative variation ${prompts.length + 1}`,
        format,
        width: dimensions.width,
        height: dimensions.height,
        overlay: textOverlay
      });
    }

    return prompts.slice(0, totalImages);
  }

  public generateSinglePrompt(
    product: StoredProduct,
    preferences: CampaignPreferences,
    format: keyof typeof FORMAT_DIMENSIONS,
    variation: number = 0
  ): ImagePrompt {
    const dimensions = FORMAT_DIMENSIONS[format];
    const basePrompt = this.generateBasePrompt(product, preferences, format);
    const variations = this.generatePromptVariations(basePrompt, product, preferences, format);
    const textOverlay = this.generateTextOverlay(product, preferences);

    const selectedPrompt = variations[variation % variations.length];

    return {
      text: selectedPrompt,
      format,
      width: dimensions.width,
      height: dimensions.height,
      overlay: textOverlay
    };
  }
}