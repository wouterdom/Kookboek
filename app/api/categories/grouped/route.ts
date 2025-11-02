import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { CategoriesByType, CategoryType } from '@/types/supabase'

export const revalidate = 300 // Cache for 5 minutes

export async function GET() {
  const supabase = await createClient()

  // Single optimized query: fetch categories with their type in one go
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

  // Handle null/empty data - DEFENSIVE FIX
  if (!categories || categories.length === 0) {
    console.error('Categories query returned null or empty:', { categories, categoriesError })
    return NextResponse.json({}, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })
  }

  // Group categories by type
  const grouped: CategoriesByType = {}

  categories.forEach((cat: any) => {
    const categoryType = cat.category_type

    if (!categoryType) return

    if (!grouped[categoryType.slug]) {
      grouped[categoryType.slug] = {
        type: categoryType,
        categories: []
      }
    }

    // Add category without the nested category_type to avoid duplication
    const { category_type, ...categoryData } = cat
    grouped[categoryType.slug].categories.push(categoryData)
  })

  // Sort types by order_index
  const sortedGrouped: CategoriesByType = {}
  Object.entries(grouped)
    .sort(([, a], [, b]) => (a.type.order_index || 0) - (b.type.order_index || 0))
    .forEach(([slug, data]) => {
      sortedGrouped[slug] = data
    })

  return NextResponse.json(sortedGrouped, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }
  })
}
