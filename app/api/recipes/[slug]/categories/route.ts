import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
  const { data, error } = await supabase
    .from('recipe_categories')
    // @ts-expect-error - Dynamic insert
    .insert({
      recipe_id: (recipe as any).id,
      category_id
    })
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
