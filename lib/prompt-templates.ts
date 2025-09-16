/**
 * Advanced prompt template system for diverse AI image generation
 */

import { StoredProduct } from './db';
import { CampaignPreferences } from '@/app/campaign/new/page';
import { IMAGE_FORMATS } from './config';

export interface PromptTemplate {
  id: string;
  name: string;
  category: 'product_focus' | 'lifestyle' | 'brand_story' | 'benefit_focus';
  template: string;
  variables: string[];
  suitableFormats: (keyof typeof IMAGE_FORMATS)[];
  style: string[];
}

export interface PromptContext {
  product: StoredProduct;
  preferences: CampaignPreferences;
  format: keyof typeof IMAGE_FORMATS;
  benefitKeywords: string[];
  categoryTags: string[];
  emotionalTone: string;
}

// Enhanced prompt templates with more variety
export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Product Focus Templates
  {
    id: 'hero_product',
    name: 'Hero Product Shot',
    category: 'product_focus',
    template: 'Professional {style} photograph of {productName}, {placement} on {background}, {lighting}, high-resolution commercial photography, {colorScheme}, emphasizing {primaryBenefit}',
    variables: ['style', 'productName', 'placement', 'background', 'lighting', 'colorScheme', 'primaryBenefit'],
    suitableFormats: ['instagram_post', 'facebook_cover', 'pinterest'],
    style: ['minimalist', 'premium', 'clinical', 'elegant']
  },

  {
    id: 'product_detail',
    name: 'Product Detail Focus',
    category: 'product_focus',
    template: 'Macro close-up of {productName}, showcasing {keyFeature}, {textureDescription}, {lighting}, {angle} composition, highlighting {qualityIndicator}',
    variables: ['productName', 'keyFeature', 'textureDescription', 'lighting', 'angle', 'qualityIndicator'],
    suitableFormats: ['instagram_post', 'pinterest'],
    style: ['detailed', 'technical', 'artistic', 'scientific']
  },

  // Lifestyle Templates
  {
    id: 'daily_routine',
    name: 'Daily Life Integration',
    category: 'lifestyle',
    template: '{demographic} {action} with {productName} in {setting}, {timeOfDay}, {mood} atmosphere, showcasing {lifestyleBenefit}, {naturalLighting}',
    variables: ['demographic', 'action', 'productName', 'setting', 'timeOfDay', 'mood', 'lifestyleBenefit', 'naturalLighting'],
    suitableFormats: ['instagram_story', 'facebook_cover', 'pinterest'],
    style: ['authentic', 'aspirational', 'relatable', 'inspiring']
  },

  {
    id: 'transformation',
    name: 'Before & After Story',
    category: 'lifestyle',
    template: 'Split composition showing {transformationType} journey with {productName}, {beforeState} transitioning to {afterState}, {emotionalJourney}, inspiring {targetAudience}',
    variables: ['transformationType', 'productName', 'beforeState', 'afterState', 'emotionalJourney', 'targetAudience'],
    suitableFormats: ['instagram_post', 'facebook_cover', 'pinterest'],
    style: ['motivational', 'documentary', 'testimonial', 'journey']
  },

  // Brand Story Templates
  {
    id: 'brand_heritage',
    name: 'Brand Heritage Story',
    category: 'brand_story',
    template: '{productName} representing {brandValues}, {heritageElement} meets {modernInnovation}, {premiumQuality} photography, {brandColorScheme}',
    variables: ['productName', 'brandValues', 'heritageElement', 'modernInnovation', 'premiumQuality', 'brandColorScheme'],
    suitableFormats: ['facebook_cover', 'pinterest'],
    style: ['sophisticated', 'timeless', 'prestigious', 'established']
  },

  // Benefit Focus Templates
  {
    id: 'benefit_visualization',
    name: 'Benefit Visualization',
    category: 'benefit_focus',
    template: 'Visual metaphor of {primaryBenefit} through {productName}, {symbolicElement} representing {benefitOutcome}, {artisticStyle}, {emotionalResonance}',
    variables: ['primaryBenefit', 'productName', 'symbolicElement', 'benefitOutcome', 'artisticStyle', 'emotionalResonance'],
    suitableFormats: ['instagram_story', 'pinterest'],
    style: ['conceptual', 'metaphorical', 'artistic', 'symbolic']
  }
];

// Enhanced variable generators with more context-aware content
export class PromptTemplateEngine {
  private getProductCategoryTags(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'nutrition': ['wellness', 'vitality', 'health', 'energy', 'nourishment', 'balance'],
      'beauty': ['radiance', 'confidence', 'glow', 'transformation', 'self-care', 'luxury'],
      'home': ['cleanliness', 'freshness', 'comfort', 'family', 'protection', 'care'],
      'personal_care': ['daily routine', 'self-care', 'confidence', 'freshness', 'quality', 'wellness']
    };
    return categoryMap[category] || ['quality', 'excellence', 'trusted', 'premium'];
  }

  private getBenefitKeywords(product: StoredProduct): string[] {
    const benefits = product.benefits?.toLowerCase() || '';
    const keywords: string[] = [];

    // Extract benefit keywords with expanded mapping
    const benefitMap = {
      'energy': ['vitality', 'stamina', 'alertness', 'vigor', 'liveliness'],
      'immune': ['protection', 'defense', 'wellness', 'strength', 'resilience'],
      'skin': ['radiance', 'glow', 'smoothness', 'youth', 'beauty'],
      'weight': ['fitness', 'balance', 'shape', 'confidence', 'wellness'],
      'clean': ['purity', 'freshness', 'hygiene', 'clarity', 'sparkle'],
      'hair': ['strength', 'shine', 'volume', 'health', 'beauty']
    };

    Object.entries(benefitMap).forEach(([key, synonyms]) => {
      if (benefits.includes(key)) {
        keywords.push(...synonyms);
      }
    });

    return keywords.length > 0 ? keywords : ['quality', 'excellence', 'wellness'];
  }

  private getEmotionalTone(preferences: CampaignPreferences): string {
    const toneMap = {
      'professional': 'confident and trustworthy',
      'casual': 'warm and approachable',
      'wellness': 'peaceful and rejuvenating',
      'luxury': 'sophisticated and exclusive'
    };
    return toneMap[preferences.brand_style];
  }

  private generateVariableValues(
    template: PromptTemplate,
    context: PromptContext
  ): Record<string, string> {
    const values: Record<string, string> = {};
    const { product, preferences, format, benefitKeywords, categoryTags } = context;

    // Dynamic variable generation based on template needs
    const variableGenerators: Record<string, () => string> = {
      productName: () => product.name,
      style: () => template.style[Math.floor(Math.random() * template.style.length)],
      primaryBenefit: () => benefitKeywords[Math.floor(Math.random() * benefitKeywords.length)],

      // Placement variations
      placement: () => {
        const placements = ['elegantly positioned', 'thoughtfully arranged', 'prominently displayed', 'artfully placed'];
        return placements[Math.floor(Math.random() * placements.length)];
      },

      // Background variations
      background: () => {
        const backgrounds = {
          'professional': ['clean white backdrop', 'neutral studio background', 'pristine white surface'],
          'wellness': ['natural wood surface', 'organic stone background', 'soft natural textures'],
          'luxury': ['rich dark background', 'premium marble surface', 'elegant textured backdrop'],
          'casual': ['warm home setting', 'cozy natural environment', 'friendly casual backdrop']
        };
        const styleBackgrounds = backgrounds[preferences.brand_style] || backgrounds.professional;
        return styleBackgrounds[Math.floor(Math.random() * styleBackgrounds.length)];
      },

      // Lighting variations
      lighting: () => {
        const lightingOptions = {
          'professional': ['studio lighting', 'clean bright illumination', 'professional photography lighting'],
          'wellness': ['soft natural light', 'warm golden hour lighting', 'gentle ambient illumination'],
          'luxury': ['dramatic accent lighting', 'sophisticated mood lighting', 'premium studio lighting'],
          'casual': ['warm natural lighting', 'soft diffused light', 'friendly bright lighting']
        };
        const styleLighting = lightingOptions[preferences.brand_style] || lightingOptions.professional;
        return styleLighting[Math.floor(Math.random() * styleLighting.length)];
      },

      // Color scheme
      colorScheme: () => {
        const schemes = {
          'amway_brand': 'Amway brand colors with blue and gold accents',
          'product_inspired': `colors inspired by ${product.category} category palette`,
          'custom': 'harmonious complementary color palette'
        };
        return schemes[preferences.color_scheme];
      },

      // Demographics for lifestyle shots
      demographic: () => {
        const demographics = ['young professional', 'health-conscious individual', 'wellness-focused person', 'active lifestyle enthusiast'];
        return demographics[Math.floor(Math.random() * demographics.length)];
      },

      // Actions for lifestyle contexts
      action: () => {
        const actions = ['starting their day', 'incorporating wellness routine', 'enhancing daily care', 'pursuing healthy living'];
        return actions[Math.floor(Math.random() * actions.length)];
      },

      // Settings
      setting: () => {
        const settings = ['modern home environment', 'serene wellness space', 'contemporary lifestyle setting', 'comfortable personal space'];
        return settings[Math.floor(Math.random() * settings.length)];
      },

      // Time contexts
      timeOfDay: () => {
        const times = ['morning routine', 'midday wellness break', 'evening self-care', 'peaceful quiet moment'];
        return times[Math.floor(Math.random() * times.length)];
      },

      // Mood descriptors
      mood: () => context.emotionalTone,

      // Lifestyle benefits
      lifestyleBenefit: () => {
        const benefits = categoryTags.map(tag => `enhanced ${tag}`);
        return benefits[Math.floor(Math.random() * benefits.length)];
      }
    };

    // Generate values for all required variables
    template.variables.forEach(variable => {
      if (variableGenerators[variable]) {
        values[variable] = variableGenerators[variable]();
      } else {
        // Fallback for undefined variables
        values[variable] = variable.replace(/([A-Z])/g, ' $1').toLowerCase();
      }
    });

    return values;
  }

  public generateEnhancedPrompts(
    product: StoredProduct,
    preferences: CampaignPreferences,
    format: keyof typeof IMAGE_FORMATS,
    count: number = 5
  ): string[] {
    const benefitKeywords = this.getBenefitKeywords(product);
    const categoryTags = this.getProductCategoryTags(product.category);
    const emotionalTone = this.getEmotionalTone(preferences);

    const context: PromptContext = {
      product,
      preferences,
      format,
      benefitKeywords,
      categoryTags,
      emotionalTone
    };

    // Filter templates suitable for the current format and campaign type
    const suitableTemplates = PROMPT_TEMPLATES.filter(template =>
      template.suitableFormats.includes(format) &&
      (template.category === preferences.campaign_type || template.category === 'benefit_focus')
    );

    if (suitableTemplates.length === 0) {
      // Fallback to all templates if none match
      return this.generateBasicPrompts(product, preferences, format, count);
    }

    const prompts: string[] = [];

    for (let i = 0; i < count; i++) {
      const template = suitableTemplates[i % suitableTemplates.length];
      const variables = this.generateVariableValues(template, context);

      let prompt = template.template;

      // Replace variables in template
      Object.entries(variables).forEach(([key, value]) => {
        prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
      });

      // Add format-specific enhancements
      prompt += this.getFormatEnhancement(format);

      prompts.push(prompt);
    }

    return prompts;
  }

  private getFormatEnhancement(format: keyof typeof IMAGE_FORMATS): string {
    const enhancements = {
      'instagram_post': ', square composition optimized for social media engagement',
      'instagram_story': ', vertical composition with engaging visual hierarchy',
      'facebook_cover': ', panoramic composition suitable for cover display',
      'pinterest': ', pin-worthy vertical composition with clear visual focus'
    };
    return enhancements[format] || '';
  }

  private generateBasicPrompts(
    product: StoredProduct,
    preferences: CampaignPreferences,
    format: keyof typeof IMAGE_FORMATS,
    count: number
  ): string[] {
    // Fallback basic prompt generation
    const basePrompt = `Professional ${preferences.brand_style} photograph of ${product.name}`;
    return Array(count).fill(0).map((_, i) => `${basePrompt}, variation ${i + 1}`);
  }
}