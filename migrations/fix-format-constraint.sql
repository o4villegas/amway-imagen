-- Migration: Fix image format constraint to support both old and new formats
-- Date: 2025-09-25
-- Issue: Database constraint only allows old formats, causing INSERT failures with new format system
--
-- Production Impact:
-- - 7 failed campaigns due to constraint violations
-- - 500/503 errors from database INSERT failures
-- - 25 existing images use old formats (must preserve)
--
-- Solution: Update constraint to support all formats (old + new)

-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table
-- First, create backup of existing data
CREATE TABLE generated_images_backup AS SELECT * FROM generated_images;

-- Drop the existing table
DROP TABLE generated_images;

-- Recreate table with updated format constraint supporting both old and new formats
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
    marketing_copy TEXT,
    image_data BLOB,
    file_path TEXT,
    r2_path TEXT,
    width INTEGER,
    height INTEGER,
    selected BOOLEAN DEFAULT 0,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
);

-- Restore all existing data from backup
INSERT INTO generated_images (
    id, campaign_id, format, prompt, marketing_copy, image_data,
    file_path, r2_path, width, height, selected, generated_at
) SELECT
    id, campaign_id, format, prompt, marketing_copy, image_data,
    file_path, r2_path, width, height, selected, generated_at
FROM generated_images_backup;

-- Recreate indexes for performance
CREATE INDEX IF NOT EXISTS idx_images_campaign ON generated_images(campaign_id);
CREATE INDEX IF NOT EXISTS idx_images_format ON generated_images(format);

-- Clean up backup table
DROP TABLE generated_images_backup;

-- Verify migration success
-- This should return 7 distinct formats now (old + new)
-- SELECT 'Migration verification - supported formats:' as info;
-- SELECT DISTINCT 'Supported: ' || format as formats FROM (
--     SELECT 'instagram_post' as format UNION ALL
--     SELECT 'instagram_story' UNION ALL
--     SELECT 'facebook_cover' UNION ALL
--     SELECT 'pinterest' UNION ALL
--     SELECT 'facebook_post' UNION ALL
--     SELECT 'snapchat_ad' UNION ALL
--     SELECT 'linkedin_post'
-- );