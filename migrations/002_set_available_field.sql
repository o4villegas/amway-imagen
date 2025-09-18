-- Migration: Set available=true for all existing products
-- This ensures backward compatibility for products created before the available field was added

-- Update all existing products to be available by default
-- The schema already has 'available BOOLEAN DEFAULT 1' but existing data may not have this set
UPDATE products
SET available = 1
WHERE available IS NULL OR available != 1;

-- Verify the update worked
-- This will help with debugging if needed
-- Note: Comment out in production if you don't want the output
-- SELECT COUNT(*) as total_products,
--        SUM(CASE WHEN available = 1 THEN 1 ELSE 0 END) as available_products,
--        SUM(CASE WHEN available = 0 THEN 1 ELSE 0 END) as unavailable_products
-- FROM products;

-- Usage: wrangler d1 execute DB --local --file=./migrations/002_set_available_field.sql
-- Or for production: wrangler d1 execute DB --file=./migrations/002_set_available_field.sql