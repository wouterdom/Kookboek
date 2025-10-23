# Kookboek User Stories - Overview

## Document Purpose
Deze user stories zijn geschreven voor E2E (End-to-End) ontwikkeling van de Kookboek applicatie. Ze bevatten gedetailleerde acceptance criteria, technische implementatie details, database queries, en test scenarios.

## Documents

### 01. Recipe Import - URL
**File:** `01-recipe-import-url.md`

**Samenvatting:**
Gebruiker kan recepten importeren door een URL te plakken. AI (Gemini) extraheert automatisch alle recept data van de webpagina.

**Key Features:**
- Import dialog met URL input
- Gemini AI extractie van titel, ingrediënten, instructies, metadata
- Database opslag in `recipes` en `parsed_ingredients` tables
- Foutafhandeling voor ongeldige URLs of pagina's zonder recept
- Auto-redirect naar recept detail pagina na succesvolle import

**Database Impact:**
- INSERT into `recipes`
- INSERT into `parsed_ingredients` (bulk)
- INSERT into `tags` (if new)
- INSERT into `recipe_tags`
- INSERT into `extracted_keywords`

**API Endpoint:**
- `POST /api/import` met `{ url: string }`

---

### 02. Recipe Import - Photos
**File:** `02-recipe-import-photos.md`

**Samenvatting:**
Gebruiker kan recepten importeren door foto's te uploaden (max 10). AI leest tekst van foto's en combineert informatie van meerdere foto's.

**Key Features:**
- Drag & drop + file dialog voor foto upload
- Preview grid met genummerde foto's
- Gemini AI multimodal input (meerdere foto's tegelijk)
- Intelligente combinatie van foto's (bijv. foto 1 = ingrediënten, foto 2 = instructies)
- Confidence score voor OCR kwaliteit
- Redirect naar edit mode (gebruiker kan AI fouten corrigeren)

**Database Impact:**
- Same as URL import
- Additional: `notes` field bevat "Geïmporteerd van [X] foto's"

**Technical Challenges:**
- OCR van handgeschreven tekst
- Meerdere talen detecteren en vertalen
- Photo orientation detection
- Poor lighting/quality handling

**API Endpoint:**
- `POST /api/import` met `FormData` (photos array)

---

### 03. Recipe View - Detail Page
**File:** `03-recipe-view-detail.md`

**Samenvatting:**
Gebruiker kan een recept bekijken met alle details: hero image, titel, metadata badges, ingrediënten (met checkboxes), instructies (genummerde stappen), en persoonlijke notities.

**Key Features:**
- Server-side rendered detail pagina (`/recipes/[slug]`)
- Hero image met bookmark button
- Metadata badges (tijd, porties, moeilijkheid, bron)
- 3 tabs: Ingrediënten, Bereidingswijze, Notities
- Serving size adjustment (ingrediënten schalen automatisch)
- Ingredient checkboxes (client-side, niet opgeslagen)
- Print-friendly layout
- Favorite toggle (bookmark)

**Database Queries:**
```sql
-- Main recipe fetch
SELECT r.*, pi.*, rt.tags
FROM recipes r
LEFT JOIN parsed_ingredients pi ON pi.recipe_id = r.id
LEFT JOIN recipe_tags rt ON rt.recipe_id = r.id
WHERE r.slug = $1;

-- Favorite toggle
UPDATE recipes SET is_favorite = NOT is_favorite WHERE id = $1;
```

**Client-side Features:**
- Tab switching (JavaScript)
- Serving adjustment calculator
- Checkbox state management
- Print functionality

---

### 04. Recipe Search & Filter
**File:** `04-recipe-search-filter.md`

**Samenvatting:**
Gebruiker kan recepten zoeken op tekst en filteren op labels (type gerecht), ingrediënten, bron, en favorieten. Homepage met recipe grid.

**Key Features:**
- Real-time search (debounced)
- Filter dropdown met expandable secties:
  - Type gerecht (voorgerecht, hoofdgerecht, dessert, etc.)
  - Ingrediënt (kip, vis, vegetarisch, etc.)
  - Bron (Jeroen Meus, Laura Bakeries, etc.)
- Favorieten toggle
- Active filters display (removable chips)
- Recipe count: "[X] recepten gevonden"
- Responsive recipe grid (1-4 kolommen)
- Empty state wanneer geen resultaten

**Database Queries:**
```sql
-- Search + filters
SELECT * FROM recipes
WHERE
  (LOWER(title) LIKE '%' || $search || '%' OR
   LOWER(description) LIKE '%' || $search || '%')
  AND labels && $selectedLabels::text[]  -- array overlap
  AND is_favorite = $favoritesOnly
  AND source_name = ANY($selectedSources)
ORDER BY created_at DESC;

-- Full-text search (advanced)
WHERE search_vector @@ plainto_tsquery('dutch', $search);
```

**Performance:**
- Database indexes op `labels`, `is_favorite`, `source_name`
- GIN index op `search_vector` voor full-text search
- Debounced search (300ms)
- Pagination (optioneel, 24 per pagina)

**State Management:**
- URL query parameters voor filter persistence
- `/?search=pasta&labels=hoofdgerecht&favorites=true`

---

### 05. Recipe Edit & Notes
**File:** `05-recipe-edit-notes.md`

**Samenvatting:**
Gebruiker kan alle velden van een recept bewerken (titel, beschrijving, metadata, ingrediënten, instructies) en persoonlijke notities toevoegen.

**Key Features:**
- Edit mode toggle ("Bewerk" → "Opslaan" button)
- Inline editing van alle velden:
  - Titel, beschrijving
  - Metadata (prep time, cook time, servings, difficulty)
  - Labels/tags (multi-select met autocomplete)
  - Ingrediënten (drag & drop, add/remove)
  - Instructies (markdown editor)
  - Notities (textarea met auto-save)
  - Afbeelding wijzigen (upload naar Supabase Storage)
- Validation & error handling
- Unsaved changes warning
- Recipe deletion met confirmatie

**Database Updates:**
```sql
-- Full recipe update
UPDATE recipes SET
  title = $1,
  slug = $2,
  description = $3,
  prep_time = $4,
  cook_time = $5,
  servings_default = $6,
  difficulty = $7,
  image_url = $8,
  source_name = $9,
  labels = $10,
  content_markdown = $11,
  notes = $12,
  notes_updated_at = NOW(),
  updated_at = NOW()
WHERE id = $13;

-- Ingredients: delete all + re-insert
DELETE FROM parsed_ingredients WHERE recipe_id = $1;
INSERT INTO parsed_ingredients (...) VALUES (...);
```

**Special Features:**
- Auto-save voor notities (2 seconden debounce)
- Smart ingredient parsing (extract amount, unit, name)
- Image upload naar Supabase Storage bucket
- Slug auto-generation from title

---

## Database Schema Summary

### Current Tables (Verified)
Based on Supabase inspection:

✅ **recipes**
- Core fields: id, title, slug, description, content_markdown
- Metadata: prep_time, cook_time, servings_default, difficulty
- Media: image_url
- Source: source_url, source_name, source_language
- Features: labels (text[]), is_favorite, notes, notes_updated_at
- Search: search_vector (tsvector)
- Timestamps: created_at, updated_at

✅ **parsed_ingredients**
- id, recipe_id
- ingredient_name_nl, amount, unit, amount_display
- scalable, section, order_index
- created_at

✅ **tags**
- id, name, slug, created_at

✅ **recipe_tags** (junction)
- recipe_id, tag_id

✅ **extracted_keywords**
- id, recipe_id, keyword, confidence, created_at

### Schema Alignment with CLAUDE.md

**Differences Found:**

1. **ingredients table (CLAUDE.md)** vs **parsed_ingredients (actual)**
   - CLAUDE.md specifies: id, recipe_id, item, amount, order
   - Actual schema is more advanced with parsing support
   - ✅ Actual is better for the use cases

2. **categories table (CLAUDE.md)** vs **tags (actual)**
   - Functionally the same, just renamed
   - ✅ No issue

3. **recipe_categories junction (CLAUDE.md)** vs **recipe_tags (actual)**
   - Functionally the same
   - ✅ No issue

4. **notes table (CLAUDE.md)** vs **recipes.notes column (actual)**
   - CLAUDE.md: separate table with id, recipe_id, content, created_at
   - Actual: single column in recipes table
   - ⚠️ Difference: cannot have multiple notes per recipe
   - ✅ For household use, one notes field is sufficient

**Recommendation:** Update CLAUDE.md to reflect actual schema

### Missing Features (Optional Future Enhancements)

1. **Auth Users**
   - Currently: single-user household app
   - Future: multi-user with auth

2. **Recipe Versions/History**
   - Track changes over time
   - Undo functionality

3. **Shopping Lists**
   - Generate shopping list from recipe
   - Combine multiple recipes

4. **Meal Planning**
   - Weekly meal calendar
   - Link recipes to dates

5. **Ratings/Reviews**
   - Star ratings
   - Review comments (different from notes)

---

## E2E Integration Checklist

### Frontend Components Needed
- [ ] `components/import-dialog.tsx` - URL/Photo import modal
- [ ] `components/recipe-card.tsx` - Grid item with hover, favorite
- [ ] `components/recipe-detail-view.tsx` - Read-only recipe display
- [ ] `components/recipe-edit-view.tsx` - Editable recipe form
- [ ] `components/search-bar.tsx` - Search input with icon
- [ ] `components/filter-dropdown.tsx` - Multi-select filters
- [ ] `components/ingredient-list.tsx` - Checkboxes, scalable amounts
- [ ] `components/markdown-renderer.tsx` - Display instructions
- [ ] `components/tag-selector.tsx` - Multi-select tags
- [ ] `components/image-upload.tsx` - Drag & drop image upload

### Pages Needed
- [ ] `app/page.tsx` - Homepage (search, filter, grid)
- [ ] `app/recipes/[slug]/page.tsx` - Recipe detail
- [ ] `app/api/import/route.ts` - Import endpoint (URL + Photos)
- [ ] `app/api/recipes/route.ts` - List/filter recipes (optional)

### Backend Services Needed
- [ ] `lib/gemini.ts` - AI extraction (URL & photos)
- [ ] `lib/supabase/server.ts` - Server-side Supabase client
- [ ] `lib/supabase/client.ts` - Client-side Supabase client
- [ ] `lib/ingredient-parser.ts` - Parse "2 el olijfolie" into structured data
- [ ] `lib/slug-generator.ts` - Generate URL-safe slugs
- [ ] `lib/markdown.ts` - Markdown parsing utilities

### Database Migrations Needed
None! Current schema is ready to use.

**Optional Improvements:**
```sql
-- Add indexes for better performance
CREATE INDEX idx_recipes_search ON recipes USING gin(search_vector);
CREATE INDEX idx_recipes_labels ON recipes USING gin(labels);
CREATE INDEX idx_recipes_favorite ON recipes(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_recipes_source ON recipes(source_name);

-- Add trigger for search_vector auto-update
CREATE TRIGGER update_recipes_search_vector
BEFORE INSERT OR UPDATE ON recipes
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.dutch', title, description, content_markdown);
```

### Supabase Storage Buckets Needed
- [ ] `recipe-images` - Public bucket for recipe photos
  - Max file size: 5MB
  - Allowed types: image/jpeg, image/png, image/webp
  - Public access for reading

### Environment Variables Needed
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.63:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
SUPABASE_SERVICE_KEY=[service role key]

# Gemini AI
GEMINI_API_KEY=[api key]

# Database (for direct access via MCP)
DATABASE_URL=postgresql://postgres:[password]@192.168.1.63:5432/postgres
```

### Testing Strategy

**Unit Tests:**
- [ ] Ingredient parser: "2 el olijfolie" → {amount: 2, unit: "el", name: "olijfolie"}
- [ ] Slug generator: "Venkelsoep met gegrilde merguez" → "venkelsoep-met-gegrilde-merguez"
- [ ] Serving calculator: scale ingredients by ratio
- [ ] Markdown sanitization: prevent XSS

**Integration Tests:**
- [ ] Gemini AI extraction (mock responses)
- [ ] Supabase queries (all CRUD operations)
- [ ] Image upload to storage

**E2E Tests (Playwright/Cypress):**
- [ ] Import recipe from URL
- [ ] Import recipe from photos
- [ ] Search and filter recipes
- [ ] View recipe detail
- [ ] Edit recipe and save
- [ ] Add notes with auto-save
- [ ] Toggle favorite
- [ ] Delete recipe
- [ ] Print recipe

---

## Development Phases

### Phase 1: Core Infrastructure (Week 1)
- ✅ Database schema (already exists)
- [ ] Supabase client setup
- [ ] Environment configuration
- [ ] Basic Next.js app structure
- [ ] Tailwind CSS theming (from wireframes)

### Phase 2: Recipe Import (Week 2)
- [ ] Import dialog UI
- [ ] Gemini AI integration
- [ ] URL import flow
- [ ] Photo import flow
- [ ] Database insert logic
- [ ] Error handling

### Phase 3: Recipe Display (Week 3)
- [ ] Homepage with grid
- [ ] Recipe detail page
- [ ] Tabs (Ingrediënten, Bereidingswijze, Notities)
- [ ] Serving size adjustment
- [ ] Print functionality
- [ ] Favorite toggle

### Phase 4: Search & Filter (Week 4)
- [ ] Search bar with real-time search
- [ ] Filter dropdown UI
- [ ] Filter logic (labels, ingredients, source)
- [ ] Active filters display
- [ ] URL parameter sync
- [ ] Empty state

### Phase 5: Edit & Notes (Week 5)
- [ ] Edit mode UI
- [ ] Inline editing for all fields
- [ ] Tag selector
- [ ] Ingredient editor (drag & drop)
- [ ] Markdown editor for instructions
- [ ] Notes auto-save
- [ ] Image upload
- [ ] Delete recipe

### Phase 6: Polish & Testing (Week 6)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading states & skeletons
- [ ] Error handling & validation
- [ ] Accessibility (ARIA, keyboard navigation)
- [ ] E2E tests
- [ ] Performance optimization
- [ ] SEO metadata

### Phase 7: Deployment (Week 7)
- [ ] Coolify deployment setup
- [ ] Environment variables in Coolify
- [ ] GitHub auto-deploy on push
- [ ] SSL/domain configuration (Nginx Proxy Manager)
- [ ] Production testing
- [ ] User acceptance testing

---

## Notes for E2E Developer

### Key Design Decisions
1. **Single-user household app** - No authentication required (for now)
2. **Dutch-first** - All content in Dutch, ingredient names normalized to Dutch
3. **Markdown for instructions** - Flexible formatting, easy to edit
4. **AI-powered import** - Gemini handles both URL and photo extraction
5. **Self-hosted** - Supabase + Coolify, full data ownership

### Wireframe References
- `wireframes/search-page.html` - Homepage layout, filters, grid
- `wireframes/recipe-detail.html` - Detail page, tabs, badges

### Database Connection
- MCP server already configured for direct database access
- Use Supabase client for Next.js app
- Connection string in SUPABASE-CONNECTION.md

### Deployment
- See COOLIFY-DEPLOYMENT.md for deployment instructions
- Auto-deploy on git push to main branch
- Environment variables managed in Coolify dashboard

### Questions/Clarifications
If anything is unclear:
1. Check wireframes for exact UI
2. Check PRD.md for tech stack decisions
3. Check CLAUDE.md for feature list
4. Refer back to specific user story for detailed AC

Good luck with E2E development! 🚀
