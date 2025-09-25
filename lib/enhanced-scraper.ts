// Enhanced multi-source product information extractor
// Uses Claude to intelligently gather product information from multiple sources

export interface EnhancedProductInfo {
  name: string;
  description: string;
  benefits: string[];
  category: string;
  brand: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  sources: string[];
  confidence: number;
}

export class EnhancedProductScraper {
  private claudeApiKey: string;
  private readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string) {
    this.claudeApiKey = apiKey;
  }

  /**
   * Extract product ID from Amway URL
   */
  private extractProductId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Match patterns like /p/110244 or Product-Name-p-110244
      const patterns = [
        /\/p\/(\d+)/,           // /p/110244
        /-p-(\d+)$/,            // Product-Name-p-110244
        /product\/(\d+)/,       // /product/110244
      ];

      for (const pattern of patterns) {
        const match = pathname.match(pattern);
        if (match) {
          return match[1];
        }
      }

      // Try to extract from the full URL
      const fullMatch = url.match(/(\d{5,6})/);
      if (fullMatch) {
        return fullMatch[1];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Search for product information using Claude's knowledge
   */
  async searchProductInfo(url: string): Promise<EnhancedProductInfo> {
    const productId = this.extractProductId(url);

    console.log(`[ENHANCED_SCRAPER] Searching for product info - URL: ${url}, Product ID: ${productId}`);

    const searchPrompt = `You are a product research assistant. I need information about an Amway product.

Product URL: ${url}
${productId ? `Product ID: ${productId}` : ''}

Based on your knowledge, please provide information about this Amway product. Search your knowledge for:
1. Amway product catalogs and descriptions
2. Product reviews and descriptions from various sources
3. Nutritional or beauty product databases
4. Health and wellness product information

If you can identify the product from the URL or product ID, provide detailed information.
If the specific product is unclear, provide information about similar Amway products or the likely product category.

Return a JSON object with these fields:
{
  "name": "Full product name with brand",
  "description": "Detailed product description (at least 100 words)",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3", "At least 3-5 benefits"],
  "category": "One of: nutrition, beauty, home, personal_care, other",
  "brand": "Nutrilite, Artistry, eSpring, Legacy of Clean, XS, or Amway",
  "price": estimated price in USD or null,
  "currency": "USD",
  "imageUrl": null,
  "sources": ["Knowledge base", "Product databases"],
  "confidence": 0.1 to 1.0 based on certainty
}

Focus on providing accurate, helpful information even if you need to make educated inferences based on the product ID or URL pattern.`;

    try {
      const response = await fetch(this.CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          temperature: 0.3, // Lower temperature for more consistent factual responses
          messages: [{
            role: 'user',
            content: searchPrompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error('No response from Claude API');
      }

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse product information from response');
      }

      const productInfo = JSON.parse(jsonMatch[0]);

      // Validate and enhance the response
      if (!productInfo.name || !productInfo.description) {
        throw new Error('Incomplete product information received');
      }

      // Ensure arrays and set defaults
      productInfo.benefits = Array.isArray(productInfo.benefits) ? productInfo.benefits : [];
      productInfo.sources = productInfo.sources || ['Claude knowledge base'];
      productInfo.confidence = productInfo.confidence || 0.7;

      console.log(`[ENHANCED_SCRAPER] Successfully extracted: ${productInfo.name} (${productInfo.confidence} confidence)`);

      return productInfo as EnhancedProductInfo;

    } catch (error) {
      console.error('[ENHANCED_SCRAPER] Search failed:', error);

      // Fallback: Try to generate generic product info based on ID
      if (productId) {
        return this.generateFallbackProductInfo(productId);
      }

      throw error;
    }
  }

  /**
   * Generate fallback product information based on product ID patterns
   */
  private generateFallbackProductInfo(productId: string): EnhancedProductInfo {
    // Common Amway product ID patterns
    const idPrefix = productId.substring(0, 2);

    let category = 'other';
    let brand = 'Amway';
    let productType = 'Product';

    // Guess category based on ID patterns (these are examples)
    if (productId.startsWith('11') || productId.startsWith('10')) {
      category = 'nutrition';
      brand = 'Nutrilite';
      productType = 'Nutritional Supplement';
    } else if (productId.startsWith('12')) {
      category = 'beauty';
      brand = 'Artistry';
      productType = 'Beauty Product';
    } else if (productId.startsWith('13')) {
      category = 'home';
      brand = 'Legacy of Clean';
      productType = 'Home Care Product';
    }

    return {
      name: `${brand} ${productType} #${productId}`,
      description: `This ${brand} ${productType} is part of Amway's premium product line. While specific details are being retrieved, this product is designed to deliver exceptional quality and results that Amway is known for worldwide.`,
      benefits: [
        'Premium quality ingredients',
        'Scientifically formulated',
        'Backed by Amway\'s quality guarantee',
        'Trusted by millions worldwide'
      ],
      category,
      brand,
      price: undefined,
      currency: 'USD',
      imageUrl: undefined,
      sources: ['Product ID analysis'],
      confidence: 0.3
    };
  }

  /**
   * Attempt web search for product information (future enhancement)
   */
  async searchWebForProduct(productId: string, productName?: string): Promise<any> {
    // This could be enhanced to search other sources like:
    // - Google Shopping API
    // - Product review sites
    // - Social media mentions
    // - IBO websites

    console.log(`[ENHANCED_SCRAPER] Web search placeholder for: ${productName || productId}`);

    // For now, return null to indicate no additional data found
    return null;
  }

  /**
   * Main extraction method that tries multiple strategies
   */
  async extractProductInfo(url: string): Promise<EnhancedProductInfo> {
    console.log(`[ENHANCED_SCRAPER] Starting multi-strategy extraction for: ${url}`);

    try {
      // Strategy 1: Use Claude's knowledge base
      const claudeInfo = await this.searchProductInfo(url);

      if (claudeInfo.confidence > 0.5) {
        return claudeInfo;
      }

      // Strategy 2: If confidence is low, try web search (future)
      const productId = this.extractProductId(url);
      if (productId) {
        const webInfo = await this.searchWebForProduct(productId, claudeInfo.name);
        if (webInfo) {
          // Merge information from multiple sources
          return {
            ...claudeInfo,
            ...webInfo,
            sources: [...claudeInfo.sources, ...webInfo.sources],
            confidence: Math.max(claudeInfo.confidence, webInfo.confidence)
          };
        }
      }

      // Return Claude's best effort even with lower confidence
      return claudeInfo;

    } catch (error) {
      console.error('[ENHANCED_SCRAPER] All strategies failed:', error);

      // Last resort: Generate basic info from URL
      const productId = this.extractProductId(url);
      if (productId) {
        return this.generateFallbackProductInfo(productId);
      }

      throw new Error('Unable to extract product information from any source');
    }
  }
}

// Example usage wrapper for the API route
export async function enhancedProductLookup(
  url: string,
  claudeApiKey: string
): Promise<EnhancedProductInfo> {
  const scraper = new EnhancedProductScraper(claudeApiKey);
  return await scraper.extractProductInfo(url);
}