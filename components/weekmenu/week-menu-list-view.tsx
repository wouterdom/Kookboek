"use client"

import { X, Users } from "lucide-react"
import { WeekMenuItemsByDay } from "@/lib/weekmenu-utils"
import { getDayName } from "@/lib/weekmenu-utils"

interface WeekMenuListViewProps {
  groupedItems: WeekMenuItemsByDay
  currentWeek: Date
  onCompleteToggle: (id: string, isCompleted: boolean) => void
  onRemove: (id: string) => void
  onDayChange?: (itemId: string, dayOfWeek: number | null) => void
  onServingsChange?: (itemId: string, servings: number) => void
}

export function WeekMenuListView({
  groupedItems,
  currentWeek,
  onCompleteToggle,
  onRemove,
  onDayChange,
  onServingsChange
}: WeekMenuListViewProps) {
  // Collect all items from all days
  const allItems = [
    ...groupedItems[0],
    ...groupedItems[1],
    ...groupedItems[2],
    ...groupedItems[3],
    ...groupedItems[4],
    ...groupedItems[5],
    ...groupedItems[6],
    ...groupedItems.unassigned
  ]

  const handleDayChange = async (itemId: string, newDay: string) => {
    const dayOfWeek = newDay === 'unassigned' ? null : parseInt(newDay)
    if (onDayChange) {
      onDayChange(itemId, dayOfWeek)
    }
  }

  return (
    <div className="space-y-2">
      {allItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Geen recepten in deze week
        </div>
      ) : (
        allItems.map(item => {
          const isUnassigned = item.day_of_week === null || item.day_of_week === undefined
          const currentDayValue = isUnassigned ? 'unassigned' : item.day_of_week.toString()

          // Get title from either recipe or custom_title
          const title = item.recipe?.title || (item as any).custom_title || 'Onbekend'

          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-2 bg-[oklch(var(--card))] border rounded-lg transition-all hover:shadow-sm ${
                item.is_completed ? 'opacity-50' : ''
              } ${isUnassigned ? 'border-yellow-500 border-2 bg-yellow-50/50' : ''}`}
            >
              {/* Checkbox */}
              <div
                onClick={() => onCompleteToggle(item.id, !item.is_completed)}
                className={`w-6 h-6 border-2 rounded flex items-center justify-center cursor-pointer transition-all flex-shrink-0 hover:scale-105 ${
                  item.is_completed
                    ? 'bg-[oklch(var(--primary))] border-[oklch(var(--primary))]'
                    : 'border-[oklch(var(--border))] hover:border-[oklch(var(--primary))]'
                }`}
              >
                {item.is_completed && (
                  <span className="text-white text-sm font-bold">✓</span>
                )}
              </div>

              {/* Day Selector */}
              <select
                value={currentDayValue}
                onChange={(e) => handleDayChange(item.id, e.target.value)}
                className={`px-2 py-1.5 text-xs font-medium border rounded focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all hover:border-[oklch(var(--primary))] ${
                  isUnassigned ? 'border-yellow-500 bg-yellow-50 font-semibold text-yellow-700' : 'bg-white'
                }`}
              >
                <option value="unassigned">-</option>
                <option value="0">Ma</option>
                <option value="1">Di</option>
                <option value="2">Wo</option>
                <option value="3">Do</option>
                <option value="4">Vr</option>
                <option value="5">Za</option>
                <option value="6">Zo</option>
              </select>

              {/* Recipe Info */}
              <div className="flex-1 flex flex-col gap-1">
                <span className={`text-sm font-medium ${item.is_completed ? 'line-through' : ''} ${isUnassigned ? 'text-yellow-800' : 'text-[oklch(var(--foreground))]'}`}>
                  {title}
                </span>

                {/* Servings Selector */}
                {onServingsChange && (
                  <div className="flex items-center gap-0.5 bg-[oklch(var(--muted))] rounded px-1 w-fit">
                    <button
                      onClick={() => {
                        const newServings = Math.max(1, item.servings - 1)
                        onServingsChange(item.id, newServings)
                      }}
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
                      onClick={() => {
                        const newServings = Math.min(12, item.servings + 1)
                        onServingsChange(item.id, newServings)
                      }}
                      disabled={item.servings >= 12}
                      className="w-5 h-5 flex items-center justify-center hover:bg-[oklch(var(--primary))] hover:text-white rounded transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onRemove(item.id)}
                className="w-8 h-8 flex items-center justify-center border border-[oklch(var(--border))] rounded hover:bg-[oklch(var(--destructive))] hover:text-white hover:border-[oklch(var(--destructive))] transition-all flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}
