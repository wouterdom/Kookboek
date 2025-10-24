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
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]) // Store all fetched recipes
  const [recipes, setRecipes] = useState<Recipe[]>([]) // Display recipes (paginated)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFavorites, setShowFavorites] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [categoriesByType, setCategoriesByType] = useState<CategoriesByType>({})
  const [isCategoryTypeModalOpen, setIsCategoryTypeModalOpen] = useState(false)
  const [labelManagementType, setLabelManagementType] = useState<CategoryType | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const PAGE_SIZE = 24

  const supabase = createClient()

  // Fetch all recipes from Supabase once
  const loadAllRecipes = useCallback(async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
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

      if (!error && data) {
        setAllRecipes(data as any)
      } else if (error) {
        console.error('Error loading recipes:', error)
      }
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Apply filters and pagination to all recipes
  const filteredRecipes = useMemo(() => {
    let filtered = allRecipes

    // Apply search filter: search in title, description, source_name, source_normalized, and category names
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter(recipe => {
        // Search in title, description, source_name, source_normalized
        const titleMatch = recipe.title?.toLowerCase().includes(searchLower)
        const descMatch = recipe.description?.toLowerCase().includes(searchLower)
        const sourceNameMatch = (recipe as any).source_name?.toLowerCase().includes(searchLower)
        const sourceNormalizedMatch = (recipe as any).source_normalized?.toLowerCase().includes(searchLower)

        // Search in category names
        const categoryNames = (recipe as any).recipe_categories?.map((rc: any) => rc.category?.name?.toLowerCase()) || []
        const categoryMatch = categoryNames.some((name: string) => name?.includes(searchLower))

        return titleMatch || descMatch || sourceNameMatch || sourceNormalizedMatch || categoryMatch
      })
    }

    // Apply favorite filter
    if (showFavorites) {
      filtered = filtered.filter(recipe => recipe.is_favorite)
    }

    // Filter by selected categories
    if (selectedCategories.size > 0) {
      filtered = filtered.filter(recipe => {
        const recipeCategoryIds = (recipe as any).recipe_categories?.map((rc: any) => rc.category.id) || []
        return Array.from(selectedCategories).some(catId => recipeCategoryIds.includes(catId))
      })
    }

    return filtered
  }, [allRecipes, searchQuery, showFavorites, selectedCategories])

  // Apply pagination to filtered recipes
  useEffect(() => {
    setTotalCount(filteredRecipes.length)

    // Reset to first page when filters change
    setCurrentPage(0)

    // Get first page of results
    const firstPageResults = filteredRecipes.slice(0, PAGE_SIZE)
    setRecipes(firstPageResults)

    // Check if there's more data
    setHasMore(filteredRecipes.length > PAGE_SIZE)
  }, [filteredRecipes])

  // Load more recipes for infinite scroll
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || isLoading) return

    setIsLoadingMore(true)
    const nextPage = currentPage + 1
    const startIdx = nextPage * PAGE_SIZE
    const endIdx = startIdx + PAGE_SIZE

    const nextPageResults = filteredRecipes.slice(startIdx, endIdx)

    setRecipes(prev => [...prev, ...nextPageResults])
    setCurrentPage(nextPage)
    setHasMore(endIdx < filteredRecipes.length)
    setIsLoadingMore(false)
  }, [isLoadingMore, hasMore, isLoading, currentPage, filteredRecipes])

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

  // Load all recipes and categories on mount
  useEffect(() => {
    loadAllRecipes()
    loadCategories()
  }, [loadAllRecipes, loadCategories])

  // Infinite scroll - detect when user reaches bottom
  useEffect(() => {
    const handleScroll = () => {
      // Check if we're near the bottom of the page (200px threshold)
      const scrollTop = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      if (scrollTop + windowHeight >= documentHeight - 200) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  const handleFavoriteChange = (id: string, isFavorite: boolean) => {
    setAllRecipes(prev => prev.map(r =>
      r.id === id ? { ...r, is_favorite: isFavorite } : r
    ))
  }

  const handleDelete = (id: string) => {
    setAllRecipes(prev => prev.filter(r => r.id !== id))
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
            {totalCount > 0 ? (
              <>
                Toon <span className="font-semibold">{recipes.length}</span> van <span className="font-semibold">{totalCount}</span> recepten
              </>
            ) : (
              <span>Geen recepten gevonden</span>
            )}
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
          <>
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
              {recipes.map((recipe) => {
                // Extract categories from recipe_categories
                const recipeCategories = (recipe as any).recipe_categories?.map((rc: any) => ({
                  id: rc.category.id,
                  name: rc.category.name,
                  color: rc.category.color,
                  slug: rc.category.slug
                })) || []

                return (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    categories={recipeCategories}
                    onFavoriteChange={handleFavoriteChange}
                    onDelete={handleDelete}
                  />
                )
              })}
            </section>

            {/* Loading More Indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Meer recepten laden...</span>
                </div>
              </div>
            )}

            {/* End of Results */}
            {!hasMore && recipes.length > 0 && (
              <div className="flex justify-center py-8">
                <p className="text-sm text-muted-foreground">
                  Alle recepten geladen
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={() => {
          loadAllRecipes() // Reload recipes after successful import
        }}
      />

      {/* Category Type Management Modal */}
      <CategoryTypeManagementModal
        isOpen={isCategoryTypeModalOpen}
        onClose={() => setIsCategoryTypeModalOpen(false)}
        onUpdate={() => {
          loadCategories()
          loadAllRecipes()
        }}
      />

      {/* Category Label Management Modal */}
      {labelManagementType && (
        <CategoryLabelManagementModal
          isOpen={!!labelManagementType}
          onClose={() => setLabelManagementType(null)}
          onUpdate={() => {
            loadCategories()
            loadAllRecipes()
          }}
          categoryType={labelManagementType}
        />
      )}
    </div>
  )
}
