-- Migration: Herstructureer categoriesysteem met meerdere categorietypes
-- Datum: 2025-01-23

-- 1. Maak category_types tabel voor de 4 hoofdcategorieën
CREATE TABLE IF NOT EXISTS category_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  allow_multiple BOOLEAN DEFAULT true, -- Of meerdere categorieën van dit type tegelijk kunnen worden geselecteerd
  order_index INTEGER, -- Voor sortering in UI
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Voeg type_id toe aan categories tabel
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES category_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- 3. Maak recipe_categories junction tabel (many-to-many)
CREATE TABLE IF NOT EXISTS recipe_categories (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (recipe_id, category_id)
);

-- 4. Voeg indexes toe voor performance
CREATE INDEX IF NOT EXISTS idx_categories_type_id ON categories(type_id);
CREATE INDEX IF NOT EXISTS idx_recipe_categories_recipe_id ON recipe_categories(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_categories_category_id ON recipe_categories(category_id);

-- 5. Insert de 4 category types
INSERT INTO category_types (name, slug, description, allow_multiple, order_index)
VALUES
  ('Type gerecht', 'type-gerecht', 'Hoofdgerecht, voorgerecht, dessert, etc.', false, 1),
  ('Status', 'status', 'Al gemaakt, te maken, favorieten', false, 2),
  ('Uitgever', 'uitgever', 'Bron van het recept', false, 3),
  ('Soort gerecht', 'soort-gerecht', 'Eenpansgerecht, comfort food, pasta, wok, etc.', true, 4)
ON CONFLICT (slug) DO NOTHING;

-- 6. Update bestaande categories met type_id (Type gerecht)
DO $$
DECLARE
  type_gerecht_id UUID;
BEGIN
  SELECT id INTO type_gerecht_id FROM category_types WHERE slug = 'type-gerecht';

  UPDATE categories
  SET
    type_id = type_gerecht_id,
    slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
  WHERE type_id IS NULL;
END $$;

-- 7. Voeg standaard Status categorieën toe
DO $$
DECLARE
  status_type_id UUID;
BEGIN
  SELECT id INTO status_type_id FROM category_types WHERE slug = 'status';

  INSERT INTO categories (name, slug, color, type_id, order_index)
  VALUES
    ('Al gemaakt', 'al-gemaakt', '#10b981', status_type_id, 1),
    ('Te maken', 'te-maken', '#f59e0b', status_type_id, 2)
  ON CONFLICT DO NOTHING;
END $$;

-- 8. Voeg standaard Soort gerecht categorieën toe
DO $$
DECLARE
  soort_type_id UUID;
BEGIN
  SELECT id INTO soort_type_id FROM category_types WHERE slug = 'soort-gerecht';

  INSERT INTO categories (name, slug, color, type_id, order_index)
  VALUES
    ('Eenpansgerecht', 'eenpansgerecht', '#8b5cf6', soort_type_id, 1),
    ('Comfort food', 'comfort-food', '#f97316', soort_type_id, 2),
    ('Pasta', 'pasta', '#eab308', soort_type_id, 3),
    ('Wok', 'wok', '#ef4444', soort_type_id, 4),
    ('Salade', 'salade', '#22c55e', soort_type_id, 5),
    ('Soep', 'soep', '#06b6d4', soort_type_id, 6)
  ON CONFLICT DO NOTHING;
END $$;

-- 9. Migreer bestaande labels naar Soort gerecht categorieën
DO $$
DECLARE
  recipe_record RECORD;
  label TEXT;
  category_record RECORD;
  soort_type_id UUID;
BEGIN
  SELECT id INTO soort_type_id FROM category_types WHERE slug = 'soort-gerecht';

  -- Loop door alle recepten met labels
  FOR recipe_record IN
    SELECT id, labels FROM recipes WHERE labels IS NOT NULL AND array_length(labels, 1) > 0
  LOOP
    -- Loop door elke label
    FOREACH label IN ARRAY recipe_record.labels
    LOOP
      -- Maak of vind de categorie
      INSERT INTO categories (name, slug, color, type_id)
      VALUES (
        label,
        LOWER(REGEXP_REPLACE(label, '[^a-zA-Z0-9]+', '-', 'g')),
        '#94a3b8', -- default gray color
        soort_type_id
      )
      ON CONFLICT (name) DO NOTHING;

      -- Vind de categorie ID
      SELECT id INTO category_record FROM categories WHERE name = label;

      -- Koppel aan recept
      IF category_record IS NOT NULL THEN
        INSERT INTO recipe_categories (recipe_id, category_id)
        VALUES (recipe_record.id, category_record.id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 10. Maak genormaliseerde source_name kolom en migreer data
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS source_normalized TEXT;

-- Functie voor source normalisatie
CREATE OR REPLACE FUNCTION normalize_source_name(source TEXT)
RETURNS TEXT AS $$
BEGIN
  IF source IS NULL THEN
    RETURN NULL;
  END IF;

  -- Naar lowercase
  source := LOWER(source);

  -- Verwijder .be, .nl, .com etc
  source := REGEXP_REPLACE(source, '\.(be|nl|com|org|net)$', '', 'g');

  -- Verwijder www.
  source := REGEXP_REPLACE(source, '^www\.', '', 'g');

  -- Verwijder leading/trailing whitespace
  source := TRIM(source);

  -- Capitalize eerste letter van elk woord voor display
  source := INITCAP(source);

  RETURN source;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update bestaande source_name
UPDATE recipes
SET source_normalized = normalize_source_name(source_name)
WHERE source_name IS NOT NULL;

-- 11. Maak Uitgever categorieën van bestaande source_name
DO $$
DECLARE
  source_record RECORD;
  uitgever_type_id UUID;
  normalized_source TEXT;
  category_id_var UUID;
BEGIN
  SELECT id INTO uitgever_type_id FROM category_types WHERE slug = 'uitgever';

  -- Loop door unieke sources
  FOR source_record IN
    SELECT DISTINCT source_name, source_normalized
    FROM recipes
    WHERE source_name IS NOT NULL AND source_name != ''
  LOOP
    normalized_source := source_record.source_normalized;

    IF normalized_source IS NOT NULL AND normalized_source != '' THEN
      -- Maak categorie voor deze uitgever
      INSERT INTO categories (name, slug, color, type_id)
      VALUES (
        normalized_source,
        LOWER(REGEXP_REPLACE(normalized_source, '[^a-zA-Z0-9]+', '-', 'g')),
        '#3b82f6', -- blue for publishers
        uitgever_type_id
      )
      ON CONFLICT (name) DO NOTHING
      RETURNING id INTO category_id_var;

      -- Als het al bestond, haal de ID op
      IF category_id_var IS NULL THEN
        SELECT id INTO category_id_var FROM categories WHERE name = normalized_source;
      END IF;

      -- Koppel alle recepten met deze source
      INSERT INTO recipe_categories (recipe_id, category_id)
      SELECT id, category_id_var
      FROM recipes
      WHERE source_normalized = normalized_source
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- 12. Maak view voor makkelijke queries
CREATE OR REPLACE VIEW recipe_categories_view AS
SELECT
  r.id as recipe_id,
  r.title,
  ct.slug as category_type_slug,
  ct.name as category_type_name,
  c.id as category_id,
  c.name as category_name,
  c.slug as category_slug,
  c.color as category_color
FROM recipes r
LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
LEFT JOIN categories c ON rc.category_id = c.id
LEFT JOIN category_types ct ON c.type_id = ct.id;

-- 13. Maak functie voor het ophalen van alle categorieën van een recept
CREATE OR REPLACE FUNCTION get_recipe_categories(recipe_id_param UUID)
RETURNS TABLE(
  type_slug TEXT,
  type_name TEXT,
  categories JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.slug as type_slug,
    ct.name as type_name,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', c.id,
        'name', c.name,
        'slug', c.slug,
        'color', c.color
      )
    ) as categories
  FROM recipe_categories rc
  JOIN categories c ON rc.category_id = c.id
  JOIN category_types ct ON c.type_id = ct.id
  WHERE rc.recipe_id = recipe_id_param
  GROUP BY ct.slug, ct.name, ct.order_index
  ORDER BY ct.order_index;
END;
$$ LANGUAGE plpgsql;

-- 14. Voeg triggers toe voor source_normalized auto-update
CREATE OR REPLACE FUNCTION update_source_normalized()
RETURNS TRIGGER AS $$
BEGIN
  NEW.source_normalized := normalize_source_name(NEW.source_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_source_normalized ON recipes;
CREATE TRIGGER trigger_update_source_normalized
  BEFORE INSERT OR UPDATE OF source_name ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_source_normalized();

-- 15. Voeg RLS policies toe (Row Level Security)
ALTER TABLE category_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;

-- Iedereen kan category_types en categories lezen
CREATE POLICY "Allow public read on category_types" ON category_types FOR SELECT USING (true);
CREATE POLICY "Allow public read on categories" ON category_types FOR SELECT USING (true);
CREATE POLICY "Allow public read on recipe_categories" ON recipe_categories FOR SELECT USING (true);

-- Alleen authenticated users kunnen recipe_categories aanpassen
CREATE POLICY "Allow authenticated insert on recipe_categories" ON recipe_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on recipe_categories" ON recipe_categories FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete on recipe_categories" ON recipe_categories FOR DELETE USING (true);

COMMENT ON TABLE category_types IS 'Bevat de 4 hoofdcategorietypes: Type gerecht, Status, Uitgever, Soort gerecht';
COMMENT ON TABLE categories IS 'Bevat alle categorieën, gegroepeerd per type';
COMMENT ON TABLE recipe_categories IS 'Junction tabel voor many-to-many relatie tussen recepten en categorieën';
COMMENT ON COLUMN recipes.source_normalized IS 'Genormaliseerde source_name (lowercase, zonder .be/.nl, etc.)';
