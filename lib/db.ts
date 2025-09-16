// Database utilities for D1

import { ScrapedProduct } from './scraper';

export interface StoredProduct extends ScrapedProduct {
  id: number;
  product_url: string;
  scraped_at: string;
  updated_at: string;
}

export interface Campaign {
  id?: number;
  product_id: number;
  campaign_type: 'product_focus' | 'lifestyle';
  brand_style: 'professional' | 'casual' | 'wellness' | 'luxury';
  color_scheme: 'amway_brand' | 'product_inspired' | 'custom';
  text_overlay: 'minimal' | 'moderate' | 'heavy';
  campaign_size: 5 | 10 | 15;
  image_formats: string[]; // Will be stored as JSON
  status?: 'pending' | 'generating' | 'completed' | 'failed';
  download_url?: string;
  expires_at?: string;
  created_at?: string;
  completed_at?: string;
}

export interface GeneratedImage {
  id?: number;
  campaign_id: number;
  format: 'instagram_post' | 'instagram_story' | 'facebook_cover' | 'pinterest';
  prompt: string;
  file_path?: string;
  r2_path?: string;
  width: number;
  height: number;
  selected?: boolean;
  generated_at?: string;
}

export class DatabaseManager {
  constructor(private db: D1Database) {}

  async getProduct(productUrl: string): Promise<StoredProduct | null> {
    try {
      const result = await this.db.prepare(
        'SELECT * FROM products WHERE product_url = ?'
      ).bind(productUrl).first();

      return result as StoredProduct | null;
    } catch (error) {
      console.error('Error getting product:', error);
      return null;
    }
  }

  async getProductById(id: number): Promise<StoredProduct | null> {
    try {
      const result = await this.db.prepare(
        'SELECT * FROM products WHERE id = ?'
      ).bind(id).first();

      return result as StoredProduct | null;
    } catch (error) {
      console.error('Error getting product by ID:', error);
      return null;
    }
  }

  async saveProduct(productUrl: string, productData: ScrapedProduct): Promise<StoredProduct> {
    try {
      // Check if product already exists
      const existing = await this.getProduct(productUrl);
      if (existing) {
        // Update existing product
        await this.db.prepare(`
          UPDATE products SET
            name = ?,
            description = ?,
            benefits = ?,
            category = ?,
            brand = ?,
            price = ?,
            currency = ?,
            main_image_url = ?,
            inventory_status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE product_url = ?
        `).bind(
          productData.name,
          productData.description,
          productData.benefits,
          productData.category,
          productData.brand,
          productData.price,
          productData.currency,
          productData.main_image_url,
          productData.inventory_status,
          productUrl
        ).run();

        return await this.getProduct(productUrl) as StoredProduct;
      } else {
        // Insert new product
        const result = await this.db.prepare(`
          INSERT INTO products (
            product_url,
            amway_product_id,
            name,
            description,
            benefits,
            category,
            brand,
            price,
            currency,
            main_image_url,
            inventory_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          productUrl,
          productData.amway_product_id,
          productData.name,
          productData.description,
          productData.benefits,
          productData.category,
          productData.brand,
          productData.price,
          productData.currency,
          productData.main_image_url,
          productData.inventory_status
        ).run();

        if (result.success) {
          return await this.getProduct(productUrl) as StoredProduct;
        } else {
          throw new Error('Failed to save product to database');
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      throw error;
    }
  }

  async createCampaign(campaign: Campaign): Promise<number> {
    try {
      const result = await this.db.prepare(`
        INSERT INTO campaigns (
          product_id,
          campaign_type,
          brand_style,
          color_scheme,
          text_overlay,
          campaign_size,
          image_formats,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        campaign.product_id,
        campaign.campaign_type,
        campaign.brand_style,
        campaign.color_scheme,
        campaign.text_overlay,
        campaign.campaign_size,
        JSON.stringify(campaign.image_formats),
        'pending'
      ).run();

      if (result.success && result.meta.last_row_id) {
        return result.meta.last_row_id as number;
      } else {
        throw new Error('Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  async getCampaign(id: number): Promise<Campaign | null> {
    try {
      const result = await this.db.prepare(
        'SELECT * FROM campaigns WHERE id = ?'
      ).bind(id).first();

      if (result) {
        return {
          ...result as any,
          image_formats: JSON.parse(result.image_formats as string)
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting campaign:', error);
      return null;
    }
  }

  async updateCampaignStatus(
    id: number,
    status: Campaign['status'],
    downloadUrl?: string,
    expiresAt?: string
  ): Promise<void> {
    try {
      let query = 'UPDATE campaigns SET status = ?';
      const params: any[] = [status];

      if (downloadUrl) {
        query += ', download_url = ?';
        params.push(downloadUrl);
      }

      if (expiresAt) {
        query += ', expires_at = ?';
        params.push(expiresAt);
      }

      if (status === 'completed') {
        query += ', completed_at = CURRENT_TIMESTAMP';
      }

      query += ' WHERE id = ?';
      params.push(id);

      await this.db.prepare(query).bind(...params).run();
    } catch (error) {
      console.error('Error updating campaign status:', error);
      throw error;
    }
  }

  async saveGeneratedImage(image: GeneratedImage): Promise<void> {
    try {
      await this.db.prepare(`
        INSERT INTO generated_images (
          campaign_id,
          format,
          prompt,
          file_path,
          r2_path,
          width,
          height,
          selected
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        image.campaign_id,
        image.format,
        image.prompt,
        image.file_path || null,
        image.r2_path || null,
        image.width,
        image.height,
        image.selected !== undefined ? image.selected : true
      ).run();
    } catch (error) {
      console.error('Error saving generated image:', error);
      throw error;
    }
  }

  async getCampaignImages(campaignId: number): Promise<GeneratedImage[]> {
    try {
      const results = await this.db.prepare(
        'SELECT * FROM generated_images WHERE campaign_id = ? ORDER BY generated_at ASC'
      ).bind(campaignId).all();

      return results.results as unknown as GeneratedImage[];
    } catch (error) {
      console.error('Error getting campaign images:', error);
      return [];
    }
  }

  async getUserCampaigns(limit: number = 20): Promise<Array<Campaign & { product: StoredProduct }>> {
    try {
      const results = await this.db.prepare(`
        SELECT
          c.*,
          p.name as product_name,
          p.brand as product_brand,
          p.main_image_url as product_image
        FROM campaigns c
        JOIN products p ON c.product_id = p.id
        ORDER BY c.created_at DESC
        LIMIT ?
      `).bind(limit).all();

      return results.results.map((row: any) => ({
        ...row,
        image_formats: JSON.parse(row.image_formats),
        product: {
          id: row.product_id,
          name: row.product_name,
          brand: row.product_brand,
          main_image_url: row.product_image
        }
      })) as any;
    } catch (error) {
      console.error('Error getting user campaigns:', error);
      return [];
    }
  }

  async updateImageSelection(imageId: number, selected: boolean): Promise<void> {
    try {
      await this.db.prepare(
        'UPDATE generated_images SET selected = ? WHERE id = ?'
      ).bind(selected, imageId).run();
    } catch (error) {
      console.error('Error updating image selection:', error);
      throw error;
    }
  }

  async updateCampaignStats(
    successful: boolean,
    imagesGenerated: number,
    generationTimeSeconds: number
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Insert or update today's stats
      await this.db.prepare(`
        INSERT INTO campaign_stats (
          date,
          total_campaigns,
          successful_campaigns,
          failed_campaigns,
          total_images_generated,
          avg_generation_time_seconds
        ) VALUES (?, 1, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
          total_campaigns = total_campaigns + 1,
          successful_campaigns = successful_campaigns + ?,
          failed_campaigns = failed_campaigns + ?,
          total_images_generated = total_images_generated + ?,
          avg_generation_time_seconds = (
            (avg_generation_time_seconds * (total_campaigns - 1) + ?) / total_campaigns
          )
      `).bind(
        today,
        successful ? 1 : 0,
        successful ? 0 : 1,
        imagesGenerated,
        generationTimeSeconds,
        successful ? 1 : 0,
        successful ? 0 : 1,
        imagesGenerated,
        generationTimeSeconds
      ).run();
    } catch (error) {
      console.error('Error updating campaign stats:', error);
      // Don't throw - stats are non-critical
    }
  }
}