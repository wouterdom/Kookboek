import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { GroceryItemUpdate } from '@/types/supabase'

// PUT /api/groceries/[id] - Update grocery item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()
  const { name, amount, category_id, is_checked } = body

  // Build update object with only provided fields
  const updateData: GroceryItemUpdate = {
    updated_at: new Date().toISOString()
  }

  if (name !== undefined) {
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }
    updateData.name = name.trim()
  }

  if (amount !== undefined) {
    updateData.amount = amount
  }

  if (category_id !== undefined) {
    updateData.category_id = category_id
  }

  if (is_checked !== undefined) {
    updateData.is_checked = is_checked
  }

  const { data: item, error } = await supabase
    .from('grocery_items')
    // @ts-ignore - Supabase SSR client type inference issue
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      category:grocery_categories(
        id,
        name,
        slug,
        icon,
        color,
        order_index
      )
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return NextResponse.json({ error: 'Grocery item not found' }, { status: 404 })
    }
    if (error.code === '23503') { // Foreign key violation
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(item)
}

// DELETE /api/groceries/[id] - Delete grocery item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { error } = await supabase
    .from('grocery_items')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Grocery item deleted' })
}
