-- Migration: Update campaign_size constraint to allow 1, 3, 5, 10, 15
-- Since SQLite/D1 doesn't support modifying CHECK constraints directly,
-- we need to recreate the table with the new constraint

-- Create temporary table with updated constraint
CREATE TABLE campaigns_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('product_focus', 'lifestyle')),
    brand_style TEXT NOT NULL CHECK (brand_style IN ('professional', 'casual', 'wellness', 'luxury')),
    color_scheme TEXT NOT NULL CHECK (color_scheme IN ('amway_brand', 'product_inspired', 'custom')),
    text_overlay TEXT NOT NULL CHECK (text_overlay IN ('minimal', 'moderate', 'heavy')),
    campaign_size INTEGER NOT NULL CHECK (campaign_size IN (1, 3, 5, 10, 15)),
    image_formats TEXT NOT NULL, -- JSON array of selected formats
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    download_url TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (product_id) REFERENCES products (id)
);

-- Copy existing data
INSERT INTO campaigns_new
SELECT * FROM campaigns;

-- Drop old table
DROP TABLE campaigns;

-- Rename new table
ALTER TABLE campaigns_new RENAME TO campaigns;

-- Recreate indexes
CREATE INDEX idx_campaigns_product ON campaigns(product_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created ON campaigns(created_at);