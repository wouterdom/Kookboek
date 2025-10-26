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

  // Add WHERE clause based on mode
  if (mode === 'checked') {
    query = query.eq('is_checked', true)
  } else {
    // For 'all' mode, use neq to satisfy WHERE clause requirement
    // This deletes all records (both true and false)
    query = query.neq('id', '00000000-0000-0000-0000-000000000000')
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
