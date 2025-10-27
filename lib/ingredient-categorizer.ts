/**
 * Ingredient Categorizer
 * AI-powered intelligent categorization of grocery ingredients
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '')

// In-memory cache for AI categorizations (lasts for server lifetime)
const categorizationCache = new Map<string, string>()

// Category information for AI prompt
const CATEGORY_INFO = {
  'groenten-fruit': 'Groenten & Fruit - All vegetables, fruits, mushrooms, salads, fresh produce',
  'zuivel-eieren': 'Zuivel & Eieren - Dairy products, milk, cheese, yogurt, eggs, butter, cream',
  'brood-bakkerij': 'Brood & Bakkerij - Bread, bakery items, crackers, toast, croissants',
  'vlees-vis': 'Vlees & Vis - Meat, poultry, fish, seafood, cold cuts, sausages',
  'pasta-rijst': 'Pasta, Rijst & Granen - Pasta, rice, noodles, grains, cereals, couscous, quinoa',
  'conserven': 'Conserven & Potten - Canned goods, jars, sauces, condiments, spreads, preserves',
  'kruiden': 'Kruiden & Specerijen - Herbs, spices, seasonings, salt, pepper, bouillon, baking ingredients',
  'dranken': 'Dranken - Beverages, water, juice, soda, coffee, tea, alcohol, wine, beer',
  'diepvries': 'Diepvries - Frozen foods, ice cream, frozen vegetables, frozen meals, frozen fries',
  'schoonmaak': 'Schoonmaak & Non-food - Cleaning supplies, toiletries, household items, pet food, paper products',
  'overige': 'Overige - Other items that don\'t fit in above categories'
}

/**
 * Categorize an ingredient using AI
 * @param ingredientName - Name of the ingredient
 * @param categories - Available categories with their slugs
 * @returns Category slug or 'overige' if no match
 */
export async function categorizeIngredient(
  ingredientName: string,
  categories?: Array<{ slug: string; name?: string }>
): Promise<string> {
  if (!ingredientName) return 'overige'

  const normalized = ingredientName.toLowerCase().trim()

  // Check cache first
  if (categorizationCache.has(normalized)) {
    const cached = categorizationCache.get(normalized)!
    // Verify cached category still exists
    if (!categories || categories.some(c => c.slug === cached)) {
      return cached
    }
  }

  try {
    // Build category list for AI
    const availableCategories = categories
      ? categories.map(c => `"${c.slug}"`).join(', ')
      : Object.keys(CATEGORY_INFO).map(slug => `"${slug}"`).join(', ')

    const categoryDescriptions = categories
      ? categories.map(c => `- "${c.slug}": ${CATEGORY_INFO[c.slug as keyof typeof CATEGORY_INFO] || c.name || c.slug}`).join('\n')
      : Object.entries(CATEGORY_INFO).map(([slug, desc]) => `- "${slug}": ${desc}`).join('\n')

    const prompt = `You are a grocery categorization AI. Your task is to categorize grocery items into the correct category.

Available categories:
${categoryDescriptions}

Rules:
1. Return ONLY the category slug (e.g., "groenten-fruit")
2. Choose the MOST APPROPRIATE category based on the ingredient type
3. Consider common Dutch ingredient names and their variations
4. For items with descriptors (e.g., "verse erwten", "bevroren doperwten"), focus on the base ingredient AND the descriptor:
   - "verse erwten" → groenten-fruit (fresh vegetables)
   - "erwten" → groenten-fruit (default to fresh/vegetable)
   - "bevroren erwten" → diepvries (frozen foods)
   - "selder" or "selderij" → groenten-fruit (vegetable)
   - "verse peterselie" → groenten-fruit (fresh herbs are vegetables)
   - "gedroogde peterselie" → kruiden (dried herbs are spices)
5. If unsure, use "overige"
6. Return ONLY the slug, no explanation, no quotes in your response

Ingredient to categorize: "${ingredientName}"

Category slug:`

    const model = genAI.getGenerativeModel({ model: 'models/gemini-flash-lite-latest' })
    const result = await model.generateContent(prompt)
    const response = result.response.text().trim().toLowerCase()

    // Extract slug from response (remove quotes if present)
    let categorySlug = response.replace(/['"]/g, '').trim()

    // Validate that the returned slug is valid
    const validSlugs = categories
      ? categories.map(c => c.slug)
      : Object.keys(CATEGORY_INFO)

    if (!validSlugs.includes(categorySlug)) {
      console.warn(`AI returned invalid category "${categorySlug}" for "${ingredientName}", using overige`)
      categorySlug = 'overige'
    }

    // Cache the result
    categorizationCache.set(normalized, categorySlug)

    return categorySlug
  } catch (error) {
    console.error(`Error categorizing ingredient "${ingredientName}":`, error)
    return 'overige'
  }
}

/**
 * Synchronous fallback categorization (returns Promise for compatibility)
 * Uses cache or returns 'overige'
 * @param ingredientName - Name of the ingredient
 * @returns Category slug from cache or 'overige'
 */
export function categorizeIngredientSync(ingredientName: string): string {
  if (!ingredientName) return 'overige'
  const normalized = ingredientName.toLowerCase().trim()
  return categorizationCache.get(normalized) || 'overige'
}

/**
 * Get category ID from slug
 * @param slug - Category slug
 * @param categories - Available categories
 * @returns Category ID or null
 */
export function getCategoryIdFromSlug(
  slug: string,
  categories: Array<{ id: string; slug: string }>
): string | null {
  const category = categories.find(c => c.slug === slug)
  return category?.id || null
}

/**
 * Batch categorize multiple ingredients using AI
 * @param ingredients - Array of ingredient names
 * @param categories - Available categories
 * @returns Promise resolving to Map of ingredient name to category slug
 */
export async function batchCategorize(
  ingredients: string[],
  categories?: Array<{ slug: string }>
): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  // Process in batches to avoid overwhelming AI
  const BATCH_SIZE = 5
  for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async (ingredient) => ({
        ingredient,
        category: await categorizeIngredient(ingredient, categories)
      }))
    )

    batchResults.forEach(({ ingredient, category }) => {
      result.set(ingredient, category)
    })
  }

  return result
}
