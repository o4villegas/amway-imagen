-- Migration: Fix image format constraint for production database
-- Date: 2025-09-25
-- Issue: Database constraint only allows old formats, causing INSERT failures
--
-- Production has these columns only:
-- id, campaign_id, format, prompt, image_data, file_path, width, height, generated_at, r2_path, selected

-- Create backup of existing data
CREATE TABLE generated_images_backup AS SELECT * FROM generated_images;

-- Drop the existing table
DROP TABLE generated_images;

-- Recreate table with updated format constraint (matching production structure exactly)
CREATE TABLE generated_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    format TEXT NOT NULL CHECK (format IN (
        -- Old formats (preserve existing data)
        'instagram_post', 'instagram_story', 'facebook_cover', 'pinterest',
        -- New formats (enable current code)
        'facebook_post', 'snapchat_ad', 'linkedin_post'
    )),
    prompt TEXT NOT NULL,
    image_data BLOB,
    file_path TEXT,
    width INTEGER,
    height INTEGER,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    r2_path TEXT,
    selected BOOLEAN DEFAULT 1,
    FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
);

-- Restore all existing data from backup (exact column match)
INSERT INTO generated_images (
    id, campaign_id, format, prompt, image_data, file_path,
    width, height, generated_at, r2_path, selected
) SELECT
    id, campaign_id, format, prompt, image_data, file_path,
    width, height, generated_at, r2_path, selected
FROM generated_images_backup;

-- Recreate indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_campaign ON generated_images(campaign_id);
CREATE INDEX IF NOT EXISTS idx_images_format ON generated_images(format);

-- Clean up backup table
DROP TABLE generated_images_backup;