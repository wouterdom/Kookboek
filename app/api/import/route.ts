import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { RecipeInsert, ParsedIngredientInsert } from '@/types/supabase'
import * as cheerio from 'cheerio'
import { linkRecipeToCategories } from '@/lib/category-manager'
import { scrapeLibelleLekker, scrapeLibelleLekkerPublic, hasLibelleLekkerCredentials, scrapeWithBrowser } from '@/lib/libelle-lekker-scraper'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

/**
 * Normalizes recipe instructions to ensure proper formatting with line breaks.
 * Handles cases where AI returns literal \n or continuous text without proper spacing.
 *
 * @param instructions - Raw instruction text from AI
 * @returns Normalized instruction text with proper line breaks
 */
function normalizeInstructions(instructions: string): string {
  if (!instructions || instructions.trim().length === 0) {
    return 'Geen bereidingswijze beschikbaar.'
  }

  let normalized = instructions.trim()

  // Step 1: Replace literal \n with actual newlines
  normalized = normalized.replace(/\\n/g, '\n')

  // Step 2: Ensure numbered steps are on separate lines
  // Use a global approach to catch all numbered steps
  // Pattern: "text 2. " -> "text\n2. " (but not at start of string)
  normalized = normalized.replace(/([^\n])(\s*)(\d+\.\s+)/g, (match, prevChar, spaces, numberDot) => {
    // If the previous character is a digit followed by a dot, we're mid-number (e.g., "1.5 liters")
    if (/\d/.test(prevChar)) {
      return match // Keep as-is
    }
    return prevChar + '\n' + numberDot
  })

  // Step 3: Ensure bullet points are on separate lines
  // Pattern: "text - " -> "text\n- "
  normalized = normalized.replace(/([^\n])(\s*)(-\s+)/g, (match, prevChar, spaces, dash) => {
    // Check if this is actually a bullet point (not a hyphen in a word like "niet-gekookt")
    if (/[a-zA-Z]/.test(prevChar)) {
      // Look ahead to see if there's a word after the dash
      return prevChar + '\n' + dash
    }
    return match
  })

  // Step 4: Clean up excessive whitespace
  // Remove multiple consecutive newlines (keep max 2 for paragraph breaks)
  normalized = normalized.replace(/\n{3,}/g, '\n\n')

  // Remove spaces at start/end of lines
  normalized = normalized.split('\n').map(line => line.trim()).join('\n')

  // Step 5: Ensure consistent spacing after numbers
  // "1.Text" -> "1. Text"
  normalized = normalized.replace(/^(\d+)\.(\S)/gm, '$1. $2')

  // Step 6: Remove any leading newlines that may have been introduced
  normalized = normalized.replace(/^\n+/, '')

  // Step 7: Final validation - warn if instructions appear poorly formatted
  const hasNumberedSteps = /^\d+\./m.test(normalized)
  const hasBulletPoints = /^-\s/m.test(normalized)
  const hasLineBreaks = normalized.includes('\n')

  if (!hasLineBreaks && normalized.length > 100) {
    console.warn('⚠️  Instructions may be poorly formatted (no line breaks detected):', normalized.substring(0, 100))
  }

  if (!hasNumberedSteps && !hasBulletPoints && normalized.length > 50) {
    console.warn('⚠️  Instructions may lack structure (no numbered steps or bullets detected)')
  }

  return normalized
}

async function extractImageFromWebpage(html: string, url: string): Promise<string | null> {
  try {
    const $ = cheerio.load(html)
    const baseUrl = new URL(url).origin

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

async function downloadAndUploadImage(imageUrl: string, slug: string, supabase: any): Promise<string | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) return null

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${slug}-${timestamp}-${randomStr}.${extension}`
    const filepath = `${slug}/${filename}`

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

    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filepath)

    return publicUrl
  } catch (error) {
    console.error('Error downloading/uploading image:', error)
    return null
  }
}

async function generateRecipeImage(
  recipeTitle: string,
  slug: string,
  supabase: any
): Promise<string | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' })
    const prompt = `A professional, high-quality food photography shot of ${recipeTitle}. The dish is beautifully plated on a clean white or neutral background. Studio lighting with soft shadows. The food looks fresh, appetizing, and restaurant-quality. Focus on making the dish look delicious and inviting. Top-down or 45-degree angle. High resolution, sharp focus.`

    console.log(`Generating AI image for: ${recipeTitle}`)

    const result = await model.generateContent(prompt)
    const response = result.response

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

    const imageBuffer = Buffer.from(imageBase64, 'base64')
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${slug}-${timestamp}-${randomStr}.png`
    const filePath = `recipe-images/${filename}`

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

    const { data: { publicUrl } } = supabase
      .storage
      .from('recipe-images')
      .getPublicUrl(filePath)

    console.log(`Uploaded generated image for "${recipeTitle}": ${publicUrl.substring(0, 50)}...`)

    return publicUrl

  } catch (error) {
    console.error('Error generating AI image:', error)
    return null
  }
}

const RECIPE_PROMPT = `
Extract recipe information from the content. Return ONLY valid JSON matching this structure.

{
  "title": "Recipe title",
  "description": "Brief description",
  "prep_time": number in minutes,
  "cook_time": number in minutes,
  "servings": number,
  "difficulty": "easy" | "medium" | "hard",
  "ingredients": [
    {
      "amount": number or null,
      "unit": "el" | "tl" | "ml" | "l" | "g" | "kg" | etc or null,
      "name": "ingredient name in Dutch",
      "section": "section name or null (e.g., 'Voor de saus', 'Voor het hoofdgerecht', 'Voor de vulling')"
    }
  ],
  "instructions": "Step-by-step instructions",
  "gang": "ONE OF THE SIX OPTIONS BELOW",
  "uitgever": "Author or publisher name"
}

CRITICAL - THESE FIELDS ARE ABSOLUTELY REQUIRED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. "gang" - MUST be EXACTLY one of these 6 options (case-sensitive):
   ✓ "Amuse"
   ✓ "Voorgerecht"
   ✓ "Soep"
   ✓ "Hoofdgerecht"
   ✓ "Dessert"
   ✓ "Bijgerecht"

   ❌ NO OTHER VALUES ALLOWED
   ❌ Do NOT use: "bijgerechten", "side dish", "starter", etc.

   How to decide:
   - Amuse = kleine hapjes voor het eten
   - Voorgerecht = starter, eerste gang
   - Soep = any soup
   - Hoofdgerecht = main course, het hoofdgerecht
   - Dessert = dessert, nagerecht, zoet
   - Bijgerecht = side dish, bijgerecht (bijv. friet, salade)

   If unclear: use "Hoofdgerecht" as default

2. "uitgever" - MUST extract the author/publisher:
   - Look for author names: "door [naam]", "by [naam]", "recept van [naam]"
   - Look for website names in headers/footers
   - Look for brand names (Knorr, Solo, etc.)
   - Common publishers: Jeroen Meus, Chloé Kookt, Laura's Bakery, Dagelijkse Kost, Leuke Recepten

   If author not found: use website domain (e.g., "leukerecepten.nl")
   ❌ NEVER return null or empty string

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Other important rules:
- All text MUST be in Dutch
- INSTRUCTIONS: Format as a numbered list with ACTUAL line breaks between each step. Each step should be on its own line.
  Example format:
  "1. Verwarm de oven voor op 180°C.
  2. Snijd de groenten in stukjes.
  3. Bak 30 minuten in de oven."

  CRITICAL: Use REAL line breaks (newlines), NOT the text "\n". Each number should start on a new line.

- SERVINGS: Extract if mentioned, otherwise use 4
- DIFFICULTY: Return in English (easy/medium/hard)
- INGREDIENT AMOUNTS: Extract exact amounts, use null if not specified
- INGREDIENT SECTIONS: If ingredients are grouped (e.g., "Voor de saus:", "Voor de vulling:"), extract the section name. Otherwise use null.

Example output (WITHOUT sections):
{
  "title": "Zoete aardappel friet",
  "gang": "Bijgerecht",
  "uitgever": "Leuke Recepten",
  "servings": 4,
  "ingredients": [
    { "amount": 500, "unit": "g", "name": "zoete aardappelen", "section": null },
    { "amount": 2, "unit": "el", "name": "olijfolie", "section": null }
  ],
  "instructions": "1. Verwarm de oven voor op 200°C.
2. Snijd de zoete aardappelen in frietjes.
3. Meng met olijfolie, zout en peper.
4. Bak 30 minuten in de oven tot goudbruin."
}

Example output (WITH sections):
{
  "title": "Carbonara",
  "gang": "Hoofdgerecht",
  "uitgever": "Italiaanse recepten",
  "servings": 4,
  "ingredients": [
    { "amount": 400, "unit": "g", "name": "spaghetti", "section": null },
    { "amount": 4, "unit": null, "name": "eieren", "section": "Voor de saus" },
    { "amount": 100, "unit": "g", "name": "Pecorino Romano", "section": "Voor de saus" },
    { "amount": 150, "unit": "g", "name": "guanciale", "section": "Voor de saus" }
  ],
  "instructions": "1. Kook de spaghetti volgens de verpakking.
2. Bak de guanciale krokant in een pan.
3. Klop de eieren met de geraspte kaas.
4. Meng de pasta met het spek en het eigenmengsel.
5. Serveer direct met extra kaas."
}
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
        const { url } = body

        if (!url) {
          return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        const isLibelleLekker = url.includes('libelle-lekker.be')
        const isOkay = url.includes('okay.be')
        const needsBrowserScraper = isLibelleLekker || isOkay

        let html = ''
        let finalUrl = url

        if (isLibelleLekker) {
          console.log(`Detected Libelle Lekker URL, using headless browser scraper`)
          const scrapedResult = await scrapeLibelleLekkerPublic(url)

          if (!scrapedResult.success) {
            console.error(`Libelle public scraper failed: ${scrapedResult.error}`)

            if (hasLibelleLekkerCredentials()) {
              console.log(`Trying authenticated scraper...`)
              const authScrapedResult = await scrapeLibelleLekker(url)

              if (authScrapedResult.success) {
                html = authScrapedResult.html
                finalUrl = authScrapedResult.finalUrl
              } else {
                return NextResponse.json({
                  error: `🔒 Kon recept niet ophalen van Libelle Lekker\n\nFout: ${authScrapedResult.error}\n\n✅ Alternatief:\n1. Open de receptpagina in je browser\n2. Log in indien nodig\n3. Selecteer en kopieer de hele pagina (Ctrl+A, Ctrl+C)\n4. Gebruik "Plak Receptinhoud" hieronder om het recept toe te voegen`,
                  loginRequired: true
                }, { status: 403 })
              }
            } else {
              return NextResponse.json({
                error: `🔒 Kon recept niet ophalen van Libelle Lekker\n\nFout: ${scrapedResult.error}\n\n💡 Tip: Configureer je Libelle Lekker login in de instellingen voor premium recepten!\n\n✅ Nu oplossen:\n1. Open de receptpagina in je browser\n2. Log in indien nodig\n3. Selecteer en kopieer de hele pagina (Ctrl+A, Ctrl+C)\n4. Gebruik "Plak Receptinhoud" hieronder om het recept toe te voegen`,
                loginRequired: true
              }, { status: 403 })
            }
          } else {
            html = scrapedResult.html
            finalUrl = scrapedResult.finalUrl
          }
        } else if (isOkay) {
          console.log(`Detected okay.be URL, using headless browser scraper`)
          const scrapedResult = await scrapeWithBrowser(url, 'Okay.be')

          if (!scrapedResult.success) {
            console.error(`Okay.be scraper failed: ${scrapedResult.error}`)
            return NextResponse.json({
              error: `Kon recept niet ophalen van okay.be\n\nFout: ${scrapedResult.error}\n\n✅ Alternatief:\n1. Open de receptpagina in je browser\n2. Selecteer en kopieer de hele pagina (Ctrl+A, Ctrl+C)\n3. Gebruik "Plak Receptinhoud" hieronder om het recept toe te voegen`,
              loginRequired: false
            }, { status: 500 })
          }

          html = scrapedResult.html
          finalUrl = scrapedResult.finalUrl
        } else {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            redirect: 'follow'
          })

          finalUrl = response.url
          const originalDomain = new URL(url).hostname
          const finalDomain = new URL(finalUrl).hostname

          const isAuthRedirect =
            originalDomain !== finalDomain ||
            finalUrl.includes('/oauth/') ||
            finalUrl.includes('/authorize') ||
            finalUrl.includes('/login') ||
            finalUrl.includes('token.roularta.be') ||
            finalUrl.includes('sso.roularta.be') ||
            finalUrl.includes('auth.')

          if (isAuthRedirect) {
            console.log(`Auth redirect detected: ${url} -> ${finalUrl}`)

            if (isLibelleLekker) {
              return NextResponse.json({
                error: '🔒 Login vereist\n\nDeze website vereist inloggen om recepten te bekijken.\n\n💡 Tip: Configureer je Libelle Lekker login in de instellingen voor automatische import!\n\n✅ Nu oplossen:\n1. Open de receptpagina in je browser\n2. Log in op de website\n3. Selecteer en kopieer de hele pagina (Ctrl+A, Ctrl+C)\n4. Gebruik "Plak Receptinhoud" hieronder om het recept toe te voegen',
                loginRequired: true
              }, { status: 403 })
            }

            return NextResponse.json({
              error: '🔒 Login vereist\n\nDeze website vereist inloggen om recepten te bekijken.\n\n✅ Oplossing:\n1. Open de receptpagina in je browser\n2. Log in op de website\n3. Selecteer en kopieer de hele pagina (Ctrl+A, Ctrl+C)\n4. Gebruik "Plak Receptinhoud" hieronder om het recept toe te voegen',
              loginRequired: true
            }, { status: 403 })
          }

          html = await response.text()
        }

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
          } else if (domain.includes('okay.be')) {
            sourceName = 'Okay'
          } else {
            sourceName = domain.replace('www.', '')
          }
        }

        $('script, style, noscript').remove() // Remove non-content elements
        const bodyText = $('body').text()

        // Check if content is too short (likely a login page)
        const contentTooShort = bodyText.length < 500

        // Check for actual recipe content indicators
        const hasRecipeContent =
          bodyText.toLowerCase().includes('ingredi') ||
          bodyText.toLowerCase().includes('bereidingswijze') ||
          bodyText.toLowerCase().includes('bereiding') ||
          bodyText.toLowerCase().includes('instructies')

        // Detect login walls - only strong indicators, not generic nav links
        const strongLoginPatterns = [
          /\bje moet inloggen\b/i, // "you must log in"
          /\binloggen om te bekijken\b/i, // "login to view"
          /sso\.roularta\.be\/login/i, // Roularta SSO login
          /token\.roularta\.be\/oauth/i, // Roularta OAuth
          /\/oauth\/.*\/authorize/i, // Generic OAuth authorization
          /\btoegang tot dit recept\b.*\binloggen\b/i, // "access to this recipe" + "login"
          /access denied/i, // Generic access denied
          /authentication required/i // Generic auth required
        ]

        const hasStrongLoginWall = strongLoginPatterns.some(pattern =>
          pattern.test(bodyText) || pattern.test(html)
        )

        // Only block if:
        // 1. Content is too short, OR
        // 2. Strong login wall detected AND no recipe content found
        if (contentTooShort || (hasStrongLoginWall && !hasRecipeContent)) {
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

    // Check if recipe already exists (by slug)
    const existingRecipeResult = await supabase
      .from('recipes')
      .select('id, title, slug')
      .eq('slug', slug)
      .maybeSingle()

    if (existingRecipeResult.data) {
      const existingRecipe = existingRecipeResult.data as { id: string; title: string; slug: string }
      console.log(`Recipe with slug "${slug}" already exists`)
      return NextResponse.json({
        error: `⚠️ Dit recept bestaat al!\n\n"${existingRecipe.title}" is al geïmporteerd.\n\nWil je het bestaande recept bekijken of bewerken?`,
        existingRecipe: {
          title: existingRecipe.title,
          slug: existingRecipe.slug
        }
      }, { status: 409 }) // 409 Conflict status for duplicate
    }

    // Insert recipe into database - be very lenient with data
    // Normalize instructions to ensure proper formatting
    const normalizedInstructions = normalizeInstructions(recipeData.instructions || '')

    const recipe: RecipeInsert = {
      title: recipeData.title || 'Geïmporteerd Recept',
      slug,
      description: recipeData.description || null,
      prep_time: recipeData.prep_time || null,
      cook_time: recipeData.cook_time || null,
      servings_default: recipeData.servings || 4, // Default to 4 if not found
      difficulty: recipeData.difficulty || null, // Should be in English now (easy/medium/hard)
      content_markdown: normalizedInstructions,
      labels: null, // Deprecated - now using category system
      source_name: recipeData.source || null,
      source_url: recipeData.source_url || null,
      source_language: 'nl',
      image_url: imageUrl,
      is_favorite: false
    }

    const { data: insertedRecipe, error: recipeError } = await supabase
      .from('recipes')
      // @ts-ignore
      .insert(recipe as any)
      .select()
      .single()

    if (recipeError) {
      console.error('Error inserting recipe:', recipeError)

      // Check if it's a unique constraint error (duplicate)
      if (recipeError.code === '23505' || recipeError.message?.includes('duplicate') || recipeError.message?.includes('unique')) {
        return NextResponse.json({
          error: `⚠️ Dit recept bestaat mogelijk al!\n\nEen recept met een vergelijkbare titel is al geïmporteerd.\n\nControleer je receptenlijst.`
        }, { status: 409 })
      }

      // Generic error
      return NextResponse.json({
        error: `❌ Kon recept niet opslaan\n\n${recipeError.message || 'Er ging iets mis bij het opslaan in de database.'}`
      }, { status: 500 })
    }

    // Insert ingredients - be very lenient
    if (recipeData.ingredients && Array.isArray(recipeData.ingredients) && recipeData.ingredients.length > 0) {
      const ingredients: ParsedIngredientInsert[] = recipeData.ingredients
        .filter((ing: any) => ing && ing.name) // Only include ingredients with a name
        .map((ing: any, index: number) => {
          const amount = ing.amount || null
          const unit = ing.unit || null
          const section = ing.section || null
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
            section,
            scalable: amount !== null,
            order_index: index
          }
        })

      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('parsed_ingredients')
          // @ts-ignore
          .insert(ingredients as any)

        if (ingredientsError) {
          console.error('Error inserting ingredients:', ingredientsError)
          // Don't fail the whole import if ingredients fail
        }
      }
    }

    // Link recipe to categories (gang + uitgever)
    const gang = recipeData.gang || null
    const uitgever = recipeData.uitgever || recipeData.source || null

    await linkRecipeToCategories(
      supabase,
      (insertedRecipe as any).id,
      gang,
      uitgever
    )

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