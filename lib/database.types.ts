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
      categories: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string | null
          type_id: string | null
          slug: string | null
          order_index: number | null
          is_system: boolean
        }
        Insert: {
          id?: string
          name: string
          color?: string
          created_at?: string | null
          type_id?: string | null
          slug?: string | null
          order_index?: number | null
          is_system?: boolean
        }
        Update: {
          id?: string
          name?: string
          color?: string
          created_at?: string | null
          type_id?: string | null
          slug?: string | null
          order_index?: number | null
          is_system?: boolean
        }
      }
      category_types: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          allow_multiple: boolean | null
          order_index: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          allow_multiple?: boolean | null
          order_index?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          allow_multiple?: boolean | null
          order_index?: number | null
          created_at?: string | null
        }
      }
      grocery_categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon: string | null
          color: string | null
          order_index: number | null
          is_system: boolean | null
          is_visible: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon?: string | null
          color?: string | null
          order_index?: number | null
          is_system?: boolean | null
          is_visible?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          icon?: string | null
          color?: string | null
          order_index?: number | null
          is_system?: boolean | null
          is_visible?: boolean | null
          created_at?: string | null
        }
      }
      grocery_items: {
        Row: {
          id: string
          name: string
          amount: string | null
          original_amount: string | null
          category_id: string | null
          is_checked: boolean | null
          from_recipe_id: string | null
          from_weekmenu_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          amount?: string | null
          original_amount?: string | null
          category_id?: string | null
          is_checked?: boolean | null
          from_recipe_id?: string | null
          from_weekmenu_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          amount?: string | null
          original_amount?: string | null
          category_id?: string | null
          is_checked?: boolean | null
          from_recipe_id?: string | null
          from_weekmenu_id?: string | null
          created_at?: string | null
          updated_at?: string | null
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
          section: string | null
          order_index: number
          created_at: string | null
        }
        Insert: {
          id?: string
          recipe_id?: string | null
          ingredient_name_nl: string
          amount?: number | null
          unit?: string | null
          amount_display?: string | null
          scalable?: boolean | null
          section?: string | null
          order_index: number
          created_at?: string | null
        }
        Update: {
          id?: string
          recipe_id?: string | null
          ingredient_name_nl?: string
          amount?: number | null
          unit?: string | null
          amount_display?: string | null
          scalable?: boolean | null
          section?: string | null
          order_index?: number
          created_at?: string | null
        }
      }
      pdf_import_jobs: {
        Row: {
          id: string
          filename: string
          file_size: number | null
          status: string
          total_pages: number | null
          current_page: number | null
          recipes_found: number | null
          recipes_imported: number | null
          error_message: string | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          filename: string
          file_size?: number | null
          status?: string
          total_pages?: number | null
          current_page?: number | null
          recipes_found?: number | null
          recipes_imported?: number | null
          error_message?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          filename?: string
          file_size?: number | null
          status?: string
          total_pages?: number | null
          current_page?: number | null
          recipes_found?: number | null
          recipes_imported?: number | null
          error_message?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
      }
      recipe_categories: {
        Row: {
          recipe_id: string
          category_id: string
          created_at: string | null
        }
        Insert: {
          recipe_id: string
          category_id: string
          created_at?: string | null
        }
        Update: {
          recipe_id?: string
          category_id?: string
          created_at?: string | null
        }
      }
      recipe_images: {
        Row: {
          id: string
          recipe_id: string
          image_url: string
          is_primary: boolean | null
          display_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          recipe_id: string
          image_url: string
          is_primary?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          recipe_id?: string
          image_url?: string
          is_primary?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
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
          source_language: string | null
          created_at: string | null
          updated_at: string | null
          search_vector: unknown | null
          notes: string | null
          notes_updated_at: string | null
          is_favorite: boolean | null
          source_name: string | null
          labels: string[] | null
          pdf_import_job_id: string | null
          pdf_source_pages: number[] | null
          source_normalized: string | null
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
          source_language?: string | null
          created_at?: string | null
          updated_at?: string | null
          search_vector?: unknown | null
          notes?: string | null
          notes_updated_at?: string | null
          is_favorite?: boolean | null
          source_name?: string | null
          labels?: string[] | null
          pdf_import_job_id?: string | null
          pdf_source_pages?: number[] | null
          source_normalized?: string | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          content_markdown?: string | null
          prep_time?: number | null
          cook_time?: number | null
          servings_default?: number
          difficulty?: string | null
          image_url?: string | null
          source_url?: string | null
          source_language?: string | null
          created_at?: string | null
          updated_at?: string | null
          search_vector?: unknown | null
          notes?: string | null
          notes_updated_at?: string | null
          is_favorite?: boolean | null
          source_name?: string | null
          labels?: string[] | null
          pdf_import_job_id?: string | null
          pdf_source_pages?: number[] | null
          source_normalized?: string | null
        }
      }
      site_credentials: {
        Row: {
          id: string
          site_name: string
          site_url: string
          username_encrypted: string
          password_encrypted: string
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          site_name: string
          site_url: string
          username_encrypted: string
          password_encrypted: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          site_name?: string
          site_url?: string
          username_encrypted?: string
          password_encrypted?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      weekly_menu_items: {
        Row: {
          id: string
          recipe_id: string | null
          week_date: string
          day_of_week: number | null
          servings: number | null
          is_completed: boolean | null
          order_index: number | null
          created_at: string | null
          custom_title: string | null
        }
        Insert: {
          id?: string
          recipe_id?: string | null
          week_date: string
          day_of_week?: number | null
          servings?: number | null
          is_completed?: boolean | null
          order_index?: number | null
          created_at?: string | null
          custom_title?: string | null
        }
        Update: {
          id?: string
          recipe_id?: string | null
          week_date?: string
          day_of_week?: number | null
          servings?: number | null
          is_completed?: boolean | null
          order_index?: number | null
          created_at?: string | null
          custom_title?: string | null
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
