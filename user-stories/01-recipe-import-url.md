# User Story: Recept Importeren via URL

## Epic
Recipe Import & Creation

## Story
Als huishoudgebruiker wil ik een recept kunnen importeren door een URL te plakken, zodat ik niet handmatig alle gegevens hoef over te typen.

## Acceptance Criteria

### AC1: Import Dialog Openen
**Given** de gebruiker is op de zoekpagina (homepage)
**When** de gebruiker klikt op de knop "Importeer Recept" in de header
**Then** wordt een modal dialog geopend met import opties

**UI Details:**
- Modal heeft een witte achtergrond met card styling
- Bevat twee secties: "Van URL" en "Van Foto's" gescheiden door "of"
- Modal is responsive (90% breedte op mobiel, max 500px op desktop)
- Achtergrond heeft een semi-transparante overlay (rgba(0,0,0,0.5))

### AC2: URL Invoeren
**Given** de import dialog is geopend
**When** de gebruiker een URL invoert in het "Van URL" invoerveld
**Then** wordt de URL opgeslagen in de state

**Technical Details:**
- Input type: `url`
- Placeholder: "https://..."
- Validatie: moet geldige URL zijn
- Helper text: "AI extraheert automatisch het recept van de pagina"

**Supported Websites:**
- Jeroen Meus recepten
- Dagelijkse Kost (VRT)
- Njam.tv
- Laura Bakeries
- Algemene receptensites met structured data

### AC3: URL Importeren
**Given** de gebruiker heeft een geldige URL ingevoerd
**When** de gebruiker klikt op "Importeren"
**Then** wordt het volgende uitgevoerd:
1. Loading state wordt getoond
2. POST request naar `/api/import` met `{ url: string }`
3. Backend haalt pagina content op
4. Backend stuurt naar Gemini AI (`models/gemini-flash-lite-latest`)
5. AI extraheert gestructureerde data
6. Data wordt gevalideerd en opgeslagen in database

**Database Operations:**
```sql
-- 1. Insert recipe
INSERT INTO recipes (
  title,
  slug,
  description,
  content_markdown,
  prep_time,
  cook_time,
  servings_default,
  difficulty,
  image_url,
  source_url,
  source_name,
  source_language,
  labels
) VALUES (...);

-- 2. Insert ingredients
INSERT INTO parsed_ingredients (
  recipe_id,
  ingredient_name_nl,
  amount,
  unit,
  amount_display,
  scalable,
  order_index,
  section
) VALUES (...);

-- 3. Extract and insert tags
INSERT INTO tags (name, slug) VALUES (...) ON CONFLICT DO NOTHING;
INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (...);

-- 4. Extract and insert keywords
INSERT INTO extracted_keywords (
  recipe_id,
  keyword,
  confidence
) VALUES (...);
```

### AC4: Succesvolle Import Feedback
**Given** de AI heeft succesvol een recept geëxtraheerd
**When** de import is voltooid
**Then** wordt de gebruiker:
1. Getoond een success notificatie
2. Doorgestuurd naar de recept detail pagina (`/recipes/[slug]`)
3. Modal wordt gesloten

**Success Response:**
```typescript
{
  success: true,
  recipeId: "uuid",
  slug: "venkelsoep-met-gegrilde-merguez"
}
```

### AC5: Foutafhandeling - Ongeldige URL
**Given** de gebruiker heeft een ongeldige URL ingevoerd
**When** de gebruiker klikt op "Importeren"
**Then** wordt een foutmelding getoond: "Voer een geldige URL in"

### AC6: Foutafhandeling - URL Kan Niet Worden Opgehaald
**Given** de URL is geldig maar de pagina kan niet worden opgehaald
**When** de import wordt uitgevoerd
**Then** wordt een foutmelding getoond: "Kon de pagina niet ophalen. Controleer de URL en probeer opnieuw."

### AC7: Foutafhandeling - AI Kan Geen Recept Vinden
**Given** de pagina is opgehaald maar bevat geen recept
**When** de AI probeert het recept te extraheren
**Then** wordt een foutmelding getoond: "Kon geen recept vinden op deze pagina. Probeer een andere URL of importeer handmatig."

### AC8: Modal Sluiten
**Given** de import dialog is geopend
**When** de gebruiker klikt op "Annuleren" OF klikt buiten de modal
**Then** wordt de modal gesloten zonder data op te slaan

## Technical Implementation

### Frontend Components
```typescript
// components/import-dialog.tsx
interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// State management
const [url, setUrl] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### API Endpoint
```typescript
// app/api/import/route.ts
export async function POST(request: Request) {
  const { url, photos } = await request.json();

  if (url) {
    // Fetch webpage content
    const html = await fetch(url).then(r => r.text());

    // Call Gemini AI
    const recipe = await extractRecipeFromHTML(html, url);

    // Validate and save to database
    const recipeId = await saveRecipe(recipe);

    return Response.json({ success: true, recipeId });
  }
}
```

### Gemini AI Prompt
```
Analyseer de volgende HTML pagina en extraheer het recept.

Geef terug in JSON formaat:
{
  "title": "string",
  "description": "string",
  "prep_time": number (in minuten),
  "cook_time": number (in minuten),
  "servings_default": number,
  "difficulty": "Makkelijk" | "Gemiddeld" | "Moeilijk",
  "ingredients": [
    {
      "ingredient_name_nl": "string",
      "amount": number | null,
      "unit": "string" | null,
      "amount_display": "string",
      "scalable": boolean,
      "section": "string" | null
    }
  ],
  "instructions": "markdown formatted steps",
  "source_name": "string",
  "labels": ["voorgerecht", "hoofdgerecht", "dessert", etc],
  "image_url": "string" | null
}

Als er geen duidelijk recept te vinden is, return: { "error": "Geen recept gevonden" }
```

## Data Mapping

### URL → Database Fields
- Webpage title → `recipes.title`
- Generated slug (from title) → `recipes.slug`
- Description/intro → `recipes.description`
- Instructions → `recipes.content_markdown`
- Prep time → `recipes.prep_time`
- Cook time → `recipes.cook_time`
- Servings → `recipes.servings_default`
- Difficulty → `recipes.difficulty`
- Main image → `recipes.image_url`
- Original URL → `recipes.source_url`
- Website name → `recipes.source_name`
- Language (nl/en/fr) → `recipes.source_language`
- Recipe type tags → `recipes.labels[]`

### Ingredient Parsing
Each ingredient is analyzed and split into:
- `ingredient_name_nl`: "ui" (normalized name)
- `amount`: 1 (numeric value, nullable)
- `unit`: "stuks" (normalized unit, nullable)
- `amount_display`: "1 grote" (original display text)
- `scalable`: true (can be scaled with servings)
- `section`: null or "Voor de saus" (ingredient group)
- `order_index`: 0, 1, 2... (display order)

## Edge Cases

### EC1: URL met Meerdere Recepten
**Scenario:** Pagina bevat een lijst van recepten
**Expected:** AI kiest het hoofdrecept OF vraagt gebruiker om te kiezen

### EC2: URL met Paywall
**Scenario:** Recept is achter een paywall
**Expected:** Foutmelding: "Deze pagina is niet toegankelijk. Probeer een andere bron."

### EC3: Buitenlandse Taal
**Scenario:** Recept is in Engels of Frans
**Expected:**
- AI vertaalt ingrediënten naar Nederlands (`ingredient_name_nl`)
- `source_language` wordt gezet op "en" of "fr"
- Instructies kunnen in originele taal blijven of vertaald

### EC4: Ontbrekende Afbeelding
**Scenario:** Pagina heeft geen receptafbeelding
**Expected:** `image_url` blijft `null`, placeholder wordt getoond in UI

### EC5: Duplicate URL
**Scenario:** URL is al eerder geïmporteerd
**Expected:**
- Optie 1: Waarschuwing + vraag om door te gaan
- Optie 2: Direct naar bestaand recept navigeren

### EC6: Invalid HTML / Bot Blocker
**Scenario:** Website blokkeert automated requests
**Expected:** Foutmelding: "Deze website kan niet automatisch worden geïmporteerd. Gebruik foto's of handmatige invoer."

## Testing Scenarios

### E2E Test: Succesvol Importeren
1. Open homepage
2. Klik "Importeer Recept"
3. Plak URL: "https://dagelijksekost.een.be/gerechten/venkelsoep-met-gegrilde-merguez"
4. Klik "Importeren"
5. Wacht op loading indicator
6. Verwacht: redirect naar `/recipes/venkelsoep-met-gegrilde-merguez`
7. Verificeer: alle velden zijn correct ingevuld
8. Verificeer: ingrediënten zijn geparsed en zichtbaar
9. Verificeer: instructies zijn in markdown format

### E2E Test: Foutafhandeling
1. Open import dialog
2. Plak URL: "https://google.com"
3. Klik "Importeren"
4. Verwacht: foutmelding "Kon geen recept vinden"
5. Modal blijft open
6. Gebruiker kan opnieuw proberen

### Unit Tests
```typescript
describe('Import API', () => {
  it('should extract recipe from valid URL', async () => {
    const result = await POST({ url: validRecipeURL });
    expect(result.success).toBe(true);
    expect(result.recipeId).toBeDefined();
  });

  it('should handle invalid URL', async () => {
    const result = await POST({ url: 'invalid' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

## Dependencies
- Gemini AI API access (GEMINI_API_KEY in env)
- Supabase connection (database insert permissions)
- Fetch API for webpage retrieval
- HTML parser (cheerio or similar) for content extraction

## Performance Requirements
- URL fetch: < 3 seconds
- AI extraction: < 5 seconds
- Database insert: < 1 second
- Total import time: < 10 seconds

## Security Considerations
- Validate URL format before fetching
- Sanitize HTML content before processing
- Rate limit API endpoint (max 10 imports per minute per IP)
- Check URL against blocklist (prevent SSRF attacks)
- Validate AI response before database insert
- Use parameterized queries to prevent SQL injection

## Future Enhancements
- Bulk import from multiple URLs
- Browser extension for one-click import
- Import history/log
- Re-import to update existing recipe
- Import from clipboard automatically
