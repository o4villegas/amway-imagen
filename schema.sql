-- D1 Database Schema for Amway Image Campaign Generator

-- Products table - stores scraped product information
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_url TEXT UNIQUE NOT NULL,
    amway_product_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    benefits TEXT,
    category TEXT,
    brand TEXT,
    price REAL,
    currency TEXT DEFAULT 'USD',
    main_image_url TEXT,
    inventory_status TEXT,
    available BOOLEAN DEFAULT 1, -- Whether product is available for campaigns
    scraping_method TEXT DEFAULT 'claude-api', -- How the product was scraped
    cached_until DATETIME, -- Cache expiration for scraped data
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table - stores user campaign configurations
CREATE TABLE campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('product_focus', 'lifestyle')),
    brand_style TEXT NOT NULL CHECK (brand_style IN ('professional', 'casual', 'wellness', 'luxury')),
    color_scheme TEXT NOT NULL CHECK (color_scheme IN ('amway_brand', 'product_inspired', 'custom')),
    text_overlay TEXT NOT NULL CHECK (text_overlay IN ('minimal', 'moderate', 'heavy')),
    campaign_size INTEGER NOT NULL CHECK (campaign_size = 5),
    image_formats TEXT NOT NULL, -- JSON array of selected formats
    preferences_json TEXT, -- Full preferences object for reproducibility (Phase 1c)
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'awaiting_approval')),
    download_url TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (product_id) REFERENCES products (id)
);

-- Generated images table - tracks individual images in campaigns
CREATE TABLE generated_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('instagram_post', 'instagram_story', 'facebook_cover', 'pinterest')),
    prompt TEXT NOT NULL,
    marketing_copy TEXT, -- AI-generated marketing copy for each image
    image_data BLOB,
    file_path TEXT,
    r2_path TEXT, -- R2 storage path
    width INTEGER,
    height INTEGER,
    selected BOOLEAN DEFAULT 0, -- Whether image is selected in preview
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
);

-- Campaign history for analytics
CREATE TABLE campaign_stats (
    date DATE PRIMARY KEY NOT NULL,
    total_campaigns INTEGER DEFAULT 0,
    successful_campaigns INTEGER DEFAULT 0,
    failed_campaigns INTEGER DEFAULT 0,
    total_images_generated INTEGER DEFAULT 0,
    avg_generation_time_seconds REAL
) WITHOUT ROWID;

-- Create indexes for performance
CREATE INDEX idx_products_url ON products(product_url);
CREATE INDEX idx_products_amway_id ON products(amway_product_id);
CREATE INDEX idx_products_scraping_method ON products(scraping_method);
CREATE INDEX idx_products_cached_until ON products(cached_until);
CREATE INDEX idx_campaigns_product ON campaigns(product_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created ON campaigns(created_at);
CREATE INDEX idx_images_campaign ON generated_images(campaign_id);
CREATE INDEX idx_images_format ON generated_images(format);
CREATE INDEX idx_images_selected ON generated_images(selected);

-- Insert initial data for testing
INSERT INTO campaign_stats (date, total_campaigns, successful_campaigns, failed_campaigns, total_images_generated, avg_generation_time_seconds)
VALUES (DATE('now'), 0, 0, 0, 0, 0.0);