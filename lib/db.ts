// Database utilities for D1

export interface ScrapedProduct {
  amway_product_id?: string;
  name: string;
  description: string;
  benefits: string;
  category: string;
  brand?: string;
  price?: number | null;
  currency?: string;
  main_image_url?: string | null;
  inventory_status?: string;
}

export interface StoredProduct extends ScrapedProduct {
  id: number;
  available: boolean;
  product_url: string;
  scraped_at: string;
  updated_at: string;
  cached_until?: string;
}

export interface Campaign {
  id?: number;
  product_id: number;
  campaign_type: 'product_focus' | 'lifestyle';
  brand_style: 'professional' | 'casual' | 'wellness' | 'luxury';
  color_scheme: 'amway_brand' | 'product_inspired' | 'custom';
  campaign_size: 1 | 3 | 5 | 10 | 15;
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
  format: 'facebook_post' | 'instagram_post' | 'pinterest' | 'snapchat_ad' | 'linkedin_post';
  prompt: string;
  file_path?: string;
  r2_path?: string;
  width: number;
  height: number;
  selected?: boolean;
  marketing_copy?: string;
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
            available = ?,
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
          (productData as any).available !== undefined ? (productData as any).available : true,
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
            inventory_status,
            available
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          productData.inventory_status,
          (productData as any).available !== undefined ? (productData as any).available : true
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
          campaign_size,
          image_formats,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        campaign.product_id,
        campaign.campaign_type,
        campaign.brand_style,
        campaign.color_scheme,
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
          selected,
          marketing_copy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        image.campaign_id,
        image.format,
        image.prompt,
        image.file_path || null,
        image.r2_path || null,
        image.width,
        image.height,
        image.selected !== undefined ? image.selected : true,
        image.marketing_copy || null
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

  async getAllProducts(): Promise<StoredProduct[]> {
    try {
      const results = await this.db.prepare(
        'SELECT * FROM products ORDER BY updated_at DESC'
      ).all();

      return results.results as unknown as StoredProduct[];
    } catch (error) {
      console.error('Error getting all products:', error);
      return [];
    }
  }

  // Caching methods for Claude API scraping

  async getCachedProduct(url: string): Promise<StoredProduct | null> {
    try {
      const result = await this.db.prepare(
        'SELECT * FROM products WHERE product_url = ? AND cached_until > datetime("now")'
      ).bind(url).first();

      return result as StoredProduct | null;
    } catch (error) {
      console.error('Error getting cached product:', error);
      return null;
    }
  }

  async saveProductWithCache(url: string, productData: ScrapedProduct, expiresAt: Date): Promise<StoredProduct> {
    try {
      // Check if product exists
      const existing = await this.getProduct(url);

      if (existing) {
        // Update existing product with new cache expiry
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
            available = ?,
            scraping_method = 'claude-api',
            cached_until = ?,
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
          (productData as any).available !== undefined ? (productData as any).available : true,
          expiresAt.toISOString(),
          url
        ).run();

        return await this.getProduct(url) as StoredProduct;
      } else {
        // Insert new product with cache expiry
        console.log(`[DB] Attempting to insert new product with ID: ${productData.amway_product_id}`);
        console.log(`[DB] Product URL: ${url}`);
        console.log(`[DB] Product Name: ${productData.name}`);

        let result;

        try {
          // First try to delete any existing entry to avoid conflicts
          await this.db.prepare('DELETE FROM products WHERE product_url = ?').bind(url).run();

          result = await this.db.prepare(`
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
              inventory_status,
              available,
              scraping_method,
              cached_until
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'claude-api', ?)
          `).bind(
            url,
            productData.amway_product_id,
            productData.name,
            productData.description,
            productData.benefits,
            productData.category,
            productData.brand,
            productData.price,
            productData.currency,
            productData.main_image_url,
            productData.inventory_status,
            (productData as any).available !== undefined ? (productData as any).available : true,
            expiresAt.toISOString()
          ).run();

          console.log(`[DB] INSERT result:`, JSON.stringify(result, null, 2));
        } catch (insertError) {
          console.error(`[DB] INSERT failed with error:`, insertError);
          throw new Error(`Database INSERT failed: ${insertError}`);
        }

        if (result.success) {
          console.log(`[DB] Successfully upserted product with changes: ${result.meta?.changes}, last_row_id: ${result.meta?.last_row_id}`);
          const retrieved = await this.getProduct(url);
          console.log(`[DB] Retrieved product after upsert:`, retrieved ? `Found: ID ${retrieved.id}` : 'Not found');
          if (retrieved) {
            return retrieved;
          } else {
            throw new Error(`UPSERT succeeded but product retrieval failed - URL mismatch issue`);
          }
        } else {
          console.error(`[DB] UPSERT failed - result.success is false`);
          throw new Error(`Failed to upsert cached product to database: ${JSON.stringify(result)}`);
        }
      }
    } catch (error) {
      console.error('Error saving product with cache:', error);
      throw error;
    }
  }

  async deleteCachedProduct(url: string): Promise<void> {
    try {
      await this.db.prepare(
        'UPDATE products SET cached_until = NULL WHERE product_url = ?'
      ).bind(url).run();
    } catch (error) {
      console.error('Error invalidating cached product:', error);
      throw error;
    }
  }

  async getCacheStats(): Promise<{ totalCached: number; validEntries: number; expiredEntries: number }> {
    try {
      const total = await this.db.prepare(
        'SELECT COUNT(*) as count FROM products WHERE scraping_method = "claude-api"'
      ).first();

      const valid = await this.db.prepare(
        'SELECT COUNT(*) as count FROM products WHERE scraping_method = "claude-api" AND cached_until > datetime("now")'
      ).first();

      const expired = await this.db.prepare(
        'SELECT COUNT(*) as count FROM products WHERE scraping_method = "claude-api" AND cached_until <= datetime("now")'
      ).first();

      return {
        totalCached: (total as any)?.count || 0,
        validEntries: (valid as any)?.count || 0,
        expiredEntries: (expired as any)?.count || 0
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalCached: 0, validEntries: 0, expiredEntries: 0 };
    }
  }

  async cleanupExpiredCache(): Promise<number> {
    try {
      const result = await this.db.prepare(
        'DELETE FROM products WHERE scraping_method = "claude-api" AND cached_until <= datetime("now")'
      ).run();

      return result.meta?.changes || 0;
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
      return 0;
    }
  }
}