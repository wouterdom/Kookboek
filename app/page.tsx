"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, Upload, Heart, Filter, ChevronDown } from "lucide-react"
import { RecipeCard } from "@/components/recipe-card"
import { ImportDialog } from "@/components/import-dialog"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { Recipe } from "@/types/supabase"

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showFavorites, setShowFavorites] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set())
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set())
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())

  const supabase = createClient()

  // Fetch recipes from Supabase with filtering
  const loadRecipes = useCallback(async () => {
    try {
      setIsLoading(true)

      let query = supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      // Apply favorite filter
      if (showFavorites) {
        query = query.eq('is_favorite', true)
      }

      // Apply source filter
      if (selectedSources.size > 0) {
        query = query.in('source_name', Array.from(selectedSources))
      }

      const { data, error } = await query

      if (!error && data) {
        // Filter by labels on client side (since they're arrays)
        let filteredData = data

        if (selectedLabels.size > 0) {
          filteredData = filteredData.filter(recipe =>
            recipe.labels?.some(label => selectedLabels.has(label)) || false
          )
        }

        setRecipes(filteredData)
      } else if (error) {
        console.error('Error loading recipes:', error)
      }
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, showFavorites, selectedLabels, selectedSources, supabase])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadRecipes()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [loadRecipes])

  // Extract unique values for filters
  const { availableLabels, availableSources } = useMemo(() => {
    const labels = new Set<string>()
    const sources = new Set<string>()

    recipes.forEach(recipe => {
      recipe.labels?.forEach(label => labels.add(label))
      if (recipe.source_name) sources.add(recipe.source_name)
    })

    return {
      availableLabels: Array.from(labels).sort(),
      availableSources: Array.from(sources).sort()
    }
  }, [recipes])

  const handleFavoriteChange = (id: string, isFavorite: boolean) => {
    setRecipes(prev => prev.map(r =>
      r.id === id ? { ...r, is_favorite: isFavorite } : r
    ))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="font-[Montserrat] text-2xl font-bold">Recepten</h1>
          <button
            onClick={() => setIsImportDialogOpen(true)}
            className="btn btn-primary btn-md flex items-center gap-2"
          >
            <Upload className="h-5 w-5" />
            Importeer Recept
          </button>
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

          {/* Compact Filter Bar */}
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

            {/* Collapsible Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="filter-chip"
              >
                <Filter className="h-4 w-4" />
                Filter
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Dropdown Content */}
              {isFilterDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 min-w-[280px] rounded-lg border bg-white p-3 shadow-lg">
                  <div className="max-h-[400px] space-y-3 overflow-y-auto">
                    {/* Type Labels */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-[oklch(var(--muted-foreground))]">Type gerecht</div>
                      <div className="ml-2 space-y-2">
                        {availableLabels.map(label => (
                          <label key={label} className="flex items-center gap-2 text-sm cursor-pointer hover:text-[oklch(var(--primary))]">
                            <input
                              type="checkbox"
                              checked={selectedLabels.has(label)}
                              onChange={(e) => {
                                const newLabels = new Set(selectedLabels)
                                if (e.target.checked) {
                                  newLabels.add(label)
                                } else {
                                  newLabels.delete(label)
                                }
                                setSelectedLabels(newLabels)
                              }}
                              className="checkbox h-4 w-4"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {availableSources.length > 0 && (
                      <>
                        <div className="h-px bg-[oklch(var(--border))]" />

                        {/* Sources */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-[oklch(var(--muted-foreground))]">Bron</div>
                          <div className="ml-2 space-y-2">
                            {availableSources.map(source => (
                              <label key={source} className="flex items-center gap-2 text-sm cursor-pointer hover:text-[oklch(var(--primary))]">
                                <input
                                  type="checkbox"
                                  checked={selectedSources.has(source)}
                                  onChange={(e) => {
                                    const newSources = new Set(selectedSources)
                                    if (e.target.checked) {
                                      newSources.add(source)
                                    } else {
                                      newSources.delete(source)
                                    }
                                    setSelectedSources(newSources)
                                  }}
                                  className="checkbox h-4 w-4"
                                />
                                <span>{source}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active filter chips */}
            {selectedLabels.size > 0 && Array.from(selectedLabels).map(label => (
              <button
                key={label}
                onClick={() => {
                  const newLabels = new Set(selectedLabels)
                  newLabels.delete(label)
                  setSelectedLabels(newLabels)
                }}
                className="filter-chip active"
              >
                {label}
                <span className="ml-1">×</span>
              </button>
            ))}

            {selectedSources.size > 0 && Array.from(selectedSources).map(source => (
              <button
                key={source}
                onClick={() => {
                  const newSources = new Set(selectedSources)
                  newSources.delete(source)
                  setSelectedSources(newSources)
                }}
                className="filter-chip active"
              >
                {source}
                <span className="ml-1">×</span>
              </button>
            ))}
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
              {searchQuery || showFavorites || selectedLabels.size > 0 || selectedSources.size > 0
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
                onFavoriteChange={handleFavoriteChange}
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
    </div>
  )
}
