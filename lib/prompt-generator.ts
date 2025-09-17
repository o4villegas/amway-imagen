// AI prompt generation system for Amway product campaigns

import { StoredProduct } from './db';
import { CampaignPreferences } from '@/app/campaign/new/page';
import { sanitizePrompt, sanitizeProductData, createSafePrompt } from './prompt-sanitizer';
import { PromptTemplateEngine } from './prompt-templates';
import { IMAGE_FORMATS, CAMPAIGN_CONFIG } from './config';

export interface ImagePrompt {
  text: string;
  format: 'instagram_post' | 'instagram_story' | 'facebook_cover' | 'pinterest';
  width: number;
  height: number;
  overlay: TextOverlay;
}

export interface TextOverlay {
  productName: string;
  brandName: string;
  callToAction: string;
  disclaimer: string;
  style: 'minimal' | 'moderate' | 'heavy';
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

  private sanitizeProductName(name: string): string {
    return name
      .replace(/™|®|©/g, '') // Remove trademark symbols
      .replace(/\b(holistic|wellness|program|solution|begin|30)\b/gi, '') // Remove trigger words
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 50) // Limit length
      .trim();
  }

  private extractBenefitConcepts(product: StoredProduct): string[] {
    const benefitConcepts: string[] = [];
    const benefitText = (product.benefits || '').toLowerCase();
    const productName = product.name.toLowerCase();
    const category = (product.category || 'other').toLowerCase();

    // Enhanced benefit detection with concept mapping
    const benefitMappings = [
      { keywords: ['energy', 'vitality', 'stamina', 'vigor'], concepts: BENEFIT_CONCEPTS.energy },
      { keywords: ['wellness', 'health', 'wellbeing'], concepts: BENEFIT_CONCEPTS.wellness },
      { keywords: ['beauty', 'skin', 'radiance', 'glow'], concepts: BENEFIT_CONCEPTS.beauty },
      { keywords: ['nutrition', 'nutrient', 'vitamin', 'mineral'], concepts: BENEFIT_CONCEPTS.nutrition },
      { keywords: ['immune', 'immunity', 'defense', 'protection'], concepts: BENEFIT_CONCEPTS.immunity },
      { keywords: ['clean', 'fresh', 'pure', 'hygiene'], concepts: BENEFIT_CONCEPTS.cleanliness },
      { keywords: ['skincare', 'complexion', 'moistur'], concepts: BENEFIT_CONCEPTS.skincare },
      { keywords: ['fitness', 'strength', 'muscle', 'workout'], concepts: BENEFIT_CONCEPTS.fitness },
      { keywords: ['hair', 'shine', 'scalp', 'volume'], concepts: BENEFIT_CONCEPTS.haircare }
    ];

    // Extract concepts based on benefits and product context
    benefitMappings.forEach(mapping => {
      const hasKeyword = mapping.keywords.some(keyword =>
        benefitText.includes(keyword) || productName.includes(keyword)
      );

      if (hasKeyword) {
        // Select a random concept from the mapping
        const randomConcept = mapping.concepts[Math.floor(Math.random() * mapping.concepts.length)];
        benefitConcepts.push(randomConcept);
      }
    });

    // Category-based fallback concepts
    if (benefitConcepts.length === 0) {
      const categoryFallbacks = {
        'nutrition': BENEFIT_CONCEPTS.nutrition,
        'beauty': BENEFIT_CONCEPTS.beauty,
        'personal_care': BENEFIT_CONCEPTS.wellness,
        'home': BENEFIT_CONCEPTS.cleanliness,
        'health': BENEFIT_CONCEPTS.wellness
      };

      const fallbackConcepts = categoryFallbacks[category as keyof typeof categoryFallbacks] || BENEFIT_CONCEPTS.wellness;
      benefitConcepts.push(fallbackConcepts[0]);
    }

    return benefitConcepts.slice(0, 2); // Limit to 2 primary concepts
  }

  private getVisualMetaphors(benefitConcepts: string[]): string[] {
    const metaphors: string[] = [];

    // Map benefit concepts to visual metaphors
    Object.entries(VISUAL_METAPHORS).forEach(([key, metaphorList]) => {
      const hasRelatedConcept = benefitConcepts.some(concept =>
        concept.includes(key) ||
        concept.includes('energy') && key === 'energy' ||
        concept.includes('strength') && key === 'strength' ||
        concept.includes('purity') && key === 'purity' ||
        concept.includes('balance') && key === 'balance' ||
        concept.includes('confidence') && key === 'confidence'
      );

      if (hasRelatedConcept) {
        const randomMetaphor = metaphorList[Math.floor(Math.random() * metaphorList.length)];
        metaphors.push(randomMetaphor);
      }
    });

    return metaphors.slice(0, 1); // One primary metaphor per image
  }

  private getTextPreservationInstructions(product: StoredProduct, campaignType: string): string {
    // Extract any potential text elements from product name and brand
    const brandName = product.brand || 'Amway';
    const productName = product.name;
    const hasNumericElements = /\d/.test(productName);
    const hasSpecialChars = /[™®©]/.test(productName);

    let textInstructions: string[] = [];

    if (campaignType === 'product_focus') {
      // Core text preservation for product focus
      textInstructions.push(
        TEXT_PRESERVATION_TECHNIQUES.clarity[Math.floor(Math.random() * TEXT_PRESERVATION_TECHNIQUES.clarity.length)],
        TEXT_PRESERVATION_TECHNIQUES.positioning[Math.floor(Math.random() * TEXT_PRESERVATION_TECHNIQUES.positioning.length)],
        TEXT_PRESERVATION_TECHNIQUES.technical[Math.floor(Math.random() * TEXT_PRESERVATION_TECHNIQUES.technical.length)]
      );

      // Brand-specific preservation
      if (brandName && brandName !== 'Amway') {
        textInstructions.push(`"${brandName}" brand name clearly visible and readable`);
        textInstructions.push(TEXT_PRESERVATION_TECHNIQUES.brand[Math.floor(Math.random() * TEXT_PRESERVATION_TECHNIQUES.brand.length)]);
      }

      // Special element preservation
      if (hasNumericElements) {
        textInstructions.push('all numbers and measurements clearly readable');
      }

      if (hasSpecialChars) {
        textInstructions.push('trademark symbols (™®©) preserved and visible');
      }

      // FLUX-1-schnell specific optimizations
      textInstructions.push(
        'avoid text blur or distortion artifacts',
        'maintain original label typography and font weights',
        'product text remains unaltered from source design'
      );

    } else {
      // For lifestyle shots - more relaxed but still preserve key text
      textInstructions.push('readable brand text when product is visible');

      if (brandName && brandName !== 'Amway') {
        textInstructions.push(`"${brandName}" branding legible when shown`);
      }

      textInstructions.push(
        'avoid obscuring important product text',
        'maintain brand identity when product appears'
      );
    }

    return textInstructions.join(', ');
  }

  private validatePromptLength(prompt: string, product: StoredProduct, campaignType: string): string {
    const maxLength = CAMPAIGN_CONFIG.MAX_PROMPT_LENGTH;

    if (prompt.length <= maxLength) {
      return prompt;
    }

    // Prompt is too long - apply fallback strategy
    console.warn(`[PROMPT_VALIDATION] Prompt length ${prompt.length} exceeds ${maxLength}, applying fallback`);

    // Fallback strategy: Simplified text preservation
    const fallbackTextPreservation = this.getFallbackTextPreservation(product, campaignType);

    // Rebuild with essential elements only
    const sanitizedProductName = this.sanitizeProductName(product.name);
    const styleModifiers = STYLE_MODIFIERS.professional; // Use professional as safe default
    const campaignTypeConfig = CAMPAIGN_TYPES[campaignType as keyof typeof CAMPAIGN_TYPES] || CAMPAIGN_TYPES.product_focus;

    const fallbackPrompt = `
${campaignTypeConfig.basePrompt} ${sanitizedProductName},
${fallbackTextPreservation},
professional studio lighting,
clean composition,
high resolution commercial photography,
marketing quality
`.replace(/\s+/g, ' ').trim();

    const finalPrompt = sanitizePrompt(fallbackPrompt);

    // If still too long, truncate gracefully
    if (finalPrompt.length > maxLength) {
      const truncated = finalPrompt.substring(0, maxLength - 20) + '...';
      console.warn(`[PROMPT_VALIDATION] Applied truncation to ${truncated.length} characters`);
      return truncated;
    }

    return finalPrompt;
  }

  private getFallbackTextPreservation(product: StoredProduct, campaignType: string): string {
    // Minimal but essential text preservation for fallback
    const brandName = product.brand || 'Amway';
    const essentialInstructions = [];

    if (campaignType === 'product_focus') {
      essentialInstructions.push('clear readable text');

      if (brandName !== 'Amway') {
        essentialInstructions.push(`"${brandName}" visible`);
      }

      if (/[™®©]/.test(product.name)) {
        essentialInstructions.push('preserve symbols');
      }
    } else {
      essentialInstructions.push('readable branding');
    }

    return essentialInstructions.join(', ');
  }

  private generateBasePrompt(
    product: StoredProduct,
    preferences: CampaignPreferences,
    format: keyof typeof FORMAT_DIMENSIONS
  ): string {
    // Sanitize product data first
    const safeProduct = sanitizeProductData(product) as StoredProduct;

    // Extract benefit concepts instead of using product name
    const benefitConcepts = this.extractBenefitConcepts(safeProduct);
    const visualMetaphors = this.getVisualMetaphors(benefitConcepts);

    const styleModifiers = STYLE_MODIFIERS[preferences.brand_style];
    const campaignType = CAMPAIGN_TYPES[preferences.campaign_type];
    const formatAspect = this.getFormatDescription(format);

    // Get brand context without product specifics
    const brandName = safeProduct.brand || 'Amway';
    const categoryContext = safeProduct.category || 'wellness';

    // Select compliance safeguard
    const complianceSafeguard = COMPLIANCE_SAFEGUARDS[Math.floor(Math.random() * COMPLIANCE_SAFEGUARDS.length)];

    // Build benefit-focused prompt structure
    const primaryConcept = benefitConcepts[0] || 'wellness enhancement concepts';
    const visualMetaphor = visualMetaphors[0] || 'harmonious composition';

    const rawPrompt = `
${campaignType.basePrompt} ${primaryConcept} for ${categoryContext} lifestyle,
${visualMetaphor},
${brandName} brand aesthetic guidelines,
${styleModifiers.mood} atmosphere,
${styleModifiers.lighting},
${campaignType.emphasis},
${formatAspect},
${complianceSafeguard},
professional commercial photography quality,
marketing imagery without product replication
`.replace(/\s+/g, ' ').trim();

    // Sanitize the final prompt
    const sanitizedPrompt = sanitizePrompt(rawPrompt);

    // Validate prompt length and apply fallback if needed
    return this.validatePromptLength(sanitizedPrompt, safeProduct, preferences.campaign_type);
  }

  private getFormatDescription(format: keyof typeof FORMAT_DIMENSIONS): string {
    switch (format) {
      case 'instagram_post':
        return 'square Instagram post optimized';
      case 'instagram_story':
        return 'vertical Instagram story optimized';
      case 'facebook_cover':
        return 'landscape Facebook cover optimized';
      case 'pinterest':
        return 'vertical Pinterest pin optimized';
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
    // Use enhanced template system for better diversity
    const enhancedPrompts = this.templateEngine.generateEnhancedPrompts(
      product,
      preferences,
      format as keyof typeof IMAGE_FORMATS,
      count
    );

    // Fallback to basic variations if enhanced system fails
    if (enhancedPrompts.length === 0) {
      return this.generateBasicVariations(basePrompt, preferences.campaign_type, format, count);
    }

    return enhancedPrompts;
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
      if (format === 'instagram_story') {
        enhanced += ', vertical composition, story-style layout, engaging visual hierarchy';
      } else if (format === 'pinterest') {
        enhanced += ', Pinterest-style graphic, text overlay friendly, pin-worthy composition';
      } else if (format === 'facebook_cover') {
        enhanced += ', banner composition, brand story visual, cover photo style';
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

    let callToAction = '';
    switch (preferences.text_overlay) {
      case 'minimal':
        callToAction = 'Learn More';
        break;
      case 'moderate':
        callToAction = `Experience ${product.brand || 'Quality'} Difference`;
        break;
      case 'heavy':
        callToAction = `Transform Your Life with ${product.brand || 'Premium'} Products - Start Today!`;
        break;
    }

    return {
      productName: sanitizedProductName,
      brandName: product.brand || 'Amway',
      callToAction,
      disclaimer,
      style: preferences.text_overlay
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