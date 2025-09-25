// Claude API integration for robust Amway product extraction
// Replaces HTMLRewriter with AI-powered scraping

export interface ProductExtractionResult {
  name: string;
  description: string;
  benefits: string[];
  category: string;
  brand: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  confidence: number;
}

export interface ScrapingError {
  type: 'fetch_failed' | 'extraction_failed' | 'invalid_url' | 'rate_limited' | 'timeout';
  message: string;
  retryable: boolean;
}

export class ClaudeProductScraper {
  private readonly CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
  private readonly MAX_RETRIES = 2;
  private readonly TIMEOUT_MS = 30000;

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('Claude API key is required');
    }
  }

  /**
   * Validates if the URL is a supported Amway product page
   */
  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const validHostnames = ['www.amway.com', 'amway.com'];

      if (!validHostnames.includes(parsedUrl.hostname)) {
        return false;
      }

      // Support multiple Amway URL patterns:
      // 1. https://www.amway.com/en_US/Product-Name-p-ProductID
      // 2. https://www.amway.com/en_US/p/ProductID (legacy format)
      // 3. https://www.amway.com/en_US/product/ProductID
      const pathname = parsedUrl.pathname;

      return pathname.includes('-p-') ||           // New format: Product-Name-p-ProductID
             pathname.includes('/p/') ||           // Legacy format: /p/ProductID
             pathname.includes('/product/');       // Alternative format
    } catch {
      return false;
    }
  }

  /**
   * Fetches the HTML content from Amway product page
   * Uses headers from successful test to avoid blocking
   */
  private async fetchProductPage(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
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
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      if (html.length < 1000) {
        throw new Error('Retrieved page content is too short, may be blocked or redirected');
      }

      return html;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout after 30 seconds');
        }
        throw error;
      }
      throw new Error('Unknown error during fetch');
    }
  }

  /**
   * Extracts product information using Claude API
   */
  private async extractWithClaude(html: string, url: string): Promise<ProductExtractionResult> {
    const prompt = `You are an expert product data extractor. Extract information from this Amway product page HTML.

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

    try {
      const response = await fetch(this.CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json() as { content?: Array<{ text: string }> };
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error('No response from Claude API');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not find JSON in Claude response');
      }

      const extracted = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!extracted.name || !extracted.description || !extracted.category) {
        throw new Error('Missing required fields in extraction');
      }

      // Ensure benefits is an array
      if (!Array.isArray(extracted.benefits)) {
        extracted.benefits = [];
      }

      // Set confidence based on data quality
      extracted.confidence = this.calculateConfidence(extracted);

      return extracted as ProductExtractionResult;

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Rate limit')) {
          throw error; // Re-throw rate limit errors
        }
        throw new Error(`Claude extraction failed: ${error.message}`);
      }
      throw new Error('Unknown error during Claude extraction');
    }
  }

  /**
   * Calculates confidence score based on extracted data quality
   */
  private calculateConfidence(extracted: any): number {
    let score = 0.5; // Base score

    // Name quality
    if (extracted.name && extracted.name.length > 10) score += 0.1;
    if (extracted.name && extracted.name.includes('™')) score += 0.05;

    // Description quality
    if (extracted.description && extracted.description.length > 50) score += 0.1;
    if (extracted.description && extracted.description.length > 150) score += 0.1;

    // Benefits quality
    if (extracted.benefits && extracted.benefits.length >= 3) score += 0.1;
    if (extracted.benefits && extracted.benefits.length >= 5) score += 0.05;

    // Brand recognition
    const validBrands = ['Nutrilite', 'Artistry', 'eSpring', 'Legacy of Clean', 'XS'];
    if (extracted.brand && validBrands.includes(extracted.brand)) score += 0.1;

    // Price availability
    if (extracted.price && extracted.price > 0) score += 0.05;

    return Math.min(score, 0.99); // Cap at 99%
  }

  /**
   * Main scraping method with retry logic and error handling
   */
  async scrapeProduct(url: string): Promise<ProductExtractionResult> {
    if (!this.validateUrl(url)) {
      const error: ScrapingError = {
        type: 'invalid_url',
        message: 'Please enter a valid Amway product URL (e.g., https://www.amway.com/en_US/p/123456)',
        retryable: false
      };
      throw error;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`[AI_SCRAPER] Attempt ${attempt}/${this.MAX_RETRIES} for ${url}`);

        // Stage 1: Fetch product page
        const html = await this.fetchProductPage(url);
        console.log(`[AI_SCRAPER] Fetched ${html.length} characters of HTML`);

        // Stage 2: Extract with Claude API
        const result = await this.extractWithClaude(html, url);
        console.log(`[AI_SCRAPER] Extraction complete with ${result.confidence} confidence`);

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`[AI_SCRAPER] Attempt ${attempt} failed:`, lastError.message);

        // Don't retry for certain errors
        if (lastError.message.includes('Rate limit') ||
            lastError.message.includes('invalid_url') ||
            attempt === this.MAX_RETRIES) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[AI_SCRAPER] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    if (lastError) {
      let errorType: ScrapingError['type'] = 'extraction_failed';

      if (lastError.message.includes('timeout')) {
        errorType = 'timeout';
      } else if (lastError.message.includes('Rate limit')) {
        errorType = 'rate_limited';
      } else if (lastError.message.includes('HTTP') || lastError.message.includes('fetch')) {
        errorType = 'fetch_failed';
      }

      const scrapingError: ScrapingError = {
        type: errorType,
        message: this.getErrorMessage(errorType, lastError.message),
        retryable: errorType !== 'rate_limited'
      };

      throw scrapingError;
    }

    throw new Error('Unknown scraping failure');
  }

  /**
   * Gets user-friendly error messages
   */
  private getErrorMessage(type: ScrapingError['type'], originalMessage: string): string {
    switch (type) {
      case 'invalid_url':
        return 'Please enter a valid Amway product URL (e.g., https://www.amway.com/en_US/p/123456)';
      case 'fetch_failed':
        return 'Unable to access this product page. Please try a different product or check if the URL is correct.';
      case 'extraction_failed':
        return 'Could not extract product information. Please verify this is a product page and try again.';
      case 'timeout':
        return 'Request took too long. Please try again.';
      case 'rate_limited':
        return 'Too many requests. Please wait a few minutes before trying again.';
      default:
        return 'An error occurred while processing the product. Please try again.';
    }
  }
}

// Rate limiting utility for scraping endpoints
export class ScrapingRateLimiter {
  private requests = new Map<string, number[]>();
  private readonly LIMIT_PER_HOUR = 10;
  private readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour

  checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Remove old requests outside the window
    const recentRequests = userRequests.filter(timestamp => now - timestamp < this.WINDOW_MS);

    if (recentRequests.length >= this.LIMIT_PER_HOUR) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(userId, recentRequests);

    return true;
  }

  getRemainingRequests(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    const recentRequests = userRequests.filter(timestamp => now - timestamp < this.WINDOW_MS);

    return Math.max(0, this.LIMIT_PER_HOUR - recentRequests.length);
  }
}