"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, Upload, Heart, Filter, ChevronDown } from "lucide-react"
import { RecipeCard } from "@/components/recipe-card"
import { ImportDialog } from "@/components/import-dialog"
import { PdfImportButton } from "@/components/pdf-import-button"
import { PdfImportProgress } from "@/components/pdf-import-progress"
import { CategoryTypeManagementModal } from "@/components/category-type-management-modal"
import { CategoryLabelManagementModal } from "@/components/category-label-management-modal"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { Recipe, CategoriesByType, CategoryType } from "@/types/supabase"

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showFavorites, setShowFavorites] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [categoriesByType, setCategoriesByType] = useState<CategoriesByType>({})
  const [isCategoryTypeModalOpen, setIsCategoryTypeModalOpen] = useState(false)
  const [labelManagementType, setLabelManagementType] = useState<CategoryType | null>(null)

  const supabase = createClient()

  // Fetch recipes from Supabase with filtering
  const loadRecipes = useCallback(async () => {
    try {
      setIsLoading(true)

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
        `)
        .order('created_at', { ascending: false })

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      // Apply favorite filter
      if (showFavorites) {
        query = query.eq('is_favorite', true)
      }

      const { data, error } = await query

      if (!error && data) {
        // Filter by selected categories on client side
        let filteredData = data

        if (selectedCategories.size > 0) {
          filteredData = filteredData.filter(recipe => {
            const recipeCategoryIds = recipe.recipe_categories?.map((rc: any) => rc.category.id) || []
            // Check if recipe has ANY of the selected categories
            return Array.from(selectedCategories).some(catId => recipeCategoryIds.includes(catId))
          })
        }

        setRecipes(filteredData as any)
      } else if (error) {
        console.error('Error loading recipes:', error)
      }
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, showFavorites, selectedCategories, supabase])

  // Load categories grouped by type
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories/grouped')
      if (response.ok) {
        const data = await response.json()
        setCategoriesByType(data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadRecipes()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [loadRecipes])

  const handleFavoriteChange = (id: string, isFavorite: boolean) => {
    setRecipes(prev => prev.map(r =>
      r.id === id ? { ...r, is_favorite: isFavorite } : r
    ))
  }

  const handleDelete = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  const toggleCategory = (categoryId: string) => {
    const newCategories = new Set(selectedCategories)
    if (newCategories.has(categoryId)) {
      newCategories.delete(categoryId)
    } else {
      newCategories.add(categoryId)
    }
    setSelectedCategories(newCategories)
  }

  const getCategoryById = (categoryId: string) => {
    for (const typeData of Object.values(categoriesByType)) {
      const category = typeData.categories.find(c => c.id === categoryId)
      if (category) return category
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="font-[Montserrat] text-xl sm:text-2xl font-bold">Recepten</h1>
            <PdfImportProgress />
          </div>
          <div className="flex items-center gap-2">
            <PdfImportButton />
            <button
              onClick={() => setIsImportDialogOpen(true)}
              className="btn btn-primary btn-sm sm:btn-md flex items-center gap-1.5 sm:gap-2"
              aria-label="Importeer Recept"
            >
              <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Importeer Recept</span>
              <span className="sm:hidden">Importeer</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Search Bar with Inline Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Zoek in recepten..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Bar - Aparte dropdowns per categorietype */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Favorites Toggle */}
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
                showFavorites
                  ? "border-primary bg-primary font-medium text-primary-foreground"
                  : "border-border bg-white hover:border-primary hover:bg-primary/5"
              }`}
            >
              <Heart className="h-4 w-4" />
              Favorieten
            </button>

            {/* Dropdown per categorietype */}
            {Object.entries(categoriesByType).map(([typeSlug, typeData]) => {
              const selectedInThisType = typeData.categories.filter(c =>
                selectedCategories.has(c.id)
              ).length

              return (
                <div key={typeSlug} className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === typeSlug ? null : typeSlug)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
                      selectedInThisType > 0
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border bg-white hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    {typeData.type.name}
                    {selectedInThisType > 0 && (
                      <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {selectedInThisType}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Dropdown Content */}
                  {openDropdown === typeSlug && (
                    <div className="absolute left-0 top-full z-50 mt-2 min-w-[240px] rounded-lg border bg-white p-3 shadow-lg">
                      <div className="max-h-[300px] space-y-2 overflow-y-auto">
                        {typeData.categories.length === 0 ? (
                          <div className="text-sm text-muted-foreground py-2">
                            Geen categorieën beschikbaar
                          </div>
                        ) : (
                          typeData.categories.map(category => (
                            <label
                              key={category.id}
                              className="flex items-center gap-2 text-sm cursor-pointer hover:text-[oklch(var(--primary))] group py-1"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCategories.has(category.id)}
                                onChange={() => toggleCategory(category.id)}
                                className="checkbox h-4 w-4"
                              />
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="truncate">{category.name}</span>
                              </span>
                            </label>
                          ))
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t">
                        <button
                          onClick={() => {
                            setOpenDropdown(null)
                            setLabelManagementType(typeData.type)
                          }}
                          className="text-sm text-primary hover:text-primary/80 w-full text-left"
                        >
                          + Beheer labels
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Manage Categories Button */}
            <button
              onClick={() => setIsCategoryTypeModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all"
            >
              + Categorie toevoegen
            </button>

            {/* Clear all filters */}
            {selectedCategories.size > 0 && (
              <button
                onClick={() => setSelectedCategories(new Set())}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Wis alle filters
              </button>
            )}
          </div>
        </div>

        {/* Recipe Count */}
        {!isLoading && (
          <div className="text-sm text-[oklch(var(--muted-foreground))]">
            <span>{recipes.length}</span> recepten gevonden
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4">
                  <div className="h-6 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="py-12 text-center text-[oklch(var(--muted-foreground))]">
            <p className="text-lg">
              {searchQuery || showFavorites || selectedCategories.size > 0
                ? 'Geen recepten gevonden met deze filters'
                : 'Nog geen recepten toegevoegd. Klik op "Importeer Recept" om te beginnen!'}
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                categories={[]} // We halen nu categorieën via recipe_categories
                onFavoriteChange={handleFavoriteChange}
                onDelete={handleDelete}
              />
            ))}
          </section>
        )}
      </main>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={() => {
          loadRecipes() // Reload recipes after successful import
        }}
      />

      {/* Category Type Management Modal */}
      <CategoryTypeManagementModal
        isOpen={isCategoryTypeModalOpen}
        onClose={() => setIsCategoryTypeModalOpen(false)}
        onUpdate={() => {
          loadCategories()
          loadRecipes()
        }}
      />

      {/* Category Label Management Modal */}
      {labelManagementType && (
        <CategoryLabelManagementModal
          isOpen={!!labelManagementType}
          onClose={() => setLabelManagementType(null)}
          onUpdate={() => {
            loadCategories()
            loadRecipes()
          }}
          categoryType={labelManagementType}
        />
      )}
    </div>
  )
}
