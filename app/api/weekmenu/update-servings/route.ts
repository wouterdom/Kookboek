import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { recipe_id, week_date, servings } = await request.json()

    if (!recipe_id || !week_date || servings === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update the servings for this recipe in the specified week
    const { error } = await supabase
      .from('weekly_menu_items')
      .update({ servings })
      .eq('recipe_id', recipe_id)
      .eq('week_date', week_date)

    if (error) {
      console.error('Error updating servings:', error)
      return NextResponse.json(
        { error: 'Failed to update servings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in update-servings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
