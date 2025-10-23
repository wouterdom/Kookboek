import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { CATEGORY_LABEL_COLOR } from '@/lib/colors'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const typeSlug = searchParams.get('type')

  let query = supabase
    .from('categories')
    .select(`
      *,
      category_type:category_types(*)
    `)

  // Filter by category type if provided
  if (typeSlug) {
    const { data: categoryType } = (await supabase
      .from('category_types')
      .select('id')
      .eq('slug', typeSlug)
      .single()) as { data: { id: string } | null }

    if (categoryType?.id) {
      query = query.eq('type_id', categoryType.id)
    }
  }

  const { data: categories, error } = await query.order('order_index', { nullsFirst: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { name, color, type_id, order_index } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!type_id) {
    return NextResponse.json({ error: 'type_id is required' }, { status: 400 })
  }

  // Generate slug from name
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')

  const { data: category, error } = await supabase
    .from('categories')
    // @ts-expect-error - Insert with runtime validated data
    .insert({
      name: name.trim(),
      slug,
      color: CATEGORY_LABEL_COLOR.value, // Always use fixed soft yellow
      type_id,
      order_index
    })
    .select(`
      *,
      category_type:category_types(*)
    `)
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(category, { status: 201 })
}
