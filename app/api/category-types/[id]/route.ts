import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CategoryTypeUpdate } from '@/types/supabase'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { error } = await supabase
    .from('category_types')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const { name, description, allow_multiple, order_index } = await request.json()

  const updateData: CategoryTypeUpdate = {}
  if (name !== undefined) updateData.name = name.trim()
  if (description !== undefined) updateData.description = description?.trim() || null
  if (allow_multiple !== undefined) updateData.allow_multiple = allow_multiple
  if (order_index !== undefined) updateData.order_index = order_index

  const { data: categoryType, error } = await supabase
    .from('category_types')
    // @ts-ignore - Supabase SSR client type inference issue
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(categoryType)
}
