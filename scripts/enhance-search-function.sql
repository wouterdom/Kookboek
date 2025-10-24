-- Enhanced search function for recipes
-- Searches across title, description, source, and categories

-- Enable required extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add index for source_name and source_normalized fields
CREATE INDEX IF NOT EXISTS idx_recipes_source_name_gin
ON recipes USING gin (source_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_recipes_source_normalized_gin
ON recipes USING gin (source_normalized gin_trgm_ops);

-- Add index for category names
CREATE INDEX IF NOT EXISTS idx_categories_name_gin
ON categories USING gin (name gin_trgm_ops);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS search_recipes(text, uuid[], boolean, integer, integer);

-- Create enhanced search function
CREATE OR REPLACE FUNCTION search_recipes(
  search_term text DEFAULT '',
  category_ids uuid[] DEFAULT NULL,
  favorites_only boolean DEFAULT false,
  page_limit integer DEFAULT 24,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  description text,
  content_markdown text,
  prep_time integer,
  cook_time integer,
  servings_default integer,
  difficulty text,
  image_url text,
  source_name text,
  source_normalized text,
  source_url text,
  is_favorite boolean,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    r.id,
    r.title,
    r.slug,
    r.description,
    r.content_markdown,
    r.prep_time,
    r.cook_time,
    r.servings_default,
    r.difficulty,
    r.image_url,
    r.source_name,
    r.source_normalized,
    r.source_url,
    r.is_favorite,
    r.created_at,
    r.updated_at
  FROM recipes r
  LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
  LEFT JOIN categories c ON rc.category_id = c.id
  WHERE
    -- Search filter: search in title, description, source_name, source_normalized, and category names
    (
      search_term = '' OR
      r.title ILIKE '%' || search_term || '%' OR
      r.description ILIKE '%' || search_term || '%' OR
      r.source_name ILIKE '%' || search_term || '%' OR
      r.source_normalized ILIKE '%' || search_term || '%' OR
      c.name ILIKE '%' || search_term || '%'
    )
    -- Category filter
    AND (
      category_ids IS NULL OR
      rc.category_id = ANY(category_ids)
    )
    -- Favorites filter
    AND (
      favorites_only = false OR
      r.is_favorite = true
    )
  ORDER BY r.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_recipes TO authenticated, anon;

-- Create a count function for pagination
DROP FUNCTION IF EXISTS count_search_recipes(text, uuid[], boolean);

CREATE OR REPLACE FUNCTION count_search_recipes(
  search_term text DEFAULT '',
  category_ids uuid[] DEFAULT NULL,
  favorites_only boolean DEFAULT false
)
RETURNS bigint AS $$
DECLARE
  result_count bigint;
BEGIN
  SELECT COUNT(DISTINCT r.id) INTO result_count
  FROM recipes r
  LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
  LEFT JOIN categories c ON rc.category_id = c.id
  WHERE
    -- Search filter: search in title, description, source_name, source_normalized, and category names
    (
      search_term = '' OR
      r.title ILIKE '%' || search_term || '%' OR
      r.description ILIKE '%' || search_term || '%' OR
      r.source_name ILIKE '%' || search_term || '%' OR
      r.source_normalized ILIKE '%' || search_term || '%' OR
      c.name ILIKE '%' || search_term || '%'
    )
    -- Category filter
    AND (
      category_ids IS NULL OR
      rc.category_id = ANY(category_ids)
    )
    -- Favorites filter
    AND (
      favorites_only = false OR
      r.is_favorite = true
    );

  RETURN result_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION count_search_recipes TO authenticated, anon;
