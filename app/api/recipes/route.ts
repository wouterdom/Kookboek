import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = parseInt(searchParams.get('pageSize') || '24')
  const search = searchParams.get('search') || ''
  const favorites = searchParams.get('favorites') === 'true'
  const categoryIds = searchParams.get('categoryIds')?.split(',').filter(Boolean) || []
  const weekmenuIds = searchParams.get('weekmenuIds')?.split(',').filter(Boolean) || []

  try {
    // Build the base query
    let query = supabase
      .from('recipes')
      .select(`
        *,
        recipe_categories(
          category:categories(
            id,
            name,
            slug,
            color,
            type_id,
            category_type:category_types(*)
          )
        )
      `, { count: 'exact' })

    // Apply filters
    if (search) {
      // Use full-text search for better performance
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,source_name.ilike.%${search}%,source_normalized.ilike.%${search}%`
      )
    }

    if (favorites) {
      query = query.eq('is_favorite', true)
    }

    // For weekmenu filter, we need to filter by IDs
    // If weekmenuIds parameter exists but is empty, return no recipes
    if (searchParams.has('weekmenuIds')) {
      if (weekmenuIds.length > 0) {
        query = query.in('id', weekmenuIds)
      } else {
        // Weekmenu filter is active but no items in weekmenu
        return NextResponse.json({
          recipes: [],
          totalCount: 0,
          page,
          pageSize,
          hasMore: false
        })
      }
    }

    // For category filtering, we need recipes that have ALL selected categories (AND logic)
    if (categoryIds.length > 0) {
      // Get recipe IDs that have at least one of the selected categories
      const { data: recipeIdsData } = await supabase
        .from('recipe_categories')
        .select('recipe_id')
        .in('category_id', categoryIds)

      if (!recipeIdsData || recipeIdsData.length === 0) {
        // No recipes match any category
        return NextResponse.json({
          recipes: [],
          totalCount: 0,
          page,
          pageSize,
          hasMore: false
        })
      }

      // Count how many times each recipe appears (= number of matching categories)
      const recipeCounts = recipeIdsData.reduce((acc: Record<string, number>, rc: { recipe_id: string }) => {
        acc[rc.recipe_id] = (acc[rc.recipe_id] || 0) + 1
        return acc
      }, {})

      // Only keep recipes that have ALL selected categories
      const recipeIds = Object.entries(recipeCounts)
        .filter(([_, count]) => count === categoryIds.length)
        .map(([recipeId, _]) => recipeId)

      if (recipeIds.length > 0) {
        query = query.in('id', recipeIds)
      } else {
        // No recipes match ALL category filters
        return NextResponse.json({
          recipes: [],
          totalCount: 0,
          page,
          pageSize,
          hasMore: false
        })
      }
    }

    // Apply sorting and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    const { data: recipes, error, count } = await query

    if (error) {
      console.error('Error fetching recipes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalCount = count || 0
    const hasMore = (page + 1) * pageSize < totalCount

    return NextResponse.json({
      recipes: recipes || [],
      totalCount,
      page,
      pageSize,
      hasMore
    })
  } catch (error: any) {
    console.error('Error in recipes API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
