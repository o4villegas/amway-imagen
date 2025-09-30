-- Migration: Add preferences_json column for comprehensive preference storage
-- Date: 2025-09-26
-- Purpose: Store all campaign preferences (including new Phase 1c fields) as JSON for full reproducibility

-- Add preferences_json column to campaigns table
ALTER TABLE campaigns ADD COLUMN preferences_json TEXT;

-- Backfill existing campaigns with their current preference data
UPDATE campaigns
SET preferences_json = json_object(
  'campaign_type', campaign_type,
  'brand_style', brand_style,
  'color_scheme', color_scheme,
  'text_overlay', text_overlay,
  'campaign_size', campaign_size,
  'image_formats', json(image_formats)
)
WHERE preferences_json IS NULL;