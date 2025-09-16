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
    // Scraping is deprecated in favor of pre-loaded product data
    throw new Error('Direct product scraping is no longer supported. Please use pre-loaded product data or manual entry.');
  }
}
