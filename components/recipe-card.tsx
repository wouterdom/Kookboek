"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, Clock, Users } from "lucide-react"
import { Recipe } from "@/types/supabase"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface RecipeCardProps {
  recipe: Recipe
  onFavoriteChange?: (id: string, isFavorite: boolean) => void
}

export function RecipeCard({ recipe, onFavoriteChange }: RecipeCardProps) {
  const [isFavorite, setIsFavorite] = useState(recipe.is_favorite || false)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()

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

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

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
        <div className="p-4">
          <h3 className="mb-2 text-lg font-semibold line-clamp-2">{recipe.title}</h3>

          {recipe.labels && recipe.labels.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {recipe.labels.map((label) => (
                <span key={label} className={`category-label ${label.toLowerCase().replace(/\s+/g, '')}`}>
                  {label}
                </span>
              ))}
            </div>
          )}

          {recipe.source_name && (
            <div className="mb-2 text-xs text-[oklch(var(--muted-foreground))]">
              Bron: {recipe.source_name}
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
        </div>
      </div>
    </Link>
  )
}
