import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/weekmenu?week=2025-01-20 - Get all items for week
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const week = searchParams.get('week')

  if (!week) {
    return NextResponse.json({ error: 'week parameter is required (format: YYYY-MM-DD)' }, { status: 400 })
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(week)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  const { data: items, error } = await supabase
    .from('weekly_menu_items')
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
    .eq('week_date', week)
    .order('day_of_week', { ascending: true, nullsFirst: false })
    .order('order_index', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(items)
}

// POST /api/weekmenu - Create new weekmenu item
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { recipe_id, week_date, day_of_week, servings, order_index } = body

  // Validation
  if (!recipe_id) {
    return NextResponse.json({ error: 'recipe_id is required' }, { status: 400 })
  }

  if (!week_date) {
    return NextResponse.json({ error: 'week_date is required' }, { status: 400 })
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(week_date)) {
    return NextResponse.json({ error: 'Invalid week_date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  // Validate day_of_week if provided
  if (day_of_week !== null && day_of_week !== undefined) {
    if (day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json({ error: 'day_of_week must be between 0 (Monday) and 6 (Sunday)' }, { status: 400 })
    }
  }

  const insertData: {
    recipe_id: string
    week_date: string
    day_of_week?: number
    servings?: number
    order_index?: number
  } = {
    recipe_id,
    week_date
  }

  if (day_of_week !== null && day_of_week !== undefined) {
    insertData.day_of_week = day_of_week
  }
  if (servings !== null && servings !== undefined) {
    insertData.servings = servings
  }
  if (order_index !== null && order_index !== undefined) {
    insertData.order_index = order_index
  }

  const { data: item, error } = await supabase
    .from('weekly_menu_items')
    .insert(insertData)
    .select(`
      *,
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
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'This recipe is already in the menu for this day' }, { status: 409 })
    }
    if (error.code === '23503') { // Foreign key violation
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(item, { status: 201 })
}
