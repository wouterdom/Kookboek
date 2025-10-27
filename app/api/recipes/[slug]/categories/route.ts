import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { RecipeCategoryInsert } from '@/types/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient()
  const { slug } = await params

  // Get recipe by slug
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('id')
    .eq('slug', slug)
    .single()

  if (recipeError || !recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  // Get all categories for this recipe
  const { data: recipeCategories, error } = await supabase
    .from('recipe_categories')
    .select(`
      category_id,
      category:categories(
        id,
        name,
        slug,
        color,
        type_id,
        category_type:category_types(*)
      )
    `)
    .eq('recipe_id', (recipe as any).id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(recipeCategories)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient()
  const { slug } = await params
  const { category_id } = await request.json()

  if (!category_id) {
    return NextResponse.json({ error: 'category_id is required' }, { status: 400 })
  }

  // Get recipe by slug
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('id')
    .eq('slug', slug)
    .single()

  if (recipeError || !recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  // Add category to recipe
  const insertData: RecipeCategoryInsert = {
    recipe_id: (recipe as any).id,
    category_id
  }

  const { data, error } = await supabase
    .from('recipe_categories')
    // @ts-ignore - Supabase SSR client type inference issue
    .insert(insertData)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Category already added to recipe' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = await createClient()
  const { slug } = await params
  const { category_ids } = await request.json()

  if (!Array.isArray(category_ids)) {
    return NextResponse.json({ error: 'category_ids must be an array' }, { status: 400 })
  }

  // Get recipe by slug
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('id')
    .eq('slug', slug)
    .single()

  if (recipeError || !recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  const recipeId = (recipe as any).id

  try {
    // Delete all existing categories for this recipe
    const { error: deleteError } = await supabase
      .from('recipe_categories')
      .delete()
      .eq('recipe_id', recipeId)

    if (deleteError) {
      throw deleteError
    }

    // Insert new categories if any
    if (category_ids.length > 0) {
      const insertData: RecipeCategoryInsert[] = category_ids.map(category_id => ({
        recipe_id: recipeId,
        category_id
      }))

      // @ts-ignore - Supabase SSR client type inference issue
      const { error: insertError } = await supabase
        .from('recipe_categories')
        // @ts-ignore - Supabase SSR client type inference issue
        .insert(insertData)

      if (insertError) {
        throw insertError
      }
    }

    return NextResponse.json({ success: true, updated: category_ids.length })
  } catch (error: any) {
    console.error('Error updating categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
