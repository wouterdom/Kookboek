# Database Schema Documentation

## Overview
This document describes the actual database schema as it exists in the Supabase PostgreSQL database. This schema is ready for E2E development - no migrations needed.

## Tables

### recipes
Main table for storing recipe information.

```sql
CREATE TABLE recipes (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core content
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  content_markdown text NOT NULL,

  -- Metadata
  prep_time integer,  -- in minutes
  cook_time integer,  -- in minutes
  servings_default integer NOT NULL,
  servings_fixed boolean DEFAULT false,
  difficulty text,  -- 'Makkelijk', 'Gemiddeld', 'Moeilijk'

  -- Media
  image_url text,

  -- Source information
  source_url text,
  source_name text,
  source_language text,  -- 'nl', 'en', 'fr', etc.

  -- Features
  labels text[] DEFAULT '{}'::text[],  -- e.g., ['hoofdgerecht', 'pasta', 'vegetarisch']
  is_favorite boolean DEFAULT false,

  -- Personal notes
  notes text,
  notes_updated_at timestamptz,

  -- Search
  search_vector tsvector,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Indexes:**
```sql
-- Existing indexes
CREATE UNIQUE INDEX recipes_slug_key ON recipes(slug);

-- Recommended indexes for performance
CREATE INDEX idx_recipes_search ON recipes USING gin(search_vector);
CREATE INDEX idx_recipes_labels ON recipes USING gin(labels);
CREATE INDEX idx_recipes_favorite ON recipes(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_recipes_source ON recipes(source_name);
CREATE INDEX idx_recipes_created ON recipes(created_at DESC);
```

**Example Row:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Venkelsoep met gegrilde merguez",
  "slug": "venkelsoep-met-gegrilde-merguez",
  "description": "Een verwarmende, aromatische soep met zoete venkel...",
  "content_markdown": "1. Verhit de olijfolie...\n\n2. Voeg de ui toe...",
  "prep_time": 20,
  "cook_time": 40,
  "servings_default": 4,
  "servings_fixed": false,
  "difficulty": "Gemiddeld",
  "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd",
  "source_url": "https://dagelijksekost.een.be/gerechten/venkelsoep",
  "source_name": "Jeroen Meus",
  "source_language": "nl",
  "labels": ["soep", "hoofdgerecht", "winter"],
  "is_favorite": false,
  "notes": "Volgende keer meer komijn gebruiken",
  "notes_updated_at": "2025-01-15T10:30:00Z",
  "created_at": "2025-01-10T14:22:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

---

### parsed_ingredients
Stores structured ingredient data for each recipe.

```sql
CREATE TABLE parsed_ingredients (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,

  -- Ingredient data
  ingredient_name_nl text NOT NULL,  -- Normalized Dutch name
  amount numeric,  -- Numeric value (nullable for "naar smaak")
  unit text,  -- 'el', 'tl', 'g', 'ml', 'stuks', etc.
  amount_display text,  -- Original display text: "2 el", "1 grote", "naar smaak"

  -- Features
  scalable boolean DEFAULT true,  -- Can be scaled with serving size
  section text,  -- Optional grouping: "Voor de saus", "Voor de garnering"
  order_index integer NOT NULL,  -- Display order

  -- Timestamp
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_parsed_ingredients_recipe ON parsed_ingredients(recipe_id);
CREATE INDEX idx_parsed_ingredients_order ON parsed_ingredients(recipe_id, order_index);
```

**Example Rows:**
```json
[
  {
    "id": "111e4567-e89b-12d3-a456-426614174001",
    "recipe_id": "123e4567-e89b-12d3-a456-426614174000",
    "ingredient_name_nl": "olijfolie",
    "amount": 2,
    "unit": "el",
    "amount_display": "2 el",
    "scalable": true,
    "section": null,
    "order_index": 0
  },
  {
    "id": "222e4567-e89b-12d3-a456-426614174002",
    "recipe_id": "123e4567-e89b-12d3-a456-426614174000",
    "ingredient_name_nl": "ui",
    "amount": 1,
    "unit": "stuks",
    "amount_display": "1 grote",
    "scalable": true,
    "section": null,
    "order_index": 1
  },
  {
    "id": "333e4567-e89b-12d3-a456-426614174003",
    "recipe_id": "123e4567-e89b-12d3-a456-426614174000",
    "ingredient_name_nl": "zout",
    "amount": null,
    "unit": null,
    "amount_display": "naar smaak",
    "scalable": false,
    "section": null,
    "order_index": 10
  }
]
```

**Ingredient Sections Example:**
```json
[
  {
    "ingredient_name_nl": "bloem",
    "amount_display": "250 g",
    "section": "Voor het deeg",
    "order_index": 0
  },
  {
    "ingredient_name_nl": "boter",
    "amount_display": "125 g",
    "section": "Voor het deeg",
    "order_index": 1
  },
  {
    "ingredient_name_nl": "suiker",
    "amount_display": "50 g",
    "section": "Voor de vulling",
    "order_index": 2
  }
]
```

---

### tags
Master list of all tags used across recipes.

```sql
CREATE TABLE tags (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tag data
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,

  -- Timestamp
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
```sql
CREATE UNIQUE INDEX tags_name_key ON tags(name);
CREATE UNIQUE INDEX tags_slug_key ON tags(slug);
```

**Example Rows:**
```json
[
  { "id": "...", "name": "Voorgerecht", "slug": "voorgerecht", "created_at": "..." },
  { "id": "...", "name": "Hoofdgerecht", "slug": "hoofdgerecht", "created_at": "..." },
  { "id": "...", "name": "Dessert", "slug": "dessert", "created_at": "..." },
  { "id": "...", "name": "Vegetarisch", "slug": "vegetarisch", "created_at": "..." },
  { "id": "...", "name": "Comfort Food", "slug": "comfort-food", "created_at": "..." }
]
```

**Note:** The `recipes.labels` array can contain tags that don't exist in this table. This table is for advanced tag management (future feature).

---

### recipe_tags
Junction table linking recipes to tags (many-to-many).

```sql
CREATE TABLE recipe_tags (
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_recipe_tags_recipe ON recipe_tags(recipe_id);
CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag_id);
```

**Example Rows:**
```json
[
  { "recipe_id": "123e4567-...", "tag_id": "aaa-..." },  // Recipe -> "Soep"
  { "recipe_id": "123e4567-...", "tag_id": "bbb-..." },  // Recipe -> "Hoofdgerecht"
  { "recipe_id": "456e7890-...", "tag_id": "ccc-..." }   // Another recipe -> "Dessert"
]
```

**Usage Note:**
Currently, the app uses `recipes.labels` (text array) for simple tag filtering. The `tags` and `recipe_tags` tables are available for future enhanced tag management with:
- Tag descriptions
- Tag hierarchies (parent/child)
- Tag images
- Tag statistics (recipe count per tag)

---

### extracted_keywords
AI-extracted keywords from recipe content (for advanced search/filtering).

```sql
CREATE TABLE extracted_keywords (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,

  -- Keyword data
  keyword text NOT NULL,
  confidence numeric,  -- 0-1 score from AI

  -- Timestamp
  created_at timestamptz DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_extracted_keywords_recipe ON extracted_keywords(recipe_id);
CREATE INDEX idx_extracted_keywords_keyword ON extracted_keywords(keyword);
```

**Example Rows:**
```json
[
  {
    "id": "...",
    "recipe_id": "123e4567-...",
    "keyword": "venkel",
    "confidence": 0.95,
    "created_at": "..."
  },
  {
    "id": "...",
    "recipe_id": "123e4567-...",
    "keyword": "merguez",
    "confidence": 0.92,
    "created_at": "..."
  },
  {
    "id": "...",
    "recipe_id": "123e4567-...",
    "keyword": "soep",
    "confidence": 0.98,
    "created_at": "..."
  }
]
```

**Usage:**
- Populated during AI import (Gemini extracts keywords)
- Used for ingredient filtering: "Show me all recipes with 'kip'"
- Can be used for recipe suggestions: "Similar recipes"
- Confidence threshold: Only show keywords with confidence > 0.7

---

## Relationships

### Entity Relationship Diagram
```
recipes (1) ──< (many) parsed_ingredients
   │
   │ (many)
   └──< recipe_tags >──┐
                       │
                  (many) tags

recipes (1) ──< (many) extracted_keywords
```

### Cascade Delete Behavior
When a recipe is deleted:
- ✅ All `parsed_ingredients` are deleted (ON DELETE CASCADE)
- ✅ All `recipe_tags` entries are deleted (ON DELETE CASCADE)
- ✅ All `extracted_keywords` are deleted (ON DELETE CASCADE)
- ⚠️ Tags in `tags` table remain (not deleted)
- ⚠️ Images in Supabase Storage must be manually deleted (see user story 05)

---

## Common Queries

### 1. Get Recipe with All Data
```sql
SELECT
  r.*,
  json_agg(
    json_build_object(
      'id', pi.id,
      'ingredient_name_nl', pi.ingredient_name_nl,
      'amount', pi.amount,
      'unit', pi.unit,
      'amount_display', pi.amount_display,
      'scalable', pi.scalable,
      'section', pi.section,
      'order_index', pi.order_index
    ) ORDER BY pi.order_index
  ) FILTER (WHERE pi.id IS NOT NULL) AS ingredients,
  (
    SELECT array_agg(t.name)
    FROM recipe_tags rt
    JOIN tags t ON t.id = rt.tag_id
    WHERE rt.recipe_id = r.id
  ) AS tag_names
FROM recipes r
LEFT JOIN parsed_ingredients pi ON pi.recipe_id = r.id
WHERE r.slug = 'venkelsoep-met-gegrilde-merguez'
GROUP BY r.id;
```

### 2. Search Recipes by Text
```sql
-- Simple search (current)
SELECT * FROM recipes
WHERE
  LOWER(title) LIKE LOWER('%' || $1 || '%') OR
  LOWER(description) LIKE LOWER('%' || $1 || '%')
ORDER BY created_at DESC;

-- Full-text search (recommended)
SELECT * FROM recipes
WHERE search_vector @@ plainto_tsquery('dutch', $1)
ORDER BY ts_rank(search_vector, plainto_tsquery('dutch', $1)) DESC;
```

### 3. Filter by Labels
```sql
-- Any of selected labels
SELECT * FROM recipes
WHERE labels && ARRAY['hoofdgerecht', 'pasta']::text[]
ORDER BY created_at DESC;

-- All of selected labels
SELECT * FROM recipes
WHERE labels @> ARRAY['hoofdgerecht', 'vegetarisch']::text[]
ORDER BY created_at DESC;
```

### 4. Filter by Ingredient Keyword
```sql
SELECT DISTINCT r.*
FROM recipes r
JOIN extracted_keywords ek ON ek.recipe_id = r.id
WHERE ek.keyword IN ('kip', 'rijst')
  AND ek.confidence > 0.7
ORDER BY r.created_at DESC;
```

### 5. Filter by Multiple Criteria
```sql
SELECT DISTINCT r.*
FROM recipes r
LEFT JOIN extracted_keywords ek ON ek.recipe_id = r.id
WHERE
  -- Search in title/description
  (
    LOWER(r.title) LIKE LOWER('%pasta%') OR
    LOWER(r.description) LIKE LOWER('%pasta%')
  )
  -- Filter by labels
  AND r.labels && ARRAY['hoofdgerecht']::text[]
  -- Filter by source
  AND r.source_name = 'Jeroen Meus'
  -- Filter by favorites
  AND r.is_favorite = TRUE
  -- Filter by ingredient
  AND ek.keyword IN ('kip')
ORDER BY r.created_at DESC;
```

### 6. Get Favorite Recipes
```sql
SELECT * FROM recipes
WHERE is_favorite = TRUE
ORDER BY updated_at DESC;
```

### 7. Update Recipe Notes
```sql
UPDATE recipes
SET
  notes = $1,
  notes_updated_at = NOW(),
  updated_at = NOW()
WHERE id = $2
RETURNING *;
```

### 8. Toggle Favorite
```sql
UPDATE recipes
SET
  is_favorite = NOT is_favorite,
  updated_at = NOW()
WHERE id = $1
RETURNING is_favorite;
```

### 9. Insert Recipe with Ingredients
```sql
-- 1. Insert recipe
WITH new_recipe AS (
  INSERT INTO recipes (
    title, slug, description, content_markdown,
    prep_time, cook_time, servings_default, difficulty,
    image_url, source_url, source_name, source_language, labels
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
  )
  RETURNING id
)
-- 2. Insert ingredients
INSERT INTO parsed_ingredients (
  recipe_id, ingredient_name_nl, amount, unit, amount_display,
  scalable, section, order_index
)
SELECT
  new_recipe.id,
  unnest($14::text[]),  -- ingredient_name_nl array
  unnest($15::numeric[]),  -- amount array
  unnest($16::text[]),  -- unit array
  unnest($17::text[]),  -- amount_display array
  unnest($18::boolean[]),  -- scalable array
  unnest($19::text[]),  -- section array
  unnest($20::integer[])  -- order_index array
FROM new_recipe
RETURNING *;
```

### 10. Delete Recipe (with cleanup)
```sql
-- Cascades will handle parsed_ingredients, recipe_tags, extracted_keywords
DELETE FROM recipes WHERE id = $1;
```

---

## Full-Text Search Setup

### Create Search Vector Trigger
```sql
-- Function to update search vector
CREATE OR REPLACE FUNCTION update_recipe_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('dutch', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('dutch', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('dutch', COALESCE(NEW.content_markdown, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT and UPDATE
CREATE TRIGGER recipes_search_vector_update
BEFORE INSERT OR UPDATE ON recipes
FOR EACH ROW
EXECUTE FUNCTION update_recipe_search_vector();

-- Backfill existing recipes
UPDATE recipes SET search_vector = search_vector WHERE search_vector IS NULL;
```

### Search Query with Ranking
```sql
SELECT
  r.*,
  ts_rank(r.search_vector, query) AS rank
FROM recipes r,
  plainto_tsquery('dutch', $1) query
WHERE r.search_vector @@ query
ORDER BY rank DESC, r.created_at DESC;
```

---

## Supabase Storage

### Bucket: recipe-images
Configuration:
```json
{
  "name": "recipe-images",
  "public": true,
  "file_size_limit": 5242880,  // 5MB
  "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"]
}
```

### Upload Example
```typescript
const { data, error } = await supabase.storage
  .from('recipe-images')
  .upload(`${recipeId}-${Date.now()}.webp`, file, {
    contentType: 'image/webp',
    cacheControl: '3600',
    upsert: false
  });

if (error) throw error;

const { data: { publicUrl } } = supabase.storage
  .from('recipe-images')
  .getPublicUrl(data.path);

// Update recipe
await supabase
  .from('recipes')
  .update({ image_url: publicUrl })
  .eq('id', recipeId);
```

### Delete Image
```typescript
const fileName = imageUrl.split('/').pop();
await supabase.storage
  .from('recipe-images')
  .remove([fileName]);
```

---

## Data Types & Constraints

### recipes
| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | gen_random_uuid() | PRIMARY KEY |
| title | text | NO | - | - |
| slug | text | NO | - | UNIQUE |
| description | text | YES | - | - |
| content_markdown | text | NO | - | - |
| prep_time | integer | YES | - | >= 0 (recommended) |
| cook_time | integer | YES | - | >= 0 (recommended) |
| servings_default | integer | NO | - | >= 1 (recommended) |
| servings_fixed | boolean | YES | false | - |
| difficulty | text | YES | - | ENUM-like validation recommended |
| image_url | text | YES | - | - |
| source_url | text | YES | - | - |
| source_name | text | YES | - | - |
| source_language | text | YES | - | - |
| labels | text[] | YES | '{}' | - |
| is_favorite | boolean | YES | false | - |
| notes | text | YES | - | - |
| notes_updated_at | timestamptz | YES | - | - |
| search_vector | tsvector | YES | - | - |
| created_at | timestamptz | YES | now() | - |
| updated_at | timestamptz | YES | now() | - |

### parsed_ingredients
| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| id | uuid | NO | gen_random_uuid() | PRIMARY KEY |
| recipe_id | uuid | YES | - | FOREIGN KEY |
| ingredient_name_nl | text | NO | - | - |
| amount | numeric | YES | - | - |
| unit | text | YES | - | - |
| amount_display | text | YES | - | - |
| scalable | boolean | YES | true | - |
| section | text | YES | - | - |
| order_index | integer | NO | - | >= 0 |
| created_at | timestamptz | YES | now() | - |

---

## Migration Status

✅ **Current Schema is Ready for E2E Development**

No migrations needed. The database schema as described in this document is already deployed and ready to use.

**Optional Enhancements (can be added later):**
1. Add CHECK constraints for validation
2. Add more indexes for performance
3. Add full-text search trigger
4. Add RLS (Row Level Security) policies for multi-user support

**Schema Version:** 1.0 (2025-01-23)
