import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { Recipe } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-dev'

// Only log warning in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local')
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper function to get recipe with all details
export async function getRecipeWithDetails(slug: string) {
  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('slug', slug)
    .single()

  if (recipeError || !recipeData) {
    console.error('Error fetching recipe:', recipeError)
    return null
  }

  const recipe = recipeData as Recipe

  const { data: ingredients } = await supabase
    .from('parsed_ingredients')
    .select('*')
    .eq('recipe_id', recipe.id)
    .order('order_index', { ascending: true })

  const { data: recipeTags } = await supabase
    .from('recipe_tags')
    .select('tag_id')
    .eq('recipe_id', recipe.id)

  const tagIds: string[] = recipeTags?.map((rt: any) => rt.tag_id) || []
  let tags: any[] = []

  if (tagIds.length > 0) {
    const { data: tagsData } = await supabase
      .from('tags')
      .select('*')
      .in('id', tagIds)
    tags = tagsData || []
  }

  return {
    ...recipe,
    parsed_ingredients: ingredients || [],
    tags: tags,
  }
}

// Helper function to get all recipes
export async function getAllRecipes() {
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching recipes:', error)
    return []
  }

  return recipes || []
}
