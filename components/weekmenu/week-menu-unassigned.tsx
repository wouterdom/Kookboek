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
    <div className="bg-[oklch(var(--card))] border rounded-lg p-4">
      <div className="font-semibold mb-3 text-[oklch(var(--muted-foreground))]">
        Geen dag toegewezen
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-wrap gap-2 min-h-[120px] p-3 rounded transition-all ${
          isOver ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/20'
        }`}
        style={{ touchAction: 'none' }}
      >
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
      </div>
    </div>
  )
}
