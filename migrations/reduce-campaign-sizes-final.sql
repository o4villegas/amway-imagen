-- Migration: Update campaign_size constraint to (1, 3, 5)
-- For development testing, let's just recreate the table with all data

-- Drop the existing campaigns table
DROP TABLE IF EXISTS campaigns;

-- Create new table with updated constraint
CREATE TABLE campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('product_focus', 'lifestyle')),
    brand_style TEXT NOT NULL CHECK (brand_style IN ('professional', 'casual', 'wellness', 'luxury')),
    color_scheme TEXT NOT NULL CHECK (color_scheme IN ('amway_brand', 'product_inspired', 'custom')),
    text_overlay TEXT NOT NULL CHECK (text_overlay IN ('minimal', 'moderate', 'heavy')),
    campaign_size INTEGER NOT NULL CHECK (campaign_size IN (1, 3, 5)),
    image_formats TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    download_url TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    name TEXT,
    session_identifier TEXT,
    FOREIGN KEY (product_id) REFERENCES products (id)
);

-- Recreate indexes
CREATE INDEX idx_campaigns_product ON campaigns(product_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created ON campaigns(created_at);

-- Note: Run with: wrangler d1 execute DB --local --file=./migrations/reduce-campaign-sizes-final.sql