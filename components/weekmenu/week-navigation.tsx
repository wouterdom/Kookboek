"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { getWeekNumber, getWeekDateRangeShort, isCurrentWeek } from "@/lib/weekmenu-utils"

interface WeekNavigationProps {
  currentWeek: Date
  onPrevious: () => void
  onNext: () => void
}

export function WeekNavigation({ currentWeek, onPrevious, onNext }: WeekNavigationProps) {
  const weekNumber = getWeekNumber(currentWeek)
  const dateRange = getWeekDateRangeShort(currentWeek)
  const isCurrent = isCurrentWeek(currentWeek)

  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-[oklch(var(--card))] rounded-lg mb-6">
      <button
        onClick={onPrevious}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-[oklch(var(--border))] hover:bg-[oklch(var(--primary))] hover:text-white hover:border-[oklch(var(--primary))] transition-all"
        aria-label="Vorige week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="text-center min-w-[200px]">
        <div className="font-semibold flex items-center justify-center gap-2">
          Week {weekNumber}
          {isCurrent && (
            <span className="px-2 py-0.5 bg-[oklch(var(--primary))] text-white text-xs rounded-full">
              Huidige week
            </span>
          )}
        </div>
        <div className="text-sm text-[oklch(var(--muted-foreground))]">{dateRange}</div>
      </div>

      <button
        onClick={onNext}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-[oklch(var(--border))] hover:bg-[oklch(var(--primary))] hover:text-white hover:border-[oklch(var(--primary))] transition-all"
        aria-label="Volgende week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
