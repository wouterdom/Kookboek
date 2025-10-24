/**
 * PDF Recipe Processor
 *
 * Extracts recipes from cookbook PDFs using Gemini Flash Latest
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

// Recipe extraction prompt optimized for Dutch cookbooks
const RECIPE_EXTRACTION_PROMPT = `
Extract ALL recipes from this Dutch cookbook PDF.

CRITICAL RULES - MUST FOLLOW:
1. Only extract pages that contain actual recipes - SKIP:
   - Table of contents (Inhoud)
   - Introduction pages (Inleiding)
   - Tips and tricks sections (Tips en trucs)
   - Section dividers (APERO, LUNCH, DINER, ZOET, etc.)
   - Author pages, copyright pages

2. For each recipe found:
   - Identify if it spans multiple pages and consolidate into one recipe
   - Extract all information in Dutch
   - **REQUIRED**: Every recipe MUST have both ingredients AND instructions
   - **DO NOT** include recipes that are missing ingredients or instructions

3. Ingredient parsing (REQUIRED - DO NOT SKIP):
   - Search thoroughly for ingredient lists
   - Look for sections labeled: "Ingrediënten", "Nodig", "Voor X personen"
   - Extract exact amounts (numbers only)
   - Keep Dutch units: g, kg, ml, l, el, tl, eetlepel, theelepel, snufje
   - Handle fractions: ½, ⅓, ¼ etc.
   - If no amount specified, use null
   - **MINIMUM**: Every recipe must have at least 2 ingredients
   - If you cannot find ingredients, DO NOT include that recipe

4. Instructions (REQUIRED - DO NOT SKIP):
   - Look for sections labeled: "Bereiding", "Instructies", "Stappen", "Werkwijze"
   - Format as numbered steps (1. 2. 3.)
   - Each step on new line with \\n
   - Keep original Dutch text
   - **MINIMUM**: Every recipe must have at least 2 instruction steps
   - If you cannot find instructions, DO NOT include that recipe

5. Servings:
   - Look for "voor X personen", "X porties", etc.
   - Return as number
   - If not found, use 4 as default

6. Gang (REQUIRED - NO EXCEPTIONS):
   - Choose EXACTLY ONE from these 6 options (case-sensitive):
     ✓ "Amuse"
     ✓ "Voorgerecht"
     ✓ "Soep"
     ✓ "Hoofdgerecht"
     ✓ "Dessert"
     ✓ "Bijgerecht"

   - ❌ NO OTHER VALUES - do NOT use "bijgerechten", "side dish", "starter", etc.
   - If unclear, use "Hoofdgerecht" as default
   - This field is MANDATORY for EVERY recipe

7. Uitgever (REQUIRED - NO EXCEPTIONS):
   - Extract the author, chef name, or publisher from:
     * PDF header/footer
     * Title page
     * Recipe byline
     * Copyright page
   - Common examples: Jeroen Meus, Chloé Kookt, Laura's Bakery, Dagelijkse Kost, Ons Kookboek
   - If not found in PDF: use PDF filename (without .pdf extension)
   - ❌ NEVER return null or empty string
   - This field is MANDATORY for EVERY recipe

8. Image detection:
   - Note which page has the main food photo (not step photos)
   - Mark confidence: high (same page as recipe), medium (adjacent page), low (ambiguous)

**VALIDATION CHECKLIST (Before including a recipe):**
- ✓ Has title
- ✓ Has at least 2 ingredients
- ✓ Has at least 2 instruction steps
- ✓ Both ingredients and instructions are clearly extracted
- If any of these are missing → DO NOT include the recipe

Return ONLY valid JSON array. No markdown, no code blocks, just the JSON:

[
  {
    "title": "Recipe naam" (REQUIRED),
    "description": "Brief description" (optional),
    "servings": 4,
    "prep_time": 15 (minutes, optional),
    "cook_time": 30 (minutes, optional),
    "difficulty": "easy" (or "medium" or "hard", optional),
    "ingredients": [
      {
        "amount": 200,
        "unit": "g",
        "name": "bloem"
      },
      {
        "amount": null,
        "unit": "snufje",
        "name": "zout"
      }
    ] (REQUIRED - minimum 2),
    "instructions": "1. Verwarm de oven voor op 180°C.\\n2. Meng de bloem met het zout.\\n3. Bak 25-30 minuten." (REQUIRED - minimum 2 steps),
    "gang": "Hoofdgerecht" (REQUIRED - one of: Amuse, Voorgerecht, Soep, Hoofdgerecht, Dessert, Bijgerecht),
    "uitgever": "Author or publisher name" (REQUIRED - e.g., "Jeroen Meus", "Chloé Kookt", "Laura's Bakery"),
    "source": "Name from PDF title if visible",
    "source_pages": [10, 11],
    "primary_image_page": 10,
    "image_confidence": "high"
  }
]

Extract every recipe you can find that has BOTH ingredients AND instructions. Be thorough but accurate.
Only include recipes that meet ALL validation criteria above.
`

export interface ExtractedIngredient {
  amount: number | null
  unit: string | null
  name: string
}

export interface ExtractedRecipe {
  title: string
  description?: string
  servings?: number
  prep_time?: number
  cook_time?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  ingredients: ExtractedIngredient[]
  instructions: string
  gang?: string // Required: Amuse, Voorgerecht, Soep, Hoofdgerecht, Dessert, or Bijgerecht
  uitgever?: string // Required: Author/publisher name
  source?: string
  source_pages: number[]
  primary_image_page?: number
  image_confidence?: 'high' | 'medium' | 'low'
}

export interface PdfProcessingResult {
  recipes: ExtractedRecipe[]
  totalPages: number
  processingTime: number
  error?: string
}

/**
 * Process PDF and extract all recipes using Gemini Flash Latest
 */
export async function processPdf(
  pdfBuffer: Buffer,
  onProgress?: (current: number, total: number) => void
): Promise<PdfProcessingResult> {
  const startTime = Date.now()

  try {
    // Convert PDF to base64
    const base64 = pdfBuffer.toString('base64')

    // Use Gemini Flash Lite Latest for PDF processing
    const model = genAI.getGenerativeModel({ model: 'models/gemini-flash-lite-latest' })

    console.log('Sending PDF to Gemini Flash Lite Latest for processing...')

    // Send PDF to Gemini
    const result = await model.generateContent([
      RECIPE_EXTRACTION_PROMPT,
      {
        inlineData: {
          data: base64,
          mimeType: 'application/pdf'
        }
      }
    ])

    const responseText = result.response.text()
    console.log('Received response from Gemini')

    // Parse JSON response
    // Remove markdown code blocks if present
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response')
    }

    const recipes: ExtractedRecipe[] = JSON.parse(jsonMatch[0])

    console.log(`Extracted ${recipes.length} recipes from PDF`)

    const processingTime = Date.now() - startTime

    return {
      recipes,
      totalPages: 0, // We don't know total pages without parsing
      processingTime
    }

  } catch (error) {
    console.error('PDF processing error:', error)
    const processingTime = Date.now() - startTime

    return {
      recipes: [],
      totalPages: 0,
      processingTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Extract images from PDF (to be implemented)
 * For now, we'll rely on Gemini's page number indication
 * and potentially extract images in a future iteration
 */
export async function extractImagesFromPdf(
  pdfBuffer: Buffer,
  pageNumbers: number[]
): Promise<Map<number, Buffer>> {
  // TODO: Implement image extraction using pdf-lib or similar
  // For MVP, we'll use Unsplash fallback or skip images
  return new Map()
}
