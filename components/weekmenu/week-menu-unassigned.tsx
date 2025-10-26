"use client"

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { WeeklyMenuItemWithRecipe } from "@/types/supabase"
import { WeekMenuSortableItem } from "./week-menu-sortable-item"

interface WeekMenuUnassignedProps {
  items: WeeklyMenuItemWithRecipe[]
  onRemove: (id: string) => void
  onServingsChange: (id: string, servings: number) => void
}

export function WeekMenuUnassigned({
  items,
  onRemove,
  onServingsChange,
}: WeekMenuUnassignedProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned',
  })

  const itemIds = items.map(item => item.id)

  return (
    <div className="bg-[oklch(var(--card))] border-2 border-dashed border-yellow-500/50 rounded-lg p-4">
      <div className="font-semibold mb-3 text-[oklch(var(--muted-foreground))]">
        Geen dag toegewezen
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-wrap gap-2 min-h-[150px] p-4 rounded-md border-2 border-dashed transition-all ${
          isOver
            ? 'bg-primary/10 border-primary ring-2 ring-primary ring-inset'
            : 'bg-[oklch(var(--muted))]/20 border-[oklch(var(--border))]'
        }`}
      >
        {items.length === 0 ? (
          <div className="w-full flex items-center justify-center text-xs text-muted-foreground">
            {isOver ? '↓ Plaats hier' : 'Sleep recepten hierheen om ze niet toe te wijzen'}
          </div>
        ) : (
          <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
            {items.map(item => (
              <div key={item.id} className="w-full sm:w-auto">
                <WeekMenuSortableItem
                  item={item}
                  onRemove={onRemove}
                  onServingsChange={onServingsChange}
                />
              </div>
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  )
}
