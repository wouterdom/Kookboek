import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecipeUpdate, ParsedIngredientInsert } from '@/types/supabase'

// GET - Fetch recipe by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const includeIngredients = searchParams.get('includeIngredients') === 'true'

    const supabase = await createClient()

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Optionally include ingredients
    if (includeIngredients) {
      const { data: ingredients } = await supabase
        .from('parsed_ingredients')
        .select('*')
        .eq('recipe_id', (recipe as any).id)
        .order('order_index')

      return NextResponse.json({ ...(recipe as any), ingredients: ingredients || [] })
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 })
  }
}

// PUT - Update recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const supabase = await createClient()

    // First get the recipe ID
    const { data: existingRecipe, error: fetchError } = await supabase
      .from('recipes')
      .select('id, slug')
      .eq('slug', slug)
      .single()

    if (fetchError || !existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: RecipeUpdate = {
      updated_at: new Date().toISOString()
    }

    // Only update fields that are provided
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.content_markdown !== undefined) updateData.content_markdown = body.content_markdown
    if (body.prep_time !== undefined) updateData.prep_time = body.prep_time
    if (body.cook_time !== undefined) updateData.cook_time = body.cook_time
    if (body.servings_default !== undefined) updateData.servings_default = body.servings_default
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty
    if (body.image_url !== undefined) updateData.image_url = body.image_url
    if (body.source_name !== undefined) updateData.source_name = body.source_name
    if (body.source_url !== undefined) updateData.source_url = body.source_url
    if (body.labels !== undefined) updateData.labels = body.labels

    // Handle notes update
    if (body.notes !== undefined) {
      updateData.notes = body.notes
      updateData.notes_updated_at = new Date().toISOString()
    }

    // If slug changed, update it (and ensure uniqueness)
    if (body.slug !== undefined && body.slug !== slug) {
      updateData.slug = body.slug
    }

    // Update recipe
    const { data: updatedRecipe, error: updateError } = await supabase
      .from('recipes')
      // @ts-ignore - Supabase SSR client type inference issue
      .update(updateData)
      .eq('id', (existingRecipe as any).id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating recipe:', updateError)
      return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 })
    }

    // Update ingredients if provided
    if (body.ingredients !== undefined && Array.isArray(body.ingredients)) {
      // Delete existing ingredients
      await supabase
        .from('parsed_ingredients')
        .delete()
        .eq('recipe_id', (existingRecipe as any).id)

      // Insert new ingredients
      if (body.ingredients.length > 0) {
        const ingredients: ParsedIngredientInsert[] = body.ingredients.map((ing: any, index: number) => ({
          recipe_id: (existingRecipe as any).id,
          ingredient_name_nl: ing.ingredient_name_nl || ing.name,
          amount: ing.amount || null,
          unit: ing.unit || null,
          amount_display: ing.amount_display || (ing.amount && ing.unit ? `${ing.amount} ${ing.unit}` : ing.amount ? `${ing.amount}` : ''),
          scalable: ing.scalable !== undefined ? ing.scalable : (ing.amount !== null),
          section: ing.section || null,
          order_index: index
        }))

        const { error: ingredientsError } = await supabase
          .from('parsed_ingredients')
          // @ts-ignore - Supabase SSR client type inference issue
          .insert(ingredients)

        if (ingredientsError) {
          console.error('Error updating ingredients:', ingredientsError)
          // Don't fail the whole update if ingredients fail
        }
      }
    }

    return NextResponse.json({
      success: true,
      recipe: updatedRecipe
    })

  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // First get the recipe ID
    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select('id')
      .eq('slug', slug)
      .single()

    if (fetchError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Fetch all images associated with this recipe
    const { data: images, error: imagesError } = await supabase
      .from('recipe_images')
      .select('image_url')
      .eq('recipe_id', (recipe as any).id)

    // Delete individual image files from storage
    if (images && images.length > 0) {
      const imagePaths: string[] = []

      for (const image of images as Array<{ image_url: string }>) {
        try {
          // Extract path from URL
          const urlObj = new URL(image.image_url)
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/recipe-images\/(.+)/)
          if (pathMatch && pathMatch[1]) {
            const path = decodeURIComponent(pathMatch[1])
            imagePaths.push(path)
          }
        } catch (error) {
          console.error('Error parsing image URL:', error)
        }
      }

      // Delete all image files
      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('recipe-images')
          .remove(imagePaths)

        if (storageError) {
          console.error('Error deleting images from storage:', storageError)
          // Continue with deletion even if storage cleanup fails
        }
      }
    }

    // Try to delete the entire recipe folder from storage
    // This handles any leftover files or AI-generated images
    try {
      const { data: folderFiles } = await supabase.storage
        .from('recipe-images')
        .list(slug)

      if (folderFiles && folderFiles.length > 0) {
        const folderPaths = folderFiles.map(file => `${slug}/${file.name}`)
        await supabase.storage
          .from('recipe-images')
          .remove(folderPaths)
      }
    } catch (error) {
      console.error('Error cleaning up recipe folder:', error)
      // Continue with deletion even if folder cleanup fails
    }

    // Delete recipe_images records from database
    await supabase
      .from('recipe_images')
      .delete()
      .eq('recipe_id', (recipe as any).id)

    // Delete ingredients (cascade should handle this, but being explicit)
    await supabase
      .from('parsed_ingredients')
      .delete()
      .eq('recipe_id', (recipe as any).id)

    // Delete recipe
    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', (recipe as any).id)

    if (deleteError) {
      console.error('Error deleting recipe:', deleteError)
      return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete recipe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
