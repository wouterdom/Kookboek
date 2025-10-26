"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, Users, GripVertical } from "lucide-react"
import { WeeklyMenuItemWithRecipe } from "@/types/supabase"
import Link from "next/link"

interface WeekMenuSortableItemProps {
  item: WeeklyMenuItemWithRecipe
  onRemove: (id: string) => void
  onServingsChange: (id: string, servings: number) => void
}

export function WeekMenuSortableItem({
  item,
  onRemove,
  onServingsChange,
}: WeekMenuSortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleServingsChange = (change: number, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const newServings = Math.max(1, Math.min(12, item.servings + change))
    onServingsChange(item.id, newServings)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onRemove(item.id)
  }

  // Check if this is a custom item (no recipe reference)
  const isCustomItem = !item.recipe_id || !item.recipe
  const title = isCustomItem ? (item as any).custom_title : item.recipe?.title

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'none' }}
      {...attributes}
      className="bg-white border border-[oklch(var(--border))] rounded-lg p-2 hover:shadow-md transition-all relative"
    >
      {/* Draggable overlay - covers entire card for dragging */}
      <div
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-0"
      />

      <div className="flex items-start gap-2 relative z-10">
        {/* Drag indicator icon */}
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isCustomItem ? (
            <div className="font-semibold text-xs mb-1.5 text-muted-foreground italic">
              {title || 'Onbekend recept'}
            </div>
          ) : (
            <Link
              href={`/recipes/${item.recipe.slug}`}
              className="block relative z-20"
            >
              <div className="font-semibold text-xs mb-1.5 hover:text-[oklch(var(--primary))] transition-colors">
                {title}
              </div>
            </Link>
          )}

          <div className="flex items-center justify-between gap-2">
            {/* Servings Selector */}
            <div className="flex items-center gap-0.5 bg-[oklch(var(--muted))] rounded px-1 relative z-20">
              <button
                onClick={(e) => handleServingsChange(-1, e)}
                disabled={item.servings <= 1}
                className="w-5 h-5 flex items-center justify-center hover:bg-[oklch(var(--primary))] hover:text-white rounded transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                −
              </button>
              <div className="min-w-[1.5rem] text-center flex items-center justify-center gap-0.5">
                <Users className="h-2.5 w-2.5" />
                <span className="font-semibold text-xs">{item.servings}</span>
              </div>
              <button
                onClick={(e) => handleServingsChange(1, e)}
                disabled={item.servings >= 12}
                className="w-5 h-5 flex items-center justify-center hover:bg-[oklch(var(--primary))] hover:text-white rounded transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Remove Button */}
            <button
              onClick={handleRemove}
              className="w-6 h-6 flex items-center justify-center border border-[oklch(var(--border))] rounded hover:bg-[oklch(var(--destructive))] hover:text-white hover:border-[oklch(var(--destructive))] transition-all flex-shrink-0 cursor-pointer relative z-20"
              title="Verwijder"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
