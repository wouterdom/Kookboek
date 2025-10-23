"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, Clock, Users, Trash2 } from "lucide-react"
import { Recipe } from "@/types/supabase"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getCategoryStyle } from "@/lib/colors"
import { ConfirmModal, Modal } from "./modal"
import { useRouter } from "next/navigation"
import { RecipeCardCategoryQuickAdd } from "./recipe-card-category-quick-add"

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
  const [recipeCategoryIds, setRecipeCategoryIds] = useState<string[]>([])
  const supabase = createClient()
  const router = useRouter()

  // Load recipe categories
  useEffect(() => {
    const loadRecipeCategories = async () => {
      try {
        const response = await fetch(`/api/recipes/${recipe.slug}/categories`)
        if (response.ok) {
          const data = await response.json()
          setRecipeCategoryIds(data.map((rc: any) => rc.category_id))
        }
      } catch (error) {
        console.error('Error loading recipe categories:', error)
      }
    }

    loadRecipeCategories()
  }, [recipe.slug])

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isUpdating) return

    setIsUpdating(true)
    const newFavoriteState = !isFavorite

    const { error } = await supabase
      .from('recipes')
      .update({ is_favorite: newFavoriteState })
      .eq('id', recipe.id)

    if (!error) {
      setIsFavorite(newFavoriteState)
      onFavoriteChange?.(recipe.id, newFavoriteState)
    }

    setIsUpdating(false)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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

  const handleCategoryUpdate = () => {
    // Reload categories and refresh the card
    const loadRecipeCategories = async () => {
      try {
        const response = await fetch(`/api/recipes/${recipe.slug}/categories`)
        if (response.ok) {
          const data = await response.json()
          setRecipeCategoryIds(data.map((rc: any) => rc.category_id))
        }
      } catch (error) {
        console.error('Error loading recipe categories:', error)
      }
    }
    loadRecipeCategories()
  }

  return (
    <Link href={`/recipes/${recipe.slug}`}>
      <div className="card group">
        <div className="relative">
          <div className="relative h-[200px] w-full">
            <Image
              src={recipe.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop"}
              alt={recipe.title}
              fill
              className="recipe-card-image object-cover"
              unoptimized
            />
          </div>
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
        <div className="p-4 relative">
          {/* Category Quick Add Button - In card content area */}
          <RecipeCardCategoryQuickAdd
            recipeId={recipe.id}
            recipeSlug={recipe.slug}
            selectedCategoryIds={recipeCategoryIds}
            onUpdate={handleCategoryUpdate}
          />
          <h3 className="mb-2 text-lg font-semibold line-clamp-2">{recipe.title}</h3>

          {recipe.labels && recipe.labels.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {recipe.labels.map((label) => (
                <span
                  key={label}
                  className="px-3 py-1 rounded-full text-xs font-medium border-2"
                  style={getCategoryStyle()}
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 text-sm text-[oklch(var(--muted-foreground))]">
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

          {/* Delete button */}
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute bottom-2 right-2 p-2 rounded-full bg-white/90 backdrop-blur hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            aria-label="Verwijder recept"
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
    </Link>
  )
}
