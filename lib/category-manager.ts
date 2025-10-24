/**
 * Category Management for Recipe Imports
 *
 * Handles automatic category creation and linking during recipe imports
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { normalizePublisher } from './publisher-normalizer'

// Fixed gang (course) options - these are system categories
export const FIXED_GANGEN = [
  'Amuse',
  'Voorgerecht',
  'Soep',
  'Hoofdgerecht',
  'Dessert',
  'Bijgerecht'
] as const

export type Gang = typeof FIXED_GANGEN[number]

/**
 * Normalize gang name to canonical form
 * Handles case insensitivity and plural forms
 */
function normalizeGang(rawGang: string): Gang | null {
  if (!rawGang) return null

  // Normalize: lowercase, trim, remove trailing 'en'
  const normalized = rawGang.toLowerCase().trim()

  // Direct mappings (including plural forms)
  const gangMappings: Record<string, Gang> = {
    'amuse': 'Amuse',
    'voorgerecht': 'Voorgerecht',
    'voorgerechten': 'Voorgerecht',
    'soep': 'Soep',
    'soepen': 'Soep',
    'hoofdgerecht': 'Hoofdgerecht',
    'hoofdgerechten': 'Hoofdgerecht',
    'dessert': 'Dessert',
    'desserts': 'Dessert',
    'nagerecht': 'Dessert',
    'nagerechten': 'Dessert',
    'bijgerecht': 'Bijgerecht',
    'bijgerechten': 'Bijgerecht',
    'side dish': 'Bijgerecht',
    'side': 'Bijgerecht'
  }

  return gangMappings[normalized] || null
}

/**
 * Validate that a gang is one of the allowed fixed options
 * Now supports case-insensitive matching and plural forms
 */
export function isValidGang(gang: string): gang is Gang {
  const normalized = normalizeGang(gang)
  return normalized !== null
}

/**
 * Get the canonical gang name from any variant
 */
export function getCanonicalGang(gang: string): Gang | null {
  return normalizeGang(gang)
}

/**
 * Get or create category by name and type
 * Returns existing category if found, creates new one if not
 */
async function getOrCreateCategory(
  supabase: SupabaseClient,
  categoryName: string,
  categoryTypeSlug: string,
  isSystem: boolean = false
): Promise<string | null> {
  try {
    // First, get the category type ID
    const { data: categoryType, error: typeError } = await supabase
      .from('category_types')
      .select('id')
      .eq('slug', categoryTypeSlug)
      .single()

    if (typeError || !categoryType) {
      console.error(`Category type not found: ${categoryTypeSlug}`)
      return null
    }

    // Generate slug from name
    const slug = categoryName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check if category already exists
    const { data: existing, error: existingError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .eq('type_id', categoryType.id)
      .maybeSingle()

    if (existing) {
      return existing.id
    }

    // Create new category
    const { data: newCategory, error: createError } = await supabase
      .from('categories')
      .insert({
        name: categoryName,
        slug,
        type_id: categoryType.id,
        is_system: isSystem,
        color: getCategoryColor(categoryTypeSlug)
      })
      .select('id')
      .single()

    if (createError || !newCategory) {
      console.error(`Error creating category ${categoryName}:`, createError)
      return null
    }

    console.log(`Created new category: ${categoryName} (${categoryTypeSlug})`)
    return newCategory.id

  } catch (error) {
    console.error('Error in getOrCreateCategory:', error)
    return null
  }
}

/**
 * Get default color for category type
 */
function getCategoryColor(categoryTypeSlug: string): string {
  const colors: Record<string, string> = {
    'gang': '#6b7280', // gray
    'uitgever': '#3b82f6', // blue
    'status': '#10b981', // green
    'soort-gerecht': '#8b5cf6' // purple
  }
  return colors[categoryTypeSlug] || '#6b7280'
}

/**
 * Link recipe to categories based on extracted data
 *
 * @param supabase - Supabase client
 * @param recipeId - Recipe UUID
 * @param gang - Course type (Amuse, Voorgerecht, Soep, Hoofdgerecht, Dessert)
 * @param uitgever - Publisher/author name (will be normalized)
 * @returns Success boolean
 */
export async function linkRecipeToCategories(
  supabase: SupabaseClient,
  recipeId: string,
  gang: string | null,
  uitgever: string | null
): Promise<boolean> {
  try {
    const categoryIds: string[] = []

    // 1. Handle Gang (required, fixed list)
    if (gang) {
      const canonicalGang = getCanonicalGang(gang)
      if (canonicalGang) {
        const gangId = await getOrCreateCategory(supabase, canonicalGang, 'gang', true)
        if (gangId) {
          categoryIds.push(gangId)
          console.log(`Linked gang: "${gang}" → "${canonicalGang}"`)
        }
      } else {
        console.warn(`Invalid gang "${gang}", expected one of: ${FIXED_GANGEN.join(', ')} (case-insensitive)`)
      }
    }

    // 2. Handle Uitgever (required, normalized)
    if (uitgever) {
      const normalizedPublisher = normalizePublisher(uitgever)
      if (normalizedPublisher) {
        const uitgeverId = await getOrCreateCategory(
          supabase,
          normalizedPublisher,
          'uitgever',
          false
        )
        if (uitgeverId) {
          categoryIds.push(uitgeverId)
        }
      }
    }

    // 3. Link all categories to recipe
    if (categoryIds.length > 0) {
      const links = categoryIds.map(categoryId => ({
        recipe_id: recipeId,
        category_id: categoryId
      }))

      const { error } = await supabase
        .from('recipe_categories')
        .insert(links)

      if (error) {
        console.error('Error linking recipe to categories:', error)
        return false
      }

      console.log(`Linked recipe ${recipeId} to ${categoryIds.length} categories`)
    }

    return true

  } catch (error) {
    console.error('Error in linkRecipeToCategories:', error)
    return false
  }
}

/**
 * Get AI prompt guidance for gang extraction
 */
export function getGangPromptGuidance(): string {
  return `"gang": Choose EXACTLY ONE from: ${FIXED_GANGEN.join(', ')} (REQUIRED)`
}
