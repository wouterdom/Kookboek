import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CategoryTypeInsert } from '@/types/supabase'

export async function GET() {
  const supabase = await createClient()

  const { data: categoryTypes, error } = await supabase
    .from('category_types')
    .select('*')
    .order('order_index')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(categoryTypes)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { name, slug, description, allow_multiple, order_index } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!slug?.trim()) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  const insertData: CategoryTypeInsert = {
    name: name.trim(),
    slug: slug.trim(),
    description: description?.trim() || null,
    allow_multiple: allow_multiple ?? true,
    order_index: order_index ?? null
  }

  const { data: categoryType, error } = await supabase
    .from('category_types')
    // @ts-ignore - Supabase SSR client type inference issue
    .insert(insertData)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Category type already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(categoryType, { status: 201 })
}
