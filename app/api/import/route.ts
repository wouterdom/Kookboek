import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { RecipeInsert, ParsedIngredientInsert } from '@/types/supabase'
import * as cheerio from 'cheerio'
import { linkRecipeToCategories } from '@/lib/category-manager'
import { scrapeLibelleLekker, scrapeLibelleLekkerPublic, hasLibelleLekkerCredentials, scrapeWithBrowser } from '@/lib/libelle-lekker-scraper'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

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
      "name": "ingredient name in Dutch"
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
- INSTRUCTIONS: Format as numbered list (1. Step\n2. Step\n3. Step)
- SERVINGS: Extract if mentioned, otherwise use 4
- DIFFICULTY: Return in English (easy/medium/hard)
- INGREDIENT AMOUNTS: Extract exact amounts, use null if not specified

Example output:
{
  "title": "Zoete aardappel friet",
  "gang": "Bijgerecht",
  "uitgever": "Leuke Recepten",
  "servings": 4,
  "ingredients": [...],
  "instructions": "1. Verwarm oven\n2. Snijd friet\n3. Bak 30 min"
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
      labels: null, // Deprecated - now using category system
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