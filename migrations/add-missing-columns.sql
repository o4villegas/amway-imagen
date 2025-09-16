-- Add missing columns to generated_images table
-- These columns are required by the codebase but missing from current schema

ALTER TABLE generated_images ADD COLUMN r2_path TEXT;
ALTER TABLE generated_images ADD COLUMN selected BOOLEAN DEFAULT 1;