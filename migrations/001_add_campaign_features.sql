-- Migration: Add campaign management features
-- Date: 2025-09-15

-- Add campaign name field
ALTER TABLE campaigns ADD COLUMN name TEXT;

-- Add session identifier for tracking user campaigns
ALTER TABLE campaigns ADD COLUMN session_identifier TEXT;

-- Add selected field to track which images user wants in final ZIP
ALTER TABLE generated_images ADD COLUMN selected BOOLEAN DEFAULT 1;

-- Add R2 storage path for individual images
ALTER TABLE generated_images ADD COLUMN r2_path TEXT;

-- Index for efficient campaign counting per session
CREATE INDEX IF NOT EXISTS idx_campaigns_session ON campaigns(session_identifier, created_at);

-- Index for finding images by campaign
CREATE INDEX IF NOT EXISTS idx_images_campaign ON generated_images(campaign_id);