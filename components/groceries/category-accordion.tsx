"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { GroceryItem, GroceryItemProps } from "./grocery-item"
import { Badge } from "@/components/ui/badge"

export interface CategoryAccordionProps {
  category: {
    id: string
    name: string
    slug: string
    icon: string
    color: string
  }
  items: Array<{
    id: string
    name: string
    amount?: string
    is_checked: boolean
    from_recipe_id?: string
  }>
  recipes?: Map<string, { id: string; title: string }>
  onItemCheck: (itemId: string, checked: boolean) => void
  onItemDelete?: (itemId: string) => void
  onAddItem?: (categoryId: string) => void
  defaultExpanded?: boolean
}

export function CategoryAccordion({
  category,
  items,
  recipes,
  onItemCheck,
  onItemDelete,
  onAddItem,
  defaultExpanded = true
}: CategoryAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const uncheckedCount = items.filter(item => !item.is_checked).length
  const totalCount = items.length

  return (
    <div className="mb-2">
      {/* Category Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-3 transition-all hover:bg-muted",
          isExpanded && "rounded-b-none border-b-0"
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{category.icon}</span>
          <h2 className="text-sm font-semibold">{category.name}</h2>
          <Badge
            variant={uncheckedCount > 0 ? "primary" : "default"}
            className="ml-1 h-5 min-w-[20px] px-1.5 text-xs"
          >
            {uncheckedCount > 0 ? uncheckedCount : totalCount}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {onAddItem && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddItem(category.id)
              }}
              className="rounded-full p-1.5 hover:bg-primary hover:text-white transition-colors"
              aria-label="Item toevoegen"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Category Content */}
      {isExpanded && (
        <div className="rounded-b-lg border border-t-0 border-border bg-card p-2">
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Geen items in deze categorie
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => {
                const sourceRecipe = item.from_recipe_id && recipes
                  ? recipes.get(item.from_recipe_id)
                  : undefined

                return (
                  <GroceryItem
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    amount={item.amount}
                    isChecked={item.is_checked}
                    sourceRecipe={sourceRecipe}
                    onCheck={(checked) => onItemCheck(item.id, checked)}
                    onDelete={onItemDelete ? () => onItemDelete(item.id) : undefined}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
