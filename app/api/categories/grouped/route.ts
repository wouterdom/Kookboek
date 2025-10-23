import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { CategoriesByType, CategoryType, Category } from '@/types/supabase'

export async function GET() {
  const supabase = await createClient()

  // Haal alle category types op
  const { data: categoryTypes, error: typesError } = await supabase
    .from('category_types')
    .select('*')
    .order('order_index')

  if (typesError) {
    return NextResponse.json({ error: typesError.message }, { status: 500 })
  }

  // Haal alle categorieën op met hun type
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select(`
      *,
      category_type:category_types(*)
    `)
    .order('order_index', { nullsFirst: false })

  if (categoriesError) {
    return NextResponse.json({ error: categoriesError.message }, { status: 500 })
  }

  // Groepeer categorieën per type
  const grouped: CategoriesByType = {}

  categoryTypes.forEach((type: CategoryType) => {
    grouped[type.slug] = {
      type,
      categories: categories.filter((cat: any) => cat.type_id === type.id)
    }
  })

  return NextResponse.json(grouped)
}
