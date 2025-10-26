import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CategoryUpdate } from '@/types/supabase'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // Delete the category (recipe_categories junction entries will be deleted via CASCADE)
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
  const { name, color, order_index } = await request.json()

  const updateData: CategoryUpdate = {}
  if (name !== undefined) {
    updateData.name = name.trim()
    updateData.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  }
  if (color !== undefined) updateData.color = color
  if (order_index !== undefined) updateData.order_index = order_index

  const { data: category, error } = await supabase
    .from('categories')
    // @ts-ignore - Supabase SSR client type inference issue
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      category_type:category_types(*)
    `)
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(category)
}
