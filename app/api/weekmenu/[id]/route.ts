import type { WeeklyMenuItemUpdate } from "@/types/supabase"
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PUT /api/weekmenu/[id] - Update weekmenu item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()
  const { day_of_week, servings, is_completed, order_index } = body

  // Build update object with only provided fields
  const updateData: WeeklyMenuItemUpdate = {}

  // Validate day_of_week if provided
  if (day_of_week !== undefined) {
    if (day_of_week !== null && (day_of_week < 0 || day_of_week > 6)) {
      return NextResponse.json({ error: 'day_of_week must be between 0 (Monday) and 6 (Sunday) or null' }, { status: 400 })
    }
    updateData.day_of_week = day_of_week
  }

  if (servings !== undefined) {
    updateData.servings = servings
  }

  if (is_completed !== undefined) {
    updateData.is_completed = is_completed
  }

  if (order_index !== undefined) {
    updateData.order_index = order_index
  }

  // Check if there's anything to update
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: item, error } = await supabase
    .from('weekly_menu_items')
    // @ts-ignore
    .update(updateData as any)
    .eq('id', id)
    .select(`
      id,
      recipe_id,
      week_date,
      day_of_week,
      servings,
      is_completed,
      order_index,
      custom_title,
      created_at,
      recipe:recipes(
        id,
        title,
        slug,
        image_url,
        prep_time,
        cook_time,
        servings_default,
        difficulty
      )
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return NextResponse.json({ error: 'Weekly menu item not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(item)
}

// DELETE /api/weekmenu/[id] - Delete weekmenu item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { error } = await supabase
    .from('weekly_menu_items')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Weekly menu item deleted' })
}
