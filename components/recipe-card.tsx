"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, Clock, Users, Trash2, Bookmark } from "lucide-react"
import { Recipe } from "@/types/supabase"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getCategoryStyle } from "@/lib/colors"
import { ConfirmModal, Modal } from "./modal"
import { useRouter } from "next/navigation"
import { RecipeCardCategoryQuickAdd } from "./recipe-card-category-quick-add"
import { useWeekMenu } from "@/contexts/weekmenu-context"
import { IngredientSelectionPopup } from "./ingredient-selection-popup"
import { useCategories } from "@/contexts/categories-context"

interface RecipeCardProps {
  recipe: Recipe
  categories?: { id: string; name: string; color: string }[]
  onFavoriteChange?: (id: string, isFavorite: boolean) => void
  onDelete?: (id: string) => void
}

export function RecipeCard({ recipe, categories = [], onFavoriteChange, onDelete }: RecipeCardProps) {
  const [isFavorite, setIsFavorite] = useState(recipe.is_favorite || false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [displayCategories, setDisplayCategories] = useState(categories)
  const [showIngredientPopup, setShowIngredientPopup] = useState(false)
  const [recipeWithIngredients, setRecipeWithIngredients] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()
  const { isRecipeInWeekMenu, addToWeekMenu, removeFromWeekMenu, isLoading: isBookmarkLoading } = useWeekMenu()
  const { categoriesByType } = useCategories()

  // Update display categories when categories prop changes
  useEffect(() => {
    setDisplayCategories(categories)
  }, [categories])

  const handleFavoriteClick = async () => {
    if (isUpdating) return

    setIsUpdating(true)
    const newFavoriteState = !isFavorite

    const { error } = await supabase
      .from('recipes')
      // @ts-expect-error - Dynamic update
      .update({ is_favorite: newFavoriteState })
      .eq('id', (recipe as any).id)

    if (!error) {
      setIsFavorite(newFavoriteState)
      onFavoriteChange?.(recipe.id, newFavoriteState)
    }

    setIsUpdating(false)
  }

  const handleDeleteClick = () => {
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/recipes/${recipe.slug}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete recipe')
      }

      // Call parent callback if provided, otherwise just refresh
      if (onDelete) {
        onDelete(recipe.id)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
      setErrorMessage('Er ging iets mis bij het verwijderen. Probeer het opnieuw.')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

  const handleCategoryUpdate = async () => {
    // Reload recipe categories when updated via quick add
    try {
      const recipeCategoriesResponse = await fetch(`/api/recipes/${recipe.slug}/categories`)

      if (!recipeCategoriesResponse.ok) {
        console.error('Error fetching categories')
        return
      }

      const recipeCategoriesData = await recipeCategoriesResponse.json()

      // Extract category IDs from recipe categories
      const categoryIds = recipeCategoriesData.map((rc: any) => rc.category_id)

      // Flatten all categories from grouped data (use context instead of fetching)
      const allCategories = Object.values(categoriesByType).flatMap(
        (typeData: any) => typeData.categories
      )

      // Map category IDs to full category objects
      const updatedCategories = categoryIds
        .map((id: string) => allCategories.find((cat: any) => cat.id === id))
        .filter((cat: any) => cat !== undefined)

      setDisplayCategories(updatedCategories)
    } catch (error) {
      console.error('Error loading recipe categories:', error)
    }
  }

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isBookmarkLoading) return

    const isInWeekMenu = isRecipeInWeekMenu(recipe.id)

    if (isInWeekMenu) {
      // Remove from weekmenu
      try {
        await removeFromWeekMenu(recipe.id)
      } catch (error) {
        console.error('Error removing from weekmenu:', error)
        setErrorMessage('Er ging iets mis bij het verwijderen uit het weekmenu')
      }
    } else {
      // Add to weekmenu and show ingredient selection popup
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
          .eq('id', recipe.id)
          .single()

        if (error) throw error

        // Add to weekmenu
        await addToWeekMenu(recipe.id, () => {
          // Show ingredient selection popup
          setRecipeWithIngredients(recipeData)
          setShowIngredientPopup(true)
        })
      } catch (error) {
        console.error('Error adding to weekmenu:', error)
        setErrorMessage('Er ging iets mis bij het toevoegen aan het weekmenu')
      }
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

      // Close popup
      setShowIngredientPopup(false)
      setRecipeWithIngredients(null)
    } catch (error) {
      console.error('Error adding to grocery list:', error)
      setErrorMessage('Er ging iets mis bij het toevoegen aan de boodschappenlijst')
      // Keep popup open so user can retry
    }
  }

  const handleIngredientCancel = () => {
    setShowIngredientPopup(false)
    setRecipeWithIngredients(null)
  }

  const isInWeekMenu = isRecipeInWeekMenu(recipe.id)

  return (
    <div className="h-full">
      <div className="card group h-full flex flex-col relative">
        <div className="relative">
          <Link href={`/recipes/${recipe.slug}`} className="block">
            <div className="relative h-[200px] w-full">
              <Image
                src={recipe.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop"}
                alt={recipe.title}
                fill
                className="recipe-card-image object-cover"
                unoptimized
              />
            </div>
          </Link>
          <button
            onClick={handleBookmarkClick}
            disabled={isBookmarkLoading}
            className="absolute top-3 right-[56px] z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center cursor-pointer shadow-sm transition-all border-none hover:scale-110"
            aria-label={isInWeekMenu ? 'Verwijder uit weekmenu' : 'Voeg toe aan weekmenu'}
          >
            <Bookmark
              className={`h-5 w-5 transition-all ${
                isInWeekMenu
                  ? "fill-[oklch(var(--primary))] stroke-[oklch(var(--primary))]"
                  : "stroke-current"
              }`}
            />
          </button>

          <button
            onClick={handleFavoriteClick}
            disabled={isUpdating}
            className="heart-btn"
            aria-label={isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
          >
            <Heart
              className={`h-5 w-5 transition-all ${
                isFavorite
                  ? "fill-[oklch(var(--primary))] stroke-[oklch(var(--primary))]"
                  : "stroke-current"
              }`}
            />
          </button>
        </div>
        <div className="p-4 relative flex-1 flex flex-col">
          {/* Category Quick Add Button - In card content area */}
          <RecipeCardCategoryQuickAdd
            recipeId={recipe.id}
            recipeSlug={recipe.slug}
            selectedCategoryIds={displayCategories.map(c => c.id)}
            onUpdate={handleCategoryUpdate}
          />
          <Link href={`/recipes/${recipe.slug}`}>
            <h3 className="mb-2 text-lg font-semibold line-clamp-2 hover:text-primary transition-colors">{recipe.title}</h3>
          </Link>

          {displayCategories && displayCategories.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {displayCategories.map((category) => (
                <span
                  key={category.id}
                  className="px-3 py-1 rounded-full text-xs font-medium border-2"
                  style={{
                    borderColor: category.color,
                    color: category.color,
                    backgroundColor: `${category.color}15`
                  }}
                >
                  {category.name}
                </span>
              ))}
            </div>
          )}

          {/* Spacer to push content to bottom */}
          <div className="flex-1"></div>

          <div className="flex items-center gap-3 text-sm text-[oklch(var(--muted-foreground))] mt-2">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {totalTime} min
              </span>
            )}
            {recipe.servings_default && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {recipe.servings_default} porties
              </span>
            )}
          </div>

          {/* Delete button - positioned to the left of the Tag icon */}
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute bottom-2 right-12 p-2 rounded-full bg-white shadow-md hover:bg-red-50 transition-all hover:scale-110 z-10"
            aria-label="Verwijder recept"
            title="Verwijder recept"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Recept verwijderen?"
        message={`Weet je zeker dat je "${recipe.title}" wilt verwijderen? Deze actie kan niet ongedaan gemaakt worden.`}
        confirmText={isDeleting ? "Verwijderen..." : "Verwijderen"}
        cancelText="Annuleren"
      />

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
