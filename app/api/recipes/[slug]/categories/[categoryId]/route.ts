import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; categoryId: string }> }
) {
  const supabase = await createClient()
  const { slug, categoryId } = await params

  // Get recipe by slug
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('id')
    .eq('slug', slug)
    .single()

  if (recipeError || !recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  // Remove category from recipe
  const { error } = await supabase
    .from('recipe_categories')
    .delete()
    .eq('recipe_id', (recipe as any).id)
    .eq('category_id', categoryId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
