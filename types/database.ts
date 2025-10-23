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
          content_markdown: string
          prep_time: number | null
          cook_time: number | null
          servings_default: number
          servings_fixed: boolean | null
          difficulty: string | null
          image_url: string | null
          source_url: string | null
          source_name: string | null
          source_language: string | null
          created_at: string
          updated_at: string
          search_vector: any | null
          notes: string | null
          notes_updated_at: string | null
          is_favorite: boolean | null
          labels: string[] | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          content_markdown: string
          prep_time?: number | null
          cook_time?: number | null
          servings_default: number
          servings_fixed?: boolean | null
          difficulty?: string | null
          image_url?: string | null
          source_url?: string | null
          source_name?: string | null
          source_language?: string | null
          created_at?: string
          updated_at?: string
          search_vector?: any | null
          notes?: string | null
          notes_updated_at?: string | null
          is_favorite?: boolean | null
          labels?: string[] | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          content_markdown?: string
          prep_time?: number | null
          cook_time?: number | null
          servings_default?: number
          servings_fixed?: boolean | null
          difficulty?: string | null
          image_url?: string | null
          source_url?: string | null
          source_name?: string | null
          source_language?: string | null
          created_at?: string
          updated_at?: string
          search_vector?: any | null
          notes?: string | null
          notes_updated_at?: string | null
          is_favorite?: boolean | null
          labels?: string[] | null
        }
      }
      parsed_ingredients: {
        Row: {
          id: string
          recipe_id: string | null
          ingredient_name_nl: string
          amount: number | null
          unit: string | null
          amount_display: string | null
          scalable: boolean | null
          order_index: number
          created_at: string
          section: string | null
        }
        Insert: {
          id?: string
          recipe_id?: string | null
          ingredient_name_nl: string
          amount?: number | null
          unit?: string | null
          amount_display?: string | null
          scalable?: boolean | null
          order_index: number
          created_at?: string
          section?: string | null
        }
        Update: {
          id?: string
          recipe_id?: string | null
          ingredient_name_nl?: string
          amount?: number | null
          unit?: string | null
          amount_display?: string | null
          scalable?: boolean | null
          order_index?: number
          created_at?: string
          section?: string | null
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
    }
  }
}

export type Recipe = Database['public']['Tables']['recipes']['Row']
export type ParsedIngredient = Database['public']['Tables']['parsed_ingredients']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']

export interface RecipeWithDetails extends Recipe {
  parsed_ingredients: ParsedIngredient[]
  tags: Tag[]
}
