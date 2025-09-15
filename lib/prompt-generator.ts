// AI prompt generation system for Amway product campaigns

import { StoredProduct } from './db';
import { CampaignPreferences } from '@/app/campaign/new/page';

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

const FORMAT_DIMENSIONS = {
  instagram_post: { width: 1080, height: 1080 },
  instagram_story: { width: 1080, height: 1920 },
  facebook_cover: { width: 1200, height: 675 },
  pinterest: { width: 1000, height: 1500 }
} as const;

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
    basePrompt: 'High-quality product photography showcasing',
    emphasis: 'product features, clean presentation, commercial quality',
    background: 'clean white background or subtle branded background',
    angle: 'multiple angles showing product details and benefits'
  },
  lifestyle: {
    basePrompt: 'Lifestyle photography featuring real people using',
    emphasis: 'authentic moments, real-life scenarios, emotional connection',
    background: 'natural environments, home settings, daily life contexts',
    angle: 'people interacting with product, before/after scenarios'
  }
} as const;

const COMPLIANCE_DISCLAIMERS = {
  nutrition: 'These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure or prevent any disease.',
  beauty: 'Individual results may vary. Use as directed.',
  home: 'Follow label instructions for best results.',
  other: 'Individual results may vary.',
  income: 'Earnings as an Amway IBO are based on individual effort and results may vary.'
} as const;

export class PromptGenerator {
  private getProductBenefits(product: StoredProduct): string[] {
    const benefits: string[] = [];

    if (product.benefits) {
      // Extract key benefit phrases
      const benefitText = product.benefits.toLowerCase();

      if (benefitText.includes('energy') || benefitText.includes('vitality')) {
        benefits.push('energy and vitality');
      }
      if (benefitText.includes('immune') || benefitText.includes('immunity')) {
        benefits.push('immune system support');
      }
      if (benefitText.includes('skin') || benefitText.includes('beauty')) {
        benefits.push('healthy skin and beauty');
      }
      if (benefitText.includes('digestive') || benefitText.includes('gut')) {
        benefits.push('digestive wellness');
      }
      if (benefitText.includes('weight') || benefitText.includes('fitness')) {
        benefits.push('weight management and fitness');
      }
      if (benefitText.includes('clean') || benefitText.includes('fresh')) {
        benefits.push('cleanliness and freshness');
      }
    }

    return benefits.length > 0 ? benefits : ['overall wellness and quality'];
  }

  private generateBasePrompt(
    product: StoredProduct,
    preferences: CampaignPreferences,
    format: keyof typeof FORMAT_DIMENSIONS
  ): string {
    const styleModifiers = STYLE_MODIFIERS[preferences.brand_style];
    const campaignType = CAMPAIGN_TYPES[preferences.campaign_type];
    const colorScheme = COLOR_SCHEMES[preferences.color_scheme];
    const benefits = this.getProductBenefits(product);
    const formatAspect = this.getFormatDescription(format);

    const prompt = `
${campaignType.basePrompt} ${product.name},
${campaignType.emphasis},
${formatAspect} format,
${styleModifiers.lighting},
${styleModifiers.composition},
${colorScheme},
${styleModifiers.mood} atmosphere,
highlighting ${benefits.join(' and ')},
${campaignType.background},
high resolution commercial photography,
marketing quality,
${styleModifiers.color}
`.replace(/\s+/g, ' ').trim();

    return prompt;
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
    format: keyof typeof FORMAT_DIMENSIONS
  ): string[] {
    const variations: string[] = [];
    const campaignType = preferences.campaign_type;

    if (campaignType === 'product_focus') {
      variations.push(
        `${basePrompt}, hero product shot, centered composition`,
        `${basePrompt}, product with packaging, brand elements visible`,
        `${basePrompt}, macro detail shot, texture and quality focus`,
        `${basePrompt}, product group arrangement, family of products`,
        `${basePrompt}, floating product, minimalist background`
      );
    } else {
      variations.push(
        `${basePrompt}, person enjoying product benefits, genuine smile`,
        `${basePrompt}, before and after transformation, inspiring story`,
        `${basePrompt}, family using product together, bonding moment`,
        `${basePrompt}, active lifestyle scene, product in daily routine`,
        `${basePrompt}, cozy home environment, product as part of wellness routine`
      );
    }

    // Add format-specific variations
    if (format === 'instagram_story') {
      variations.push(`${basePrompt}, vertical composition, story-style layout, engaging visual hierarchy`);
    } else if (format === 'pinterest') {
      variations.push(`${basePrompt}, Pinterest-style graphic, text overlay friendly, pin-worthy composition`);
    } else if (format === 'facebook_cover') {
      variations.push(`${basePrompt}, banner composition, brand story visual, cover photo style`);
    }

    return variations;
  }

  private generateTextOverlay(
    product: StoredProduct,
    preferences: CampaignPreferences
  ): TextOverlay {
    const disclaimer = COMPLIANCE_DISCLAIMERS[product.category as keyof typeof COMPLIANCE_DISCLAIMERS] ||
                     COMPLIANCE_DISCLAIMERS.other;

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
      productName: product.name,
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

      // Take only the number of variations we need for this format
      const selectedVariations = variations.slice(0, imagesPerFormat);

      for (const promptText of selectedVariations) {
        if (prompts.length < totalImages) {
          prompts.push({
            text: promptText,
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