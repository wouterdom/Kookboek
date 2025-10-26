"use client"

import { useState, useEffect } from "react"
import { X, Bookmark, Info, CheckSquare } from "lucide-react"
import { Recipe, ParsedIngredient } from "@/types/supabase"
import { calculateScaledAmount } from "@/lib/weekmenu-utils"

interface IngredientSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  recipe: Recipe & { parsed_ingredients: ParsedIngredient[] }
  onConfirm?: (selectedIngredients: ParsedIngredient[]) => void
}

export function IngredientSelectionModal({
  isOpen,
  onClose,
  recipe,
  onConfirm
}: IngredientSelectionModalProps) {
  const [servings, setServings] = useState(recipe.servings_default || 4)
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set())
  const [adjustedAmounts, setAdjustedAmounts] = useState<Map<string, string>>(new Map())

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setServings(recipe.servings_default || 4)
      setSelectedIngredientIds(new Set())
      setAdjustedAmounts(new Map())
    }
  }, [isOpen, recipe])

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const ingredients = recipe.parsed_ingredients || []

  const handleServingsChange = (change: number) => {
    const newServings = Math.max(1, Math.min(12, servings + change))
    setServings(newServings)

    // Update all amounts based on new servings
    const newAdjustedAmounts = new Map<string, string>()
    ingredients.forEach(ingredient => {
      if (ingredient.amount_display && ingredient.scalable) {
        const newAmount = calculateScaledAmount(
          ingredient.amount_display,
          recipe.servings_default || 4,
          newServings
        )
        newAdjustedAmounts.set(ingredient.id, newAmount)
      }
    })
    setAdjustedAmounts(newAdjustedAmounts)
  }

  const handleAmountChange = (ingredientId: string, newAmount: string) => {
    const newAdjustedAmounts = new Map(adjustedAmounts)
    newAdjustedAmounts.set(ingredientId, newAmount)
    setAdjustedAmounts(newAdjustedAmounts)
  }

  const toggleIngredient = (ingredientId: string) => {
    const newSelected = new Set(selectedIngredientIds)
    if (newSelected.has(ingredientId)) {
      newSelected.delete(ingredientId)
    } else {
      newSelected.add(ingredientId)
    }
    setSelectedIngredientIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIngredientIds.size === ingredients.length) {
      setSelectedIngredientIds(new Set())
    } else {
      setSelectedIngredientIds(new Set(ingredients.map(ing => ing.id)))
    }
  }

  const handleConfirm = () => {
    const selected = ingredients.filter(ing => selectedIngredientIds.has(ing.id))
    onConfirm?.(selected)
    onClose()
  }

  const getDisplayAmount = (ingredient: ParsedIngredient): string => {
    if (adjustedAmounts.has(ingredient.id)) {
      return adjustedAmounts.get(ingredient.id)!
    }
    return ingredient.amount_display || ''
  }

  const isAmountChanged = (ingredient: ParsedIngredient): boolean => {
    return adjustedAmounts.has(ingredient.id) &&
           adjustedAmounts.get(ingredient.id) !== ingredient.amount_display
  }

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl flex flex-col max-h-[85vh] animate-in zoom-in duration-200">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[oklch(var(--primary))]/10 flex items-center justify-center flex-shrink-0">
            <Bookmark className="h-4 w-4" style={{ color: 'oklch(var(--primary))' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Recept toegevoegd aan weekmenu!</h3>
            <p className="text-xs text-[oklch(var(--muted-foreground))]">
              Selecteer ingrediënten voor je boodschappenlijst
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Recipe Info with Servings */}
          <div className="flex items-center gap-3 p-3 bg-[oklch(var(--muted))] rounded-lg mb-3">
            {recipe.image_url && (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-10 h-10 rounded object-cover"
              />
            )}
            <div className="flex-1">
              <div className="font-semibold text-sm">{recipe.title}</div>
              {totalTime > 0 && (
                <div className="text-xs text-[oklch(var(--muted-foreground))]">
                  {totalTime} min
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[oklch(var(--muted-foreground))]">Porties:</span>
              <div className="flex items-center gap-0.5 bg-white border border-[oklch(var(--border))] rounded px-0.5">
                <button
                  onClick={() => handleServingsChange(-1)}
                  className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded text-sm"
                  disabled={servings <= 1}
                >
                  −
                </button>
                <span className="min-w-[1.25rem] text-center font-semibold text-xs">{servings}</span>
                <button
                  onClick={() => handleServingsChange(1)}
                  className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded text-sm"
                  disabled={servings >= 12}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Select All Button */}
          <button
            onClick={toggleSelectAll}
            className="w-full text-left p-2 hover:bg-[oklch(var(--muted))] rounded text-xs text-[oklch(var(--primary))] font-medium flex items-center gap-1.5"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Alles selecteren
          </button>

          {/* Ingredients List */}
          {ingredients.length === 0 ? (
            <div className="text-center py-8 text-sm text-[oklch(var(--muted-foreground))]">
              Dit recept heeft geen ingrediënten
            </div>
          ) : (
            <div className="space-y-1.5">
              {ingredients.map(ingredient => {
                const isSelected = selectedIngredientIds.has(ingredient.id)
                const displayAmount = getDisplayAmount(ingredient)
                const isChanged = isAmountChanged(ingredient)

                return (
                  <div
                    key={ingredient.id}
                    className={`flex items-center gap-2 p-2 border rounded transition-all ${
                      isSelected
                        ? 'border-[oklch(var(--primary))] bg-[oklch(var(--primary))]/5'
                        : 'border-[oklch(var(--border))] hover:border-[oklch(var(--primary))] hover:bg-[oklch(var(--muted))]'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      onClick={() => toggleIngredient(ingredient.id)}
                      className={`w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${
                        isSelected
                          ? 'bg-[oklch(var(--primary))] border-[oklch(var(--primary))]'
                          : 'border-[oklch(var(--border))]'
                      }`}
                    >
                      {isSelected && (
                        <span className="text-white text-xs font-bold">✓</span>
                      )}
                    </div>

                    {/* Amount Input */}
                    <input
                      type="text"
                      value={displayAmount}
                      onChange={(e) => handleAmountChange(ingredient.id, e.target.value)}
                      className={`w-16 px-2 py-1 border rounded text-xs text-center ${
                        isChanged
                          ? 'border-[oklch(var(--primary))] bg-[oklch(var(--primary))]/5'
                          : 'border-[oklch(var(--border))]'
                      }`}
                      placeholder="0"
                    />

                    {/* Ingredient Name */}
                    <span className="flex-1 text-sm">{ingredient.ingredient_name_nl}</span>

                    {/* "was X" indicator */}
                    {isChanged && ingredient.amount_display && (
                      <span className="text-xs text-[oklch(var(--muted-foreground))]">
                        was {ingredient.amount_display}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Info Tip */}
          <div className="mt-3 p-2.5 bg-[oklch(var(--muted))] rounded text-xs text-[oklch(var(--muted-foreground))] flex gap-2">
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span>
              Tip: Pas hoeveelheden aan naar wat je nodig hebt. Bijv: heb je al 100g spaghetti thuis? Verander 400g naar 300g.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex gap-2">
          <button
            onClick={onClose}
            className="btn btn-outline flex-1"
          >
            Overslaan
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIngredientIds.size === 0}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            Toevoegen aan boodschappen
            {selectedIngredientIds.size > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                {selectedIngredientIds.size}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
