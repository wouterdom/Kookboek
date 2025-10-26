"use client"

import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { GroceryCategory, GroceryItemData } from "./expanded-view"

export interface CompactViewProps {
  categories: GroceryCategory[]
  items: GroceryItemData[]
  onItemCheck: (itemId: string, checked: boolean) => void
  onAddItem?: (categoryId?: string) => void
}

export function CompactView({
  categories,
  items,
  onItemCheck,
  onAddItem
}: CompactViewProps) {
  // Group items by category
  const itemsByCategory = new Map<string, GroceryItemData[]>()

  for (const item of items) {
    const categoryId = item.category_id || 'uncategorized'
    if (!itemsByCategory.has(categoryId)) {
      itemsByCategory.set(categoryId, [])
    }
    itemsByCategory.get(categoryId)!.push(item)
  }

  // Sort categories by order_index
  const sortedCategories = [...categories].sort(
    (a, b) => a.order_index - b.order_index
  )

  // Filter to only show categories with items
  const categoriesWithItems = sortedCategories.filter(
    (category) => {
      const categoryItems = itemsByCategory.get(category.id) || []
      return categoryItems.length > 0
    }
  )

  if (categoriesWithItems.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-muted-foreground">
          Je boodschappenlijst is leeg
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {categoriesWithItems.map((category) => {
        const categoryItems = itemsByCategory.get(category.id) || []

        return (
          <div key={category.id}>
            {/* Category header */}
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-border pb-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{category.icon}</span>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {category.name}
                </h3>
              </div>
              {onAddItem && (
                <button
                  onClick={() => onAddItem(category.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white transition-transform hover:scale-110"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Compact items list */}
            <div className="space-y-0">
              {categoryItems.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-2 border-b border-border py-2 text-sm",
                    index === categoryItems.length - 1 && "border-b-0"
                  )}
                >
                  {/* Compact checkbox */}
                  <div
                    onClick={() => onItemCheck(item.id, !item.is_checked)}
                    className={cn(
                      "flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center rounded-sm border-2 transition-all",
                      item.is_checked
                        ? "border-primary bg-primary"
                        : "border-border hover:border-primary"
                    )}
                  >
                    {item.is_checked && (
                      <span className="text-[10px] font-bold text-white">✓</span>
                    )}
                  </div>

                  {/* Item text */}
                  <div
                    className={cn(
                      "flex-1",
                      item.is_checked && "text-muted-foreground line-through"
                    )}
                  >
                    {item.amount && (
                      <span className="mr-1.5 font-semibold">{item.amount}</span>
                    )}
                    <span>{item.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
