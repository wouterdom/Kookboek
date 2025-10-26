"use client"

import { Bookmark } from "lucide-react"
import { useState, useEffect } from "react"
import { Recipe, ParsedIngredient } from "@/types/supabase"
import { createClient } from "@/lib/supabase/client"
import { useWeekMenu } from "@/contexts/weekmenu-context"

interface RecipeBookmarkButtonProps {
  recipeId: string
  onBookmarkChange?: (isBookmarked: boolean) => void
  onShowIngredientModal?: (recipe: Recipe & { parsed_ingredients: ParsedIngredient[] }) => void
  className?: string
}

export function RecipeBookmarkButton({
  recipeId,
  onBookmarkChange,
  onShowIngredientModal,
  className = ""
}: RecipeBookmarkButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { isRecipeInWeekMenu, addToWeekMenu, removeFromWeekMenu } = useWeekMenu()
  const supabase = createClient()

  // Use context to determine bookmark status
  const isBookmarked = isRecipeInWeekMenu(recipeId)

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) return

    setIsLoading(true)

    try {
      if (isBookmarked) {
        // Remove from weekmenu using context
        await removeFromWeekMenu(recipeId)
        onBookmarkChange?.(false)
      } else {
        // Get recipe with ingredients for modal
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .select(`
            *,
            parsed_ingredients (*)
          `)
          .eq('id', recipeId)
          .single()

        if (recipeError) {
          console.error('Error fetching recipe:', recipeError)
          return
        }

        // Add to weekmenu using context
        await addToWeekMenu(recipeId)
        onBookmarkChange?.(true)

        // Show ingredient selection modal
        if (onShowIngredientModal && recipe) {
          onShowIngredientModal(recipe as any)
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleBookmarkClick}
      disabled={isLoading}
      className={`bookmark-btn ${isBookmarked ? 'active' : ''} ${className}`}
      aria-label={isBookmarked ? 'Verwijder uit weekmenu' : 'Voeg toe aan weekmenu'}
      title={isBookmarked ? 'Verwijder uit weekmenu' : 'Voeg toe aan weekmenu'}
    >
      <Bookmark
        className={`h-5 w-5 transition-all ${
          isBookmarked
            ? "fill-[oklch(var(--primary))] stroke-[oklch(var(--primary))]"
            : "stroke-current"
        }`}
      />
    </button>
  )
}
