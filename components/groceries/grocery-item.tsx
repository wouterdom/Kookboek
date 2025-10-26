"use client"

import { BookOpen, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GroceryItemProps {
  id: string
  name: string
  amount?: string
  isChecked: boolean
  sourceRecipe?: {
    id: string
    title: string
  }
  sourceCount?: number
  onCheck: (checked: boolean) => void
  onDelete?: () => void
}

export function GroceryItem({
  id,
  name,
  amount,
  isChecked,
  sourceRecipe,
  sourceCount,
  onCheck,
  onDelete
}: GroceryItemProps) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-md bg-white px-4 py-3 transition-all hover:bg-muted",
        isChecked && "opacity-60"
      )}
    >
      {/* Checkbox */}
      <div
        onClick={() => onCheck(!isChecked)}
        className={cn(
          "flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-all",
          isChecked
            ? "border-primary bg-primary"
            : "border-border hover:border-primary"
        )}
      >
        {isChecked && (
          <span className="text-xs font-bold text-white">✓</span>
        )}
      </div>

      {/* Item text */}
      <div className={cn("flex-1 text-sm", isChecked && "line-through")}>
        {amount && <span className="mr-2 font-semibold">{amount}</span>}
        <span>{name}</span>

        {/* Source badge */}
        {(sourceRecipe || (sourceCount && sourceCount > 0)) && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            {sourceRecipe ? sourceRecipe.title : `${sourceCount} recepten`}
          </span>
        )}
      </div>

      {/* Delete button (always visible in red) */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="rounded p-1 text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Verwijderen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
