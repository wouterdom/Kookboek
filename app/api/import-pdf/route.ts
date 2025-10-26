/**
 * PDF Recipe Import API
 *
 * This endpoint handles bulk recipe imports from PDF cookbooks.
 *
 * AI Models Used:
 * - models/gemini-flash-lite-latest: Recipe text extraction from PDF
 * - models/gemini-2.5-flash-image: AI-generated food photography
 *
 * Cost per import (500-page PDF with ~50 recipes):
 * - PDF extraction: ~€0.02-0.05 (gemini-flash-lite-latest)
 * - Image generation: ~€1.93 (50 recipes × 1290 tokens × $30/1M tokens)
 * - Total: ~€2.00 per full cookbook import
 *
 * Features:
 * - Non-blocking background processing
 * - Real-time status updates in header
 * - Automatic recipe detection and extraction
 * - AI-generated food photography with Gemini
 * - Images uploaded to Supabase Storage
 * - Intelligent ingredient parsing with validation
 * - Ensures all recipes have ingredients AND instructions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processPdf } from '@/lib/pdf-processor'
import type { RecipeInsert, ParsedIngredientInsert } from '@/types/supabase'
import { linkRecipeToCategories } from '@/lib/category-manager'

const MAX_PDF_SIZE = 100 * 1024 * 1024 // 100MB

/**
 * POST /api/import-pdf
 *
 * Upload PDF and start background processing
 * Returns immediately with job ID
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const formData = await request.formData()
    const file = formData.get('pdf') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Geen PDF bestand gevonden' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Alleen PDF bestanden zijn toegestaan' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: `PDF bestand is te groot. Maximum is ${MAX_PDF_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('pdf_import_jobs')
      // @ts-ignore
      .insert({
        filename: file.name,
        file_size: file.size,
        status: 'processing'
      } as any)
      .select()
      .single()

    if (jobError || !job) {
      console.error('Error creating job:', jobError)
      return NextResponse.json(
        { error: 'Kon import job niet aanmaken' },
        { status: 500 }
      )
    }

    // Start background processing (don't await)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    processPdfInBackground(fileBuffer, (job as any).id, file.name)

    // Return immediately
    return NextResponse.json({
      success: true,
      jobId: (job as any).id,
      message: `${file.name} wordt verwerkt op de achtergrond`
    })

  } catch (error) {
    console.error('PDF upload error:', error)
    return NextResponse.json(
      {
        error: 'Er ging iets mis bij het uploaden',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Validate that a recipe has the minimum required fields
 * Returns false if recipe is missing ingredients or instructions
 */
function validateRecipe(recipe: any): boolean {
  // Must have title
  if (!recipe.title || recipe.title.trim().length === 0) {
    return false
  }

  // Must have at least 2 ingredients
  if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length < 2) {
    return false
  }

  // Check that ingredients have names
  const validIngredients = recipe.ingredients.filter((ing: any) => ing && ing.name && ing.name.trim().length > 0)
  if (validIngredients.length < 2) {
    return false
  }

  // Must have instructions
  if (!recipe.instructions || recipe.instructions.trim().length < 10) {
    return false
  }

  // Instructions should have at least 2 steps (look for numbered steps or newlines)
  const stepCount = (recipe.instructions.match(/\d+\./g) || []).length
  const lineCount = recipe.instructions.split('\n').filter((line: string) => line.trim().length > 0).length

  if (stepCount < 2 && lineCount < 2) {
    return false
  }

  return true
}

/**
 * Process PDF in background
 * This runs asynchronously after the API returns
 */
async function processPdfInBackground(
  pdfBuffer: Buffer,
  jobId: string,
  filename: string
) {
  const supabase = await createClient()

  try {
    console.log(`Starting background processing for job ${jobId} (${filename})`)

    // Process PDF with Gemini
    const result = await processPdf(pdfBuffer)

    if (result.error) {
      throw new Error(result.error)
    }

    console.log(`Found ${result.recipes.length} recipes in ${filename}`)

    // Update job with found recipes
    await supabase
      .from('pdf_import_jobs')
      // @ts-ignore
      .update({
        recipes_found: result.recipes.length
      } as any)
      .eq('id', jobId)

    // Import each recipe with validation
    let importedCount = 0
    let skippedCount = 0

    for (const extractedRecipe of result.recipes) {
      try {
        // Validate recipe has required fields
        if (!validateRecipe(extractedRecipe)) {
          console.warn(`Skipping recipe "${extractedRecipe.title}": Missing ingredients or instructions`)
          skippedCount++
          continue
        }

        await importRecipe(extractedRecipe, jobId, filename, supabase)
        importedCount++
      } catch (error) {
        console.error(`Error importing recipe "${extractedRecipe.title}":`, error)
        skippedCount++
        // Continue with other recipes
      }
    }

    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} recipes due to missing data`)
    }

    // Mark job as completed
    await supabase
      .from('pdf_import_jobs')
      // @ts-ignore
      .update({
        status: 'completed',
        recipes_imported: importedCount,
        completed_at: new Date().toISOString()
      } as any)
      .eq('id', jobId)

    console.log(`Completed job ${jobId}: ${importedCount}/${result.recipes.length} recipes imported`)

  } catch (error) {
    console.error(`Background processing error for job ${jobId}:`, error)

    // Mark job as failed
    await supabase
      .from('pdf_import_jobs')
      // @ts-ignore
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      } as any)
      .eq('id', jobId)
  }
}

/**
 * Generate AI food image using Gemini 2.5 Flash Image
 * Saves the image to Supabase Storage and returns the public URL
 *
 * @param recipeTitle - The title of the recipe (e.g., "Lemon Meringue Taart")
 * @param recipeId - The UUID of the recipe (for storage path)
 * @param supabase - Supabase client
 * @returns URL of the generated and uploaded image
 */
async function generateRecipeImage(
  recipeTitle: string,
  recipeId: string,
  supabase: any
): Promise<string | null> {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

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
    const filename = `${recipeId}-${Date.now()}.png`
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

    console.log(`Uploaded image for "${recipeTitle}": ${publicUrl.substring(0, 50)}...`)

    return publicUrl

  } catch (error) {
    console.error('Error generating AI image:', error)
    // Return null to allow recipe import without image
    return null
  }
}

/**
 * Import a single recipe into the database
 */
async function importRecipe(
  extractedRecipe: any,
  jobId: string,
  sourceFilename: string,
  supabase: any
) {
  // Generate slug from title
  const slug = extractedRecipe.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // Check if recipe with this slug already exists
  const { data: existing } = await supabase
    .from('recipes')
    .select('id')
    .eq('slug', slug)
    .single()

  // If exists, append a random suffix
  const finalSlug = existing
    ? `${slug}-${Math.random().toString(36).substring(2, 8)}`
    : slug

  // Prepare recipe data (without image first)
  const recipe: RecipeInsert = {
    title: extractedRecipe.title || 'Geïmporteerd Recept',
    slug: finalSlug,
    description: extractedRecipe.description || null,
    prep_time: extractedRecipe.prep_time || null,
    cook_time: extractedRecipe.cook_time || null,
    servings_default: extractedRecipe.servings || 4,
    difficulty: extractedRecipe.difficulty || null,
    content_markdown: extractedRecipe.instructions || 'Geen bereidingswijze beschikbaar.',
    labels: null, // Deprecated - now using category system
    source_name: extractedRecipe.source || sourceFilename,
    source_url: null,
    source_language: 'nl',
    image_url: null, // Will be updated after generating
    is_favorite: false
  }

  // Insert recipe
  const { data: insertedRecipe, error: recipeError } = await supabase
    .from('recipes')
    .insert(recipe)
    .select()
    .single()

  if (recipeError || !insertedRecipe) {
    throw new Error(`Failed to insert recipe: ${recipeError?.message}`)
  }

  // Generate AI image using Gemini 2.5 Flash Image model
  const imageUrl = await generateRecipeImage(extractedRecipe.title, insertedRecipe.id, supabase)

  // Update recipe with image URL if generated successfully
  if (imageUrl) {
    await supabase
      .from('recipes')
      .update({ image_url: imageUrl })
      .eq('id', insertedRecipe.id)
  }

  // Insert ingredients
  if (extractedRecipe.ingredients && Array.isArray(extractedRecipe.ingredients)) {
    const ingredients: ParsedIngredientInsert[] = extractedRecipe.ingredients
      .filter((ing: any) => ing && ing.name)
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
          recipe_id: insertedRecipe.id,
          ingredient_name_nl: ing.name,
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
        .insert(ingredients)

      if (ingredientsError) {
        console.error('Error inserting ingredients:', ingredientsError)
        // Don't fail the whole import if ingredients fail
      }
    }
  }

  // Link recipe to categories (gang + uitgever)
  const gang = extractedRecipe.gang || null
  const uitgever = extractedRecipe.uitgever || extractedRecipe.source || sourceFilename.replace(/\.[^/.]+$/, '')

  await linkRecipeToCategories(
    supabase,
    insertedRecipe.id,
    gang,
    uitgever
  )

  console.log(`Imported recipe: ${extractedRecipe.title}`)
}
