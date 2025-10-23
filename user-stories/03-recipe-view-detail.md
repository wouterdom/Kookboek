# User Story: Recept Bekijken (Detail Pagina)

## Epic
Recipe Viewing & Management

## Story
Als huishoudgebruiker wil ik een recept kunnen bekijken met alle details (ingrediënten, instructies, notities), zodat ik het recept kan volgen tijdens het koken.

## Acceptance Criteria

### AC1: Navigatie naar Recept Detail
**Given** de gebruiker is op de zoekpagina (homepage)
**When** de gebruiker klikt op een recept card
**Then** wordt de gebruiker naar `/recipes/[slug]` genavigeerd

**URL Voorbeelden:**
- `/recipes/venkelsoep-met-gegrilde-merguez`
- `/recipes/chocolade-brownies`
- `/recipes/pasta-arrabiata`

**Routing:**
- Next.js dynamic route: `app/recipes/[slug]/page.tsx`
- Server Component (SSR)
- Data fetching op server

### AC2: Hero Section - Afbeelding
**Given** de recept detail pagina wordt geladen
**When** het recept een `image_url` heeft
**Then** wordt een hero afbeelding getoond:
- Full-width container
- Hoogte: 384px (24rem)
- Object-fit: cover
- Responsive: 250px op mobiel, 384px op desktop

**Als geen afbeelding:**
- Toon placeholder met receptnaam
- Of gradient achtergrond met kleur gebaseerd op categorie

**Bookmark Button:**
- Positie: absolute, top-right (16px van rand)
- Stijl: wit rondje met schaduw, semi-transparant
- Icoon: bookmark outline (niet gevuld)
- Hover: scale 1.1
- Alleen zichtbaar in browser (niet bij printen)

### AC3: Recept Header - Titel & Beschrijving
**Given** de pagina is geladen
**When** de hero sectie wordt getoond
**Then** wordt onder de afbeelding getoond:
- **Titel**: 4xl font, bold, serif font (Montserrat)
  - Voorbeeld: "Venkelsoep met gegrilde merguez"
- **Beschrijving**: lg font, muted foreground color
  - Voorbeeld: "Een verwarmende, aromatische soep..."
  - Optioneel veld (nullable in database)

**Spacing:**
- Padding: 2rem op alle kanten (mobiel: 1rem)
- Titel margin-bottom: 0.75rem
- Beschrijving margin-bottom: 2rem

### AC4: Metadata Badges
**Given** de recept data is beschikbaar
**When** de header wordt gerenderd
**Then** worden badges getoond met:

**Badge 1: Bereidingstijd (prep_time)**
- Icoon: Clock
- Tekst: "Bereidingstijd: [X] min"
- Alleen tonen als `prep_time IS NOT NULL`

**Badge 2: Kooktijd (cook_time)**
- Icoon: Chef-hat
- Tekst: "Kooktijd: [X] min"
- Alleen tonen als `cook_time IS NOT NULL`

**Badge 3: Moeilijkheidsgraad (difficulty)**
- Icoon: Signal (bars)
- Tekst: "Makkelijk" | "Gemiddeld" | "Moeilijk"
- Kleur: accent badge voor "Gemiddeld"
- Alleen tonen als `difficulty IS NOT NULL`

**Badge 4: Porties (servings_default)**
- Icoon: Users
- Tekst: "[X] porties"
- Bevat +/- knoppen voor aanpassing (zie AC8)
- ALTIJD tonen (required veld)

**Badge 5: Bron (source_name)**
- Icoon: Book-open
- Tekst: source_name (bijv. "Jeroen Meus")
- Primary badge styling
- Alleen tonen als `source_name IS NOT NULL`

**Badge Layout:**
- Flex wrap
- Gap: 0.75rem
- Alle badges: inline-flex, gap tussen icoon en tekst

### AC5: Tabs Navigatie
**Given** de gebruiker bekijkt de recept detail pagina
**When** de metadata sectie is gerenderd
**Then** wordt een tab navigatie getoond met:

**Tab 1: Ingrediënten** (default active)
**Tab 2: Bereidingswijze**
**Tab 3: Notities** (not visible when printing)

**Tab Styling:**
- Border-bottom: 1px solid border color
- Active tab: primary color, border-bottom 2px primary
- Inactive tab: muted foreground color
- Hover: foreground color
- Padding: 0.75rem horizontal, 1.5rem vertical
- Font-weight: 500
- Cursor: pointer

**Tab Switching:**
- Client-side interactivity
- URL hash wordt NIET aangepast
- Smooth transition (fade)
- State management in component

### AC6: Tab Content - Ingrediënten
**Given** de "Ingrediënten" tab is actief
**When** de content wordt gerenderd
**Then** wordt getoond:

**Heading:**
- "Ingrediënten" (2xl, semibold, serif)
- Margin-bottom: 1rem

**Ingrediënten Lijst:**
Data source: `parsed_ingredients` table
```sql
SELECT
  ingredient_name_nl,
  amount,
  unit,
  amount_display,
  scalable,
  section,
  order_index
FROM parsed_ingredients
WHERE recipe_id = [id]
ORDER BY order_index ASC;
```

**Weergave per Ingredient:**
```html
<label class="flex items-start gap-3 p-3 rounded hover:bg-gray-50 cursor-pointer">
  <input type="checkbox" class="checkbox mt-0.5" />
  <span class="flex-1">
    <strong>[amount_display]</strong> [ingredient_name_nl]
  </span>
</label>
```

**Voorbeelden:**
- `<strong>2 el</strong> olijfolie`
- `<strong>1</strong> grote ui, fijngesneden`
- `<strong>3</strong> venkelknollen, in dunne plakjes gesneden (groene toef bewaren)`

**Sections (optioneel):**
Als `section IS NOT NULL`:
```html
<h3 class="font-semibold mt-4 mb-2">[section]</h3>
<!-- ingredients in this section -->
```

Voorbeeld sections:
- "Voor de saus"
- "Voor de garnering"
- "Voor het deeg"

**Checkbox Functionaliteit:**
- Puur client-side (niet opgeslagen in database)
- Wordt NIET geprint
- Helpt gebruiker bij afvinken tijdens koken
- State wordt gereset bij page refresh

### AC7: Ingredient Scaling (Serving Adjustment)
**Given** de gebruiker wil het recept voor meer/minder personen maken
**When** de gebruiker klikt op de +/- knoppen bij "porties" badge
**Then** worden de ingrediënt hoeveelheden aangepast

**Logic:**
```typescript
const baseServings = recipe.servings_default; // e.g., 4
const [currentServings, setCurrentServings] = useState(baseServings);

const ratio = currentServings / baseServings;

// Voor elk ingredient:
if (ingredient.scalable) {
  const scaledAmount = ingredient.amount * ratio;
  const displayAmount = formatAmount(scaledAmount, ingredient.unit);
}
```

**Formatted Display:**
- 0.5 → "½"
- 0.25 → "¼"
- 0.75 → "¾"
- 1.5 → "1½"
- 2.333 → "2⅓" (afgerond op nearest fraction)

**Not Scalable Ingredients:**
- `scalable = false` in database
- Voorbeelden: "naar smaak zout", "snufje peper"
- Deze worden NIET aangepast bij scaling

**Constraints:**
- Minimum servings: 1
- Maximum servings: 99 (praktisch limiet)
- +/- buttons disabled bij limiet

**UI Feedback:**
- Aantal update is onmiddellijk (geen API call)
- Ingrediënt amounts updaten smooth
- Iconen: Minus en Plus (Lucide icons)

### AC8: Tab Content - Bereidingswijze
**Given** de "Bereidingswijze" tab is actief
**When** de content wordt gerenderd
**Then** wordt getoond:

**Heading:**
- "Bereidingswijze" (2xl, semibold, serif)
- Margin-bottom: 1.5rem

**Instructions:**
Data source: `recipes.content_markdown`
- Markdown format
- Genummerde stappen met visuele nummering

**Step Layout:**
```html
<div class="flex gap-4">
  <div class="flex-shrink-0">
    <div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
      [number]
    </div>
  </div>
  <div class="flex-1">
    <p class="leading-relaxed">[instruction text]</p>
  </div>
</div>
```

**Styling:**
- Stap nummer: primary background, white text, bold
- Tekst: leading-relaxed (line-height 1.625)
- Gap tussen stappen: 1.5rem (24px)

**Chef Tip (optioneel):**
Als er een tip in de markdown staat (bijvoorbeeld met `> Tip:` syntax):
```html
<div class="p-4 rounded-lg bg-accent text-accent-foreground">
  <div class="flex gap-3">
    <i data-lucide="lightbulb" class="icon"></i>
    <div>
      <strong>Tip van de chef</strong>
      <p class="text-sm opacity-90">[tip text]</p>
    </div>
  </div>
</div>
```

### AC9: Tab Content - Notities
**Given** de "Notities" tab is actief
**When** de content wordt gerenderd
**Then** wordt getoond:

**Heading:**
- "Notities" (2xl, semibold, serif)
- Margin-bottom: 1.5rem

**Notities Weergave:**
Data source: `recipes.notes`

**Als notes NULL of leeg:**
```html
<p class="text-muted-foreground italic">
  Nog geen notities toegevoegd. Klik op "Bewerk" om notities toe te voegen.
</p>
```

**Als notes aanwezig:**
```html
<div class="prose">
  [notes content] <!-- rendered as markdown -->
</div>
<p class="text-sm text-muted-foreground mt-4">
  Laatst bijgewerkt: [notes_updated_at formatted]
</p>
```

**Notes Functionaliteit:**
- Markdown support (bold, italic, lijsten, etc)
- Persoonlijke aantekeningen zoals:
  - "Volgende keer meer knoflook gebruiken"
  - "Familie vond dit heerlijk!"
  - "Bereidingstijd was eerder 30 min dan 20 min"
- Niet zichtbaar bij printen (optioneel)

### AC10: Header Actions - Terug Button
**Given** de gebruiker is op de recept detail pagina
**When** de gebruiker kijkt naar de header
**Then** ziet de gebruiker linksboven:

**Terug Button:**
- Icoon: Arrow-left
- Tekst: "Terug"
- Styling: outline button, small
- Action: `window.history.back()` of navigate naar `/`
- Niet zichtbaar bij printen

### AC11: Header Actions - Bewerk Button
**Given** de gebruiker is op de recept detail pagina
**When** de gebruiker kijkt naar de header
**Then** ziet de gebruiker rechtsboven:

**Bewerk Button:**
- Icoon: Edit-3
- Tekst: "Bewerk"
- Styling: primary button, small
- Action: Navigate naar edit mode (zie user story 05)
- Niet zichtbaar bij printen

**State Change:**
Als in edit mode:
- Tekst wordt: "Opslaan"
- Icoon wordt: Save
- Action: save changes

### AC12: Header Actions - Print Button
**Given** de gebruiker wil het recept printen
**When** de gebruiker klikt op de "Print" button
**Then** wordt `window.print()` aangeroepen

**Print Button:**
- Icoon: Printer
- Tekst: "Print"
- Styling: outline button, small
- Positie: naast "Bewerk" button

**Print Styling:**
CSS media query `@media print`:
- Verberg header/footer
- Verberg tabs navigatie
- Verberg buttons (terug, bewerk, print, bookmark)
- Verberg "Notities" tab content
- Verberg checkboxes bij ingrediënten
- A4 formaat
- Margin: 2cm
- Font sizes aangepast voor print
- Toon alleen: titel, afbeelding, ingrediënten, instructies

### AC13: Favorite Toggle (Bookmark)
**Given** de gebruiker wil een recept favoriet maken
**When** de gebruiker klikt op de bookmark button
**Then** wordt:

**Database Update:**
```sql
UPDATE recipes
SET is_favorite = NOT is_favorite
WHERE id = [recipe_id];
```

**UI Update:**
- Icoon verandert: outline → filled
- Kleur: currentColor → primary
- Optimistic UI update (onmiddellijk feedback)
- Background sync met database

**State:**
- Favoriet: bookmark filled, primary color
- Niet favoriet: bookmark outline, current color

### AC14: Responsive Design
**Mobile (< 640px):**
- Stack badges verticaal
- Smaller image height (250px)
- Padding: 1rem ipv 2rem
- Font sizes kleiner
- Tabs scroll horizontaal if needed

**Tablet (640px - 1024px):**
- 2-column layout voor sommige badges
- Standard sizing

**Desktop (> 1024px):**
- Max-width container: 5xl (64rem)
- Centered content
- Full badge layout horizontaal

### AC15: Loading States
**Given** de pagina wordt geladen
**When** data nog niet beschikbaar is
**Then** worden skeleton loaders getoond:
- Skeleton voor afbeelding (shimmer effect)
- Skeleton voor titel (2 lines)
- Skeleton voor badges (5 rectangles)
- Skeleton voor ingrediënten lijst

**Error State:**
Als recept niet gevonden:
```html
<div class="text-center py-12">
  <h1 class="text-2xl font-bold mb-4">Recept niet gevonden</h1>
  <p class="text-muted-foreground mb-6">
    Dit recept bestaat niet of is verwijderd.
  </p>
  <a href="/" class="btn btn-primary">Terug naar overzicht</a>
</div>
```

### AC16: SEO & Metadata
**Given** de recept pagina wordt geladen
**When** de HTML wordt gegenereerd
**Then** worden meta tags toegevoegd:

```typescript
// app/recipes/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const recipe = await getRecipe(params.slug);

  return {
    title: `${recipe.title} - Kookboek`,
    description: recipe.description,
    openGraph: {
      title: recipe.title,
      description: recipe.description,
      images: [recipe.image_url],
    },
  };
}
```

## Technical Implementation

### Server Component - Data Fetching
```typescript
// app/recipes/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function RecipePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  // Fetch recipe with ingredients
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
      ),
      recipe_tags (
        tags (name, slug)
      )
    `)
    .eq('slug', params.slug)
    .single();

  if (error || !recipe) {
    notFound();
  }

  return (
    <RecipeDetailView recipe={recipe} />
  );
}
```

### Client Component - Interactive Features
```typescript
'use client';

import { useState } from 'react';

export function RecipeDetailView({ recipe }: { recipe: Recipe }) {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'notes'>('ingredients');
  const [servings, setServings] = useState(recipe.servings_default);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());

  const ratio = servings / recipe.servings_default;

  const scaleIngredient = (ingredient: Ingredient) => {
    if (!ingredient.scalable) return ingredient.amount_display;

    const scaled = ingredient.amount * ratio;
    return formatAmount(scaled, ingredient.unit);
  };

  return (
    <>
      {/* Hero Image */}
      {/* Header */}
      {/* Tabs */}
      {/* Tab Content */}
    </>
  );
}
```

## Database Queries

### Main Recipe Query
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
  ) AS ingredients
FROM recipes r
LEFT JOIN parsed_ingredients pi ON pi.recipe_id = r.id
WHERE r.slug = $1
GROUP BY r.id;
```

### Favorite Toggle
```sql
UPDATE recipes
SET
  is_favorite = NOT is_favorite,
  updated_at = NOW()
WHERE id = $1
RETURNING is_favorite;
```

## Testing Scenarios

### E2E Test: View Recipe
1. Navigate to `/`
2. Click on first recipe card
3. Expect: navigated to `/recipes/[slug]`
4. Expect: image loaded
5. Expect: title and description visible
6. Expect: badges showing correct metadata
7. Expect: "Ingrediënten" tab active by default
8. Expect: ingredients list rendered

### E2E Test: Tab Switching
1. On recipe detail page
2. Click "Bereidingswijze" tab
3. Expect: tab becomes active (visual feedback)
4. Expect: instructions content shown
5. Expect: ingredients content hidden
6. Click "Notities" tab
7. Expect: notes content shown

### E2E Test: Serving Adjustment
1. Recipe has servings_default = 4
2. Initial ingredient: "2 el olijfolie"
3. Click + button (servings becomes 8)
4. Expect: ingredient becomes "4 el olijfolie"
5. Click - button twice (servings becomes 2)
6. Expect: ingredient becomes "1 el olijfolie"

### E2E Test: Print
1. On recipe detail page
2. Click "Print" button
3. Expect: print dialog opens
4. In print preview:
   - No header/footer
   - No buttons visible
   - Only recipe content
   - Clean A4 layout

### E2E Test: Favorite Toggle
1. Recipe is not favorite (bookmark outline)
2. Click bookmark button
3. Expect: icon fills, color changes to primary
4. Refresh page
5. Expect: bookmark still filled (persisted in DB)

## Performance Requirements
- Page load: < 1.5s (including SSR)
- Time to interactive: < 2s
- Tab switch: < 100ms
- Serving adjustment: < 50ms (instant feel)
- Smooth scroll (60fps)

## Accessibility
- Semantic HTML (h1, h2, article, nav)
- Tab order: terug → bewerk → print → bookmark → tabs → ingredients
- Keyboard navigation for tabs (arrow keys)
- Screen reader: announce tab changes
- Alt text for hero image
- ARIA labels for icon buttons

## Future Enhancements
- Share button (copy link, WhatsApp, email)
- Rating system (stars)
- Reviews/comments section
- Related recipes carousel
- Cooking timer integration
- Step-by-step mode (full screen, one step at a time)
- Voice control ("Ok Google, next step")
