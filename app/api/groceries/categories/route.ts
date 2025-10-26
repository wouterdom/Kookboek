import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { GroceryCategoryInsert } from '@/types/supabase'

// GET /api/groceries/categories - Get all grocery categories
export async function GET() {
  const supabase = await createClient()

  const { data: categories, error } = await supabase
    .from('grocery_categories')
    .select('*')
    .eq('is_visible', true)
    .order('order_index', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(categories)
}

// POST /api/groceries/categories - Create custom category
export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { name, color, icon, order_index } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // Generate slug from name
  const slug = name.trim().toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const insertData: GroceryCategoryInsert = {
    name: name.trim(),
    slug,
    is_system: false
  }

  if (color) {
    insertData.color = color
  }
  if (icon) {
    insertData.icon = icon
  }
  if (order_index !== undefined) {
    insertData.order_index = order_index
  }

  const { data: category, error } = await supabase
    .from('grocery_categories')
    // @ts-ignore - Supabase SSR client type inference issue
    .insert(insertData)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(category, { status: 201 })
}
