# E2E Implementation Plan - Kookboek

## Executive Summary

This document provides a complete implementation plan for the Kookboek recipe management application. The database is **already configured and ready** with all necessary tables, indexes, triggers, and storage bucket. This plan covers the frontend and backend implementation needed to connect the UI to the existing database.

**Status:** ✅ Database Ready | ⏳ Frontend/API Implementation Needed

---

## Current Infrastructure Status

### ✅ Database (Supabase PostgreSQL)
**Connection:** `postgresql://postgres:[password]@192.168.1.63:5432/postgres`

**Tables:**
- ✅ `recipes` - 21 columns, fully indexed
- ✅ `parsed_ingredients` - with sections support
- ✅ `tags` - master tag list
- ✅ `recipe_tags` - junction table
- ✅ `extracted_keywords` - for AI-generated keywords

**Indexes (Performance Optimized):**
- ✅ `idx_recipes_search` - GIN index on search_vector
- ✅ `idx_recipes_labels` - GIN index on labels array
- ✅ `idx_recipes_is_favorite` - Partial index for favorites
- ✅ `idx_recipes_created_at` - DESC index for latest recipes
- ✅ `idx_recipes_title_search` - GIN index for title full-text search

**Triggers:**
- ✅ `recipes_search_trigger` - Auto-updates search_vector on INSERT/UPDATE
- ✅ Function: `recipes_search_update()` - Dutch language full-text search

### ✅ Storage (Supabase Storage)
**Bucket:** `recipe-images`
- ✅ Public access enabled
- ✅ File size limit: 5MB (5,242,880 bytes)
- ✅ Allowed types: image/jpeg, image/jpg, image/png, image/webp
- ✅ Type: STANDARD storage

### ⏳ Backend (Next.js API Routes) - TO IMPLEMENT
**Needed:**
- API route: `/api/import` (POST) - Handle URL/Photo imports
- API route: `/api/recipes` (GET) - List/search/filter
- API route: `/api/recipes/[id]` (PUT, DELETE) - Update/delete
- Gemini AI integration service
- Ingredient parsing service

### ⏳ Frontend (Next.js 15 + React 19) - TO IMPLEMENT
**Needed:**
- Pages: `/`, `/recipes/[slug]`
- Components: Import dialog, recipe cards, filters, detail view, edit mode
- Client-side state management for filters, edit mode, serving adjustments

---

## Database Schema Analysis

### recipes Table
**Observed Data Structure:**
```json
{
  "id": "uuid",
  "title": "Balletjes in tomatensaus",
  "slug": "balletjes-in-tomatensaus",
  "description": null,
  "content_markdown": "1. Meng het gehakt...\n2. Vorm er gelijke balletjes...",
  "prep_time": 20,
  "cook_time": 45,
  "servings_default": 4,
  "servings_fixed": false,
  "difficulty": null,
  "image_url": null,
  "source_url": null,
  "source_name": "Solo.be",
  "source_language": null,
  "labels": ["hoofdgerecht", "vlees", "Belgisch"],
  "is_favorite": false,
  "notes": null,
  "notes_updated_at": null,
  "search_vector": "...",
  "created_at": "2025-10-23T09:34:32.057Z",
  "updated_at": "2025-10-23T09:34:32.057Z"
}
```

**Key Observations:**
- ✅ All user story fields are present
- ✅ Search vector auto-updated via trigger
- ✅ Labels stored as text array (perfect for filtering)
- ⚠️ Sample recipe has `amount` and `unit` as NULL in ingredients (all data in `amount_display`)
- 💡 This is acceptable - we can improve parsing when editing

### parsed_ingredients Table
**Observed Data Structure:**
```json
{
  "id": "uuid",
  "recipe_id": "uuid",
  "ingredient_name_nl": "rundergehakt",
  "amount": null,
  "unit": null,
  "amount_display": "600 g",
  "scalable": true,
  "order_index": 1,
  "section": null  // or "Voor de saus:"
}
```

**Key Observations:**
- ✅ Section support working (e.g., "Voor de saus:")
- ⚠️ Current data has amount/unit as NULL
- 💡 Implementation should:
  - Use `amount_display` for display
  - Parse `amount` and `unit` for scaling calculations
  - If amount/unit NULL, parse from `amount_display` on-the-fly

**Ingredient Parsing Strategy:**
```typescript
// When displaying/scaling:
if (ingredient.amount !== null) {
  // Use parsed values
  scaledAmount = ingredient.amount * servingRatio;
  display = `${formatAmount(scaledAmount)} ${ingredient.unit} ${ingredient.ingredient_name_nl}`;
} else {
  // Parse on-the-fly from amount_display
  const parsed = parseIngredient(ingredient.amount_display);
  scaledAmount = parsed.amount * servingRatio;
  display = `${formatAmount(scaledAmount)} ${parsed.unit} ${ingredient.ingredient_name_nl}`;
}
```

### Search Vector Implementation
**Current Trigger:**
```sql
CREATE FUNCTION recipes_search_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('dutch',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Note:** Content_markdown is NOT included in search_vector. This is fine for title/description search. If we want to search instructions, we can extend the trigger.

---

## API Endpoints Implementation

### 1. POST /api/import
**Purpose:** Import recipe from URL or photos using Gemini AI

**Request Body:**
```typescript
type ImportRequest =
  | { url: string }
  | { photos: FormData }  // multiple files

interface ImportResponse {
  success: boolean;
  recipeId?: string;
  slug?: string;
  error?: string;
  confidence?: number;  // for photo imports
}
```

**Implementation Steps:**

**A. URL Import Flow:**
```typescript
// app/api/import/route.ts
export async function POST(request: Request) {
  const contentType = request.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    // URL import
    const { url } = await request.json();

    // 1. Fetch webpage
    const html = await fetch(url).then(r => r.text());

    // 2. Call Gemini AI to extract recipe
    const recipe = await extractRecipeFromURL(html, url);

    // 3. Generate slug
    const slug = generateSlug(recipe.title);

    // 4. Insert into database
    const { data: newRecipe, error } = await supabase
      .from('recipes')
      .insert({
        title: recipe.title,
        slug,
        description: recipe.description,
        content_markdown: recipe.instructions,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        servings_default: recipe.servings_default,
        difficulty: recipe.difficulty,
        image_url: recipe.image_url,
        source_url: url,
        source_name: recipe.source_name,
        source_language: recipe.source_language || 'nl',
        labels: recipe.labels || []
      })
      .select()
      .single();

    if (error) throw error;

    // 5. Insert ingredients
    if (recipe.ingredients?.length > 0) {
      await supabase.from('parsed_ingredients').insert(
        recipe.ingredients.map((ing, index) => ({
          recipe_id: newRecipe.id,
          ingredient_name_nl: ing.ingredient_name_nl,
          amount: ing.amount,
          unit: ing.unit,
          amount_display: ing.amount_display,
          scalable: ing.scalable ?? true,
          section: ing.section,
          order_index: index
        }))
      );
    }

    // 6. Insert keywords
    if (recipe.keywords?.length > 0) {
      await supabase.from('extracted_keywords').insert(
        recipe.keywords.map(kw => ({
          recipe_id: newRecipe.id,
          keyword: kw.keyword,
          confidence: kw.confidence
        }))
      );
    }

    return Response.json({
      success: true,
      recipeId: newRecipe.id,
      slug: newRecipe.slug
    });
  }

  else if (contentType?.includes('multipart/form-data')) {
    // Photo import (similar flow)
    // ... see B below
  }
}
```

**B. Photo Import Flow:**
```typescript
// Parse FormData
const formData = await request.formData();
const photos = formData.getAll('photos') as File[];

// Convert to base64 for Gemini
const imagesData = await Promise.all(
  photos.map(async (photo) => {
    const buffer = await photo.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(buffer).toString('base64'),
        mimeType: photo.type
      }
    };
  })
);

// Call Gemini with multiple images
const recipe = await extractRecipeFromPhotos(imagesData);

// Check confidence
if (recipe.confidence < 0.3) {
  return Response.json({
    success: false,
    error: 'De foto\'s zijn niet leesbaar. Probeer betere foto\'s.'
  });
}

// Insert into database (same as URL import)
// ...

return Response.json({
  success: true,
  recipeId: newRecipe.id,
  slug: newRecipe.slug,
  confidence: recipe.confidence,
  // Redirect to edit mode for verification
  editMode: true
});
```

**Gemini AI Prompts:**

See `user-stories/01-recipe-import-url.md` AC7 and `user-stories/02-recipe-import-photos.md` AC7 for detailed prompts.

---

### 2. GET /api/recipes
**Purpose:** List/search/filter recipes

**Query Parameters:**
```typescript
interface RecipesQuery {
  search?: string;           // Full-text search
  labels?: string[];         // Filter by labels
  ingredients?: string[];    // Filter by keywords
  source?: string[];         // Filter by source_name
  favorites?: boolean;       // Only favorites
  limit?: number;            // Pagination (default: 24)
  offset?: number;           // Pagination
  sort?: 'newest' | 'oldest' | 'title';  // Sort order
}
```

**Implementation:**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search');
  const labels = searchParams.getAll('label');
  const ingredients = searchParams.getAll('ingredient');
  const sources = searchParams.getAll('source');
  const favorites = searchParams.get('favorites') === 'true';
  const limit = parseInt(searchParams.get('limit') || '24');
  const offset = parseInt(searchParams.get('offset') || '0');
  const sort = searchParams.get('sort') || 'newest';

  let query = supabase.from('recipes').select('*');

  // Search
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    // Alternative: full-text search
    // query = query.textSearch('search_vector', search, {
    //   config: 'dutch'
    // });
  }

  // Filter by labels
  if (labels.length > 0) {
    query = query.overlaps('labels', labels);
  }

  // Filter by favorites
  if (favorites) {
    query = query.eq('is_favorite', true);
  }

  // Filter by source
  if (sources.length > 0) {
    query = query.in('source_name', sources);
  }

  // Sort
  switch (sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'title':
      query = query.order('title', { ascending: true });
      break;
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return Response.json({
    recipes: data,
    count,
    limit,
    offset
  });
}
```

**Note on Ingredient Filtering:**
Ingredient filtering requires JOIN with `extracted_keywords` table. This is more complex and can be implemented in a separate endpoint or using raw SQL:

```typescript
// Complex query with ingredient filter
if (ingredients.length > 0) {
  const { data } = await supabase.rpc('search_recipes_with_ingredients', {
    ingredient_keywords: ingredients,
    other_filters: {
      search, labels, sources, favorites
    }
  });
}
```

Create a PostgreSQL function:
```sql
CREATE OR REPLACE FUNCTION search_recipes_with_ingredients(
  ingredient_keywords text[],
  other_filters jsonb
)
RETURNS SETOF recipes AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT r.*
  FROM recipes r
  LEFT JOIN extracted_keywords ek ON ek.recipe_id = r.id
  WHERE
    (ingredient_keywords IS NULL OR ek.keyword = ANY(ingredient_keywords))
    -- Add other filters from jsonb
    AND (
      (other_filters->>'favorites')::boolean IS NULL
      OR r.is_favorite = (other_filters->>'favorites')::boolean
    )
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

---

### 3. GET /api/recipes/[slug]
**Purpose:** Get single recipe with all related data

**Implementation:**
```typescript
// app/api/recipes/[slug]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      *,
      parsed_ingredients (
        id,
        ingredient_name_nl,
        amount,
        unit,
        amount_display,
        scalable,
        section,
        order_index
      )
    `)
    .eq('slug', params.slug)
    .order('parsed_ingredients(order_index)')
    .single();

  if (error || !recipe) {
    return Response.json(
      { error: 'Recipe not found' },
      { status: 404 }
    );
  }

  return Response.json(recipe);
}
```

---

### 4. PUT /api/recipes/[id]
**Purpose:** Update recipe

**Request Body:**
```typescript
interface UpdateRecipeRequest {
  title?: string;
  description?: string;
  content_markdown?: string;
  prep_time?: number;
  cook_time?: number;
  servings_default?: number;
  difficulty?: string;
  labels?: string[];
  source_name?: string;
  notes?: string;
  ingredients?: Array<{
    ingredient_name_nl: string;
    amount?: number;
    unit?: string;
    amount_display: string;
    scalable?: boolean;
    section?: string;
  }>;
  image?: File;  // if image updated
}
```

**Implementation:**
```typescript
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const data = await request.json();

  // 1. Handle image upload if provided
  if (data.image) {
    const imageUrl = await uploadImage(data.image, params.id);
    data.image_url = imageUrl;
  }

  // 2. Generate new slug if title changed
  if (data.title) {
    data.slug = generateSlug(data.title);
  }

  // 3. Update recipe
  const { error: recipeError } = await supabase
    .from('recipes')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id);

  if (recipeError) throw recipeError;

  // 4. Update ingredients if provided
  if (data.ingredients) {
    // Delete existing
    await supabase
      .from('parsed_ingredients')
      .delete()
      .eq('recipe_id', params.id);

    // Insert new
    await supabase.from('parsed_ingredients').insert(
      data.ingredients.map((ing, index) => ({
        recipe_id: params.id,
        ...ing,
        order_index: index
      }))
    );
  }

  return Response.json({ success: true });
}
```

---

### 5. PATCH /api/recipes/[id]/favorite
**Purpose:** Toggle favorite status

**Implementation:**
```typescript
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Get current value
  const { data: recipe } = await supabase
    .from('recipes')
    .select('is_favorite')
    .eq('id', params.id)
    .single();

  // Toggle
  const { data, error } = await supabase
    .from('recipes')
    .update({
      is_favorite: !recipe.is_favorite,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select('is_favorite')
    .single();

  if (error) throw error;

  return Response.json({ is_favorite: data.is_favorite });
}
```

---

### 6. PATCH /api/recipes/[id]/notes
**Purpose:** Update notes (with auto-save)

**Request Body:**
```typescript
interface UpdateNotesRequest {
  notes: string;
}
```

**Implementation:**
```typescript
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { notes } = await request.json();

  const { error } = await supabase
    .from('recipes')
    .update({
      notes,
      notes_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id);

  if (error) throw error;

  return Response.json({ success: true });
}
```

---

### 7. DELETE /api/recipes/[id]
**Purpose:** Delete recipe and cleanup

**Implementation:**
```typescript
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Get recipe to find image
  const { data: recipe } = await supabase
    .from('recipes')
    .select('image_url')
    .eq('id', params.id)
    .single();

  // 2. Delete image from storage if exists
  if (recipe?.image_url?.includes('recipe-images')) {
    const fileName = recipe.image_url.split('/').pop();
    await supabase.storage
      .from('recipe-images')
      .remove([fileName]);
  }

  // 3. Delete recipe (cascades to ingredients, tags, keywords)
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', params.id);

  if (error) throw error;

  return Response.json({ success: true });
}
```

---

## Service Layer Implementation

### lib/gemini.ts - AI Extraction Service

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ExtractedRecipe {
  title: string;
  description?: string;
  prep_time?: number;
  cook_time?: number;
  servings_default: number;
  difficulty?: 'Makkelijk' | 'Gemiddeld' | 'Moeilijk';
  ingredients: Array<{
    ingredient_name_nl: string;
    amount?: number;
    unit?: string;
    amount_display: string;
    scalable?: boolean;
    section?: string;
  }>;
  instructions: string;  // markdown
  source_name?: string;
  source_language?: string;
  labels?: string[];
  keywords?: Array<{
    keyword: string;
    confidence: number;
  }>;
  image_url?: string;
  confidence?: number;  // for photo imports
}

export async function extractRecipeFromURL(
  html: string,
  url: string
): Promise<ExtractedRecipe> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp'
  });

  const prompt = `
Analyseer de volgende HTML pagina en extraheer het recept.

URL: ${url}

INSTRUCTIES:
- Extraheer de receptgegevens zo nauwkeurig mogelijk
- Converteer alle hoeveelheden naar Nederlandse eenheden
- Formatteer de bereidingswijze als genummerde Markdown lijst
- Detecteer de bron (website naam)
- Identificeer het type gerecht (voorgerecht, hoofdgerecht, etc.)

Geef terug in JSON formaat:
{
  "title": "string",
  "description": "string (korte intro, 1-2 zinnen)",
  "prep_time": number (in minuten, schatting indien niet vermeld),
  "cook_time": number (in minuten, schatting indien niet vermeld),
  "servings_default": number,
  "difficulty": "Makkelijk" | "Gemiddeld" | "Moeilijk",
  "ingredients": [
    {
      "ingredient_name_nl": "string (genormaliseerde naam)",
      "amount": number | null,
      "unit": "string (el, tl, g, ml, stuks, etc.) | null",
      "amount_display": "string (originele tekst: '2 el', '1 grote ui', etc.)",
      "scalable": boolean (false voor 'naar smaak', 'snufje', etc.),
      "section": "string | null (bijv. 'Voor de saus', 'Voor de garnering')"
    }
  ],
  "instructions": "string (Markdown formatted met genummerde stappen)",
  "source_name": "string (website naam, bijv. 'Solo.be', 'Jeroen Meus')",
  "source_language": "nl" | "en" | "fr",
  "labels": ["string"] (bijv. ["hoofdgerecht", "vlees", "Belgisch"]),
  "keywords": [
    {
      "keyword": "string (belangrijke ingrediënten)",
      "confidence": number (0-1)
    }
  ],
  "image_url": "string | null (hoofdafbeelding URL indien zichtbaar)"
}

Als er GEEN recept gevonden kan worden, return:
{ "error": "Geen recept gevonden op deze pagina" }

HTML:
${html}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Geen JSON response van AI');
  }

  const recipe = JSON.parse(jsonMatch[0]);

  if (recipe.error) {
    throw new Error(recipe.error);
  }

  return recipe;
}

export async function extractRecipeFromPhotos(
  images: Array<{ inlineData: { data: string; mimeType: string } }>
): Promise<ExtractedRecipe> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp'
  });

  const prompt = `
Je ontvangt ${images.length} foto('s) van een recept (uit een kookboek, tijdschrift, of handgeschreven).

INSTRUCTIES:
1. Lees alle foto's en combineer de informatie
2. Als ingrediënten op foto 1 staan en instructies op foto 2, combineer deze
3. Als er meerdere versies van hetzelfde veld zijn, gebruik de meest complete
4. Als tekst onduidelijk is, doe je best om te interpreteren
5. Converteer alle hoeveelheden naar Nederlandse eenheden

Geef terug in JSON formaat met exact dezelfde structuur als bij URL import (zie boven).

BELANGRIJK:
- Voeg een "confidence" veld toe (0-1) voor hoe zeker je bent van de extractie
- Als tekst NIET leesbaar is: confidence < 0.3
- Als sommige delen onduidelijk zijn: confidence 0.3-0.7
- Als alles duidelijk leesbaar is: confidence > 0.7
- Bij confidence < 0.3: return { "error": "Foto's zijn te onscherp of bevatten geen tekst", "confidence": [score] }
`;

  const parts = [prompt, ...images];

  const result = await model.generateContent(parts);
  const response = await result.response;
  const text = response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Geen JSON response van AI');
  }

  const recipe = JSON.parse(jsonMatch[0]);

  if (recipe.error) {
    throw new Error(recipe.error);
  }

  return recipe;
}
```

---

### lib/ingredient-parser.ts - Ingredient Parsing

```typescript
interface ParsedIngredient {
  amount: number | null;
  unit: string | null;
  name: string;
}

export function parseIngredient(input: string): ParsedIngredient {
  // Remove leading/trailing whitespace
  input = input.trim();

  // Patterns to match
  const patterns = [
    // "2 el olijfolie" -> amount: 2, unit: "el", name: "olijfolie"
    /^(\d+(?:[.,]\d+)?)\s*(el|tl|kg|g|ml|l|dl|cl|stuks?|st|teentjes?|takjes?|blaadjes?)\s+(.+)$/i,

    // "1 grote ui" -> amount: 1, unit: "stuks", name: "grote ui"
    /^(\d+)\s+(grote?|kleine?|middel(?:grote)?)\s+(.+)$/i,

    // "600 g rundergehakt" -> amount: 600, unit: "g", name: "rundergehakt"
    /^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\s+(.+)$/i,

    // "naar smaak zout" -> amount: null, unit: null, name: "zout"
    /^(naar smaak|snufje|beetje|vleugje)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      if (match[1] === 'naar smaak' || match[1] === 'snufje') {
        return {
          amount: null,
          unit: null,
          name: match[2]
        };
      }

      const amount = parseFloat(match[1].replace(',', '.'));
      const unit = normalizeUnit(match[2]);
      const name = match[3];

      return { amount, unit, name };
    }
  }

  // If no pattern matches, return whole string as name
  return {
    amount: null,
    unit: null,
    name: input
  };
}

function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'el': 'el',
    'eetlepel': 'el',
    'eetlepels': 'el',
    'tl': 'tl',
    'theelepel': 'tl',
    'theelepels': 'tl',
    'kg': 'kg',
    'g': 'g',
    'gram': 'g',
    'ml': 'ml',
    'l': 'l',
    'liter': 'l',
    'dl': 'dl',
    'cl': 'cl',
    'stuk': 'stuks',
    'stuks': 'stuks',
    'st': 'stuks',
    'teentje': 'teentjes',
    'teentjes': 'teentjes',
    'takje': 'takjes',
    'takjes': 'takjes',
    'grote': 'stuks',
    'groot': 'stuks',
    'kleine': 'stuks',
    'klein': 'stuks',
  };

  return unitMap[unit.toLowerCase()] || unit;
}

export function formatAmount(amount: number): string {
  // Convert decimals to fractions
  const fractions: Record<number, string> = {
    0.25: '¼',
    0.33: '⅓',
    0.5: '½',
    0.67: '⅔',
    0.75: '¾',
  };

  const intPart = Math.floor(amount);
  const decPart = amount - intPart;

  // Check if decimal part matches a common fraction
  for (const [dec, frac] of Object.entries(fractions)) {
    if (Math.abs(decPart - parseFloat(dec)) < 0.01) {
      return intPart > 0 ? `${intPart}${frac}` : frac;
    }
  }

  // Otherwise round to 1 decimal
  return amount.toFixed(1).replace('.0', '');
}
```

---

### lib/slug-generator.ts

```typescript
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')  // Decompose accents
    .replace(/[\u0300-\u036f]/g, '')  // Remove accents
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
    .trim()
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .replace(/-+/g, '-');  // Remove duplicate hyphens
}
```

---

### lib/storage.ts - Image Upload

```typescript
import { createClient } from '@/lib/supabase/server';

export async function uploadRecipeImage(
  file: File,
  recipeId: string
): Promise<string> {
  const supabase = createClient();

  // Generate unique filename
  const ext = file.name.split('.').pop();
  const fileName = `${recipeId}-${Date.now()}.${ext}`;

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('recipe-images')
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function deleteRecipeImage(imageUrl: string): Promise<void> {
  if (!imageUrl.includes('recipe-images')) return;

  const supabase = createClient();
  const fileName = imageUrl.split('/').pop();

  if (!fileName) return;

  await supabase.storage
    .from('recipe-images')
    .remove([fileName]);
}
```

---

## Frontend Implementation Guide

### Page Structure

```
app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Homepage (recipe list)
├── recipes/
│   └── [slug]/
│       └── page.tsx              # Recipe detail page
└── api/
    ├── import/
    │   └── route.ts              # POST import endpoint
    └── recipes/
        ├── route.ts              # GET list recipes
        └── [id]/
            ├── route.ts          # PUT/DELETE recipe
            ├── favorite/
            │   └── route.ts      # PATCH toggle favorite
            └── notes/
                └── route.ts      # PATCH update notes
```

### Component Structure

```
components/
├── recipe/
│   ├── recipe-card.tsx          # Grid item
│   ├── recipe-detail.tsx        # Detail view wrapper
│   ├── recipe-read-view.tsx     # Read-only display
│   ├── recipe-edit-view.tsx     # Edit mode
│   ├── recipe-header.tsx        # Hero image + title
│   ├── recipe-metadata.tsx      # Badges (time, servings, etc.)
│   ├── recipe-tabs.tsx          # Tab navigation
│   ├── ingredient-list.tsx      # Ingredients with checkboxes
│   ├── instructions-view.tsx    # Numbered steps
│   └── notes-editor.tsx         # Notes textarea
├── import/
│   ├── import-dialog.tsx        # Modal for import
│   ├── url-import.tsx           # URL input section
│   └── photo-import.tsx         # Photo upload section
├── search/
│   ├── search-bar.tsx           # Search input
│   ├── filter-dropdown.tsx      # Multi-filter dropdown
│   └── active-filters.tsx       # Active filter chips
└── ui/
    ├── button.tsx
    ├── input.tsx
    ├── badge.tsx
    ├── tabs.tsx
    └── ...                       # Other UI primitives
```

---

## Data Flow Diagrams

### 1. Recipe Import from URL

```
User → Click "Importeer Recept"
     → Enter URL
     → Click "Importeren"
     ↓
Frontend → POST /api/import { url }
         ↓
API Route → Fetch HTML from URL
          → Call Gemini AI
          → Parse AI response
          → Generate slug
          → Insert into recipes table
          → Insert into parsed_ingredients table
          → Insert into extracted_keywords table
          → Return { recipeId, slug }
          ↓
Frontend ← Receive response
         → Navigate to /recipes/[slug]
         → Show success toast
```

### 2. Recipe Search & Filter

```
User → Type in search box (debounced 300ms)
     → Select filters (labels, source, favorites)
     ↓
Frontend → Update URL params (?search=...&label=...)
         → GET /api/recipes?search=...&label=...
         ↓
API Route → Build Supabase query
          → Apply filters (WHERE, overlaps, etc.)
          → Apply sorting
          → Apply pagination
          → Return recipes array
          ↓
Frontend ← Receive recipes
         → Update recipe grid
         → Update count display
```

### 3. Recipe Edit & Save

```
User → Click "Bewerk" button
     → Edit mode activated (client state)
     → Change title, ingredients, etc.
     → Click "Opslaan"
     ↓
Frontend → Validate changes
         → Upload image (if changed)
         → PUT /api/recipes/[id] { ...changes }
         ↓
API Route → Update recipes table
          → Delete old ingredients
          → Insert new ingredients
          → Update search_vector (via trigger)
          → Return success
          ↓
Frontend ← Receive response
         → Exit edit mode
         → Show success toast
         → Refresh data (router.refresh())
```

### 4. Auto-save Notes

```
User → Type in notes textarea
     ↓
Frontend → Debounce 2 seconds
         → PATCH /api/recipes/[id]/notes { notes }
         ↓
API Route → Update recipes.notes
          → Update recipes.notes_updated_at
          → Return success
          ↓
Frontend ← Show "Opgeslagen" indicator
```

---

## Implementation Checklist

### ✅ Phase 0: Infrastructure (DONE)
- [x] Database tables created
- [x] Indexes created
- [x] Search trigger created
- [x] Storage bucket created
- [x] Sample recipe exists

### ⏳ Phase 1: Project Setup
- [ ] Initialize Next.js 15 project
- [ ] Install dependencies (Supabase, Gemini AI, etc.)
- [ ] Configure environment variables
- [ ] Setup Tailwind CSS with custom theme
- [ ] Create Supabase client utilities

### ⏳ Phase 2: API Layer
- [ ] Implement POST /api/import (URL)
- [ ] Implement POST /api/import (Photos)
- [ ] Implement GET /api/recipes (list/search/filter)
- [ ] Implement GET /api/recipes/[slug]
- [ ] Implement PUT /api/recipes/[id]
- [ ] Implement DELETE /api/recipes/[id]
- [ ] Implement PATCH /api/recipes/[id]/favorite
- [ ] Implement PATCH /api/recipes/[id]/notes

### ⏳ Phase 3: Services
- [ ] Implement Gemini AI extraction (URL)
- [ ] Implement Gemini AI extraction (Photos)
- [ ] Implement ingredient parser
- [ ] Implement slug generator
- [ ] Implement image upload/delete
- [ ] Implement amount formatter (fractions)

### ⏳ Phase 4: UI Components
- [ ] Create recipe card component
- [ ] Create recipe detail layout
- [ ] Create ingredient list with checkboxes
- [ ] Create serving size adjuster
- [ ] Create tabs component
- [ ] Create import dialog
- [ ] Create search bar
- [ ] Create filter dropdown
- [ ] Create notes editor with auto-save

### ⏳ Phase 5: Pages
- [ ] Homepage (recipe grid)
- [ ] Recipe detail page (SSR)
- [ ] 404 page
- [ ] Error boundaries

### ⏳ Phase 6: Features
- [ ] Search functionality
- [ ] Filter functionality
- [ ] Favorite toggle
- [ ] Edit mode
- [ ] Recipe deletion
- [ ] Print functionality
- [ ] Image upload

### ⏳ Phase 7: Testing
- [ ] Unit tests for parsers
- [ ] API route tests
- [ ] Component tests
- [ ] E2E tests (Playwright)

### ⏳ Phase 8: Polish
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design
- [ ] Accessibility (ARIA, keyboard nav)
- [ ] SEO metadata
- [ ] Performance optimization

### ⏳ Phase 9: Deployment
- [ ] Deploy to Coolify
- [ ] Configure environment variables
- [ ] Test production build
- [ ] Setup GitHub auto-deploy

---

## Next Steps

**Immediate Actions:**
1. ✅ Read this document thoroughly
2. ⏳ Review user stories in `/user-stories/` folder
3. ⏳ Initialize Next.js project
4. ⏳ Start with Phase 1: Project Setup
5. ⏳ Then Phase 2: API Layer (start with simpler GET /api/recipes)
6. ⏳ Then Phase 3: Services
7. ⏳ Then Phase 4-5: UI Implementation

**Questions to Clarify:**
1. Do you want ingredient amounts fully parsed now, or is `amount_display` sufficient for MVP?
2. Should we implement ingredient filtering with `extracted_keywords`, or use simpler label-only filtering for MVP?
3. Do you want full markdown support in notes, or plain text?
4. Do you want recipe versioning/history, or just latest version?

**Ready to Start:**
- Database: ✅ Ready
- Storage: ✅ Ready
- User Stories: ✅ Complete
- Implementation Plan: ✅ Complete
- Developer: ⏳ Needed

Let's build this! 🚀
