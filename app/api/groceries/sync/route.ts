import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/groceries/sync - Sync grocery items from weekly menu
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { week_date, clear_existing = false } = body

  if (!week_date) {
    return NextResponse.json({ error: 'week_date is required (format: YYYY-MM-DD)' }, { status: 400 })
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(week_date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  // Get weekly menu items for the week
  const { data: menuItems, error: menuError } = await supabase
    .from('weekly_menu_items')
    .select(`
      id,
      recipe_id,
      servings,
      recipe:recipes(
        id,
        title,
        servings,
        ingredients(
          item,
          amount
        )
      )
    `)
    .eq('week_date', week_date)
    .eq('is_completed', false)

  if (menuError) {
    return NextResponse.json({ error: menuError.message }, { status: 500 })
  }

  if (!menuItems || menuItems.length === 0) {
    return NextResponse.json({ error: 'No menu items found for this week' }, { status: 404 })
  }

  // Clear existing grocery items if requested
  if (clear_existing) {
    await supabase
      .from('grocery_items')
      .delete()
      .not('from_weekmenu_id', 'is', null)
  }

  // Collect all ingredients from all recipes
  const groceryItems: Array<{
    name: string
    amount: string | null
    original_amount: string | null
    from_recipe_id: string
    from_weekmenu_id: string
  }> = []

  menuItems.forEach(menuItem => {
    if (!menuItem.recipe?.ingredients) return

    const servingRatio = menuItem.servings / (menuItem.recipe.servings || 4)

    menuItem.recipe.ingredients.forEach(ingredient => {
      // Calculate scaled amount if needed
      let scaledAmount = ingredient.amount

      // Try to scale numeric amounts
      if (ingredient.amount && servingRatio !== 1) {
        const match = ingredient.amount.match(/^(\d+(?:\.\d+)?)\s*(.*)$/)
        if (match) {
          const number = parseFloat(match[1])
          const unit = match[2]
          const scaledNumber = (number * servingRatio).toFixed(1).replace(/\.0$/, '')
          scaledAmount = `${scaledNumber}${unit ? ' ' + unit : ''}`
        }
      }

      groceryItems.push({
        name: ingredient.item,
        amount: scaledAmount,
        original_amount: ingredient.amount,
        from_recipe_id: menuItem.recipe_id,
        from_weekmenu_id: menuItem.id
      })
    })
  })

  if (groceryItems.length === 0) {
    return NextResponse.json({ error: 'No ingredients found in menu recipes' }, { status: 404 })
  }

  // Insert grocery items
  const { data: createdItems, error: insertError } = await supabase
    .from('grocery_items')
    .insert(groceryItems)
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

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Synced ${createdItems.length} items from ${menuItems.length} recipes`,
    items: createdItems
  }, { status: 201 })
}
