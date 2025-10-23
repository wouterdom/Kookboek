# Implementation Status - Kookboek

**Last Updated:** 2025-10-23
**Project Phase:** Early Development
**Overall Progress:** 25% Complete

---

## ✅ COMPLETED Infrastructure

### Database & Storage
- [x] **PostgreSQL Tables** - All 5 tables created and configured
  - `recipes` (21 columns)
  - `parsed_ingredients` (10 columns with section support)
  - `tags` (4 columns)
  - `recipe_tags` (2 columns, junction table)
  - `extracted_keywords` (5 columns)

- [x] **Database Indexes** - Performance optimized
  - GIN index on `search_vector` for full-text search
  - GIN index on `labels` array for filtering
  - Partial index on `is_favorite` for favorites filtering
  - DESC index on `created_at` for sorting
  - GIN index on `title` for title search

- [x] **Database Triggers** - Auto-update search vector
  - Trigger: `recipes_search_trigger`
  - Function: `recipes_search_update()`
  - Language: Dutch (nl) text search

- [x] **Storage Bucket** - `recipe-images`
  - Public access: enabled
  - File size limit: 5MB
  - Allowed types: image/jpeg, image/jpg, image/png, image/webp

- [x] **Sample Data** - 1 recipe with ingredients
  - Recipe: "Balletjes in tomatensaus"
  - 14 parsed ingredients with sections
  - Labels: ["hoofdgerecht", "vlees", "Belgisch"]

---

## ✅ COMPLETED Frontend Setup

### Project Configuration
- [x] **Next.js 15** initialized
- [x] **TypeScript** configured
- [x] **Tailwind CSS** configured
- [x] **Image Optimization** - `next.config.ts` updated
  - Supabase storage hostname added: `192.168.1.63:8000`
  - Unsplash images allowed
  - UI avatars allowed

### Type Definitions
- [x] **`types/database.ts`** - Complete and accurate
  - Matches actual database schema 100%
  - Uses `content_markdown` (not `content`)
  - Uses `servings_default` (not `servings`)
  - Uses `parsed_ingredients` table
  - Uses `labels` array
  - Uses `notes` as text field
  - Includes `RecipeWithDetails` interface

### Supabase Client
- [x] **`lib/supabase.ts`** - Client configured
  - Type-safe client with Database types
  - Helper function: `getRecipeWithDetails(slug)`
  - Helper function: `getAllRecipes()`
  - Properly fetches ingredients with order
  - Fetches tags via junction table

### UI Components (Shadcn)
- [x] `components/ui/button.tsx`
- [x] `components/ui/badge.tsx`
- [x] `components/ui/input.tsx`
- [x] `components/ui/card.tsx`

### Feature Components
- [x] `components/recipe-card.tsx` - Grid item component
- [x] `components/import-dialog.tsx` - Import modal (partial)

### Pages
- [x] **`app/recipes/[slug]/page.tsx`** - Recipe detail page
  - Server-side rendering ready
  - Client-side interactivity for tabs, servings, checkboxes
  - Correctly uses `content_markdown` for instructions
  - Correctly uses `servings_default`
  - Correctly uses `parsed_ingredients` with `ingredient_name_nl`
  - Correctly displays ingredient sections
  - Correctly displays `notes` field
  - Print functionality
  - Responsive design

---

## ⏳ IN PROGRESS

### Homepage
- [ ] **`app/page.tsx`** - Recipe list/grid page
  - Currently missing or incomplete
  - Needs: recipe grid, search bar, filters
  - Should use `getAllRecipes()` from supabase.ts

---

## ❌ NOT STARTED - Priority Order

### Critical Path (MVP Features)

#### 1. Homepage Implementation ⭐⭐⭐
**File:** `app/page.tsx`

**Tasks:**
- [ ] Fetch recipes with `getAllRecipes()`
- [ ] Display recipe grid (responsive: 1-4 columns)
- [ ] Show recipe cards with:
  - Image (with fallback)
  - Title
  - Labels as badges
  - Source name
  - Cook time, servings
  - Favorite heart icon
- [ ] Loading state
- [ ] Empty state (no recipes)

**Dependencies:** `components/recipe-card.tsx` (exists)

---

#### 2. Search Functionality ⭐⭐⭐
**Files Needed:**
- `components/search-bar.tsx`
- Update `app/page.tsx` to use search

**Tasks:**
- [ ] Create search input component
- [ ] Implement debounced search (300ms)
- [ ] Search in title + description
- [ ] Update URL params with search query
- [ ] Filter recipes client-side OR server-side

**API Option:** Create `app/api/recipes/route.ts` for server-side search

---

#### 3. Filter Functionality ⭐⭐⭐
**Files Needed:**
- `components/filter-dropdown.tsx`
- `components/active-filters.tsx`

**Tasks:**
- [ ] Create filter dropdown with sections:
  - Type gerecht (labels)
  - Bron (source_name)
  - Favorieten toggle
- [ ] Multi-select checkboxes
- [ ] Apply filters to recipe list
- [ ] Show active filter chips
- [ ] Update URL params with filters

**Database:** Use `labels` array for filtering (already indexed)

---

#### 4. Recipe Import - URL ⭐⭐⭐
**Files Needed:**
- `app/api/import/route.ts` - POST endpoint
- `lib/gemini.ts` - AI extraction service
- `lib/slug-generator.ts` - Generate URL slugs
- Complete `components/import-dialog.tsx`

**Tasks:**
- [ ] Implement POST /api/import endpoint
- [ ] Integrate Gemini AI SDK
- [ ] Fetch webpage HTML
- [ ] Extract recipe data with AI
- [ ] Insert into database:
  - recipes table
  - parsed_ingredients table
  - extracted_keywords table
- [ ] Generate slug from title
- [ ] Return recipe ID and slug
- [ ] Navigate to new recipe page

**Environment:** Requires `GEMINI_API_KEY`

---

#### 5. Recipe Import - Photos ⭐⭐
**Same as URL import, but:**

**Tasks:**
- [ ] Handle FormData with multiple files
- [ ] Convert files to base64
- [ ] Send to Gemini AI (multimodal)
- [ ] Handle confidence scoring
- [ ] Navigate to recipe in edit mode (for verification)

**Note:** More complex than URL import, can be done after URL works

---

#### 6. Favorite Toggle ⭐⭐
**Files Needed:**
- `app/api/recipes/[id]/favorite/route.ts` - PATCH endpoint
- Update `components/recipe-card.tsx` to use API
- Update `app/recipes/[slug]/page.tsx` bookmark button

**Tasks:**
- [ ] Implement PATCH endpoint to toggle `is_favorite`
- [ ] Add click handler to heart icon on cards
- [ ] Add click handler to bookmark button on detail page
- [ ] Optimistic UI update
- [ ] Update database

**Database:** Simple UPDATE query on `recipes.is_favorite`

---

#### 7. Edit Mode ⭐⭐
**Files Needed:**
- `components/recipe-edit-view.tsx`
- `app/api/recipes/[id]/route.ts` - PUT endpoint
- Update `app/recipes/[slug]/page.tsx` to support edit mode

**Tasks:**
- [ ] Toggle edit mode on "Bewerk" button
- [ ] Make all fields editable:
  - Title, description (text inputs)
  - Prep time, cook time, servings (number inputs)
  - Difficulty (select)
  - Labels (multi-select)
  - Ingredients (list with add/remove/reorder)
  - Instructions (textarea)
  - Notes (textarea)
- [ ] Implement PUT endpoint to save changes
- [ ] Update ingredients (delete + re-insert)
- [ ] Show validation errors
- [ ] Unsaved changes warning

**Complexity:** High - lots of forms and state management

---

#### 8. Notes Auto-save ⭐
**Files Needed:**
- `app/api/recipes/[id]/notes/route.ts` - PATCH endpoint
- Update notes editor in detail page

**Tasks:**
- [ ] Implement PATCH endpoint for notes only
- [ ] Debounce notes textarea (2 seconds)
- [ ] Auto-save to database
- [ ] Show "Opgeslagen" indicator
- [ ] Update `notes_updated_at` timestamp

**Database:** Simple UPDATE on `recipes.notes`

---

#### 9. Image Upload ⭐⭐
**Files Needed:**
- `lib/storage.ts` - Upload/delete helpers
- Update edit mode to support image upload

**Tasks:**
- [ ] Create image upload component
- [ ] Upload to Supabase Storage `recipe-images` bucket
- [ ] Generate unique filename
- [ ] Get public URL
- [ ] Update `recipes.image_url`
- [ ] Delete old image when replacing

**Storage:** Bucket already exists, just need upload logic

---

#### 10. Recipe Deletion ⭐
**Files Needed:**
- `app/api/recipes/[id]/route.ts` - DELETE endpoint
- Add delete button to edit mode

**Tasks:**
- [ ] Implement DELETE endpoint
- [ ] Show confirmation dialog
- [ ] Delete from database (cascades to ingredients, tags, keywords)
- [ ] Delete image from storage
- [ ] Navigate to homepage
- [ ] Show success toast

**Database:** Foreign keys configured with CASCADE DELETE

---

### Nice-to-Have Features (Post-MVP)

#### 11. Ingredient Parsing ⭐
**Files Needed:**
- `lib/ingredient-parser.ts`

**Tasks:**
- [ ] Parse "2 el olijfolie" into { amount: 2, unit: "el", name: "olijfolie" }
- [ ] Handle fractions (½, ¼, ¾)
- [ ] Normalize units (eetlepel → el, theelepel → tl)
- [ ] Handle "naar smaak" (amount: null)
- [ ] Use for serving size scaling

**Current Status:** Ingredients have `amount_display` only, parsing would improve scaling

---

#### 12. Ingredient Filtering ⭐
**Files Needed:**
- Update filter dropdown
- Create database function or join query

**Tasks:**
- [ ] Add ingredient filter section
- [ ] Fetch unique ingredients from `extracted_keywords`
- [ ] Filter recipes by keywords (JOIN query)
- [ ] Show in active filters

**Complexity:** Requires JOIN with `extracted_keywords` table

---

#### 13. Print Optimization ⭐
**Files Needed:**
- Add CSS print styles

**Tasks:**
- [ ] Hide header, footer, buttons in print
- [ ] Hide tabs, only show all content
- [ ] Hide checkboxes
- [ ] Optimize fonts and spacing for A4
- [ ] Test print layout

**Current:** Basic print button exists, needs CSS refinement

---

#### 14. Serving Size Scaling ⭐
**Files Needed:**
- Update ingredient display logic

**Tasks:**
- [ ] Calculate ratio: `currentServings / defaultServings`
- [ ] Scale ingredient amounts by ratio
- [ ] Format scaled amounts (show fractions)
- [ ] Handle non-scalable ingredients

**Current:** UI exists for +/- buttons, scaling logic not implemented

---

#### 15. Loading States & Skeletons ⭐
**Tasks:**
- [ ] Add skeleton loaders for recipe cards
- [ ] Add skeleton for detail page
- [ ] Add loading spinner for API calls
- [ ] Add progress indicator for image uploads

---

#### 16. Error Handling ⭐
**Tasks:**
- [ ] Add error boundaries
- [ ] Add toast notifications (success, error)
- [ ] Add form validation errors
- [ ] Add network error handling
- [ ] Add 404 page (recipe not found)

---

#### 17. URL Parameter Sync ⭐
**Tasks:**
- [ ] Sync search to URL (?search=pasta)
- [ ] Sync filters to URL (?label=hoofdgerecht&favorite=true)
- [ ] Make URLs shareable
- [ ] Restore filters from URL on page load

**Benefit:** Shareable filtered links

---

#### 18. Responsive Design Audit ⭐
**Tasks:**
- [ ] Test on mobile (320px - 640px)
- [ ] Test on tablet (640px - 1024px)
- [ ] Test on desktop (1024px+)
- [ ] Fix any layout issues
- [ ] Optimize touch targets (44px min)

**Current:** Detail page looks good, homepage needs testing

---

#### 19. Accessibility Audit ⭐
**Tasks:**
- [ ] Add ARIA labels to icon buttons
- [ ] Ensure keyboard navigation works
- [ ] Test with screen reader
- [ ] Add focus visible styles
- [ ] Fix contrast issues
- [ ] Add alt text to all images

---

#### 20. Performance Optimization ⭐
**Tasks:**
- [ ] Implement pagination (24 recipes per page)
- [ ] Optimize images (WebP, lazy loading)
- [ ] Add caching headers
- [ ] Minimize bundle size
- [ ] Test Lighthouse score (target: > 90)

---

## Database Schema Notes

### ✅ Schema is Correct
All columns match user story requirements:

**recipes table:**
- ✅ `content_markdown` (not `content`)
- ✅ `servings_default` (not `servings`)
- ✅ `labels` as text array
- ✅ `notes` as text field
- ✅ `is_favorite` boolean
- ✅ `source_name` and `source_url`

**parsed_ingredients table:**
- ✅ `ingredient_name_nl` column
- ✅ `amount_display` for display
- ✅ `amount` and `unit` for scaling (can be NULL)
- ✅ `section` for ingredient grouping
- ✅ `order_index` for sorting

### ⚠️ Current Data Observation
In sample recipe "Balletjes in tomatensaus":
- `amount` and `unit` columns are NULL
- All data is in `amount_display` (e.g., "600 g", "1", "2 teentjes")

**Impact:**
- Display works fine (using `amount_display`)
- Serving scaling won't work perfectly without parsing
- Solution: Implement `lib/ingredient-parser.ts` to parse on-the-fly

**Recommendation:**
For MVP, serving scaling can:
1. Skip parsing, just show original amounts (easy)
2. Parse `amount_display` on-the-fly when scaling (medium)
3. Pre-parse and store `amount`/`unit` during import (better long-term)

---

## API Endpoints Status

| Endpoint | Method | Status | Priority |
|----------|--------|--------|----------|
| `/api/import` | POST | ❌ Not started | ⭐⭐⭐ Critical |
| `/api/recipes` | GET | ❌ Not started | ⭐⭐⭐ Critical |
| `/api/recipes/[slug]` | GET | ✅ Done (via SSR) | Done |
| `/api/recipes/[id]` | PUT | ❌ Not started | ⭐⭐ Important |
| `/api/recipes/[id]` | DELETE | ❌ Not started | ⭐ Nice to have |
| `/api/recipes/[id]/favorite` | PATCH | ❌ Not started | ⭐⭐ Important |
| `/api/recipes/[id]/notes` | PATCH | ❌ Not started | ⭐ Nice to have |

---

## Services Status

| Service | File | Status | Priority |
|---------|------|--------|----------|
| Gemini AI Extraction | `lib/gemini.ts` | ❌ Not started | ⭐⭐⭐ Critical |
| Ingredient Parser | `lib/ingredient-parser.ts` | ❌ Not started | ⭐ Nice to have |
| Slug Generator | `lib/slug-generator.ts` | ❌ Not started | ⭐⭐⭐ Critical |
| Image Upload | `lib/storage.ts` | ❌ Not started | ⭐⭐ Important |
| Amount Formatter | `lib/format.ts` | ❌ Not started | ⭐ Nice to have |

---

## Component Status

| Component | File | Status | Priority |
|-----------|------|--------|----------|
| Recipe Card | `components/recipe-card.tsx` | ✅ Exists | Done |
| Import Dialog | `components/import-dialog.tsx` | 🟡 Partial | ⭐⭐⭐ |
| Search Bar | `components/search-bar.tsx` | ❌ Not started | ⭐⭐⭐ |
| Filter Dropdown | `components/filter-dropdown.tsx` | ❌ Not started | ⭐⭐⭐ |
| Active Filters | `components/active-filters.tsx` | ❌ Not started | ⭐⭐ |
| Recipe Edit View | `components/recipe-edit-view.tsx` | ❌ Not started | ⭐⭐ |
| Notes Editor | Inline in detail page | ✅ Read-only | ⭐ |

---

## Environment Variables Needed

```bash
# .env.local (REQUIRED)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.63:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=[get from Supabase dashboard]
SUPABASE_SERVICE_KEY=[get from Supabase dashboard]

# Gemini AI (for import feature)
GEMINI_API_KEY=[get from Google AI Studio]

# Optional: Database direct access
DATABASE_URL=postgresql://postgres:[password]@192.168.1.63:5432/postgres
```

**Current Status:**
- ⚠️ Not configured (dummy values in code)
- 📝 Add to `.env.local` before testing

---

## Next Steps (Recommended Order)

### Week 1: Core Functionality
1. **Configure environment variables** (.env.local)
2. **Implement homepage** (app/page.tsx)
   - Display recipe grid
   - Use existing recipe-card component
3. **Implement search** (components/search-bar.tsx)
   - Client-side filtering for MVP
4. **Implement filters** (components/filter-dropdown.tsx)
   - Labels filter
   - Favorites toggle

### Week 2: Import Feature
5. **Setup Gemini AI** (lib/gemini.ts)
6. **Implement slug generator** (lib/slug-generator.ts)
7. **Implement URL import** (app/api/import/route.ts)
8. **Complete import dialog** (components/import-dialog.tsx)
9. **Test URL import** with real recipes

### Week 3: Edit & Favorites
10. **Implement favorite toggle** (API + UI)
11. **Implement edit mode** (components/recipe-edit-view.tsx)
12. **Implement recipe update** (app/api/recipes/[id]/route.ts)
13. **Test edit flow**

### Week 4: Polish
14. **Add loading states** everywhere
15. **Add error handling** and validation
16. **Responsive design** testing
17. **Accessibility** audit
18. **Performance** optimization

### Week 5: Deployment
19. **Deploy to Coolify**
20. **Configure production env vars**
21. **Test in production**
22. **User acceptance testing**

---

## Questions for Product Owner

1. **Serving Scaling:** Should we implement ingredient parsing now, or can we skip scaling for MVP?

2. **Import Priority:** URL import first, or both URL + Photo at the same time?

3. **Ingredient Filtering:** Do you want to filter by ingredients (needs JOIN query), or is label filtering enough for MVP?

4. **Edit Mode:** Full edit mode now, or just notes editing for MVP?

5. **Pagination:** Should we implement pagination (24 per page), or show all recipes?

6. **Search:** Client-side search (simpler) or server-side with full-text search (better performance)?

---

## Dependencies

### NPM Packages Needed (likely installed)
- [x] `@supabase/supabase-js` - Supabase client
- [ ] `@google/generative-ai` - Gemini AI SDK
- [x] `lucide-react` - Icons
- [ ] `sonner` or `react-hot-toast` - Toast notifications (optional)
- [ ] `@dnd-kit/core` - Drag & drop for ingredient reordering (optional)

### Environment Setup
- [x] Next.js 15 installed
- [x] TypeScript configured
- [x] Tailwind CSS configured
- [ ] Environment variables configured

---

## Blockers

### None Currently
All infrastructure is ready. Can start frontend development immediately.

### Potential Future Blockers
1. **Gemini AI API Key** - Needed for import feature
2. **Supabase Keys** - Needed to connect to database
3. **Image Upload Testing** - Need to verify bucket permissions

---

## Success Metrics

**MVP Definition (Minimum Viable Product):**
- ✅ View list of recipes
- ✅ View recipe detail with ingredients and instructions
- ⏳ Search recipes by title
- ⏳ Filter recipes by labels
- ⏳ Import recipe from URL
- ⏳ Toggle favorite
- ⏳ Add/edit notes

**Nice-to-Have (Post-MVP):**
- Import from photos
- Full edit mode
- Ingredient filtering
- Serving size scaling
- Print optimization

---

## Documentation Status

### ✅ Complete Documentation
- [x] User Stories (5 detailed documents)
- [x] Database Schema (complete with examples)
- [x] Implementation Plan (API endpoints, services, data flows)
- [x] Implementation Status (this document)

### 📝 Ready for Developer Handoff
All documentation is complete and ready for E2E development to begin.

---

**Last Updated:** 2025-10-23
**Next Review:** After Week 1 implementation

🚀 Ready to start development!
