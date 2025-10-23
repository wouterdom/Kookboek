import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { RecipeInsert, ParsedIngredientInsert } from '@/types/supabase'
import * as cheerio from 'cheerio'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

// Helper function to extract image from webpage
async function extractImageFromWebpage(html: string, url: string): Promise<string | null> {
  try {
    const $ = cheerio.load(html)
    const baseUrl = new URL(url).origin

    // Try different selectors for recipe images
    const selectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'article img',
      '.recipe-image img',
      '.recipe img',
      'img[alt*="recept"]',
      'img[alt*="recipe"]',
      'main img:first'
    ]

    for (const selector of selectors) {
      const element = $(selector).first()
      let imageUrl = element.attr('content') || element.attr('src')

      if (imageUrl) {
        // Make absolute URL
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl
        } else if (imageUrl.startsWith('/')) {
          imageUrl = baseUrl + imageUrl
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = baseUrl + '/' + imageUrl
        }

        return imageUrl
      }
    }
  } catch (error) {
    console.error('Error extracting image:', error)
  }
  return null
}

// Helper function to download and upload image to Supabase
async function downloadAndUploadImage(imageUrl: string, slug: string, supabase: any): Promise<string | null> {
  try {
    // Download image
    const response = await fetch(imageUrl)
    if (!response.ok) return null

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Get file extension from URL or content-type
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${slug}-${timestamp}-${randomStr}.${extension}`
    const filepath = `${slug}/${filename}`

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .upload(filepath, buffer, {
        contentType,
        upsert: false
      })

    if (error) {
      console.error('Error uploading image:', error)
      return null
    }

    // Return public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filepath)

    return publicUrl
  } catch (error) {
    console.error('Error downloading/uploading image:', error)
    return null
  }
}

/**
 * Generate AI food image using Gemini 2.5 Flash Image
 * Saves the image to Supabase Storage and returns the public URL
 *
 * @param recipeTitle - The title of the recipe (e.g., "Lemon Meringue Taart")
 * @param slug - The slug of the recipe (for storage path)
 * @param supabase - Supabase client
 * @returns URL of the generated and uploaded image
 */
async function generateRecipeImage(
  recipeTitle: string,
  slug: string,
  supabase: any
): Promise<string | null> {
  try {
    // Use Gemini 2.5 Flash Image model for image generation
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' })

    // Craft a professional food photography prompt
    const prompt = `A professional, high-quality food photography shot of ${recipeTitle}. The dish is beautifully plated on a clean white or neutral background. Studio lighting with soft shadows. The food looks fresh, appetizing, and restaurant-quality. Focus on making the dish look delicious and inviting. Top-down or 45-degree angle. High resolution, sharp focus.`

    console.log(`Generating AI image for: ${recipeTitle}`)

    // Generate the image
    const result = await model.generateContent(prompt)
    const response = result.response

    // Extract image data from response
    let imageBase64: string | null = null

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        imageBase64 = part.inlineData.data
        break
      }
    }

    if (!imageBase64) {
      console.error('No image data returned from Gemini')
      return null
    }

    console.log(`Generated image for "${recipeTitle}", uploading to Supabase...`)

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64')

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${slug}-${timestamp}-${randomStr}.png`
    const filePath = `recipe-images/${filename}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('recipe-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('recipe-images')
      .getPublicUrl(filePath)

    console.log(`Uploaded generated image for "${recipeTitle}": ${publicUrl.substring(0, 50)}...`)

    return publicUrl

  } catch (error) {
    console.error('Error generating AI image:', error)
    // Return null to allow recipe import without image
    return null
  }
}

// Recipe extraction prompt
const RECIPE_PROMPT = `
Extract recipe information from the content. Return ONLY valid JSON matching this structure.
Be as flexible as possible - if any field is missing or unclear, just omit it or use null.

{
  "title": "Recipe title" (REQUIRED - extract from page),
  "description": "Brief description" (optional),
  "prep_time": number in minutes (optional),
  "cook_time": number in minutes (optional),
  "servings": number of servings (IMPORTANT: Only include if explicitly mentioned. Look for "voor X personen", "X porties", etc. If not found, use 4 as default),
  "difficulty": "easy" | "medium" | "hard" (optional - translate from Dutch if needed),
  "ingredients": [
    {
      "amount": number or null (IMPORTANT: extract the exact amount, do not guess),
      "unit": "el" | "tl" | "ml" | "l" | "g" | "kg" | etc or null,
      "name": "ingredient name in Dutch"
    }
  ],
  "instructions": "Step-by-step instructions in markdown format. MUST be formatted as numbered list (1. First step\n2. Second step\n3. Third step\netc.) or bullet points (- Step one\n- Step two\netc.)",
  "labels": ["Voorgerecht" | "Hoofdgerecht" | "Dessert" | "Bijgerecht"] (IMPORTANT: Select ONE category that best describes this dish. Choose from: Voorgerecht, Hoofdgerecht, Dessert, Bijgerecht. Return as single-item array.),
  "source": "Source name if mentioned" (optional)
}

Important:
- All text MUST be in Dutch
- INSTRUCTIONS: MUST be formatted as a numbered list (1. 2. 3.) or bullet points (- ). Each step on a new line. This is critical for readability.
- If instructions are not clear, extract whatever text you can find but still format as numbered steps
- Extract as many ingredients as possible, even if amounts are unclear
- SERVINGS: If serving information is found, use it. Otherwise, default to 4.
- INGREDIENT AMOUNTS: Extract the exact amounts as written. Do not guess or make up amounts.
- DIFFICULTY: Return in English (easy/medium/hard). Translate: Makkelijk=easy, Gemiddeld=medium, Moeilijk=hard
- LABELS: Choose ONE category only (Voorgerecht, Hoofdgerecht, Dessert, or Bijgerecht) that best describes this dish type
- The only REQUIRED field is "title" - everything else is optional

Example of good instruction formatting:
1. Verwarm de oven voor op 180°C.
2. Meng de bloem met het zout in een kom.
3. Voeg de eieren en melk toe en roer tot een glad beslag.
4. Bak 25-30 minuten tot goudbruin.
`

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')
    const supabase = await createClient()

    let recipeData: any

    if (contentType?.includes('application/json')) {
      const body = await request.json()

      // Check if this is a paste import or URL import
      if (body.pastedContent) {
        // Import from pasted content
        const { pastedContent, sourceUrl } = body

        if (!pastedContent || pastedContent.trim().length === 0) {
          return NextResponse.json({ error: 'Geplakte inhoud is vereist' }, { status: 400 })
        }

        // Use Gemini to extract recipe from pasted content
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })
        const result = await model.generateContent([
          RECIPE_PROMPT,
          `Extract recipe information from this pasted content:\n\n${pastedContent.slice(0, 300000)}`
        ])

        const text = result.response.text()
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('Kon geen recept informatie vinden in de geplakte tekst')
        }

        recipeData = JSON.parse(jsonMatch[0])

        // Set source info if provided
        if (sourceUrl) {
          recipeData.source_url = sourceUrl
          // Try to extract source name from URL
          try {
            const domain = new URL(sourceUrl).hostname
            if (domain.includes('dagelijksekost')) {
              recipeData.source = 'Dagelijkse kost'
            } else if (domain.includes('libelle-lekker')) {
              recipeData.source = 'Libelle Lekker'
            } else if (domain.includes('njam')) {
              recipeData.source = 'njam!'
            } else {
              recipeData.source = domain.replace('www.', '')
            }
          } catch (e) {
            // Invalid URL, skip
          }
        } else {
          recipeData.source = 'Handmatig ingevoerd'
        }

        // No image extracted from paste - will use placeholder
        recipeData.extracted_image_url = null

      } else if (body.url) {
        // Import from URL
        const { url } = body

        if (!url) {
          return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        // Fetch the webpage content
        const response = await fetch(url)
        const html = await response.text()

        // Extract image from webpage
        const extractedImageUrl = await extractImageFromWebpage(html, url)

        // Use cheerio to extract metadata and text content
        const $ = cheerio.load(html)

        // Try to extract source name from JSON-LD structured data
        let sourceName: string | null = null
        $('script[type="application/ld+json"]').each((_, elem) => {
          try {
            const jsonLd = JSON.parse($(elem).html() || '{}')
            // Check for Recipe type with author
            if (jsonLd['@type'] === 'Recipe' && jsonLd.author?.name) {
              sourceName = jsonLd.author.name
            }
          } catch (e) {
            // Ignore parse errors
          }
        })

        // Fallback: infer source from domain
        if (!sourceName) {
          const domain = new URL(url).hostname
          if (domain.includes('dagelijksekost')) {
            sourceName = 'Dagelijkse kost'
          } else if (domain.includes('libelle-lekker')) {
            sourceName = 'Libelle Lekker'
          } else if (domain.includes('njam')) {
            sourceName = 'njam!'
          } else {
            sourceName = domain.replace('www.', '')
          }
        }

        $('script, style, noscript').remove() // Remove non-content elements
        const bodyText = $('body').text()

        // Detect login walls - check for common login/register patterns
        const loginPatterns = [
          /\b(inloggen|login|log in)\b.*\b(registreer|register|sign up)\b/i,
          /\bmeld je aan\b/i,
          /\bje moet inloggen\b/i,
          /sso\.roularta\.be\/login/i
        ]

        const hasLoginWall = loginPatterns.some(pattern =>
          pattern.test(bodyText) || pattern.test(html)
        )

        // Check if content is too short (likely a login page)
        const contentTooShort = bodyText.length < 500

        if (hasLoginWall || contentTooShort) {
          return NextResponse.json({
            error: '🔒 Login vereist\n\nDeze website vereist inloggen.\n\n✅ Oplossing:\n1. Log in op de website in je browser\n2. Kopieer de hele pagina (inclusief ingrediënten en instructies)\n3. Gebruik "Plak Receptinhoud" hieronder om het recept toe te voegen',
            loginRequired: true
          }, { status: 403 })
        }

        // Get cleaner HTML content - limit to 300k chars (Gemini can handle it)
        const cleanContent = bodyText.slice(0, 300000)

        // Use Gemini to extract recipe from HTML
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })
        const result = await model.generateContent([
          RECIPE_PROMPT,
          `Extract recipe information from this webpage content:\n\n${cleanContent}`
        ])

        const text = result.response.text()
        // Extract JSON from response (Gemini might wrap it in markdown)
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('Could not extract recipe information')
        }

        recipeData = JSON.parse(jsonMatch[0])
        recipeData.source_url = url
        recipeData.source = sourceName // Use extracted source name
        recipeData.extracted_image_url = extractedImageUrl
      } else {
        return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
      }

    } else if (contentType?.includes('multipart/form-data')) {
      // Import from photos
      const formData = await request.formData()
      const photos = formData.getAll('photos') as File[]

      if (photos.length === 0) {
        return NextResponse.json({ error: 'No photos provided' }, { status: 400 })
      }

      // Convert photos to base64 for Gemini
      const photoData = await Promise.all(
        photos.map(async (photo) => {
          const bytes = await photo.arrayBuffer()
          const base64 = Buffer.from(bytes).toString('base64')
          return {
            inlineData: {
              data: base64,
              mimeType: photo.type
            }
          }
        })
      )

      // Use Gemini multimodal to extract recipe from photos
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })
      const result = await model.generateContent([
        RECIPE_PROMPT,
        'Extract and combine recipe information from these photos:',
        ...photoData
      ])

      const text = result.response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not extract recipe information from photos')
      }

      recipeData = JSON.parse(jsonMatch[0])
      recipeData.source = 'Foto opgeladen'
      recipeData.notes = `Geïmporteerd van ${photos.length} foto's`

    } else {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    // Generate slug from title
    const slug = recipeData.title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Handle image - download and upload to Supabase
    let imageUrl: string | null = null

    if (recipeData.extracted_image_url) {
      // Try to download and upload the extracted image
      imageUrl = await downloadAndUploadImage(recipeData.extracted_image_url, slug, supabase)
    }

    // If image extraction failed, generate AI image with Gemini
    if (!imageUrl && recipeData.title) {
      console.log(`No image found for "${recipeData.title}", generating AI image...`)
      imageUrl = await generateRecipeImage(recipeData.title, slug, supabase)
    }

    // Insert recipe into database - be very lenient with data
    const recipe: RecipeInsert = {
      title: recipeData.title || 'Geïmporteerd Recept',
      slug,
      description: recipeData.description || null,
      prep_time: recipeData.prep_time || null,
      cook_time: recipeData.cook_time || null,
      servings_default: recipeData.servings || 4, // Default to 4 if not found
      difficulty: recipeData.difficulty || null, // Should be in English now (easy/medium/hard)
      content_markdown: recipeData.instructions || 'Geen bereidingswijze beschikbaar.',
      labels: recipeData.labels || null,
      source_name: recipeData.source || null,
      source_url: recipeData.source_url || null,
      source_language: 'nl',
      image_url: imageUrl,
      is_favorite: false
    }

    const { data: insertedRecipe, error: recipeError } = await supabase
      .from('recipes')
      . // @ts-expect-error
      insert(recipe)
      .select()
      .single()

    if (recipeError) {
      console.error('Error inserting recipe:', recipeError)
      return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 })
    }

    // Insert ingredients - be very lenient
    if (recipeData.ingredients && Array.isArray(recipeData.ingredients) && recipeData.ingredients.length > 0) {
      const ingredients: ParsedIngredientInsert[] = recipeData.ingredients
        .filter((ing: any) => ing && ing.name) // Only include ingredients with a name
        .map((ing: any, index: number) => {
          const amount = ing.amount || null
          const unit = ing.unit || null
          let amount_display = ''

          if (amount && unit) {
            amount_display = `${amount} ${unit}`
          } else if (amount) {
            amount_display = `${amount}`
          } else if (unit) {
            amount_display = unit
          }

          return {
            recipe_id: (insertedRecipe as any).id,
            ingredient_name_nl: ing.name || 'Onbekend ingrediënt',
            amount,
            unit,
            amount_display,
            scalable: amount !== null,
            order_index: index
          }
        })

      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('parsed_ingredients')
          // @ts-expect-error
          .insert(ingredients)

        if (ingredientsError) {
          console.error('Error inserting ingredients:', ingredientsError)
          // Don't fail the whole import if ingredients fail
        }
      }
    }

    return NextResponse.json({
      success: true,
      recipe: insertedRecipe,
      slug
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import recipe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}