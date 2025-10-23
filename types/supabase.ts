export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      recipes: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          content_markdown: string | null
          prep_time: number | null
          cook_time: number | null
          servings_default: number
          difficulty: string | null
          image_url: string | null
          source_url: string | null
          source_name: string | null
          source_normalized: string | null
          source_language: string | null
          labels: string[] | null
          is_favorite: boolean
          notes: string | null
          notes_updated_at: string | null
          search_vector: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          content_markdown?: string | null
          prep_time?: number | null
          cook_time?: number | null
          servings_default?: number
          difficulty?: string | null
          image_url?: string | null
          source_url?: string | null
          source_name?: string | null
          source_normalized?: string | null
          source_language?: string | null
          labels?: string[] | null
          is_favorite?: boolean
          notes?: string | null
          notes_updated_at?: string | null
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          content_markdown?: string | null
          prep_time?: number | null
          cook_time?: number | null
          servings_default?: number | null
          difficulty?: string | null
          image_url?: string | null
          source_url?: string | null
          source_name?: string | null
          source_normalized?: string | null
          source_language?: string | null
          labels?: string[] | null
          is_favorite?: boolean
          notes?: string | null
          notes_updated_at?: string | null
          search_vector?: unknown | null
          created_at?: string
          updated_at?: string
        }
      }
      parsed_ingredients: {
        Row: {
          id: string
          recipe_id: string
          ingredient_name_nl: string
          amount: number | null
          unit: string | null
          amount_display: string | null
          scalable: boolean
          section: string | null
          order_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          ingredient_name_nl: string
          amount?: number | null
          unit?: string | null
          amount_display?: string | null
          scalable?: boolean
          section?: string | null
          order_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          ingredient_name_nl?: string
          amount?: number | null
          unit?: string | null
          amount_display?: string | null
          scalable?: boolean
          section?: string | null
          order_index?: number | null
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      recipe_tags: {
        Row: {
          recipe_id: string
          tag_id: string
        }
        Insert: {
          recipe_id: string
          tag_id: string
        }
        Update: {
          recipe_id?: string
          tag_id?: string
        }
      }
      extracted_keywords: {
        Row: {
          id: string
          recipe_id: string
          keyword: string
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          keyword: string
          confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          keyword?: string
          confidence?: number | null
          created_at?: string
        }
      }
      category_types: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          allow_multiple: boolean
          order_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          allow_multiple?: boolean
          order_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          allow_multiple?: boolean
          order_index?: number | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string | null
          color: string
          type_id: string | null
          order_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          color: string
          type_id?: string | null
          order_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          color?: string
          type_id?: string | null
          order_index?: number | null
          created_at?: string
        }
      }
      recipe_categories: {
        Row: {
          recipe_id: string
          category_id: string
          created_at: string
        }
        Insert: {
          recipe_id: string
          category_id: string
          created_at?: string
        }
        Update: {
          recipe_id?: string
          category_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Recipe = Database['public']['Tables']['recipes']['Row']
export type RecipeInsert = Database['public']['Tables']['recipes']['Insert']
export type RecipeUpdate = Database['public']['Tables']['recipes']['Update']

export type ParsedIngredient = Database['public']['Tables']['parsed_ingredients']['Row']
export type ParsedIngredientInsert = Database['public']['Tables']['parsed_ingredients']['Insert']
export type ParsedIngredientUpdate = Database['public']['Tables']['parsed_ingredients']['Update']

export type Tag = Database['public']['Tables']['tags']['Row']
export type TagInsert = Database['public']['Tables']['tags']['Insert']
export type TagUpdate = Database['public']['Tables']['tags']['Update']

export type RecipeTag = Database['public']['Tables']['recipe_tags']['Row']
export type RecipeTagInsert = Database['public']['Tables']['recipe_tags']['Insert']
export type RecipeTagUpdate = Database['public']['Tables']['recipe_tags']['Update']

export type ExtractedKeyword = Database['public']['Tables']['extracted_keywords']['Row']
export type ExtractedKeywordInsert = Database['public']['Tables']['extracted_keywords']['Insert']
export type ExtractedKeywordUpdate = Database['public']['Tables']['extracted_keywords']['Update']

export type CategoryType = Database['public']['Tables']['category_types']['Row']
export type CategoryTypeInsert = Database['public']['Tables']['category_types']['Insert']
export type CategoryTypeUpdate = Database['public']['Tables']['category_types']['Update']

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

export type RecipeCategory = Database['public']['Tables']['recipe_categories']['Row']
export type RecipeCategoryInsert = Database['public']['Tables']['recipe_categories']['Insert']
export type RecipeCategoryUpdate = Database['public']['Tables']['recipe_categories']['Update']

// Extended types met relaties
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