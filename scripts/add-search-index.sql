-- Add GIN index for faster text search on recipes
-- This improves performance for ILIKE queries on title and description

-- Create GIN index on title for pattern matching
CREATE INDEX IF NOT EXISTS idx_recipes_title_gin
ON recipes USING gin (title gin_trgm_ops);

-- Create GIN index on description for pattern matching
CREATE INDEX IF NOT EXISTS idx_recipes_description_gin
ON recipes USING gin (description gin_trgm_ops);

-- Enable the pg_trgm extension if not already enabled (required for gin_trgm_ops)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optional: Add a compound GIN index for searching both fields
-- This can speed up queries that search title OR description
CREATE INDEX IF NOT EXISTS idx_recipes_search_gin
ON recipes USING gin ((title || ' ' || COALESCE(description, '')) gin_trgm_ops);
