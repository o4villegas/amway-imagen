-- Migration: Add 'awaiting_approval' status to campaigns table
-- Date: 2025-09-26
-- Purpose: Support preview workflow where campaigns await user approval before packaging

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints directly
-- We need to recreate the table with the new constraint

-- Step 0: Disable foreign key constraints temporarily
PRAGMA foreign_keys = OFF;

-- Step 1: Create new table with updated constraint
CREATE TABLE campaigns_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('product_focus', 'lifestyle')),
    brand_style TEXT NOT NULL CHECK (brand_style IN ('professional', 'casual', 'wellness', 'luxury')),
    color_scheme TEXT NOT NULL CHECK (color_scheme IN ('amway_brand', 'product_inspired', 'custom')),
    text_overlay TEXT NOT NULL CHECK (text_overlay IN ('minimal', 'moderate', 'heavy')),
    campaign_size INTEGER NOT NULL CHECK (campaign_size = 5),
    image_formats TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'awaiting_approval')),
    download_url TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (product_id) REFERENCES products (id)
);

-- Step 2: Copy existing data
INSERT INTO campaigns_new SELECT * FROM campaigns;

-- Step 3: Drop old table
DROP TABLE campaigns;

-- Step 4: Rename new table
ALTER TABLE campaigns_new RENAME TO campaigns;

-- Step 5: Recreate indexes
CREATE INDEX idx_campaigns_product ON campaigns(product_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created ON campaigns(created_at);

-- Step 6: Re-enable foreign key constraints
PRAGMA foreign_keys = ON;