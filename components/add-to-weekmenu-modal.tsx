"use client"

import { useState, useEffect } from 'react'
import { X, Search, BookOpen, PlusCircle, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWeekMenu } from '@/contexts/weekmenu-context'
import { getCurrentWeekMonday, formatDateForDB } from '@/lib/weekmenu-utils'
import Image from 'next/image'
import { IngredientSelectionPopup } from './ingredient-selection-popup'
import { Modal } from './modal'

interface AddToWeekmenuModalProps {
  isOpen: boolean
  onClose: () => void
}

type ModalView = 'choose' | 'select-recipe' | 'manual-add'

export function AddToWeekmenuModal({ isOpen, onClose }: AddToWeekmenuModalProps) {
  const [view, setView] = useState<ModalView>('choose')
  const [searchQuery, setSearchQuery] = useState('')
  const [recipes, setRecipes] = useState<any[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [showIngredientPopup, setShowIngredientPopup] = useState(false)
  const [recipeWithIngredients, setRecipeWithIngredients] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { addToWeekMenu, isRecipeInWeekMenu } = useWeekMenu()
  const supabase = createClient()

  // Reset view when modal closes
  useEffect(() => {
    if (!isOpen) {
      setView('choose')
      setSearchQuery('')
      setManualTitle('')
      setShowIngredientPopup(false)
      setRecipeWithIngredients(null)
      setErrorMessage(null)
    }
  }, [isOpen])

  // Load recipes when switching to select-recipe view
  useEffect(() => {
    if (view === 'select-recipe' && recipes.length === 0) {
      loadRecipes()
    }
  }, [view])

  // Filter recipes based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRecipes(recipes)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = recipes.filter((recipe: any) =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.categories?.some((cat: any) => cat.name.toLowerCase().includes(query))
      )
      setFilteredRecipes(filtered)
    }
  }, [searchQuery, recipes])

  const loadRecipes = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          id,
          title,
          slug,
          image_url,
          servings_default,
          prep_time,
          cook_time,
          recipe_categories (
            category:categories (
              id,
              name,
              color
            )
          )
        `)
        .order('title', { ascending: true })

      if (error) throw error

      // Transform data to flatten categories
      const recipesWithCategories = (data || []).map((recipe: any) => ({
        ...recipe,
        categories: recipe.recipe_categories?.map((rc: any) => rc.category) || []
      }))

      setRecipes(recipesWithCategories)
      setFilteredRecipes(recipesWithCategories)
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectRecipe = async (recipeId: string) => {
    try {
      // First, get recipe with ingredients
      const { data: recipeData, error } = await supabase
        .from('recipes')
        .select(`
          id,
          title,
          image_url,
          servings_default,
          parsed_ingredients (
            id,
            ingredient_name_nl,
            amount_display,
            order_index
          )
        `)
        .eq('id', recipeId)
        .single()

      if (error) throw error

      // Add to weekmenu with callback to show ingredient selection
      await addToWeekMenu(recipeId, () => {
        // Show ingredient selection popup
        setRecipeWithIngredients(recipeData)
        setShowIngredientPopup(true)
      })
    } catch (error) {
      console.error('Error adding recipe to weekmenu:', error)
      setErrorMessage('Er ging iets mis bij het toevoegen aan het weekmenu')
    }
  }

  const handleIngredientConfirm = async (groceryItems: any[]) => {
    try {
      // Add items to grocery list via API
      const response = await fetch('/api/groceries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: groceryItems })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add ingredients to grocery list')
      }

      const data = await response.json()
      console.log(`Successfully added ${data.count} items to grocery list`)

      // Close popups
      setShowIngredientPopup(false)
      setRecipeWithIngredients(null)
      onClose() // Close the main modal too
    } catch (error) {
      console.error('Error adding to grocery list:', error)
      setErrorMessage('Er ging iets mis bij het toevoegen aan de boodschappenlijst')
      // Keep popup open so user can retry
    }
  }

  const handleIngredientCancel = () => {
    setShowIngredientPopup(false)
    setRecipeWithIngredients(null)
    onClose() // Close the main modal when user skips
  }

  const handleManualAdd = async () => {
    if (!manualTitle.trim()) return

    try {
      // Get current week Monday using utility function
      const monday = getCurrentWeekMonday()
      const weekDateStr = formatDateForDB(monday)

      // Use API endpoint instead of direct Supabase insert
      const response = await fetch('/api/weekmenu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_title: manualTitle.trim(),
          week_date: weekDateStr,
          day_of_week: null,
          servings: 4,
          order_index: 0
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to add item')
      }

      // Close modal - parent component will refresh the list
      onClose()
    } catch (error) {
      console.error('Error adding manual item:', error)
      setErrorMessage('Er ging iets mis bij het toevoegen. Probeer het opnieuw.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header - Only show for choose view */}
        {view === 'choose' && (
          <div className="flex items-center justify-between p-3 border-b">
            <h2 className="text-base font-semibold">Recept toevoegen</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sluiten"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Compact header for select-recipe view */}
        {view === 'select-recipe' && (
          <div className="flex items-center gap-3 p-3 border-b">
            <button
              onClick={() => setView('choose')}
              className="text-primary hover:underline flex items-center gap-1"
            >
              ← Terug
            </button>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sluiten"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {view === 'choose' && (
            <div className="space-y-3">

              <button
                onClick={() => setView('select-recipe')}
                className="w-full flex items-center gap-3 p-4 border-2 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-0.5">Selecteer uit recepten</h3>
                  <p className="text-xs text-muted-foreground">
                    Kies een bestaand recept uit je verzameling. Ingrediënten kunnen automatisch worden toegevoegd aan je boodschappenlijst.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setView('manual-add')}
                className="w-full flex items-center gap-3 p-4 border-2 rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <PlusCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-0.5">Handmatig toevoegen</h3>
                  <p className="text-xs text-muted-foreground">
                    Typ gewoon een naam (bijv. "Ballekes met krieken"). Je zal ingrediënten later handmatig moeten toevoegen.
                  </p>
                </div>
              </button>
            </div>
          )}

          {view === 'select-recipe' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek recepten..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Recipe List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Recepten laden...</p>
                ) : filteredRecipes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Geen recepten gevonden</p>
                ) : (
                  filteredRecipes.map((recipe) => {
                    const isInWeekMenu = isRecipeInWeekMenu(recipe.id)

                    return (
                      <button
                        key={recipe.id}
                        onClick={() => !isInWeekMenu && handleSelectRecipe(recipe.id)}
                        disabled={isInWeekMenu}
                        className={`w-full flex items-center gap-4 p-4 border rounded-lg transition-all text-left ${
                          isInWeekMenu
                            ? 'opacity-50 cursor-not-allowed bg-muted'
                            : 'hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        {recipe.image_url && (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={recipe.image_url}
                              alt={recipe.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{recipe.title}</h3>
                          {recipe.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {recipe.categories.slice(0, 3).map((cat: any) => (
                                <span
                                  key={cat.id}
                                  className="px-2 py-0.5 rounded-full text-xs border"
                                  style={{
                                    borderColor: cat.color,
                                    color: cat.color,
                                    backgroundColor: `${cat.color}15`
                                  }}
                                >
                                  {cat.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {isInWeekMenu && (
                          <Bookmark className="h-5 w-5 text-primary fill-current flex-shrink-0" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {view === 'manual-add' && (
            <div className="space-y-4">
              <button
                onClick={() => setView('choose')}
                className="text-sm text-primary hover:underline mb-4"
              >
                ← Terug
              </button>

              <div>
                <label htmlFor="manual-title" className="block text-sm font-medium mb-2">
                  Recept naam
                </label>
                <input
                  id="manual-title"
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="bijv. Ballekes met krieken"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Dit recept wordt toegevoegd aan je weekmenu. Je zal ingrediënten later handmatig moeten toevoegen aan je boodschappenlijst.
                </p>
              </div>

              <button
                onClick={handleManualAdd}
                disabled={!manualTitle.trim()}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Toevoegen aan weekmenu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Modal */}
      {errorMessage && (
        <Modal
          isOpen={!!errorMessage}
          onClose={() => setErrorMessage(null)}
          message={errorMessage}
          type="error"
        />
      )}

      {/* Ingredient Selection Popup */}
      {showIngredientPopup && recipeWithIngredients && (
        <IngredientSelectionPopup
          isOpen={showIngredientPopup}
          recipe={recipeWithIngredients}
          onConfirm={handleIngredientConfirm}
          onCancel={handleIngredientCancel}
        />
      )}
    </div>
  )
}
