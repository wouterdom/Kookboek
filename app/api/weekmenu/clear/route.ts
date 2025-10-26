import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/weekmenu/clear - Clear all items for a specific week
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { week } = body

  if (!week) {
    return NextResponse.json({ error: 'week parameter is required (format: YYYY-MM-DD)' }, { status: 400 })
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(week)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  const { error } = await supabase
    .from('weekly_menu_items')
    .delete()
    .eq('week_date', week)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Weekly menu cleared' })
}
