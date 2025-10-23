# User Story: Recepten Zoeken en Filteren

## Epic
Recipe Discovery & Navigation

## Story
Als huishoudgebruiker wil ik recepten kunnen zoeken en filteren op basis van ingrediënten, type gerecht, bron en favorieten, zodat ik snel het gewenste recept kan vinden.

## Acceptance Criteria

### AC1: Homepage Layout
**Given** de gebruiker opent de applicatie
**When** de homepage (`/`) wordt geladen
**Then** wordt getoond:

**Header:**
- Titel: "Recepten" (2xl, bold, serif font)
- Button: "Importeer Recept" (primary, rechts)
- Sticky positie (blijft bovenaan bij scrollen)
- Border-bottom
- Background: white

**Main Content:**
- Zoekbalk met inline filters
- Active filters display (indien actief)
- Recipe count: "[X] recepten gevonden"
- Recipe grid (cards)

### AC2: Zoekbalk
**Given** de gebruiker wil recepten zoeken
**When** de zoekbalk wordt gerenderd
**Then** bevat deze:

**Input Field:**
- Type: text
- Placeholder: "Zoek in recepten..."
- Icoon: Search (links, binnen input)
- Full-width
- Border-radius: var(--radius)
- Focus: ring effect (primary color)

**Zoek Functionaliteit:**
- Real-time zoeken (debounced, 300ms)
- Zoekt in: `recipes.title` + `recipes.description`
- Case-insensitive
- Partial match (LIKE '%query%')
- Updates recipe count onmiddellijk

**Database Query:**
```sql
SELECT *
FROM recipes
WHERE
  (LOWER(title) LIKE LOWER('%' || $1 || '%')
   OR LOWER(description) LIKE LOWER('%' || $1 || '%'))
  AND [other filters]
ORDER BY
  -- Relevantie: exact match in titel eerst
  CASE
    WHEN LOWER(title) = LOWER($1) THEN 1
    WHEN LOWER(title) LIKE LOWER($1 || '%') THEN 2
    ELSE 3
  END,
  created_at DESC;
```

**Advanced: Full-text Search (optioneel)**
```sql
-- Using search_vector column
WHERE search_vector @@ plainto_tsquery('dutch', $1)
ORDER BY ts_rank(search_vector, plainto_tsquery('dutch', $1)) DESC;
```

### AC3: Filter Bar - Favorieten Toggle
**Given** de gebruiker wil alleen favoriete recepten zien
**When** de filter bar wordt getoond
**Then** is er een "Favorieten" chip:

**Favorieten Chip:**
- Icoon: Heart (outline)
- Tekst: "Favorieten"
- Styling: filter-chip class
- Default: niet actief (wit met border)
- Active: primary background, white text

**Click Behavior:**
```typescript
const [showFavorites, setShowFavorites] = useState(false);

const toggleFavorites = () => {
  setShowFavorites(!showFavorites);
  filterRecipes();
};
```

**Filter Logic:**
```sql
SELECT * FROM recipes
WHERE is_favorite = TRUE
AND [other filters];
```

**UI Feedback:**
- Toggle tussen active/inactive state
- Recipe grid update onmiddellijk
- Count update: "3 recepten gevonden" (alleen favorieten)

### AC4: Filter Bar - Filter Dropdown
**Given** de gebruiker wil op categorieën filteren
**When** de gebruiker klikt op "Filter" chip
**Then** wordt een dropdown menu geopend:

**Filter Chip:**
- Icoon: Filter
- Tekst: "Filter"
- Chevron-down icoon (rechts)
- Hover: border primary, light background

**Dropdown Positie:**
- Position: absolute
- Top: 100% + 0.5rem
- Left: 0
- Z-index: 50
- Min-width: 280px
- Background: white
- Border + shadow
- Border-radius

**Close Behavior:**
- Click buiten dropdown → sluit
- Escape key → sluit
- Blijft open bij selecties (niet auto-close)

### AC5: Filter Dropdown - Type Gerecht
**Given** de filter dropdown is geopend
**When** de gebruiker kijkt naar de filters
**Then** ziet de gebruiker de eerste sectie:

**Sectie Header:**
- Checkbox (toggle om sectie open/dicht te klappen)
- Label: "Type gerecht"
- Font: 0.875rem, medium weight

**Opties (alleen zichtbaar als checkbox checked):**
- Voorgerecht
- Hoofdgerecht
- Dessert
- Bijgerecht
- Soep
- Salade
- Snack

**Data Source:**
`recipes.labels` (text array)

**Filter Logic:**
```sql
SELECT * FROM recipes
WHERE labels && ARRAY['hoofdgerecht', 'dessert']::text[]
-- && is array overlap operator
```

**Multi-select:**
- Meerdere opties kunnen tegelijk geselecteerd
- OR logic: show if ANY selected label matches
- Checkboxes: 1rem size

**Weergave:**
```html
<div class="filter-dropdown-section">
  <label class="filter-dropdown-label">
    <input type="checkbox" class="checkbox-small" id="toggle-labels" />
    <span>Type gerecht</span>
  </label>
  <div id="labelFilters" class="filter-dropdown-options" style="display: none;">
    <label>
      <input type="checkbox" data-label="voorgerecht" />
      Voorgerecht
    </label>
    <!-- etc -->
  </div>
</div>
```

### AC6: Filter Dropdown - Ingrediënt
**Given** de filter dropdown is geopend
**When** de gebruiker wil filteren op ingrediënt
**Then** ziet de gebruiker de tweede sectie:

**Opties:**
- Kip
- Vis
- Varkensvlees
- Rundvlees
- Vegetarisch
- Pasta
- Rijst
- Aardappelen
- Chocolade

**Data Source:**
`extracted_keywords.keyword` OR custom ingredient tags

**Database Query:**
```sql
SELECT DISTINCT r.*
FROM recipes r
JOIN extracted_keywords ek ON ek.recipe_id = r.id
WHERE ek.keyword IN ('kip', 'vis', 'pasta')
AND [other filters];
```

**Alternative (simplified):**
Search in ingredient names:
```sql
SELECT DISTINCT r.*
FROM recipes r
JOIN parsed_ingredients pi ON pi.recipe_id = r.id
WHERE pi.ingredient_name_nl IN ('kip', 'vis', 'pasta')
```

**Multi-select:**
- OR logic: show if ANY selected ingredient matches

### AC7: Filter Dropdown - Bron
**Given** de filter dropdown is geopend
**When** de gebruiker wil filteren op bron
**Then** ziet de gebruiker de derde sectie:

**Opties:**
- Jeroen Meus
- Laura Bakeries
- Dagelijkse Kost
- Njam
- Eigen Recept

**Data Source:**
`recipes.source_name`

**Auto-populate:**
Deze lijst wordt dynamisch gegenereerd uit database:
```sql
SELECT DISTINCT source_name
FROM recipes
WHERE source_name IS NOT NULL
ORDER BY source_name;
```

**Filter Logic:**
```sql
SELECT * FROM recipes
WHERE source_name IN ('Jeroen Meus', 'Laura Bakeries')
```

### AC8: Active Filters Display
**Given** de gebruiker heeft filters toegepast
**When** minimaal 1 filter actief is
**Then** wordt een "Active Filters" bar getoond:

**Locatie:**
- Tussen filter bar en recipe count
- Flex layout met wrap
- Gap: 0.5rem

**Active Filter Chip:**
```html
<div class="active-filter-chip">
  <span>[Filter label]: [Filter value]</span>
  <button class="remove-btn" aria-label="Verwijder filter">×</button>
</div>
```

**Voorbeelden:**
- "Type: Hoofdgerecht"
- "Type: Dessert"
- "Ingrediënt: Kip"
- "Bron: Jeroen Meus"
- "Favorieten"

**Styling:**
- Background: primary light (opacity 0.1)
- Border: primary
- Font-size: 0.875rem
- Border-radius: full (pill shape)
- Padding: 0.25rem 0.75rem
- Remove button: × symbool, hover: red

**Remove Filter:**
Click op × → filter wordt verwijderd → recipes update

**Clear All:**
Als 3+ filters actief:
```html
<button class="text-sm text-primary underline">
  Wis alle filters
</button>
```

### AC9: Recipe Count
**Given** filters/zoek zijn toegepast
**When** de recipe lijst wordt gefilterd
**Then** wordt de count getoond:

**Weergave:**
- "[X] recepten gevonden"
- Font-size: small
- Color: muted-foreground
- Updates real-time bij filter changes

**Voorbeelden:**
- "12 recepten gevonden" (geen filters)
- "3 recepten gevonden" (met filters)
- "0 recepten gevonden" → toon empty state

### AC10: Recipe Grid
**Given** recepten zijn geladen
**When** de grid wordt gerenderd
**Then** is de layout:

**Grid Specificaties:**
- Display: grid
- Columns:
  - Mobile (< 640px): 1 kolom
  - Tablet (640-1024px): 2 kolommen
  - Desktop (1024-1280px): 3 kolommen
  - Large (> 1280px): 4 kolommen
- Gap: 1.5rem (24px)
- Container: max-width 7xl, centered

**Responsive:**
```css
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

### AC11: Recipe Card
**Given** een recept in de grid
**When** de card wordt gerenderd
**Then** bevat deze:

**Card Structure:**
```html
<div class="card" data-labels="hoofdgerecht" data-ingredients="kip,rijst" data-source="jeroen-meus">
  <!-- Image -->
  <div class="relative">
    <img src="[image_url]" alt="[title]" class="recipe-card-image" />
    <button class="heart-btn">
      <HeartIcon />
    </button>
  </div>

  <!-- Content -->
  <div class="p-4">
    <h3 class="font-semibold text-lg mb-2">[title]</h3>

    <!-- Badges -->
    <div class="flex flex-wrap gap-1 mb-2">
      <span class="badge">[label]</span>
      <span class="badge">[ingredient]</span>
    </div>

    <!-- Source -->
    <div class="text-xs mb-2 text-muted-foreground">
      Bron: [source_name]
    </div>

    <!-- Meta -->
    <div class="flex items-center gap-3 text-sm text-muted-foreground">
      <span>⏱️ [total_time] min</span>
      <span>👤 [servings] porties</span>
    </div>
  </div>
</div>
```

**Image:**
- Width: 100%
- Height: 200px
- Object-fit: cover
- Lazy loading: `loading="lazy"`

**Heart Button:**
- Position: absolute, top-right
- Background: white, semi-transparent
- Shadow: sm
- Size: 2.5rem circle
- Filled if `is_favorite = true`

**Click Behavior:**
- Click on card (niet heart) → navigate to `/recipes/[slug]`
- Click on heart → toggle favorite (stop propagation)

**Hover Effect:**
- Transform: translateY(-2px)
- Shadow: md
- Smooth transition (0.2s)

### AC12: Empty State
**Given** de filters resulteren in 0 recepten
**When** de recipe grid wordt gerenderd
**Then** wordt getoond:

```html
<div class="text-center py-12">
  <div class="text-6xl mb-4">🔍</div>
  <h2 class="text-2xl font-bold mb-2">Geen recepten gevonden</h2>
  <p class="text-muted-foreground mb-6">
    Probeer andere filters of zoektermen
  </p>
  <button class="btn btn-primary" onclick="clearAllFilters()">
    Wis alle filters
  </button>
</div>
```

### AC13: Filter State Persistence
**Given** de gebruiker heeft filters toegepast
**When** de gebruiker navigeert naar een recept en terug gaat
**Then** blijven de filters behouden

**Implementation Options:**

**Optie 1: URL Query Parameters**
```
/?search=pasta&labels=hoofdgerecht&ingredients=kip&favorites=true
```

**Optie 2: LocalStorage**
```typescript
localStorage.setItem('recipeFilters', JSON.stringify({
  search: 'pasta',
  labels: ['hoofdgerecht'],
  ingredients: ['kip'],
  favorites: true
}));
```

**Optie 3: React Context**
Global state die persist tijdens sessie

**Recommended:** URL query params (deelbaar, SEO-vriendelijk)

### AC14: Filter Performance
**Given** er zijn 1000+ recepten in database
**When** filters worden toegepast
**Then** moet de response tijd < 500ms zijn

**Optimization Strategies:**

**Database Indexes:**
```sql
-- Full-text search index
CREATE INDEX idx_recipes_search ON recipes USING gin(search_vector);

-- Label filtering
CREATE INDEX idx_recipes_labels ON recipes USING gin(labels);

-- Favorite filtering
CREATE INDEX idx_recipes_favorite ON recipes(is_favorite) WHERE is_favorite = TRUE;

-- Source filtering
CREATE INDEX idx_recipes_source ON recipes(source_name);

-- Ingredient keywords
CREATE INDEX idx_keywords_keyword ON extracted_keywords(keyword);
CREATE INDEX idx_keywords_recipe ON extracted_keywords(recipe_id);
```

**Client-side:**
- Debounce search input (300ms)
- Virtualization voor 100+ results (react-window)
- Pagination: 24 recepten per pagina

### AC15: Mobile Filter UX
**Given** de gebruiker is op mobiel (< 640px)
**When** de filter dropdown wordt geopend
**Then** wordt deze aangepast:

**Mobile Optimizations:**
- Full-width dropdown (niet min-width)
- Max-height: 60vh (scrollable)
- Sticky "Toepassen" button onderaan
- Close button bovenaan (×)
- Overlay achter dropdown (backdrop)

**Alternative Design:**
Bottom sheet/modal ipv dropdown:
- Slide up van onderaan scherm
- Full-height minus header
- Better touch targets (44px min)

## Technical Implementation

### Client State Management
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FilterState {
  search: string;
  labels: Set<string>;
  ingredients: Set<string>;
  sources: Set<string>;
  favorites: boolean;
}

export function RecipeList({ initialRecipes }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    labels: new Set(searchParams.getAll('label')),
    ingredients: new Set(searchParams.getAll('ingredient')),
    sources: new Set(searchParams.getAll('source')),
    favorites: searchParams.get('favorites') === 'true'
  });

  const [filteredRecipes, setFilteredRecipes] = useState(initialRecipes);

  useEffect(() => {
    filterRecipes();
    updateURL();
  }, [filters]);

  const filterRecipes = async () => {
    // Client-side filtering OR
    // Fetch from API with query params
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    filters.labels.forEach(l => params.append('label', l));
    // etc...

    const response = await fetch(`/api/recipes?${params}`);
    const recipes = await response.json();
    setFilteredRecipes(recipes);
  };

  const updateURL = () => {
    const params = new URLSearchParams();
    // ... build params
    router.push(`/?${params}`, { scroll: false });
  };

  return (
    <>
      <SearchBar
        value={filters.search}
        onChange={(v) => setFilters({ ...filters, search: v })}
      />
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
      />
      <RecipeGrid recipes={filteredRecipes} />
    </>
  );
}
```

### API Endpoint (optioneel)
```typescript
// app/api/recipes/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('search');
  const labels = searchParams.getAll('label');
  const ingredients = searchParams.getAll('ingredient');
  const sources = searchParams.getAll('source');
  const favorites = searchParams.get('favorites') === 'true';

  const supabase = createClient();

  let query = supabase.from('recipes').select('*');

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (labels.length > 0) {
    query = query.overlaps('labels', labels);
  }

  if (favorites) {
    query = query.eq('is_favorite', true);
  }

  if (sources.length > 0) {
    query = query.in('source_name', sources);
  }

  // Ingredient filtering requires JOIN
  if (ingredients.length > 0) {
    // Complex query, might need raw SQL
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  return Response.json(data);
}
```

### Database Schema Verification

**Confirm Required Columns Exist:**
```sql
-- recipes table
SELECT column_name FROM information_schema.columns
WHERE table_name = 'recipes'
AND column_name IN ('title', 'slug', 'description', 'image_url', 'source_name', 'is_favorite', 'labels', 'search_vector');

-- parsed_ingredients table
SELECT column_name FROM information_schema.columns
WHERE table_name = 'parsed_ingredients';

-- extracted_keywords table
SELECT column_name FROM information_schema.columns
WHERE table_name = 'extracted_keywords';
```

**Current Schema (from analysis):**
✅ `recipes.labels` (text array) - for type filtering
✅ `recipes.is_favorite` (boolean) - for favorite filtering
✅ `recipes.source_name` (text) - for source filtering
✅ `recipes.search_vector` (tsvector) - for full-text search
✅ `parsed_ingredients` table - for ingredient filtering
✅ `extracted_keywords` table - for keyword/ingredient filtering

## Testing Scenarios

### E2E Test: Search
1. Open homepage
2. Type "soep" in search bar
3. Wait 300ms (debounce)
4. Expect: only recipes with "soep" in title/description shown
5. Count updates: "2 recepten gevonden"

### E2E Test: Filter by Label
1. Open homepage
2. Click "Filter" chip
3. Check "Type gerecht" to expand
4. Check "Dessert"
5. Expect: only dessert recipes shown
6. Active filter chip shown: "Type: Dessert"
7. Click × on chip
8. Expect: all recipes shown again

### E2E Test: Multiple Filters
1. Apply search: "kip"
2. Apply filter: label "Hoofdgerecht"
3. Apply filter: ingredient "Rijst"
4. Expect: only recipes matching ALL filters
5. Count updates accordingly

### E2E Test: Favorites
1. Click "Favorieten" chip
2. Expect: only recipes with is_favorite=true shown
3. Click favorite heart on a card
4. Expect: recipe disappears from list (if filtering favorites)

### E2E Test: Empty State
1. Apply search: "zzz" (no matches)
2. Expect: empty state shown
3. Click "Wis alle filters"
4. Expect: all recipes shown again

### E2E Test: Filter Persistence
1. Apply filters
2. Navigate to recipe detail
3. Click back button
4. Expect: filters still applied (from URL params)

## Performance Requirements
- Initial page load: < 2s
- Filter application: < 300ms
- Search debounce: 300ms
- Recipe card hover: 60fps smooth animation
- Grid layout shift: 0 (CLS score)

## Accessibility
- Search input: label or aria-label
- Filter checkboxes: proper labels
- Keyboard navigation: Tab through filters
- Screen reader: announce filter changes
- Focus management: return to trigger after dropdown close

## Future Enhancements
- Save filter presets ("Snelle weekavond maaltijden")
- Sort options (nieuwste, populairste, alfabetisch)
- Advanced search (exclude ingredients, difficulty)
- Recipe suggestions based on available ingredients
- Filter by cooking time range
- Filter by dietary restrictions (vegan, glutenvrij)
- Recipe of the day/week
- Recently viewed recipes
