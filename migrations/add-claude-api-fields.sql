-- Migration: Add Claude API scraping and marketing copy fields
-- Date: 2024-12-19
-- Description: Adds fields for Claude API scraping, caching, and marketing copy generation

-- Add scraping method and caching fields to products table
ALTER TABLE products ADD COLUMN scraping_method TEXT DEFAULT 'legacy';
ALTER TABLE products ADD COLUMN cached_until DATETIME;

-- Update existing products to use legacy scraping method
UPDATE products SET scraping_method = 'legacy' WHERE scraping_method IS NULL;

-- Add marketing copy field to generated_images table
ALTER TABLE generated_images ADD COLUMN marketing_copy TEXT;

-- Add selected field for image selection in preview
ALTER TABLE generated_images ADD COLUMN selected BOOLEAN DEFAULT 0;

-- Add r2_path field for R2 storage paths
ALTER TABLE generated_images ADD COLUMN r2_path TEXT;

-- Create indexes for new fields
CREATE INDEX idx_products_scraping_method ON products(scraping_method);
CREATE INDEX idx_products_cached_until ON products(cached_until);
CREATE INDEX idx_images_selected ON generated_images(selected);

-- Create a view for cache statistics
CREATE VIEW cache_stats AS
SELECT
    COUNT(*) as total_cached_products,
    COUNT(CASE WHEN cached_until > datetime('now') THEN 1 END) as valid_cached_products,
    COUNT(CASE WHEN cached_until <= datetime('now') THEN 1 END) as expired_cached_products,
    AVG(CASE WHEN cached_until > datetime('now')
        THEN (julianday(cached_until) - julianday('now')) * 24
        END) as avg_hours_remaining
FROM products
WHERE scraping_method = 'claude-api'
    AND cached_until IS NOT NULL;