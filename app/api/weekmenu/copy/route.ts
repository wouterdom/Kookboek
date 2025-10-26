import type { WeeklyMenuItemInsert } from "@/types/supabase"
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/weekmenu/copy - Copy week to another week
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { from_week, to_week } = body

  if (!from_week || !to_week) {
    return NextResponse.json({ error: 'Both from_week and to_week are required (format: YYYY-MM-DD)' }, { status: 400 })
  }

  // Validate date formats
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(from_week) || !dateRegex.test(to_week)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  if (from_week === to_week) {
    return NextResponse.json({ error: 'from_week and to_week must be different' }, { status: 400 })
  }

  // Get items from source week
  const { data: sourceItems, error: fetchError } = await supabase
    .from('weekly_menu_items')
    .select('recipe_id, day_of_week, servings, order_index')
    .eq('week_date', from_week)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!sourceItems || sourceItems.length === 0) {
    return NextResponse.json({ error: 'No items found in source week' }, { status: 404 })
  }

  // Clear target week first (optional - you can remove this if you want to merge)
  await supabase
    .from('weekly_menu_items')
    .delete()
    .eq('week_date', to_week)

  // Create new items for target week
  const newItems = sourceItems.map((item: any) => ({
    recipe_id: item.recipe_id,
    week_date: to_week,
    day_of_week: item.day_of_week,
    servings: item.servings,
    order_index: item.order_index,
    is_completed: false
  }))

  const { data: copiedItems, error: insertError } = await supabase
    .from('weekly_menu_items')
    // @ts-ignore
    .insert(newItems as any)
    .select(`
      *,
      recipe:recipes(
        id,
        title,
        slug,
        image_url,
        prep_time,
        cook_time,
        servings,
        difficulty
      )
    `)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Copied ${copiedItems.length} items from ${from_week} to ${to_week}`,
    items: copiedItems
  }, { status: 201 })
}
