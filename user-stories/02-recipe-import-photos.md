# User Story: Recept Importeren via Foto's

## Epic
Recipe Import & Creation

## Story
Als huishoudgebruiker wil ik een recept kunnen importeren door foto's te uploaden (bijvoorbeeld van een kookboek of tijdschrift), zodat ik snel recepten uit fysieke bronnen kan digitaliseren.

## Acceptance Criteria

### AC1: Foto Upload Interface
**Given** de import dialog is geopend
**When** de gebruiker kijkt naar de "Van Foto's" sectie
**Then** ziet de gebruiker:
- Een dashed border upload zone
- Upload icoon (camera/image)
- Tekst: "Sleep foto's hierheen of klik om te uploaden"
- Helper text: "Je kunt meerdere foto's tegelijk uploaden (max 10)"
- Helper text: "AI leest het recept van alle foto's en combineert de informatie"

**UI Specifications:**
- Border: 2px dashed, color: `var(--border)`
- Padding: 2rem (32px)
- Hover state: light gray background
- Click: triggers file input dialog
- Drag & drop: visual feedback tijdens drag

### AC2: Foto Selectie - File Dialog
**Given** de gebruiker klikt op de upload zone
**When** de file dialog opent
**Then** kan de gebruiker:
- Meerdere bestanden selecteren
- Alleen image bestanden kiezen (accept="image/*")
- Maximaal 10 bestanden selecteren

**Supported Formats:**
- JPG/JPEG
- PNG
- HEIC (iOS foto's)
- WebP

### AC3: Foto Selectie - Drag & Drop
**Given** de gebruiker heeft foto's op hun computer
**When** de gebruiker sleept foto's naar de upload zone
**Then** worden de foto's toegevoegd aan de upload lijst

**Drag & Drop States:**
- `dragenter`: border color changes to primary
- `dragover`: background becomes light blue
- `dragleave`: revert to default
- `drop`: files added to state

### AC4: Foto Preview Grid
**Given** de gebruiker heeft foto's geselecteerd (1-10 foto's)
**When** de selectie is gemaakt
**Then** wordt een preview grid getoond:
- Grid layout: 5 kolommen op desktop, 3 op tablet, 2 op mobiel
- Elke foto krijgt een vierkante preview (aspect-ratio: 1)
- Foto nummer badge in linkerbovenhoek (1, 2, 3...)
- Verwijder knop (×) in rechterbovenhoek
- Foto count: "Geüploade foto's (3)"

**Preview Item Details:**
```html
<div class="relative rounded overflow-hidden border aspect-ratio-1">
  <img src="base64/objectURL" class="w-full h-full object-cover" />
  <div class="absolute top-1 left-1 bg-white rounded-full w-6 h-6">
    <span class="text-primary font-semibold">1</span>
  </div>
  <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5">
    ×
  </button>
</div>
```

### AC5: Foto Verwijderen
**Given** de preview grid bevat foto's
**When** de gebruiker klikt op de verwijder knop (×) van een foto
**Then** wordt:
1. De foto uit de lijst verwijderd
2. Preview grid opnieuw gerenderd
3. Foto count bijgewerkt
4. Nummering van overige foto's aangepast

### AC6: Maximum Foto's Validatie
**Given** de gebruiker probeert meer dan 10 foto's te uploaden
**When** de selectie wordt gemaakt
**Then** wordt:
1. Een alert getoond: "Maximum 10 foto's toegestaan"
2. Alleen de eerste 10 foto's geaccepteerd
3. OF alle foto's geweigerd (gebruiker moet opnieuw selecteren)

### AC7: Foto Upload en AI Processing
**Given** de gebruiker heeft 1-10 foto's geselecteerd
**When** de gebruiker klikt op "Importeren"
**Then** wordt het volgende uitgevoerd:

**Frontend:**
1. Loading state wordt getoond
2. FormData wordt aangemaakt met alle foto's
3. POST request naar `/api/import` met FormData
4. Progress indicator (optioneel): "Foto's uploaden... (1/3)"

**Backend:**
1. Foto's worden ontvangen
2. Elke foto wordt naar Gemini AI gestuurd (multimodal input)
3. AI analyseert alle foto's samen
4. AI extraheert en combineert gegevens van meerdere foto's
5. Gestructureerde data wordt geretourneerd

**Gemini AI Prompt:**
```
Je ontvangt [aantal] foto('s) van een recept (uit een kookboek, tijdschrift, of handgeschreven).

INSTRUCTIES:
1. Lees alle foto's en combineer de informatie
2. Als ingrediënten op foto 1 staan en instructies op foto 2, combineer deze
3. Als er meerdere versies van hetzelfde veld zijn, gebruik de meest complete
4. Als tekst onduidelijk is, doe je best om te interpreteren
5. Converteer alle hoeveelheden naar Nederlandse eenheden

Geef terug in JSON formaat:
{
  "title": "string",
  "description": "string (genereer als niet aanwezig)",
  "prep_time": number (schatting in minuten),
  "cook_time": number (schatting in minuten),
  "servings_default": number,
  "difficulty": "Makkelijk" | "Gemiddeld" | "Moeilijk",
  "ingredients": [
    {
      "ingredient_name_nl": "string",
      "amount": number | null,
      "unit": "string" | null,
      "amount_display": "string (exact zoals op foto)",
      "scalable": boolean,
      "section": "string" | null
    }
  ],
  "instructions": "markdown formatted steps",
  "source_name": "string (bijv. 'Kookboek Oma', 'Libelle Magazine')",
  "labels": ["voorgerecht", "hoofdgerecht", etc],
  "confidence": number (0-1, hoe zeker ben je van extractie)
}

BELANGRIJK:
- Als tekst niet leesbaar is, zet "confidence" lager
- Bij twijfel, geef wat je wel kunt lezen
- Als NIETS leesbaar is: { "error": "Foto's zijn te onscherp of bevatten geen tekst" }
```

### AC8: Multi-Photo Intelligence
**Scenario 1: Ingrediënten + Instructies Gesplitst**
- Foto 1: Ingrediëntenlijst
- Foto 2: Bereidingswijze
**Expected:** AI combineert beide in één compleet recept

**Scenario 2: Recept Over Meerdere Pagina's**
- Foto 1-3: Verschillende delen van hetzelfde recept
**Expected:** AI herkent dat het hetzelfde recept is en combineert

**Scenario 3: Meerdere Recepten**
- Foto's bevatten 2 verschillende recepten
**Expected:** AI kiest het meest prominente recept OF vraagt gebruiker

**Scenario 4: Foto's met Afbeeldingen**
- Sommige foto's bevatten receptafbeeldingen
**Expected:** AI extraheert tekst, negeert afbeeldingen (geen image_url)

### AC9: Succesvolle Import Feedback
**Given** de AI heeft succesvol foto's verwerkt
**When** de import is voltooid
**Then** wordt de gebruiker:
1. Getoond een success notificatie
2. Doorgestuurd naar de recept detail pagina in **edit mode**
3. Modal wordt gesloten
4. Gebruiker kan eventuele fouten in de extractie corrigeren

**Waarom Edit Mode:**
Omdat OCR/AI niet 100% accuraat is, gaat de gebruiker direct naar edit mode om eventuele fouten te verbeteren voordat het recept wordt opgeslagen.

### AC10: Foutafhandeling - Geen Foto's Geselecteerd
**Given** de gebruiker heeft geen foto's geselecteerd
**When** de gebruiker klikt op "Importeren" zonder URL
**Then** wordt een foutmelding getoond: "Voer een URL in of upload minimaal 1 foto"

### AC11: Foutafhandeling - Foto's Niet Leesbaar
**Given** de foto's zijn te wazig of bevatten geen tekst
**When** de AI probeert te extraheren
**Then** wordt een foutmelding getoond: "De foto's zijn niet leesbaar. Probeer betere foto's of voer het recept handmatig in."

**Confidence Threshold:**
- Als `confidence < 0.3`: error, niet opslaan
- Als `confidence < 0.7`: waarschuwing + vraag om verificatie
- Als `confidence >= 0.7`: automatisch opslaan in edit mode

### AC12: Foutafhandeling - File Size Limiet
**Given** één of meerdere foto's zijn te groot (> 10MB per foto)
**When** de gebruiker probeert te uploaden
**Then** wordt een foutmelding getoond: "Foto [naam] is te groot. Max 10MB per foto."

### AC13: Foutafhandeling - Verkeerd Bestandstype
**Given** de gebruiker selecteert een PDF of ander niet-image bestand
**When** de selectie wordt gemaakt
**Then** wordt het bestand niet geaccepteerd (file input accept attribute)

## Technical Implementation

### Frontend - File Handling
```typescript
// components/import-dialog.tsx
const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
const [previews, setPreviews] = useState<string[]>([]);

const handleFileSelect = (files: FileList) => {
  const fileArray = Array.from(files);

  // Validate count
  if (fileArray.length > 10) {
    alert('Maximum 10 foto\'s toegestaan');
    return;
  }

  // Validate size
  const oversized = fileArray.filter(f => f.size > 10 * 1024 * 1024);
  if (oversized.length > 0) {
    alert(`Foto's te groot: ${oversized.map(f => f.name).join(', ')}`);
    return;
  }

  // Create previews
  fileArray.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviews(prev => [...prev, e.target?.result as string]);
    };
    reader.readAsDataURL(file);
  });

  setUploadedPhotos(fileArray);
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.currentTarget.classList.add('drag-active');
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-active');
  handleFileSelect(e.dataTransfer.files);
};
```

### Backend - Multipart Form Upload
```typescript
// app/api/import/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const photos = formData.getAll('photos') as File[];

  if (photos.length > 0) {
    // Convert Files to base64 or Buffers for Gemini
    const imageData = await Promise.all(
      photos.map(async (photo) => {
        const buffer = await photo.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return {
          inlineData: {
            data: base64,
            mimeType: photo.type
          }
        };
      })
    );

    // Call Gemini AI with multiple images
    const recipe = await extractRecipeFromPhotos(imageData);

    // Validate confidence
    if (recipe.confidence < 0.3) {
      return Response.json({
        success: false,
        error: 'Foto\'s zijn niet leesbaar'
      });
    }

    // Save to database
    const recipeId = await saveRecipe(recipe);

    return Response.json({
      success: true,
      recipeId,
      slug: recipe.slug,
      confidence: recipe.confidence
    });
  }
}
```

### Gemini AI - Multimodal Input
```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function extractRecipeFromPhotos(images: ImageData[]) {
  const model = genAI.getGenerativeModel({
    model: 'models/gemini-flash-lite-latest'
  });

  const prompt = `[see AC7 for full prompt]`;

  const result = await model.generateContent([
    prompt,
    ...images
  ]);

  const response = await result.response;
  const recipe = JSON.parse(response.text());

  return recipe;
}
```

## Database Operations
Same as URL import (see 01-recipe-import-url.md, AC3), with additions:

```sql
-- Additional fields for photo imports
UPDATE recipes
SET
  source_name = 'Geïmporteerd van foto',
  source_url = NULL,
  notes = 'Geïmporteerd van [aantal] foto''s. Controleer op eventuele OCR fouten.'
WHERE id = [recipe_id];
```

## Edge Cases

### EC1: Handgeschreven Recepten
**Scenario:** Foto bevat handgeschreven tekst (oma's receptenboek)
**Expected:** AI doet best effort, confidence score waarschijnlijk lager
**Workaround:** Gebruiker kan in edit mode verbeteren

### EC2: Recepten in Meerdere Talen
**Scenario:** Foto bevat Frans of Engels recept
**Expected:** AI detecteert taal, vertaalt ingrediënten naar Nederlands

### EC3: Foto Oriëntatie
**Scenario:** Foto is ondersteboven of gedraaid
**Expected:** AI kan tekst in meerdere oriëntaties lezen (Gemini capability)

### EC4: Slechte Belichting
**Scenario:** Foto is te donker of overbelicht
**Expected:** Lagere confidence score, mogelijke foutmelding

### EC5: Foto met Meerdere Kolommen
**Scenario:** Tijdschrift met 2-kolommen layout
**Expected:** AI leest beide kolommen en begrijpt structuur

### EC6: Receptafbeeldingen vs Tekst
**Scenario:** Foto bevat zowel de tekst als afbeeldingen van het gerecht
**Expected:** AI extraheert alleen tekst, negeert decoratieve afbeeldingen

## Testing Scenarios

### E2E Test: Succesvol Importeren van 1 Foto
1. Open import dialog
2. Klik op upload zone
3. Selecteer 1 duidelijke receptfoto
4. Wacht op preview
5. Klik "Importeren"
6. Wacht op AI processing (5-10 sec)
7. Verwacht: redirect naar edit mode van recept
8. Verificeer: titel, ingrediënten, instructies zijn ingevuld
9. Gebruiker controleert en slaat op

### E2E Test: Meerdere Foto's Combineren
1. Open import dialog
2. Selecteer 3 foto's:
   - Foto 1: Titel en ingrediënten
   - Foto 2: Bereidingswijze deel 1
   - Foto 3: Bereidingswijze deel 2
3. Preview toont 3 foto's (genummerd)
4. Klik "Importeren"
5. Verwacht: AI combineert alle informatie
6. Verificeer: instructies zijn compleet

### E2E Test: Foto Verwijderen
1. Selecteer 5 foto's
2. Preview toont 5 items
3. Klik × op foto 3
4. Verwacht: foto 3 verdwijnt
5. Count wordt "4 foto's"
6. Nummers zijn nu: 1, 2, 3, 4 (hergenummerd)

### E2E Test: Maximum Foto's
1. Probeer 15 foto's te selecteren
2. Verwacht: alert "Maximum 10 foto's"
3. Geen foto's worden toegevoegd
4. Gebruiker moet opnieuw selecteren

### E2E Test: Onleesbare Foto's
1. Upload een foto die wazig/onduidelijk is
2. Klik "Importeren"
3. AI probeert te lezen
4. Confidence < 0.3
5. Verwacht: foutmelding
6. Gebruiker kan foto's vervangen of handmatig invoeren

## Performance Requirements
- File upload: < 2 seconds (voor 10 foto's à 3MB)
- AI processing: < 10 seconds (1-3 foto's), < 20 seconds (10 foto's)
- Preview generation: < 1 second
- Total import time: < 25 seconds (worst case)

## Security Considerations
- Validate file type on server (don't trust client)
- Scan for malware (optional, maar recommended)
- Limit file size (10MB per foto, 50MB totaal)
- Rate limit (max 5 photo imports per hour per IP)
- Sanitize AI output before database insert
- Delete uploaded files after processing (don't store originals)

## Accessibility
- Upload zone heeft `role="button"` en `tabindex="0"`
- Keyboard support: Enter/Space om file dialog te openen
- Screen reader: "Upload zone. Klik of sleep foto's om te uploaden"
- Foto preview alt text: "Preview van geüploade foto [nummer]"

## Future Enhancements
- Live OCR preview tijdens upload (laat tekst zien die AI ziet)
- Image enhancement (auto contrast/brightness voor betere OCR)
- Crop tool om alleen recept-deel te selecteren
- Batch import van multiple recepten tegelijk
- Save uploaded photos in Supabase Storage als backup
- "Retake photo" functie met camera API
