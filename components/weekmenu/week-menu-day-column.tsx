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
        className={`${compact ? 'min-h-[120px]' : 'min-h-[280px]'} p-2 space-y-2 transition-all ${
          isOver ? 'bg-primary/10 ring-2 ring-primary ring-inset' : 'bg-[oklch(var(--muted))]/20'
        }`}
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

        {/* Large drop indicator - always visible for better UX */}
        {!compact && (
          <div className={`flex-1 min-h-[100px] flex items-center justify-center rounded-md border-2 border-dashed transition-all ${
            isOver
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-[oklch(var(--border))] text-muted-foreground'
          }`}>
            <span className="text-xs font-medium">
              {isOver ? '↓ Plaats hier' : 'Sleep hier'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
