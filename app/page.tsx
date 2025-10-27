"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Upload, Heart, Filter, ChevronDown, Bookmark } from "lucide-react"
import { RecipeCard } from "@/components/recipe-card"
import { RecipeGridSkeleton } from "@/components/recipe-card-skeleton"
import { ImportDialog } from "@/components/import-dialog"
import { PdfImportButton } from "@/components/pdf-import-button"
import { PdfImportProgress } from "@/components/pdf-import-progress"
import { CategoryTypeManagementModal } from "@/components/category-type-management-modal"
import { CategoryLabelManagementModal } from "@/components/category-label-management-modal"
import { Header } from "@/components/header"
import { Input } from "@/components/ui/input"
import { Recipe, CategoriesByType, CategoryType } from "@/types/supabase"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { useWeekMenu } from "@/contexts/weekmenu-context"
import { useRecipes } from "@/hooks/use-recipes"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("") // User's input (instant)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("") // Debounced for API (delayed)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showWeekmenu, setShowWeekmenu] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [categoriesByType, setCategoriesByType] = useState<CategoriesByType>({})
  const [isCategoryTypeModalOpen, setIsCategoryTypeModalOpen] = useState(false)
  const [labelManagementType, setLabelManagementType] = useState<CategoryType | null>(null)

  // Pagination state for infinite scroll
  const [currentPage, setCurrentPage] = useState(0)
  const [additionalRecipes, setAdditionalRecipes] = useState<Recipe[]>([]) // Recipes from page 1+
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const PAGE_SIZE = 24

  const router = useRouter()
  const { bookmarkedRecipeIds } = useWeekMenu()

  // Debounce search query (wait 400ms after user stops typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Use SWR for the first page (cached, instant on return)
  const {
    recipes: firstPageRecipes,
    totalCount,
    hasMore: hasMoreFromAPI,
    isLoading,
    mutate: refreshRecipes
  } = useRecipes({
    page: 0,
    pageSize: PAGE_SIZE,
    search: debouncedSearchQuery, // Use debounced query for API
    favorites: showFavorites,
    categoryIds: Array.from(selectedCategories),
    weekmenuIds: Array.from(bookmarkedRecipeIds),
    weekmenuActive: showWeekmenu
  })

  // Combine first page (from SWR cache) with additional pages
  const allRecipes = [...firstPageRecipes, ...additionalRecipes]
  const hasMore = currentPage === 0 ? hasMoreFromAPI : (currentPage + 1) * PAGE_SIZE < totalCount

  // Load additional pages for infinite scroll (page 1+)
  const loadMoreRecipes = useCallback(async (page: number) => {
    if (page === 0) return // Page 0 is handled by SWR

    try {
      setIsLoadingMore(true)

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
      })

      if (debouncedSearchQuery.trim()) {
        params.set('search', debouncedSearchQuery.trim())
      }

      if (showFavorites) {
        params.set('favorites', 'true')
      }

      if (selectedCategories.size > 0) {
        params.set('categoryIds', Array.from(selectedCategories).join(','))
      }

      if (showWeekmenu) {
        params.set('weekmenuIds', Array.from(bookmarkedRecipeIds).join(','))
      }

      const response = await fetch(`/api/recipes?${params}`)
      const data = await response.json()

      if (response.ok) {
        // Deduplicate recipes when appending new pages
        setAdditionalRecipes(prev => {
          const allExisting = new Set([...firstPageRecipes, ...prev].map(r => r.id))
          const newRecipes = data.recipes.filter((r: Recipe) => !allExisting.has(r.id))
          return [...prev, ...newRecipes]
        })
        setCurrentPage(page)
      } else {
        console.error('Error loading more recipes:', data.error)
      }
    } catch (error) {
      console.error('Error loading more recipes:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [debouncedSearchQuery, showFavorites, selectedCategories, showWeekmenu, bookmarkedRecipeIds, firstPageRecipes, PAGE_SIZE])

  // Reset additional pages and pagination when filters change
  // SWR will automatically refetch page 0
  useEffect(() => {
    setAdditionalRecipes([])
    setCurrentPage(0)
  }, [debouncedSearchQuery, showFavorites, selectedCategories, showWeekmenu, bookmarkedRecipeIds])

  // Load more recipes for infinite scroll
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || isLoading) return
    loadMoreRecipes(currentPage + 1)
  }, [isLoadingMore, hasMore, isLoading, currentPage, loadMoreRecipes])

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

  // Load categories on mount (recipes are loaded by the filter effect)
  useEffect(() => {
    loadCategories()
  }, [loadCategories])

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
    // Update additional recipes (pages 1+)
    setAdditionalRecipes(prev => prev.map(r =>
      r.id === id ? { ...r, is_favorite: isFavorite } : r
    ))
    // Refresh SWR cache for first page
    refreshRecipes()
  }

  const handleDelete = (id: string) => {
    // Remove from additional recipes
    setAdditionalRecipes(prev => prev.filter(r => r.id !== id))
    // Refresh SWR cache for first page
    refreshRecipes()
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
      <Header>
        <PdfImportProgress />
        <PdfImportButton />
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => router.push('/recipes/new')}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            aria-label="Handmatig Toevoegen"
            title="Handmatig Toevoegen"
          >
            <span className="text-xl leading-none">+</span>
          </button>
          <button
            onClick={() => setIsImportDialogOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            aria-label="Importeer Recept"
            title="Importeer"
          >
            <Upload className="h-5 w-5" />
          </button>
        </div>
      </Header>

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
            {/* Show subtle loading indicator when debouncing */}
            {searchQuery !== debouncedSearchQuery && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>

          {/* Filter Bar - Aparte dropdowns per categorietype */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Favorites Toggle - Icon Only */}
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-full border transition-all ${
                showFavorites
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white hover:border-primary hover:bg-primary/5"
              }`}
              title="Favorieten"
              aria-label="Filter op favorieten"
            >
              <Heart className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
            </button>

            {/* Weekmenu Toggle - Icon Only */}
            <button
              onClick={() => setShowWeekmenu(!showWeekmenu)}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-full border transition-all ${
                showWeekmenu
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white hover:border-primary hover:bg-primary/5"
              }`}
              title="Weekmenu"
              aria-label="Filter op weekmenu"
            >
              <Bookmark className={`h-4 w-4 ${showWeekmenu ? 'fill-current' : ''}`} />
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
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs sm:text-sm transition-all min-h-[40px] ${
                      selectedInThisType > 0
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border bg-white hover:border-primary hover:bg-primary/5"
                    }`}
                  >
                    <span className="truncate max-w-[80px] sm:max-w-none">{typeData.type.name}</span>
                    {selectedInThisType > 0 && (
                      <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground flex-shrink-0">
                        {selectedInThisType}
                      </span>
                    )}
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
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
                          // Sort categories alphabetically by name
                          [...typeData.categories]
                            .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
                            .map(category => (
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

            {/* Manage Categories Button - Compact */}
            <button
              onClick={() => setIsCategoryTypeModalOpen(true)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-dashed border-border bg-white text-muted-foreground hover:border-primary hover:text-primary transition-all"
              title="Categorie toevoegen"
              aria-label="Categorie toevoegen"
            >
              <span className="text-lg font-semibold">+</span>
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
                Toon <span className="font-semibold">{allRecipes.length}</span> van <span className="font-semibold">{totalCount}</span> recepten
              </>
            ) : (
              <span>Geen recepten gevonden</span>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <RecipeGridSkeleton count={PAGE_SIZE} />
        ) : allRecipes.length === 0 ? (
          <div className="py-12 text-center text-[oklch(var(--muted-foreground))]">
            <p className="text-lg">
              {searchQuery || showFavorites || showWeekmenu || selectedCategories.size > 0
                ? 'Geen recepten gevonden met deze filters'
                : 'Nog geen recepten toegevoegd. Klik op "Importeer Recept" om te beginnen!'}
            </p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
              {allRecipes.map((recipe) => {
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
            {!hasMore && allRecipes.length > 0 && (
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
          refreshRecipes() // Refresh SWR cache
        }}
      />

      {/* Category Type Management Modal */}
      <CategoryTypeManagementModal
        isOpen={isCategoryTypeModalOpen}
        onClose={() => setIsCategoryTypeModalOpen(false)}
        onUpdate={() => {
          loadCategories()
          refreshRecipes() // Refresh SWR cache
        }}
      />

      {/* Category Label Management Modal */}
      {labelManagementType && (
        <CategoryLabelManagementModal
          isOpen={!!labelManagementType}
          onClose={() => setLabelManagementType(null)}
          onUpdate={() => {
            loadCategories()
            refreshRecipes() // Refresh SWR cache
          }}
          categoryType={labelManagementType}
        />
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  )
}
