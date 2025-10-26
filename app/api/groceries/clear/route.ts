import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DELETE /api/groceries/clear?mode=checked|all - Clear grocery items
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'checked'

  if (mode !== 'checked' && mode !== 'all') {
    return NextResponse.json({ error: 'Invalid mode. Use "checked" or "all"' }, { status: 400 })
  }

  let query = supabase.from('grocery_items').delete()

  // Only delete checked items if mode is 'checked'
  if (mode === 'checked') {
    query = query.eq('is_checked', true)
  }

  const { error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: mode === 'all' ? 'All grocery items cleared' : 'Checked items cleared'
  })
}
