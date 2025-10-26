import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { categorizeIngredient, getCategoryIdFromSlug } from '@/lib/ingredient-categorizer'

// GET /api/groceries - Get all items grouped by category
export async function GET() {
  const supabase = await createClient()

  const { data: items, error } = await supabase
    .from('grocery_items')
    .select(`
      *,
      category:grocery_categories(
        id,
        name,
        slug,
        icon,
        color,
        order_index
      ),
      recipe:from_recipe_id(
        id,
        title,
        slug
      ),
      weekmenu:from_weekmenu_id(
        id,
        week_date,
        day_of_week
      )
    `)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group items by category
  const uncategorized: typeof items = []
  const categorized: { [key: string]: typeof items } = {}

  items.forEach(item => {
    if (item.category) {
      const categoryId = item.category.id
      if (!categorized[categoryId]) {
        categorized[categoryId] = []
      }
      categorized[categoryId].push(item)
    } else {
      uncategorized.push(item)
    }
  })

  // Get all categories to ensure proper ordering
  const { data: categories } = await supabase
    .from('grocery_categories')
    .select('*')
    .eq('is_visible', true)
    .order('order_index', { ascending: true })

  // Build final grouped structure
  const grouped = categories?.map(category => ({
    category,
    items: categorized[category.id] || []
  })) || []

  // Add uncategorized items at the end
  if (uncategorized.length > 0) {
    grouped.push({
      category: {
        id: null,
        name: 'Ongecategoriseerd',
        slug: 'uncategorized',
        icon: '❓',
        color: '#9CA3AF',
        order_index: 999,
        is_system: false,
        is_visible: true,
        created_at: new Date().toISOString()
      },
      items: uncategorized
    })
  }

  return NextResponse.json({
    grouped,
    total: items.length,
    checked: items.filter(item => item.is_checked).length,
    unchecked: items.filter(item => !item.is_checked).length
  })
}

// POST /api/groceries - Create new grocery item(s)
// Supports both single item and batch insert with automatic categorization
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Fetch all grocery categories for categorization
  const { data: categories, error: categoriesError } = await supabase
    .from('grocery_categories')
    .select('id, slug')

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError)
  }

  // Check if this is a batch insert (array of items)
  const isBatch = Array.isArray(body.items)

  if (isBatch) {
    // Batch insert
    const items = body.items

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'items array is required and cannot be empty' }, { status: 400 })
    }

    // Validate and prepare items
    const insertData = items.map((item: any) => {
      if (!item.name?.trim()) {
        throw new Error('Each item must have a name')
      }

      const data: {
        name: string
        amount?: string
        original_amount?: string
        category_id?: string
        from_recipe_id?: string
        from_weekmenu_id?: string
      } = {
        name: item.name.trim()
      }

      if (item.amount) {
        data.amount = item.amount
        data.original_amount = item.original_amount || item.amount
      }
      // Auto-categorize if no category_id provided
      if (item.category_id) {
        data.category_id = item.category_id
      } else if (categories && categories.length > 0) {
        const categorySlug = categorizeIngredient(item.name, categories)
        const categoryId = getCategoryIdFromSlug(categorySlug, categories)
        if (categoryId) {
          data.category_id = categoryId
        }
      }
      if (item.from_recipe_id) {
        data.from_recipe_id = item.from_recipe_id
      }
      if (item.from_weekmenu_id) {
        data.from_weekmenu_id = item.from_weekmenu_id
      }

      return data
    })

    const { data: insertedItems, error } = await supabase
      .from('grocery_items')
      .insert(insertData)
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

    if (error) {
      if (error.code === '23503') { // Foreign key violation
        return NextResponse.json({ error: 'Category, recipe, or weekmenu item not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: insertedItems, count: insertedItems?.length || 0 }, { status: 201 })
  } else {
    // Single item insert
    const { name, amount, category_id, from_recipe_id, from_weekmenu_id } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const insertData: {
      name: string
      amount?: string
      original_amount?: string
      category_id?: string
      from_recipe_id?: string
      from_weekmenu_id?: string
    } = {
      name: name.trim()
    }

    if (amount) {
      insertData.amount = amount
      insertData.original_amount = amount
    }

    // Auto-categorize if no category_id provided
    if (category_id) {
      insertData.category_id = category_id
    } else if (categories && categories.length > 0) {
      const categorySlug = categorizeIngredient(name, categories)
      const categoryId = getCategoryIdFromSlug(categorySlug, categories)
      if (categoryId) {
        insertData.category_id = categoryId
      }
    }
    if (from_recipe_id) {
      insertData.from_recipe_id = from_recipe_id
    }
    if (from_weekmenu_id) {
      insertData.from_weekmenu_id = from_weekmenu_id
    }

    const { data: item, error } = await supabase
      .from('grocery_items')
      .insert(insertData)
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
      if (error.code === '23503') { // Foreign key violation
        return NextResponse.json({ error: 'Category, recipe, or weekmenu item not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(item, { status: 201 })
  }
}
