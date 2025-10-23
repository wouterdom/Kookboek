import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // Get the category name first to remove it from recipes
  const { data: category, error: fetchError } = await supabase
    .from('categories')
    .select('name')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  // Remove this category from all recipes that have it
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('id, labels')

  if (!recipesError && recipes) {
    for (const recipe of recipes) {
      if (recipe.labels && recipe.labels.includes(category.name)) {
        const updatedLabels = recipe.labels.filter((label: string) => label !== category.name)
        await supabase
          .from('recipes')
          .update({ labels: updatedLabels })
          .eq('id', recipe.id)
      }
    }
  }

  // Delete the category
  const { error: deleteError } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const { name, color } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Get old category name for updating recipes
  const { data: oldCategory, error: fetchError } = await supabase
    .from('categories')
    .select('name')
    .eq('id', id)
    .single()

  if (fetchError || !oldCategory) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  // Update the category
  const { data: category, error } = await supabase
    .from('categories')
    .update({
      name: name.trim(),
      color: color || name.toLowerCase().replace(/\s+/g, '')
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update category name in all recipes if name changed
  if (oldCategory.name !== name.trim()) {
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, labels')

    if (!recipesError && recipes) {
      for (const recipe of recipes) {
        if (recipe.labels && recipe.labels.includes(oldCategory.name)) {
          const updatedLabels = recipe.labels.map((label: string) =>
            label === oldCategory.name ? name.trim() : label
          )
          await supabase
            .from('recipes')
            .update({ labels: updatedLabels })
            .eq('id', recipe.id)
        }
      }
    }
  }

  return NextResponse.json(category)
}
