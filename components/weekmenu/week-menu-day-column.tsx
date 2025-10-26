"use client"

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { WeeklyMenuItemWithRecipe } from "@/types/supabase"
import { formatDayHeader, formatDayHeaderShort } from "@/lib/weekmenu-utils"
import { WeekMenuSortableItem } from "./week-menu-sortable-item"

interface WeekMenuDayColumnProps {
  day: number
  currentWeek: Date
  items: WeeklyMenuItemWithRecipe[]
  onRemove: (id: string) => void
  onServingsChange: (id: string, servings: number) => void
  compact?: boolean
}

export function WeekMenuDayColumn({
  day,
  currentWeek,
  items,
  onRemove,
  onServingsChange,
  compact = false
}: WeekMenuDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day}`,
  })

  const itemIds = items.map(item => item.id)

  return (
    <div className="bg-[oklch(var(--card))] border rounded-lg overflow-hidden">
      <div className="bg-[oklch(var(--muted))] border-b px-2 py-1.5 font-semibold text-xs">
        {compact ? formatDayHeaderShort(currentWeek, day) : formatDayHeader(currentWeek, day)}
      </div>
      <div
        ref={setNodeRef}
        className={`${compact ? 'min-h-[80px]' : 'min-h-[200px]'} p-2 space-y-2 transition-all ${
          isOver ? 'bg-primary/10 ring-2 ring-primary' : ''
        }`}
        style={{ touchAction: 'none' }}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <WeekMenuSortableItem
              key={item.id}
              item={item}
              onRemove={onRemove}
              onServingsChange={onServingsChange}
            />
          ))}
        </SortableContext>

        {/* Extra drop space when items exist - makes it easier to drop */}
        {items.length > 0 && !compact && (
          <div className="h-20 flex items-center justify-center text-xs text-muted-foreground opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            Sleep hier
          </div>
        )}
      </div>
    </div>
  )
}
