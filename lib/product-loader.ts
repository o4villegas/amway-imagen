// Product data loader utility for processing external product data
import { ScrapedProduct, StoredProduct, DatabaseManager } from './db';

export interface RawProductData {
  filename: string;
  title: string;
  description: string;
  imagePath?: string;
  imageBuffer?: ArrayBuffer;
}

export class ProductLoader {
  constructor(private db: DatabaseManager, private bucket: R2Bucket) {}

  parseProductFile(textContent: string, filename: string): RawProductData {
    const lines = textContent.split('\n').filter(line => line.trim());

    // Extract title (first line with "Title:" or first non-empty line)
    const titleLine = lines.find(line => line.startsWith('Title:')) || lines[0];
    const title = titleLine?.replace('Title:', '').trim() || filename.replace('.txt', '');

    // Extract description (lines after "Description:" or all other lines)
    const descriptionStart = lines.findIndex(line => line.startsWith('Description:'));
    let description = '';

    if (descriptionStart >= 0) {
      description = lines
        .slice(descriptionStart)
        .join(' ')
        .replace('Description:', '')
        .trim();
    } else {
      // Use all lines except title as description
      description = lines.slice(1).join(' ').trim();
    }

    return {
      filename,
      title,
      description
    };
  }

  async uploadImageToR2(imageBuffer: ArrayBuffer, filename: string): Promise<string> {
    // Always use base64 for product images to avoid R2 dependency
    // This ensures images work immediately without needing R2 bucket setup
    const base64 = Buffer.from(imageBuffer).toString('base64');
    return `data:${this.getContentType(filename)};base64,${base64}`;
  }

  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      default: return 'image/png';
    }
  }

  mapToStoredProduct(rawData: RawProductData, imageUrl?: string): ScrapedProduct {
    // Generate product ID from filename
    const productId = this.generateProductId(rawData.filename);

    // Determine category from title/description
    const category = this.categorizeProduct(rawData.title, rawData.description);

    // Extract brand from title
    const brand = this.extractBrand(rawData.title);

    // Generate synthetic URL
    const productUrl = `https://www.amway.com/p/${productId}`;

    return {
      amway_product_id: productId,
      name: rawData.title,
      description: rawData.description,
      benefits: this.extractBenefits(rawData.description),
      category,
      brand,
      price: null, // Will be set manually or from future data
      currency: 'USD',
      main_image_url: imageUrl || null,
      inventory_status: 'in_stock'
    };
  }

  private generateProductId(filename: string): string {
    // Create consistent product ID from filename
    const base = filename.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return base.substring(0, 6).padEnd(6, '0');
  }

  private categorizeProduct(title: string, description: string): string {
    const text = (title + ' ' + description).toLowerCase();

    if (text.includes('nutrilite') || text.includes('vitamin') || text.includes('supplement')) {
      return 'nutrition';
    }
    if (text.includes('artistry') || text.includes('foundation') || text.includes('beauty')) {
      return 'beauty';
    }
    if (text.includes('espring') || text.includes('water') || text.includes('purifier') || text.includes('home')) {
      return 'home';
    }
    return 'other';
  }

  private extractBrand(title: string): string {
    // Extract brand names from title
    if (title.toLowerCase().includes('nutrilite')) return 'Nutrilite';
    if (title.toLowerCase().includes('artistry')) return 'Artistry';
    if (title.toLowerCase().includes('espring')) return 'eSpring';
    return 'Amway';
  }

  private extractBenefits(description: string): string {
    // Extract benefit statements from description
    const sentences = description.split(/[.!]/).filter(s => s.trim().length > 10);
    const benefitKeywords = ['support', 'help', 'promote', 'improve', 'enhance', 'provide', 'designed', 'made'];

    const benefits = sentences
      .filter(sentence =>
        benefitKeywords.some(keyword =>
          sentence.toLowerCase().includes(keyword)
        )
      )
      .slice(0, 3)
      .map(s => s.trim())
      .join('. ');

    return benefits || description.split('.')[0] || '';
  }

  async loadProduct(textContent: string, filename: string, imageBuffer?: ArrayBuffer): Promise<StoredProduct> {
    // Parse text data
    const rawData = this.parseProductFile(textContent, filename);

    // Upload image if provided
    let imageUrl: string | undefined;
    if (imageBuffer) {
      const imageName = filename.replace('.txt', '.png'); // Assume PNG for now
      imageUrl = await this.uploadImageToR2(imageBuffer, imageName);
    }

    // Map to product format
    const productData = this.mapToStoredProduct(rawData, imageUrl);

    // Generate synthetic URL for this product
    const productUrl = `https://www.amway.com/p/${productData.amway_product_id}`;

    // Save to database
    const storedProduct = await this.db.saveProduct(productUrl, productData);

    return storedProduct;
  }

  async loadProductBatch(products: Array<{
    textContent: string;
    filename: string;
    imageBuffer?: ArrayBuffer;
  }>): Promise<StoredProduct[]> {
    const results: StoredProduct[] = [];

    for (const product of products) {
      try {
        const stored = await this.loadProduct(
          product.textContent,
          product.filename,
          product.imageBuffer
        );
        results.push(stored);
        console.log(`Loaded product: ${stored.name}`);
      } catch (error) {
        console.error(`Failed to load product ${product.filename}:`, error);
        throw error;
      }
    }

    return results;
  }
}