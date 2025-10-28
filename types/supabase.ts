// Re-export from the main database types file
import type { Database as DatabaseType } from '@/lib/database.types'

export type Database = DatabaseType

// Helper types
export type Recipe = DatabaseType['public']['Tables']['recipes']['Row']
export type RecipeInsert = DatabaseType['public']['Tables']['recipes']['Insert']
export type RecipeUpdate = DatabaseType['public']['Tables']['recipes']['Update']

// Instruction step type for structured instructions with optional sections
export type InstructionStep = {
  section: string | null  // Section name (e.g., "Het stoofvlees", "Voor de frieten") or null if no sections
  step: string           // The instruction text
  order_index: number    // Sequential ordering (0, 1, 2, 3...)
}

export type ParsedIngredient = DatabaseType['public']['Tables']['parsed_ingredients']['Row']
export type ParsedIngredientInsert = DatabaseType['public']['Tables']['parsed_ingredients']['Insert']
export type ParsedIngredientUpdate = DatabaseType['public']['Tables']['parsed_ingredients']['Update']

export type CategoryType = DatabaseType['public']['Tables']['category_types']['Row']
export type CategoryTypeInsert = DatabaseType['public']['Tables']['category_types']['Insert']
export type CategoryTypeUpdate = DatabaseType['public']['Tables']['category_types']['Update']

export type Category = DatabaseType['public']['Tables']['categories']['Row']
export type CategoryInsert = DatabaseType['public']['Tables']['categories']['Insert']
export type CategoryUpdate = DatabaseType['public']['Tables']['categories']['Update']

export type RecipeCategory = DatabaseType['public']['Tables']['recipe_categories']['Row']
export type RecipeCategoryInsert = DatabaseType['public']['Tables']['recipe_categories']['Insert']
export type RecipeCategoryUpdate = DatabaseType['public']['Tables']['recipe_categories']['Update']

export type PdfImportJob = DatabaseType['public']['Tables']['pdf_import_jobs']['Row']
export type PdfImportJobInsert = DatabaseType['public']['Tables']['pdf_import_jobs']['Insert']
export type PdfImportJobUpdate = DatabaseType['public']['Tables']['pdf_import_jobs']['Update']

export type WeeklyMenuItem = DatabaseType['public']['Tables']['weekly_menu_items']['Row']
export type WeeklyMenuItemInsert = DatabaseType['public']['Tables']['weekly_menu_items']['Insert']
export type WeeklyMenuItemUpdate = DatabaseType['public']['Tables']['weekly_menu_items']['Update']

export type GroceryCategory = DatabaseType['public']['Tables']['grocery_categories']['Row']
export type GroceryCategoryInsert = DatabaseType['public']['Tables']['grocery_categories']['Insert']
export type GroceryCategoryUpdate = DatabaseType['public']['Tables']['grocery_categories']['Update']

export type GroceryItem = DatabaseType['public']['Tables']['grocery_items']['Row']
export type GroceryItemInsert = DatabaseType['public']['Tables']['grocery_items']['Insert']
export type GroceryItemUpdate = DatabaseType['public']['Tables']['grocery_items']['Update']

export type RecipeImage = DatabaseType['public']['Tables']['recipe_images']['Row']
export type RecipeImageInsert = DatabaseType['public']['Tables']['recipe_images']['Insert']
export type RecipeImageUpdate = DatabaseType['public']['Tables']['recipe_images']['Update']

// Extended types with relations
export type CategoryWithType = Category & {
  category_type: CategoryType
}

export type RecipeWithCategories = Recipe & {
  recipe_categories: Array<{
    category: CategoryWithType
  }>
}

// Categorieën gegroepeerd per type voor UI
export type CategoriesByType = {
  [typeSlug: string]: {
    type: CategoryType
    categories: Category[]
  }
}

// Weekly menu item with full recipe data
export type WeeklyMenuItemWithRecipe = WeeklyMenuItem & {
  recipe: Recipe & {
    parsed_ingredients: ParsedIngredient[]
  }
}

// Grocery item with category
export type GroceryItemWithCategory = GroceryItem & {
  category: GroceryCategory | null
}
