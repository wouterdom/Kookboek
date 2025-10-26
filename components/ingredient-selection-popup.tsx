"use client"

import { useState, useEffect } from 'react'
import { X, BookmarkCheck, Plus, Minus } from 'lucide-react'
import { Modal } from './modal'
import { scaleIngredientAmount } from '@/lib/servings-calculator'
import Image from 'next/image'

/**
 * Ingredient Selection Popup
 *
 * Shown after bookmarking a recipe to allow user to:
 * 1. Adjust servings (affects all amounts proportionally)
 * 2. Select specific ingredients to add to grocery list
 * 3. Edit individual amounts if needed
 *
 * Key Requirements:
 * - Nothing is selected by default
 * - Servings adjustment updates all amounts proportionally
 * - Individual amounts can be edited after scaling
 * - Shows "was X" indicator for changed amounts
 */

interface Ingredient {
  id: string
  ingredient_name_nl: string
  amount_display: string
  order_index: number
}

interface Recipe {
  id: string
  title: string
  image_url: string | null
  servings_default: number
  parsed_ingredients: Ingredient[]
}

interface GroceryItem {
  name: string
  amount: string
  original_amount: string
  from_recipe_id: string
  category_id?: string
}

interface IngredientSelectionPopupProps {
  isOpen: boolean
  recipe: Recipe
  onConfirm: (items: GroceryItem[]) => void
  onCancel: () => void
}

export function IngredientSelectionPopup({
  isOpen,
  recipe,
  onConfirm,
  onCancel,
}: IngredientSelectionPopupProps) {
  const [servings, setServings] = useState(recipe.servings_default)
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set())
  const [adjustedAmounts, setAdjustedAmounts] = useState<Map<string, string>>(new Map())
  const [manualEdits, setManualEdits] = useState<Set<string>>(new Set())

  // Reset state when recipe changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setServings(recipe.servings_default)
      setSelectedIngredients(new Set())
      setAdjustedAmounts(new Map())
      setManualEdits(new Set())
    }
  }, [isOpen, recipe])

  // Handle servings change - recalculate all amounts
  const handleServingsChange = (newServings: number) => {
    if (newServings < 1) return

    setServings(newServings)

    // Recalculate amounts for all ingredients that haven't been manually edited
    const newAmounts = new Map<string, string>()

    recipe.parsed_ingredients.forEach(ingredient => {
      // Don't recalculate if user manually edited this amount
      if (manualEdits.has(ingredient.id)) {
        const existingAmount = adjustedAmounts.get(ingredient.id)
        if (existingAmount) {
          newAmounts.set(ingredient.id, existingAmount)
        }
      } else {
        const scaledAmount = scaleIngredientAmount(
          ingredient.amount_display,
          recipe.servings_default,
          newServings
        )
        newAmounts.set(ingredient.id, scaledAmount)
      }
    })

    setAdjustedAmounts(newAmounts)
  }

  // Handle manual amount edit
  const handleAmountChange = (ingredientId: string, newAmount: string) => {
    setAdjustedAmounts(prev => new Map(prev).set(ingredientId, newAmount))
    setManualEdits(prev => new Set(prev).add(ingredientId))
  }

  // Toggle ingredient selection
  const handleIngredientToggle = (ingredientId: string) => {
    setSelectedIngredients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId)
      } else {
        newSet.add(ingredientId)
      }
      return newSet
    })
  }

  // Select all ingredients
  const handleSelectAll = () => {
    if (selectedIngredients.size === recipe.parsed_ingredients.length) {
      setSelectedIngredients(new Set())
    } else {
      setSelectedIngredients(new Set(recipe.parsed_ingredients.map(ing => ing.id)))
    }
  }

  // Get current amount for ingredient (scaled or original)
  const getCurrentAmount = (ingredient: Ingredient): string => {
    return adjustedAmounts.get(ingredient.id) || ingredient.amount_display
  }

  // Check if amount was changed from original
  const isAmountChanged = (ingredient: Ingredient): boolean => {
    const current = getCurrentAmount(ingredient)
    return current !== ingredient.amount_display
  }

  // Helper to update servings in the database if changed
  const updateServingsIfChanged = async () => {
    if (servings !== recipe.servings_default) {
      try {
        // Get current week Monday
        const weekDate = new Date()
        const dayOfWeek = weekDate.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        weekDate.setDate(weekDate.getDate() + mondayOffset)
        weekDate.setHours(0, 0, 0, 0)
        const weekDateStr = weekDate.toISOString().split('T')[0]

        // Update servings for this recipe in the current week
        await fetch('/api/weekmenu/update-servings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe_id: recipe.id,
            week_date: weekDateStr,
            servings: servings
          })
        })
      } catch (error) {
        console.error('Error updating servings:', error)
      }
    }
  }

  // Handle confirm
  const handleConfirm = async () => {
    // Update servings in the database if it was changed
    await updateServingsIfChanged()

    const itemsToAdd: GroceryItem[] = recipe.parsed_ingredients
      .filter(ingredient => selectedIngredients.has(ingredient.id))
      .map(ingredient => ({
        name: ingredient.ingredient_name_nl,
        amount: getCurrentAmount(ingredient),
        original_amount: ingredient.amount_display,
        from_recipe_id: recipe.id,
        // category_id will be determined by backend categorization logic
      }))

    onConfirm(itemsToAdd)
  }

  // Handle cancel/skip
  const handleCancel = async () => {
    // Save servings even if user skips adding ingredients
    await updateServingsIfChanged()
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] flex flex-col">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-3 border-b bg-primary/5">
          <div className="flex items-center gap-2 min-w-0">
            <BookmarkCheck className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="text-sm sm:text-base font-semibold truncate">Recept toegevoegd aan weekmenu!</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 ml-2"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Compact Recipe Info & Servings */}
        <div className="p-3 border-b bg-muted/10">
          <div className="flex items-center gap-2 sm:gap-3">
            {recipe.image_url && (
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded overflow-hidden flex-shrink-0">
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
              <h3 className="font-semibold text-sm sm:text-base truncate">{recipe.title}</h3>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Porties:</span>
              <div className="flex items-center gap-0.5 border rounded-lg">
                <button
                  onClick={() => handleServingsChange(servings - 1)}
                  disabled={servings <= 1}
                  className="p-1.5 sm:p-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Verminder porties"
                >
                  <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <span className="px-2 sm:px-3 py-1 font-semibold min-w-[2rem] sm:min-w-[3rem] text-center text-sm sm:text-base">
                  {servings}
                </span>
                <button
                  onClick={() => handleServingsChange(servings + 1)}
                  className="p-1.5 sm:p-2 hover:bg-muted transition-colors"
                  aria-label="Verhoog porties"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ingredients List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm sm:text-base">Ingrediënten</h3>
            <button
              onClick={handleSelectAll}
              className="text-xs sm:text-sm text-primary hover:underline"
            >
              {selectedIngredients.size === recipe.parsed_ingredients.length
                ? 'Deselecteer alles'
                : 'Selecteer alles'}
            </button>
          </div>

          <div className="space-y-2">
            {recipe.parsed_ingredients
              .sort((a, b) => a.order_index - b.order_index)
              .map(ingredient => {
                const currentAmount = getCurrentAmount(ingredient)
                const isChanged = isAmountChanged(ingredient)
                const isSelected = selectedIngredients.has(ingredient.id)

                return (
                  <div
                    key={ingredient.id}
                    className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border-2 transition-all cursor-pointer hover:bg-muted/50 ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-muted/20'
                    }`}
                    onClick={() => handleIngredientToggle(ingredient.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleIngredientToggle(ingredient.id)}
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 cursor-pointer flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <input
                        type="text"
                        value={currentAmount}
                        onChange={(e) => handleAmountChange(ingredient.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 sm:w-24 px-1.5 sm:px-2 py-1 text-xs sm:text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary flex-shrink-0"
                        placeholder="Hoev."
                      />
                      <span className="flex-1 text-sm sm:text-base truncate">{ingredient.ingredient_name_nl}</span>
                      {isChanged && (
                        <span className="text-xs text-muted-foreground hidden sm:inline flex-shrink-0">
                          was {ingredient.amount_display}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-t bg-muted/10">
          <button
            onClick={handleCancel}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Overslaan
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIngredients.size === 0}
            className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Toevoegen ({selectedIngredients.size})
          </button>
        </div>
      </div>
    </div>
  )
}
