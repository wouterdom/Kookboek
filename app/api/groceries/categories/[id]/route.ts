import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { GroceryCategoryUpdate } from '@/types/supabase'

// PUT /api/groceries/categories/[id] - Update category
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()
  const { name, color, icon, order_index, is_visible } = body

  // Build update object with only provided fields
  const updateData: GroceryCategoryUpdate = {}

  if (name !== undefined) {
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }
    updateData.name = name.trim()

    // Generate new slug from name
    updateData.slug = name.trim().toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  if (color !== undefined) {
    updateData.color = color
  }

  if (icon !== undefined) {
    updateData.icon = icon
  }

  if (order_index !== undefined) {
    updateData.order_index = order_index
  }

  if (is_visible !== undefined) {
    updateData.is_visible = is_visible
  }

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: category, error } = await supabase
    .from('grocery_categories')
    // @ts-ignore - Supabase SSR client type inference issue
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(category)
}

// DELETE /api/groceries/categories/[id] - Delete category
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // Check if category is system category
  const { data: category, error: fetchError } = await supabase
    .from('grocery_categories')
    .select('is_system')
    .eq('id', id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if ((category as any)?.is_system) {
    return NextResponse.json({ error: 'Cannot delete system category' }, { status: 403 })
  }

  const { error } = await supabase
    .from('grocery_categories')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Category deleted' })
}
