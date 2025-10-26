"use client"

import { CategoryAccordion } from "./category-accordion"
import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface GroceryCategory {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  order_index: number
}

export interface GroceryItemData {
  id: string
  name: string
  amount?: string
  is_checked: boolean
  category_id?: string
  from_recipe_id?: string
}

export interface ExpandedViewProps {
  categories: GroceryCategory[]
  items: GroceryItemData[]
  recipes?: Map<string, { id: string; title: string }>
  onItemCheck: (itemId: string, checked: boolean) => void
  onItemDelete?: (itemId: string) => void
  onAddItem?: (categoryId: string) => void
  onAddCategory?: () => void
}

export function ExpandedView({
  categories,
  items,
  recipes,
  onItemCheck,
  onItemDelete,
  onAddItem,
  onAddCategory
}: ExpandedViewProps) {
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

  return (
    <div className="space-y-2">
      {sortedCategories.map((category) => {
        const categoryItems = itemsByCategory.get(category.id) || []

        // Only show categories that have items
        if (categoryItems.length === 0) {
          return null
        }

        return (
          <CategoryAccordion
            key={category.id}
            category={category}
            items={categoryItems}
            recipes={recipes}
            onItemCheck={onItemCheck}
            onItemDelete={onItemDelete}
            onAddItem={onAddItem}
            defaultExpanded={categoryItems.length > 0}
          />
        )
      })}

      {/* Add new category button */}
      {onAddCategory && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onAddCategory}
        >
          <PlusCircle className="h-4 w-4" />
          Nieuwe categorie toevoegen
        </Button>
      )}
    </div>
  )
}
