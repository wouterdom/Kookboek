-- Migration: Type gerecht → Gang system with fixed categories
-- Version: 2025-10-24-gang-system
-- Description:
--   1. Add is_system column to categories
--   2. Rename "Type gerecht" to "Gang"
--   3. Remove "Snack" category
--   4. Add "Amuse" category
--   5. Mark all gang categories as system categories
--   6. Merge duplicate Chloé publishers

-- ============================================================
-- STEP 1: Add is_system column to categories table
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories'
    AND column_name = 'is_system'
  ) THEN
    ALTER TABLE categories ADD COLUMN is_system BOOLEAN DEFAULT false NOT NULL;
    RAISE NOTICE 'Added is_system column to categories';
  ELSE
    RAISE NOTICE 'Column is_system already exists';
  END IF;
END $$;

-- ============================================================
-- STEP 2: Rename "Type gerecht" → "Gang"
-- ============================================================
UPDATE category_types
SET
  name = 'Gang',
  slug = 'gang',
  description = 'Gang van het gerecht: Amuse, Voorgerecht, Soep, Hoofdgerecht, Dessert'
WHERE slug = 'type-gerecht';

-- ============================================================
-- STEP 3: Get the Gang category type ID (for next steps)
-- ============================================================
DO $$
DECLARE
  gang_type_id UUID;
  amuse_id UUID;
  snack_id UUID;
  chloe_correct_id UUID;
  chloe_duplicate_id UUID;
BEGIN
  -- Get gang type ID
  SELECT id INTO gang_type_id
  FROM category_types
  WHERE slug = 'gang';

  IF gang_type_id IS NULL THEN
    RAISE EXCEPTION 'Gang category type not found';
  END IF;

  RAISE NOTICE 'Gang type ID: %', gang_type_id;

  -- ============================================================
  -- STEP 4: Remove "Snack" category
  -- ============================================================
  SELECT id INTO snack_id
  FROM categories
  WHERE slug = 'snack' AND type_id = gang_type_id;

  IF snack_id IS NOT NULL THEN
    -- Remove all recipe links to Snack
    DELETE FROM recipe_categories WHERE category_id = snack_id;

    -- Remove Snack category
    DELETE FROM categories WHERE id = snack_id;

    RAISE NOTICE 'Removed Snack category and its links';
  ELSE
    RAISE NOTICE 'Snack category not found, skipping';
  END IF;

  -- ============================================================
  -- STEP 5: Add "Amuse" category if missing
  -- ============================================================
  SELECT id INTO amuse_id
  FROM categories
  WHERE slug = 'amuse' AND type_id = gang_type_id;

  IF amuse_id IS NULL THEN
    INSERT INTO categories (name, slug, type_id, is_system, color, order_index)
    VALUES ('Amuse', 'amuse', gang_type_id, true, '#a855f7', 1)
    RETURNING id INTO amuse_id;

    RAISE NOTICE 'Created Amuse category with ID: %', amuse_id;
  ELSE
    RAISE NOTICE 'Amuse category already exists';
  END IF;

  -- ============================================================
  -- STEP 6: Mark all gang categories as system categories
  -- ============================================================
  UPDATE categories
  SET
    is_system = true,
    order_index = CASE name
      WHEN 'Amuse' THEN 1
      WHEN 'Voorgerecht' THEN 2
      WHEN 'Soep' THEN 3
      WHEN 'Hoofdgerecht' THEN 4
      WHEN 'Dessert' THEN 5
      ELSE order_index
    END
  WHERE type_id = gang_type_id
    AND name IN ('Amuse', 'Voorgerecht', 'Soep', 'Hoofdgerecht', 'Dessert', 'Bijgerecht');

  RAISE NOTICE 'Marked gang categories as system and set order';

  -- ============================================================
  -- STEP 7: Merge duplicate Chloé publishers
  -- ============================================================
  -- Find the correct Chloé Kookt (with accent)
  SELECT id INTO chloe_correct_id
  FROM categories
  WHERE name = 'Chloé Kookt'
  LIMIT 1;

  -- Find duplicate without accent
  SELECT id INTO chloe_duplicate_id
  FROM categories
  WHERE name = 'Chloekookt'
  LIMIT 1;

  IF chloe_correct_id IS NULL AND chloe_duplicate_id IS NOT NULL THEN
    -- No correct one exists, rename the duplicate
    UPDATE categories
    SET name = 'Chloé Kookt', slug = 'chloe-kookt'
    WHERE id = chloe_duplicate_id;

    RAISE NOTICE 'Renamed Chloekookt to Chloé Kookt';
  ELSIF chloe_correct_id IS NOT NULL AND chloe_duplicate_id IS NOT NULL THEN
    -- Both exist, merge them
    -- Move all recipes from duplicate to correct
    UPDATE recipe_categories
    SET category_id = chloe_correct_id
    WHERE category_id = chloe_duplicate_id;

    -- Delete duplicate
    DELETE FROM categories WHERE id = chloe_duplicate_id;

    RAISE NOTICE 'Merged Chloekookt into Chloé Kookt';
  ELSE
    RAISE NOTICE 'Chloé publisher cleanup: nothing to do';
  END IF;

END $$;

-- ============================================================
-- STEP 8: Update order_index for category types
-- ============================================================
UPDATE category_types
SET order_index = CASE slug
  WHEN 'gang' THEN 1
  WHEN 'uitgever' THEN 2
  WHEN 'status' THEN 3
  WHEN 'soort-gerecht' THEN 4
  ELSE order_index
END;

-- ============================================================
-- VERIFICATION: Show final state
-- ============================================================
SELECT
  'Category Types' as info,
  name,
  slug,
  order_index,
  allow_multiple
FROM category_types
ORDER BY order_index;

SELECT
  'Gang Categories' as info,
  c.name,
  c.slug,
  c.is_system,
  c.order_index,
  ct.name as category_type
FROM categories c
JOIN category_types ct ON c.type_id = ct.id
WHERE ct.slug = 'gang'
ORDER BY c.order_index;

SELECT
  'Publisher Categories (sample)' as info,
  c.name,
  c.slug,
  ct.name as category_type
FROM categories c
JOIN category_types ct ON c.type_id = ct.id
WHERE ct.slug = 'uitgever'
ORDER BY c.name
LIMIT 10;
