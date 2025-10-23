# User Story: Recept Bewerken en Notities Toevoegen

## Epic
Recipe Management & Personalization

## Story
Als huishoudgebruiker wil ik een recept kunnen bewerken en persoonlijke notities kunnen toevoegen, zodat ik recepten kan aanpassen aan mijn voorkeuren en ervaringen kan vastleggen.

## Acceptance Criteria

### AC1: Edit Mode Activeren
**Given** de gebruiker bekijkt een recept detail pagina
**When** de gebruiker klikt op de "Bewerk" button in de header
**Then** wordt de pagina in edit mode gezet

**Visual Changes:**
- Button tekst: "Bewerk" → "Opslaan"
- Button icoon: Edit-3 → Save
- Alle bewerkbare velden krijgen een border/outline
- Cursor changes to text cursor on hover
- Tooltip: "Klik om te bewerken"

**State Management:**
```typescript
const [isEditMode, setIsEditMode] = useState(false);
const [editedRecipe, setEditedRecipe] = useState(recipe);
const [hasChanges, setHasChanges] = useState(false);
```

### AC2: Titel Bewerken
**Given** edit mode is actief
**When** de gebruiker klikt op de titel
**Then** wordt de titel een bewerkbaar veld

**Input Field:**
- Type: text
- Default value: huidige titel
- Max length: 200 characters
- Font: blijft 4xl, bold, serif
- Border: subtiel (alleen zichtbaar in edit mode)
- Placeholder: "Recept titel..."

**Validation:**
- Mag niet leeg zijn
- Auto-trim whitespace
- Slug wordt automatisch gegenereerd bij save

**Auto-save vs Manual:**
Optie: Auto-save na 2 seconden inactiviteit
Of: Alleen bij klikken "Opslaan" button

### AC3: Beschrijving Bewerken
**Given** edit mode is actief
**When** de gebruiker klikt op de beschrijving
**Then** wordt dit een textarea

**Textarea:**
- Rows: 3 (auto-expand tot max 6)
- Max length: 500 characters
- Font: lg, muted color
- Placeholder: "Voeg een beschrijving toe..."
- Optional veld (mag leeg blijven)

### AC4: Metadata Bewerken
**Given** edit mode is actief
**When** de gebruiker klikt op metadata badges
**Then** worden deze bewerkbaar

**Bereidingstijd (prep_time):**
```html
<div class="badge editable">
  <i data-lucide="clock"></i>
  <input
    type="number"
    value={prep_time}
    min="0"
    max="999"
    class="inline-input"
  />
  <span>min</span>
</div>
```

**Kooktijd (cook_time):**
- Zelfde als bereidingstijd
- Icoon: Chef-hat

**Porties (servings_default):**
- Number input
- Min: 1, Max: 99
- Behoud +/- buttons functionaliteit

**Moeilijkheidsgraad (difficulty):**
```html
<select class="badge-select">
  <option value="Makkelijk">Makkelijk</option>
  <option value="Gemiddeld">Gemiddeld</option>
  <option value="Moeilijk">Moeilijk</option>
</select>
```

**Bron (source_name):**
- Text input
- Placeholder: "Jeroen Meus, Oma, etc."
- Optional

### AC5: Labels/Tags Bewerken
**Given** edit mode is actief
**When** de gebruiker wil labels aanpassen
**Then** wordt een tag selector getoond

**Tag Selector:**
```html
<div class="tag-editor">
  <div class="selected-tags">
    <span class="tag">
      Hoofdgerecht
      <button class="remove-tag">×</button>
    </span>
    <!-- existing tags -->
  </div>
  <div class="tag-dropdown">
    <input type="text" placeholder="Zoek of voeg tag toe..." />
    <div class="tag-suggestions">
      <button class="tag-option">Voorgerecht</button>
      <button class="tag-option">Dessert</button>
      <!-- suggestions from labels array -->
    </div>
  </div>
</div>
```

**Standard Tags:**
- Voorgerecht, Hoofdgerecht, Dessert, Bijgerecht
- Soep, Salade, Snack
- Ontbijt, Lunch, Diner
- Vegetarisch, Vegan, Glutenvrij

**Custom Tags:**
- Gebruiker kan eigen tags toevoegen
- Worden opgeslagen in `recipes.labels` array
- Auto-suggest van bestaande tags uit database

**Database Update:**
```sql
UPDATE recipes
SET labels = ARRAY['hoofdgerecht', 'comfort food', 'winter']::text[]
WHERE id = $1;
```

### AC6: Ingrediënten Bewerken
**Given** edit mode is actief op Ingrediënten tab
**When** de gebruiker ingrediënten wil aanpassen
**Then** worden deze inline bewerkbaar

**Editable Ingredient:**
```html
<div class="ingredient-edit-row">
  <button class="drag-handle" aria-label="Versleep">
    <i data-lucide="grip-vertical"></i>
  </button>

  <input
    type="text"
    class="ingredient-input"
    value="2 el"
    placeholder="Hoeveelheid"
  />

  <input
    type="text"
    class="ingredient-input flex-1"
    value="olijfolie"
    placeholder="Ingrediënt"
  />

  <button class="remove-ingredient" aria-label="Verwijder">
    <i data-lucide="trash-2"></i>
  </button>
</div>
```

**Features:**
- ✅ Hoeveelheid en naam apart
- ✅ Drag & drop om volgorde te wijzigen
- ✅ Verwijder knop
- ✅ Auto-parsing bij opslaan (extract amount, unit, name)

**Add Ingredient Button:**
```html
<button class="btn btn-outline btn-sm" onclick="addIngredient()">
  <i data-lucide="plus"></i>
  Voeg ingrediënt toe
</button>
```

**Sections (optioneel):**
Als sectie headers aanwezig:
```html
<input
  type="text"
  class="section-header-input"
  value="Voor de saus"
  placeholder="Sectie naam (optioneel)"
/>
```

**Smart Parsing:**
Bij opslaan wordt ingrediënt geparsed:
```typescript
parseIngredient("2 el olijfolie") => {
  amount: 2,
  unit: "el",
  amount_display: "2 el",
  ingredient_name_nl: "olijfolie",
  scalable: true
}
```

### AC7: Instructies Bewerken
**Given** edit mode is actief op Bereidingswijze tab
**When** de gebruiker instructies wil aanpassen
**Then** wordt een markdown editor getoond

**Editor Options:**

**Optie 1: Simple Textarea**
```html
<textarea
  class="markdown-editor"
  rows="20"
  placeholder="Schrijf de bereidingswijze in stappen..."
>{content_markdown}</textarea>
```

**Optie 2: Rich Editor with Preview**
Split view: editor links, preview rechts

**Markdown Format:**
```markdown
1. Verhit de olijfolie in een grote pan...

2. Voeg de gesneden ui toe en bak deze 5 minuten...

3. Voeg de knoflook, komijn en koriander toe...

> **Tip:** Voor een extra romige soep kun je...
```

**Toolbar (optioneel):**
- Bold, Italic
- Numbered list, Bullet list
- Add tip/note block
- Preview toggle

**Auto-formatting:**
- Genummerde lijsten automatisch herkennen
- Dubbele newline = nieuwe paragraaf

### AC8: Notities Bewerken (Tab 3)
**Given** de gebruiker is op de Notities tab
**When** edit mode actief is OF de gebruiker klikt op "Bewerk" (zelfs in view mode)
**Then** wordt een notities editor getoond

**Notities Editor:**
```html
<textarea
  class="notes-editor"
  placeholder="Voeg persoonlijke notities toe...

Bijvoorbeeld:
- Volgende keer meer knoflook
- Familie vond dit heerlijk!
- Bereidingstijd was eerder 30 min"
  rows="10"
>{notes}</textarea>
```

**Features:**
- Markdown support (optioneel)
- Auto-save functionaliteit
- Character count (max 2000)
- Timestamp: "Laatst bijgewerkt: [timestamp]"

**Database Update:**
```sql
UPDATE recipes
SET
  notes = $1,
  notes_updated_at = NOW()
WHERE id = $2;
```

**Difference with Instructions:**
- Notes = persoonlijk (wat ik vond, aanpassingen)
- Instructions = objectief (hoe maak je het)

### AC9: Afbeelding Wijzigen
**Given** edit mode is actief
**When** de gebruiker wil de afbeelding wijzigen
**Then** wordt een upload knop over de afbeelding getoond

**Upload Overlay:**
```html
<div class="image-upload-overlay">
  <button class="btn btn-primary">
    <i data-lucide="upload"></i>
    Wijzig afbeelding
  </button>
</div>
```

**Upload Flow:**
1. User klikt "Wijzig afbeelding"
2. File dialog opent
3. User selecteert afbeelding (JPG, PNG, WebP)
4. Preview wordt direct getoond
5. Bij "Opslaan": upload naar Supabase Storage
6. Update `recipes.image_url` in database

**Supabase Storage:**
```typescript
const uploadRecipeImage = async (file: File, recipeId: string) => {
  const fileName = `${recipeId}-${Date.now()}.${file.name.split('.').pop()}`;
  const { data, error } = await supabase.storage
    .from('recipe-images')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(fileName);

  return publicUrl;
};
```

**Image Optimization:**
- Max upload size: 5MB
- Auto-resize to max 1200px width
- Convert to WebP for smaller size
- Delete old image when replacing

### AC10: Opslaan van Wijzigingen
**Given** de gebruiker heeft wijzigingen gemaakt
**When** de gebruiker klikt op "Opslaan" button
**Then** worden alle changes opgeslagen in database

**Save Flow:**
```typescript
const handleSave = async () => {
  setIsSaving(true);

  try {
    // 1. Upload nieuwe afbeelding (indien gewijzigd)
    if (newImage) {
      const imageUrl = await uploadRecipeImage(newImage, recipe.id);
      editedRecipe.image_url = imageUrl;
    }

    // 2. Parse en update ingrediënten
    const parsedIngredients = editedRecipe.ingredients.map(parseIngredient);

    // 3. Update recipe in database
    const { error: recipeError } = await supabase
      .from('recipes')
      .update({
        title: editedRecipe.title,
        slug: generateSlug(editedRecipe.title),
        description: editedRecipe.description,
        prep_time: editedRecipe.prep_time,
        cook_time: editedRecipe.cook_time,
        servings_default: editedRecipe.servings_default,
        difficulty: editedRecipe.difficulty,
        image_url: editedRecipe.image_url,
        source_name: editedRecipe.source_name,
        labels: editedRecipe.labels,
        content_markdown: editedRecipe.content_markdown,
        notes: editedRecipe.notes,
        notes_updated_at: editedRecipe.notes ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipe.id);

    if (recipeError) throw recipeError;

    // 4. Delete old ingredients
    await supabase
      .from('parsed_ingredients')
      .delete()
      .eq('recipe_id', recipe.id);

    // 5. Insert updated ingredients
    const { error: ingredientsError } = await supabase
      .from('parsed_ingredients')
      .insert(
        parsedIngredients.map((ing, index) => ({
          recipe_id: recipe.id,
          ...ing,
          order_index: index
        }))
      );

    if (ingredientsError) throw ingredientsError;

    // 6. Update search vector
    await supabase.rpc('update_recipe_search_vector', {
      recipe_id: recipe.id
    });

    // Success!
    setIsEditMode(false);
    setHasChanges(false);
    toast.success('Recept opgeslagen!');

    // Refresh page data
    router.refresh();

  } catch (error) {
    console.error('Save error:', error);
    toast.error('Fout bij opslaan. Probeer opnieuw.');
  } finally {
    setIsSaving(false);
  }
};
```

**Optimistic UI:**
- Changes direct zichtbaar in UI
- Bij fout: revert naar vorige state
- Loading state tijdens opslaan

**Success Feedback:**
- Toast notification: "Recept opgeslagen!"
- Exit edit mode
- Page blijft op zelfde locatie (geen redirect)

### AC11: Annuleren van Wijzigingen
**Given** de gebruiker is in edit mode
**When** de gebruiker klikt "Annuleren" OF navigeert weg
**Then** wordt een confirmatie dialog getoond (als er wijzigingen zijn)

**Annuleren Button:**
```html
<button class="btn btn-outline" onclick="handleCancel()">
  Annuleren
</button>
```

**Confirmation Dialog:**
```html
<div class="modal">
  <div class="modal-content">
    <h2>Wijzigingen niet opgeslagen</h2>
    <p>Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt annuleren?</p>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="stayInEditMode()">
        Verder bewerken
      </button>
      <button class="btn btn-destructive" onclick="discardChanges()">
        Wijzigingen verwijderen
      </button>
    </div>
  </div>
</div>
```

**Discard Logic:**
```typescript
const handleCancel = () => {
  if (hasChanges) {
    showConfirmDialog();
  } else {
    setIsEditMode(false);
  }
};

const discardChanges = () => {
  setEditedRecipe(recipe); // revert to original
  setIsEditMode(false);
  setHasChanges(false);
  closeConfirmDialog();
};
```

**Browser Navigation:**
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = ''; // Shows browser's default dialog
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasChanges]);
```

### AC12: Validation & Error Handling
**Given** de gebruiker probeert op te slaan
**When** er validatie fouten zijn
**Then** worden deze getoond

**Validation Rules:**
- Titel: required, min 3 chars, max 200 chars
- Prep/cook time: >= 0, <= 999
- Servings: >= 1, <= 99
- Ingrediënten: minimaal 1 ingrediënt required
- Instructies: required, min 10 chars

**Error Display:**
```html
<div class="error-message">
  <i data-lucide="alert-circle"></i>
  <span>Titel is verplicht</span>
</div>
```

**Field-level Errors:**
- Red border om invalide veld
- Error message onder veld
- Focus op eerste invalide veld

**Save Button State:**
```typescript
<button
  class="btn btn-primary"
  disabled={!isValid || isSaving}
  onClick={handleSave}
>
  {isSaving ? (
    <>
      <Spinner />
      Opslaan...
    </>
  ) : (
    <>
      <SaveIcon />
      Opslaan
    </>
  )}
</button>
```

### AC13: Auto-save Notities (optioneel)
**Given** de gebruiker bewerkt notities
**When** de gebruiker stopt met typen
**Then** worden notities automatisch opgeslagen na 2 seconden

**Auto-save Implementation:**
```typescript
const [notes, setNotes] = useState(recipe.notes);
const [isSavingNotes, setIsSavingNotes] = useState(false);

const debouncedSave = useDebouncedCallback(
  async (value: string) => {
    setIsSavingNotes(true);
    await supabase
      .from('recipes')
      .update({
        notes: value,
        notes_updated_at: new Date().toISOString()
      })
      .eq('id', recipe.id);
    setIsSavingNotes(false);
  },
  2000
);

const handleNotesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
  const value = e.target.value;
  setNotes(value);
  debouncedSave(value);
};
```

**Indicator:**
```html
<div class="auto-save-indicator">
  {isSavingNotes ? (
    <><Spinner /> Opslaan...</>
  ) : (
    <><CheckIcon /> Opgeslagen</>
  )}
</div>
```

### AC14: Recept Verwijderen
**Given** de gebruiker wil een recept verwijderen
**When** de gebruiker klikt op "Verwijderen" (in edit mode)
**Then** wordt een confirmatie dialog getoond

**Verwijder Button:**
```html
<button class="btn btn-destructive btn-sm" onclick="handleDelete()">
  <i data-lucide="trash-2"></i>
  Verwijder recept
</button>
```

**Confirmation:**
```html
<div class="modal">
  <h2>Recept verwijderen?</h2>
  <p>Weet je zeker dat je "[recipe.title]" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.</p>
  <div class="modal-actions">
    <button class="btn btn-outline">Annuleren</button>
    <button class="btn btn-destructive" onclick="confirmDelete()">
      Verwijderen
    </button>
  </div>
</div>
```

**Delete Logic:**
```typescript
const confirmDelete = async () => {
  try {
    // 1. Delete ingredients (cascade should handle this, but be safe)
    await supabase
      .from('parsed_ingredients')
      .delete()
      .eq('recipe_id', recipe.id);

    // 2. Delete recipe_tags
    await supabase
      .from('recipe_tags')
      .delete()
      .eq('recipe_id', recipe.id);

    // 3. Delete extracted_keywords
    await supabase
      .from('extracted_keywords')
      .delete()
      .eq('recipe_id', recipe.id);

    // 4. Delete recipe image from storage (if exists)
    if (recipe.image_url && recipe.image_url.includes('supabase')) {
      const fileName = recipe.image_url.split('/').pop();
      await supabase.storage
        .from('recipe-images')
        .remove([fileName]);
    }

    // 5. Delete recipe
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipe.id);

    if (error) throw error;

    // Success: navigate to home
    router.push('/');
    toast.success('Recept verwijderd');

  } catch (error) {
    console.error('Delete error:', error);
    toast.error('Fout bij verwijderen');
  }
};
```

**Position:**
- Onderaan edit mode sectie
- Duidelijk gescheiden van "Opslaan"
- Destructive styling (rood)

## Technical Implementation

### Component Structure
```typescript
// app/recipes/[slug]/page.tsx
export default function RecipeDetailPage({ params }) {
  return <RecipeDetail slug={params.slug} />;
}

// components/recipe-detail.tsx
'use client';

export function RecipeDetail({ initialRecipe }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [recipe, setRecipe] = useState(initialRecipe);
  const [hasChanges, setHasChanges] = useState(false);

  if (isEditMode) {
    return <RecipeEditView recipe={recipe} onSave={handleSave} />;
  }

  return <RecipeReadView recipe={recipe} onEdit={() => setIsEditMode(true)} />;
}
```

### Database Schema Requirements
All columns used in editing exist in current schema:

**recipes table:** ✅
- title, slug, description
- prep_time, cook_time, servings_default, difficulty
- image_url, source_name, labels
- content_markdown, notes, notes_updated_at
- updated_at

**parsed_ingredients table:** ✅
- All fields exist

**Missing/Optional:**
- Recipe versioning (audit trail)
- Soft delete (deleted_at column)

## Testing Scenarios

### E2E Test: Edit Recipe Title
1. Navigate to recipe detail
2. Click "Bewerk"
3. Change title from "Venkelsoep" to "Heerlijke Venkelsoep"
4. Click "Opslaan"
5. Expect: title updated in view mode
6. Expect: slug updated: `/recipes/heerlijke-venkelsoep`
7. Refresh page
8. Expect: changes persisted

### E2E Test: Add Ingredient
1. Enter edit mode
2. Go to Ingrediënten tab
3. Click "Voeg ingrediënt toe"
4. Enter: "1 tl" + "zout"
5. Drag to position 3
6. Click "Opslaan"
7. Expect: ingredient saved with order_index = 2

### E2E Test: Edit Notes with Auto-save
1. Go to Notities tab
2. Type "Dit recept is heerlijk!"
3. Wait 2 seconds
4. Expect: "Opgeslagen" indicator shown
5. Refresh page
6. Expect: notes still there

### E2E Test: Cancel with Unsaved Changes
1. Enter edit mode
2. Change title
3. Click "Annuleren"
4. Expect: confirmation dialog
5. Click "Wijzigingen verwijderen"
6. Expect: original title shown
7. Expect: exit edit mode

### E2E Test: Delete Recipe
1. Enter edit mode
2. Scroll to bottom
3. Click "Verwijder recept"
4. Expect: confirmation dialog
5. Click "Verwijderen"
6. Expect: navigated to `/`
7. Expect: recipe not in list anymore
8. Try to navigate to old URL
9. Expect: 404 page

## Performance Requirements
- Edit mode toggle: < 100ms
- Auto-save: debounced 2s, execute < 500ms
- Full save: < 2s (including image upload)
- Image upload: < 5s (for 3MB file)

## Security Considerations
- Validate all inputs server-side
- Sanitize markdown (prevent XSS)
- Check file types for image upload
- Limit file size (5MB max)
- Rate limit save endpoint (max 10 saves per minute)
- Verify user owns recipe (when auth added)

## Accessibility
- Edit mode announced by screen reader
- All form fields have labels
- Keyboard shortcuts: Ctrl+S to save, Esc to cancel
- Focus management: return to edit button after save
- Error announcements for screen readers

## Future Enhancements
- Recipe versioning (history of changes)
- Undo/redo functionality
- Collaborative editing (multiple users)
- Duplicate recipe feature
- Export recipe (PDF, JSON)
- Recipe templates for quick creation
- Bulk edit multiple recipes
- Change log: "Laatst bewerkt door [user] op [date]"
