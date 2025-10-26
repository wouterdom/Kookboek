"use client"

import { X, Move, Users } from "lucide-react"
import { WeeklyMenuItemWithRecipe } from "@/types/supabase"
import Link from "next/link"

interface RecipeCardWeekmenuProps {
  item: WeeklyMenuItemWithRecipe
  onRemove: (id: string) => void
  onServingsChange: (id: string, servings: number) => void
  onDragStart?: (e: React.DragEvent, item: WeeklyMenuItemWithRecipe) => void
  onDragEnd?: (e: React.DragEvent) => void
  draggable?: boolean
}

export function RecipeCardWeekMenu({
  item,
  onRemove,
  onServingsChange,
  onDragStart,
  onDragEnd,
  draggable = true
}: RecipeCardWeekmenuProps) {
  const handleServingsChange = (change: number) => {
    const newServings = Math.max(1, Math.min(12, item.servings || 4 + change))
    onServingsChange(item.id, newServings)
  }

  // Check if this is a custom item (no recipe reference)
  const isCustomItem = !item.recipe_id || !item.recipe
  const title = isCustomItem ? (item as any).custom_title : item.recipe?.title

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, item)}
      onDragEnd={onDragEnd}
      className="bg-white border border-[oklch(var(--border))] rounded-lg p-2 cursor-move hover:shadow-md transition-all"
    >
      {isCustomItem ? (
        <div className="font-semibold text-xs mb-1.5 text-muted-foreground italic">
          {title || 'Onbekend recept'}
        </div>
      ) : (
        <Link href={`/recipes/${item.recipe.slug}`} className="block">
          <div className="font-semibold text-xs mb-1.5 hover:text-[oklch(var(--primary))] transition-colors">
            {title}
          </div>
        </Link>
      )}

      <div className="flex items-center justify-between">
        {/* Servings Selector */}
        <div className="flex items-center gap-0.5 bg-[oklch(var(--muted))] rounded px-1">
          <button
            onClick={() => handleServingsChange(-1)}
            disabled={(item.servings || 4) <= 1}
            className="w-5 h-5 flex items-center justify-center hover:bg-[oklch(var(--primary))] hover:text-white rounded transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            −
          </button>
          <div className="min-w-[1.5rem] text-center flex items-center justify-center gap-0.5">
            <Users className="h-2.5 w-2.5" />
            <span className="font-semibold text-xs">{item.servings || 4}</span>
          </div>
          <button
            onClick={() => handleServingsChange(1)}
            disabled={(item.servings || 4) >= 12}
            className="w-5 h-5 flex items-center justify-center hover:bg-[oklch(var(--primary))] hover:text-white rounded transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => onRemove(item.id)}
            className="w-6 h-6 flex items-center justify-center border border-[oklch(var(--border))] rounded hover:bg-[oklch(var(--destructive))] hover:text-white hover:border-[oklch(var(--destructive))] transition-all"
            title="Verwijder"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
