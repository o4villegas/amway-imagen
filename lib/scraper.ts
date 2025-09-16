// Product scraping utilities for Amway website

import { USER_AGENTS } from './config';

export interface ScrapedProduct {
  amway_product_id: string;
  name: string;
  description: string;
  benefits: string;
  category: string;
  brand: string;
  price: number | null;
  currency: string;
  main_image_url: string | null;
  inventory_status: string;
}

export function validateAmwayURL(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname.replace('www.', '');

    // Only allow amway.com for now
    if (!domain.endsWith('amway.com')) {
      return false;
    }

    // Check for product URL pattern: /p/[product-id] or /en_US/...-p-[product-id]
    const pathname = parsedUrl.pathname;
    return pathname.includes('/p/') || !!pathname.match(/-p-\d+/);
  } catch {
    return false;
  }
}

export function extractProductId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;

    // Extract from /p/123456 format
    const directMatch = pathname.match(/\/p\/(\d+)/);
    if (directMatch) {
      return directMatch[1];
    }

    // Extract from /-p-123456 format
    const suffixMatch = pathname.match(/-p-(\d+)/);
    if (suffixMatch) {
      return suffixMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

export class AmwayProductScraper {
  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }
  private cleanHtmlDescription(htmlText: string): string {
    // Remove HTML tags and decode entities
    return htmlText
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractJsonLD(html: string): any | null {
    try {
      const jsonLDRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      const matches = Array.from(html.matchAll(jsonLDRegex));

      for (const match of matches) {
        try {
          const jsonData = JSON.parse(match[1]);

          // Look for Product type
          if (jsonData['@type'] === 'Product') {
            return jsonData;
          }

          // Look for ItemList with Product items
          if (jsonData['@type'] === 'ItemList' && jsonData.itemListElement) {
            for (const item of jsonData.itemListElement) {
              if (item['@type'] === 'Product' || item['@type'] === 'Thing') {
                return item;
              }
            }
          }
        } catch (parseError) {
          continue;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private extractUtagData(html: string): any | null {
    try {
      const utagRegex = /window\.utag_data\s*=\s*({.*?});/;
      const match = html.match(utagRegex);

      if (match) {
        return JSON.parse(match[1]);
      }

      return null;
    } catch {
      return null;
    }
  }

  private extractMetaData(html: string): Partial<ScrapedProduct> {
    const result: Partial<ScrapedProduct> = {};

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      result.name = titleMatch[1]
        .replace(/\s+/g, ' ') // Normalize whitespace first
        .trim()
        .split(/\s*[|]\s*/)[0] // Take everything before first pipe
        .split(/\s*[-–]\s*/)[0] // Take everything before first dash
        .replace(/&trade;/g, '™')
        .replace(/&reg;/g, '®')
        .trim();
    }

    // Extract description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    if (descMatch) {
      result.description = descMatch[1].trim();
    }

    // Extract OG image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
    if (ogImageMatch) {
      result.main_image_url = ogImageMatch[1];
    }

    return result;
  }

  async scrapeProduct(url: string): Promise<ScrapedProduct> {
    if (!validateAmwayURL(url)) {
      throw new Error('Invalid Amway product URL');
    }

    const productId = extractProductId(url);
    if (!productId) {
      throw new Error('Could not extract product ID from URL');
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Try JSON-LD first (most reliable)
      const jsonLD = this.extractJsonLD(html);
      const utagData = this.extractUtagData(html);
      const metaData = this.extractMetaData(html);

      // Combine data sources, prioritizing JSON-LD
      const result: ScrapedProduct = {
        amway_product_id: productId,
        name: '',
        description: '',
        benefits: '',
        category: '',
        brand: '',
        price: null,
        currency: 'USD',
        main_image_url: null,
        inventory_status: 'unknown'
      };

      // Extract from JSON-LD
      if (jsonLD) {
        result.name = jsonLD.name || result.name;
        result.description = jsonLD.description ? this.cleanHtmlDescription(jsonLD.description) : result.description;
        result.brand = jsonLD.brand?.name || jsonLD.brand || result.brand;
        result.main_image_url = jsonLD.image || result.main_image_url;

        if (jsonLD.offers?.price || jsonLD.price) {
          const priceStr = jsonLD.offers?.price || jsonLD.price;
          const priceMatch = priceStr.toString().match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            result.price = parseFloat(priceMatch[0].replace(/,/g, ''));
          }
        }

        result.currency = jsonLD.offers?.priceCurrency || jsonLD.priceCurrency || result.currency;
      }

      // Extract from utag_data
      if (utagData) {
        if (!result.name && utagData.product_name?.[0]) {
          result.name = utagData.product_name[0];
        }
        if (!result.brand && utagData.product_brand?.[0]) {
          result.brand = utagData.product_brand[0];
        }
        if (utagData.product_inventoryStatus?.[0]) {
          result.inventory_status = utagData.product_inventoryStatus[0];
        }
      }

      // Fill in from meta data
      if (!result.name && metaData.name) {
        result.name = metaData.name;
      }
      if (!result.description && metaData.description) {
        result.description = metaData.description;
      }
      if (!result.main_image_url && metaData.main_image_url) {
        result.main_image_url = metaData.main_image_url;
      }

      // Extract benefits from description (simple heuristic)
      if (result.description) {
        const benefits = result.description
          .split(/[.!]/)
          .filter(sentence =>
            sentence.toLowerCase().includes('benefit') ||
            sentence.toLowerCase().includes('support') ||
            sentence.toLowerCase().includes('help') ||
            sentence.toLowerCase().includes('promote')
          )
          .slice(0, 3) // Take first 3 benefit sentences
          .join('. ');

        if (benefits) {
          result.benefits = benefits.trim();
        }
      }

      // Determine category from brand or product name
      if (result.brand?.toLowerCase().includes('nutrilite') ||
          result.name?.toLowerCase().includes('nutrilite')) {
        result.category = 'nutrition';
      } else if (result.name?.toLowerCase().includes('beauty') ||
                 result.name?.toLowerCase().includes('skin')) {
        result.category = 'beauty';
      } else if (result.name?.toLowerCase().includes('home') ||
                 result.name?.toLowerCase().includes('clean')) {
        result.category = 'home';
      } else {
        result.category = 'other';
      }

      // Validate required fields
      if (!result.name) {
        throw new Error('Could not extract product name');
      }

      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: The Amway website took too long to respond');
      }
      throw new Error(`Failed to scrape product: ${error.message}`);
    }
  }
}