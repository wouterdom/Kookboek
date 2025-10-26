import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeInsert, ParsedIngredientInsert } from '@/types/supabase'
import { linkRecipeToCategories } from '@/lib/category-manager'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const data = await request.json()

    const {
      title,
      description,
      ingredients,
      instructions,
      prep_time,
      cook_time,
      servings,
      difficulty,
      gang
    } = data

    if (!title) {
      return NextResponse.json(
        { error: 'Titel is verplicht' },
        { status: 400 }
      )
    }

    console.log(`Creating manual recipe: ${title}`)

    // Generate base slug from title
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Ensure unique slug
    let slug = baseSlug
    let counter = 1

    while (true) {
      const { data: existing } = await supabase
        .from('recipes')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!existing) break

      slug = `${baseSlug}-${counter++}`
    }

    console.log(`Generated unique slug: ${slug}`)

    // Insert recipe
    const recipe: RecipeInsert = {
      title,
      slug,
      description: description || null,
      prep_time: prep_time || null,
      cook_time: cook_time || null,
      servings_default: servings || 4,
      difficulty: difficulty || null,
      content_markdown: instructions || '',
      labels: null,
      source_name: 'Handmatig toegevoegd',
      source_url: null,
      source_language: 'nl',
      image_url: null, // Will be generated separately
      is_favorite: false
    }

    const { data: insertedRecipe, error: recipeError } = await supabase
      .from('recipes')
      // @ts-expect-error
      .insert(recipe)
      .select()
      .single()

    if (recipeError) {
      console.error('Error inserting recipe:', recipeError)
      return NextResponse.json(
        { error: 'Recept opslaan mislukt' },
        { status: 500 }
      )
    }

    const recipeId = (insertedRecipe as any).id

    console.log(`Recipe inserted with ID: ${recipeId}`)

    // Insert ingredients if provided
    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      console.log(`Inserting ${ingredients.length} ingredients`)

      // Parse ingredients from strings like "250g bloem" into structured format
      const parsedIngredients: ParsedIngredientInsert[] = ingredients.map((ing: string, index: number) => {
        // Try to parse amount and unit from string
        const match = ing.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/)

        let amount = null
        let unit = null
        let name = ing

        if (match) {
          amount = parseFloat(match[1].replace(',', '.'))
          unit = match[2] || null
          name = match[3]
        } else {
          // Check if starts with number only
          const numMatch = ing.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/)
          if (numMatch) {
            amount = parseFloat(numMatch[1].replace(',', '.'))
            name = numMatch[2]
          }
        }

        let amount_display = ''
        if (amount && unit) {
          amount_display = `${amount} ${unit}`
        } else if (amount) {
          amount_display = `${amount}`
        } else if (unit) {
          amount_display = unit
        }

        return {
          recipe_id: recipeId,
          ingredient_name_nl: name.trim(),
          amount,
          unit,
          amount_display,
          section: null, // Manual recipes don't have sections
          scalable: amount !== null,
          order_index: index
        }
      })

      const { error: ingredientsError } = await supabase
        .from('parsed_ingredients')
        // @ts-expect-error
        .insert(parsedIngredients)

      if (ingredientsError) {
        console.error('Error inserting ingredients:', ingredientsError)
        // Don't fail the whole save if ingredients fail
      } else {
        console.log('Ingredients inserted successfully')
      }
    }

    // Link recipe to categories (gang + uitgever = "Eigen recept")
    const uitgever = 'Eigen recept' // Always "Eigen recept" for manual recipes
    await linkRecipeToCategories(
      supabase,
      recipeId,
      gang || null,
      uitgever
    )

    console.log(`Recipe categories linked: gang=${gang || 'none'}, uitgever=${uitgever}`)

    return NextResponse.json({
      recipeId,
      slug
    })

  } catch (error) {
    console.error('Error saving manual recipe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Recept opslaan mislukt' },
      { status: 500 }
    )
  }
}
