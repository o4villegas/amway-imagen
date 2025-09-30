// Marketing copy generator for social media campaigns
// Generates platform-appropriate captions with compliance disclaimers

import { StoredProduct } from './db';
import { CampaignPreferences } from '@/app/campaign/new/page';

export interface MarketingCopy {
  text: string;
  hashtags: string[];
  callToAction: string;
  disclaimer: string;
  platform: string;
  totalLength: number;
}

export interface CopyGenerationOptions {
  platform: 'facebook' | 'instagram' | 'pinterest' | 'linkedin';
  style: 'professional' | 'casual' | 'wellness' | 'luxury';
  focusArea: 'benefits' | 'lifestyle' | 'transformation' | 'community';
  includeHashtags: boolean;
  includeEmojis: boolean;
}

export class MarketingCopyGenerator {

  /**
   * Platform-specific copy constraints and characteristics
   */
  private static readonly PLATFORM_SPECS = {
    facebook: {
      maxLength: 2000,
      idealLength: 300,
      tone: 'conversational',
      hashtagLimit: 5,
      emojisRecommended: true
    },
    instagram: {
      maxLength: 2200,
      idealLength: 150,
      tone: 'engaging',
      hashtagLimit: 10,
      emojisRecommended: true
    },
    pinterest: {
      maxLength: 500,
      idealLength: 200,
      tone: 'descriptive',
      hashtagLimit: 20,
      emojisRecommended: false
    },
    linkedin: {
      maxLength: 3000,
      idealLength: 400,
      tone: 'professional',
      hashtagLimit: 3,
      emojisRecommended: false
    }
  } as const;

  /**
   * Style-specific messaging approaches
   */
  private static readonly STYLE_APPROACHES = {
    professional: {
      vocabulary: ['enhance', 'support', 'optimize', 'advance', 'deliver'],
      tone: 'authoritative and trustworthy',
      structure: 'benefit-first with supporting details'
    },
    casual: {
      vocabulary: ['boost', 'feel', 'love', 'enjoy', 'experience'],
      tone: 'friendly and approachable',
      structure: 'conversational with personal connection'
    },
    wellness: {
      vocabulary: ['nourish', 'restore', 'balance', 'revitalize', 'nurture'],
      tone: 'mindful and inspiring',
      structure: 'holistic benefits with lifestyle integration'
    },
    luxury: {
      vocabulary: ['indulge', 'transform', 'elevate', 'refine', 'pamper'],
      tone: 'sophisticated and aspirational',
      structure: 'premium experience with exclusive benefits'
    }
  } as const;

  /**
   * Category-specific compliance disclaimers
   */
  private static readonly COMPLIANCE_DISCLAIMERS = {
    nutrition: 'These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure or prevent any disease.',
    beauty: 'Individual results may vary. Use as directed.',
    home: 'Follow label instructions for best results.',
    personal_care: 'Individual results may vary. Use as directed.',
    other: 'Individual results may vary.'
  } as const;

  /**
   * Category-specific hashtag sets
   */
  private static readonly CATEGORY_HASHTAGS = {
    nutrition: ['#WellnessJourney', '#HealthyLiving', '#NutritionSupport', '#AmwayWellness', '#HealthGoals'],
    beauty: ['#BeautyRoutine', '#SkincareGoals', '#GlowUp', '#AmwayBeauty', '#SelfCare'],
    home: ['#CleanLiving', '#HomeWellness', '#EcoFriendly', '#AmwayHome', '#CleanHome'],
    personal_care: ['#SelfCare', '#WellnessRoutine', '#HealthyChoices', '#AmwayLife', '#Wellness'],
    other: ['#AmwayLife', '#QualityProducts', '#WellnessJourney', '#HealthyLiving', '#Lifestyle']
  } as const;

  /**
   * Generates marketing copy for a specific image and platform
   */
  generateCopy(
    product: StoredProduct,
    preferences: CampaignPreferences,
    imageFormat: string,
    options?: Partial<CopyGenerationOptions>
  ): MarketingCopy {

    const platform = this.mapFormatToPlatform(imageFormat);
    const config = MarketingCopyGenerator.PLATFORM_SPECS[platform];
    const styleApproach = MarketingCopyGenerator.STYLE_APPROACHES[preferences.brand_style];

    const copyOptions: CopyGenerationOptions = {
      platform,
      style: preferences.brand_style,
      focusArea: 'benefits',
      includeHashtags: platform !== 'linkedin',
      includeEmojis: config.emojisRecommended,
      ...options
    };

    // Generate the main copy text with Phase 1c preferences
    const mainText = this.generateMainText(product, styleApproach, copyOptions, config, preferences);

    // Generate hashtags
    const hashtags = copyOptions.includeHashtags
      ? this.generateHashtags(product, platform, config.hashtagLimit)
      : [];

    // Generate call to action
    const callToAction = this.generateCallToAction(preferences.brand_style, platform);

    // Get compliance disclaimer
    const disclaimer = this.getComplianceDisclaimer(product.category);

    // Combine all elements
    let fullText = mainText;

    if (callToAction) {
      fullText += `\n\n${callToAction}`;
    }

    if (hashtags.length > 0) {
      fullText += `\n\n${hashtags.join(' ')}`;
    }

    if (disclaimer) {
      fullText += `\n\n${disclaimer}`;
    }

    // Ensure we're within platform limits
    if (fullText.length > config.maxLength) {
      fullText = this.truncateGracefully(fullText, config.maxLength);
    }

    return {
      text: fullText,
      hashtags,
      callToAction,
      disclaimer,
      platform,
      totalLength: fullText.length
    };
  }

  /**
   * Maps image format to social media platform
   */
  private mapFormatToPlatform(format: string): 'facebook' | 'instagram' | 'pinterest' | 'linkedin' {
    const mapping = {
      'facebook_post': 'facebook',
      'instagram_post': 'instagram',
      'instagram_story': 'instagram',
      'pinterest': 'pinterest',
      'linkedin_post': 'linkedin',
      'snapchat_ad': 'instagram' // Treat Snapchat like Instagram
    } as const;

    return mapping[format as keyof typeof mapping] || 'facebook';
  }

  // Phase 1c - Helper methods to adjust copy based on new preferences
  private getVisualFocusCopyAdjustment(visualFocus?: string): string {
    if (!visualFocus) return '';

    const adjustments: Record<string, string> = {
      outcome_lifestyle: 'Experience the transformation in your everyday life.',
      outcome_environmental: 'See the results in the spaces around you.',
      outcome_conceptual: 'Imagine the possibilities for your wellness journey.',
      outcome_natural: 'Feel the natural difference in every aspect of your life.',
      mixed_outcomes: 'Discover your path to better wellness.'
    };

    return adjustments[visualFocus] || '';
  }

  private getMoodAdjustment(moodProfile?: string): string {
    if (!moodProfile) return '';

    const adjustments: Record<string, string> = {
      energetic: 'Feel the energy and vitality!',
      serene: 'Find your perfect balance and peace.',
      confident: 'Step into your confident, radiant self.',
      aspirational: 'Unlock your full potential today.',
      professional: 'Trust in proven quality and results.'
    };

    return adjustments[moodProfile] || '';
  }

  /**
   * Generates the main marketing text
   */
  private generateMainText(
    product: StoredProduct,
    styleApproach: typeof MarketingCopyGenerator.STYLE_APPROACHES[keyof typeof MarketingCopyGenerator.STYLE_APPROACHES],
    options: CopyGenerationOptions,
    config: typeof MarketingCopyGenerator.PLATFORM_SPECS[keyof typeof MarketingCopyGenerator.PLATFORM_SPECS],
    preferences?: CampaignPreferences
  ): string {

    const benefits = this.extractBenefits(product.benefits || '');
    const productName = product.name;
    const brand = product.brand || 'Amway';

    // Choose a style-appropriate verb
    const actionVerb = styleApproach.vocabulary[Math.floor(Math.random() * styleApproach.vocabulary.length)];

    // Phase 1c - Get preference-based adjustments
    const visualFocusAdjustment = preferences ? this.getVisualFocusCopyAdjustment(preferences.visualFocus) : '';
    const moodAdjustment = preferences ? this.getMoodAdjustment(preferences.moodProfile) : '';

    let opening: string;
    let body: string;

    switch (options.style) {
      case 'professional':
        opening = `${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)} your wellness journey with ${productName}.`;
        body = this.generateProfessionalBody(benefits, brand);
        break;

      case 'casual':
        opening = options.includeEmojis
          ? `✨ Ready to ${actionVerb} how you feel? ${productName} is here to help!`
          : `Ready to ${actionVerb} how you feel? ${productName} is here to help!`;
        body = this.generateCasualBody(benefits, options.includeEmojis);
        break;

      case 'wellness':
        opening = options.includeEmojis
          ? `🌿 ${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)} your body naturally with ${productName}.`
          : `${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)} your body naturally with ${productName}.`;
        body = this.generateWellnessBody(benefits, options.includeEmojis);
        break;

      case 'luxury':
        opening = `${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)} your daily routine with the premium quality of ${productName}.`;
        body = this.generateLuxuryBody(benefits, brand);
        break;

      default:
        opening = `Discover what ${productName} can do for you.`;
        body = this.generateGenericBody(benefits);
    }

    // Combine opening and body, ensuring we stay within ideal length
    let combined = `${opening} ${body}`;

    // Phase 1c - Add mood adjustment if there's room
    if (moodAdjustment && combined.length + moodAdjustment.length < config.idealLength * 1.2) {
      combined = `${combined} ${moodAdjustment}`;
    }

    if (combined.length > config.idealLength * 1.2) {
      // Trim to essential elements if too long
      combined = `${opening} ${benefits[0] || 'Experience the difference today.'}`;
      // Try to add mood adjustment to trimmed version if it fits
      if (moodAdjustment && combined.length + moodAdjustment.length < config.idealLength * 1.2) {
        combined = `${combined} ${moodAdjustment}`;
      }
    }

    return combined;
  }

  /**
   * Extracts and formats benefits from product benefits string
   */
  private extractBenefits(benefitsText: string): string[] {
    if (!benefitsText) return ['Experience the difference', 'Support your wellness goals'];

    return benefitsText
      .split(/[.,;]/)
      .map(benefit => benefit.trim())
      .filter(benefit => benefit.length > 10)
      .slice(0, 3)
      .map(benefit => benefit.charAt(0).toUpperCase() + benefit.slice(1));
  }

  private generateProfessionalBody(benefits: string[], brand: string): string {
    const primaryBenefit = benefits[0] || 'Support your wellness goals';
    return `Designed to ${primaryBenefit.toLowerCase()}, this premium ${brand} product delivers results you can trust.`;
  }

  private generateCasualBody(benefits: string[], includeEmojis: boolean): string {
    const primaryBenefit = benefits[0] || 'feel amazing';
    const emoji = includeEmojis ? ' 💪' : '';
    return `Perfect for those days when you want to ${primaryBenefit.toLowerCase()}.${emoji} Who else is ready to make positive changes?`;
  }

  private generateWellnessBody(benefits: string[], includeEmojis: boolean): string {
    const primaryBenefit = benefits[0] || 'support your wellness journey';
    const emoji = includeEmojis ? ' 🌱' : '';
    return `When you choose to ${primaryBenefit.toLowerCase()}, you're choosing to invest in yourself.${emoji} Your future self will thank you.`;
  }

  private generateLuxuryBody(benefits: string[], brand: string): string {
    const primaryBenefit = benefits[0] || 'elevate your daily routine';
    return `Experience the sophisticated difference that comes with ${primaryBenefit.toLowerCase()}. ${brand} - where quality meets innovation.`;
  }

  private generateGenericBody(benefits: string[]): string {
    const primaryBenefit = benefits[0] || 'Support your goals';
    return `${primaryBenefit}. Join thousands who have already made the change.`;
  }

  /**
   * Generates appropriate hashtags based on product category and platform
   */
  private generateHashtags(product: StoredProduct, platform: string, limit: number): string[] {
    const category = product.category as keyof typeof MarketingCopyGenerator.CATEGORY_HASHTAGS;
    const baseHashtags = MarketingCopyGenerator.CATEGORY_HASHTAGS[category] || MarketingCopyGenerator.CATEGORY_HASHTAGS.other;

    // Platform-specific hashtags
    const platformHashtags = {
      facebook: ['#SmallBusiness', '#Entrepreneur'],
      instagram: ['#Lifestyle', '#SelfCare', '#Motivation'],
      pinterest: ['#Inspiration', '#Wellness', '#HealthyLife'],
      linkedin: ['#Entrepreneurship', '#QualityOfLife']
    };

    const platformSpecific = platformHashtags[platform as keyof typeof platformHashtags] || [];

    // Combine and limit
    const combined = [...baseHashtags, ...platformSpecific];
    return combined.slice(0, limit);
  }

  /**
   * Generates call to action based on style and platform
   */
  private generateCallToAction(style: string, platform: string): string {
    const ctas = {
      professional: {
        facebook: 'Learn more about how this can support your goals.',
        instagram: 'DM for more info! 👆',
        pinterest: 'Save for later and start your journey.',
        linkedin: 'Connect with me to learn more about quality wellness products.'
      },
      casual: {
        facebook: 'Who wants to try this with me? 🙋‍♀️',
        instagram: 'Tag a friend who needs this! ➡️',
        pinterest: 'Pin this for your wellness board! 📌',
        linkedin: 'Reach out if you want to learn more!'
      },
      wellness: {
        facebook: 'Ready to take the next step in your wellness journey?',
        instagram: 'Your wellness journey starts now ✨',
        pinterest: 'Save to start your wellness transformation.',
        linkedin: 'Let\'s discuss your wellness goals.'
      },
      luxury: {
        facebook: 'Experience premium quality for yourself.',
        instagram: 'Elevate your routine today ✨',
        pinterest: 'Discover luxury wellness.',
        linkedin: 'Invest in premium quality.'
      }
    };

    const styleCtAs = ctas[style as keyof typeof ctas] || ctas.professional;
    return styleCtAs[platform as keyof typeof styleCtAs] || 'Learn more today.';
  }

  /**
   * Gets compliance disclaimer for product category
   */
  private getComplianceDisclaimer(category: string | undefined): string {
    if (!category) return MarketingCopyGenerator.COMPLIANCE_DISCLAIMERS.other;

    const key = category.toLowerCase() as keyof typeof MarketingCopyGenerator.COMPLIANCE_DISCLAIMERS;
    return MarketingCopyGenerator.COMPLIANCE_DISCLAIMERS[key] || MarketingCopyGenerator.COMPLIANCE_DISCLAIMERS.other;
  }

  /**
   * Truncates text gracefully while preserving structure
   */
  private truncateGracefully(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // Try to cut at sentence boundaries
    const sentences = text.split(/[.!?]\s+/);
    let result = '';

    for (const sentence of sentences) {
      const potential = result + sentence + '. ';
      if (potential.length > maxLength - 50) break; // Leave room for disclaimer
      result = potential;
    }

    // If still too long, cut at word boundaries
    if (result.length > maxLength) {
      const words = result.split(' ');
      result = '';
      for (const word of words) {
        const potential = result + word + ' ';
        if (potential.length > maxLength - 20) break; // Leave room
        result = potential;
      }
      result = result.trim() + '...';
    }

    return result.trim();
  }

  /**
   * Generates copy for multiple images in a campaign
   */
  generateCampaignCopy(
    product: StoredProduct,
    preferences: CampaignPreferences,
    imageFormats: string[]
  ): Map<string, MarketingCopy> {
    const copyMap = new Map<string, MarketingCopy>();

    // Vary focus areas to create diverse copy
    const focusAreas: Array<CopyGenerationOptions['focusArea']> = ['benefits', 'lifestyle', 'transformation', 'community'];

    imageFormats.forEach((format, index) => {
      const focusArea = focusAreas[index % focusAreas.length];
      const copy = this.generateCopy(product, preferences, format, {
        focusArea,
        // Vary emoji usage for diversity
        includeEmojis: index % 2 === 0 && MarketingCopyGenerator.PLATFORM_SPECS[this.mapFormatToPlatform(format)].emojisRecommended
      });

      // Use format as key (not format_index) since we generate one image per format
      copyMap.set(format, copy);
    });

    return copyMap;
  }
}