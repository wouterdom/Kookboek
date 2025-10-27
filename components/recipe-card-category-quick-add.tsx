"use client"

import { useState, useEffect, useMemo } from "react"
import { Tag, Search } from "lucide-react"
import { getCategoryStyle } from "@/lib/colors"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { useCategories } from "@/contexts/categories-context"
import { CategoriesByType } from "@/types/supabase"

interface RecipeCardCategoryQuickAddProps {
  recipeId: string
  recipeSlug: string
  selectedCategoryIds: string[]
  onUpdate: () => void
}

export function RecipeCardCategoryQuickAdd({
  recipeId,
  recipeSlug,
  selectedCategoryIds,
  onUpdate
}: RecipeCardCategoryQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { categoriesByType } = useCategories()
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(selectedCategoryIds)
  )
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    setSelectedCategories(new Set(selectedCategoryIds))
  }, [selectedCategoryIds])

  // Reset search when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("")
    }
  }, [isOpen])

  // Filter categories based on search query
  const filteredCategoriesByType = useMemo(() => {
    if (!searchQuery.trim()) {
      return categoriesByType
    }

    const query = searchQuery.toLowerCase()
    const filtered: CategoriesByType = {}

    Object.entries(categoriesByType).forEach(([typeSlug, typeData]) => {
      const matchingCategories = typeData.categories.filter(cat =>
        cat.name.toLowerCase().includes(query)
      )

      filtered[typeSlug] = {
        type: typeData.type,
        categories: matchingCategories
      }
    })

    return filtered
  }, [categoriesByType, searchQuery])

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
    } else {
      newSelected.add(categoryId)
    }
    setSelectedCategories(newSelected)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Get current categories from database
      const currentResponse = await fetch(`/api/recipes/${recipeSlug}/categories`)
      const currentCategories = currentResponse.ok ? await currentResponse.json() : []
      const currentIds = new Set(currentCategories.map((c: any) => c.category_id))

      // Determine what to add and remove
      const toAdd = Array.from(selectedCategories).filter(id => !currentIds.has(id))
      const toRemove = Array.from(currentIds).filter((id): id is string => !selectedCategories.has(id as string))

      // Add new categories
      for (const categoryId of toAdd) {
        await fetch(`/api/recipes/${recipeSlug}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_id: categoryId })
        })
      }

      // Remove unchecked categories
      for (const categoryId of toRemove) {
        await fetch(`/api/recipes/${recipeSlug}/categories/${categoryId}`, {
          method: 'DELETE'
        })
      }

      setIsOpen(false)
      onUpdate()
    } catch (error) {
      console.error('Error updating categories:', error)
      alert('Fout bij opslaan categorieën')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  const handleOpen = () => {
    setIsOpen(true)
  }

  return (
    <>
      {/* Button to open sheet - Fixed position bottom right */}
      <button
        onClick={handleOpen}
        className="absolute bottom-2 right-2 p-2 rounded-full bg-white shadow-md hover:bg-primary hover:text-white transition-all z-10"
        title="Categorieën beheren"
      >
        <Tag className="h-4 w-4" />
      </button>

      {/* Sheet (Bottom drawer on mobile, dialog on desktop) */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="p-0 sm:max-w-2xl sm:mx-auto">
          <div className="flex flex-col h-full max-h-[75vh]">
            <SheetHeader className="p-4 border-b flex-shrink-0">
              <SheetTitle>Categorieën selecteren</SheetTitle>
            </SheetHeader>

            {/* Search Bar */}
            <div className="px-4 pt-3 pb-2 border-b flex-shrink-0 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Zoek categorieën..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {Object.entries(filteredCategoriesByType).map(([typeSlug, typeData]) => (
                <div key={typeSlug} className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-900">
                    {typeData.type.name}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {typeData.categories.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        {searchQuery.trim() ? `Geen resultaten voor "${searchQuery}"` : 'Geen categorieën'}
                      </p>
                    ) : (
                      typeData.categories.map(category => {
                        const style = getCategoryStyle(category.color)
                        return (
                          <label
                            key={category.id}
                            className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.has(category.id)}
                              onChange={() => toggleCategory(category.id)}
                              className="checkbox h-5 w-5 flex-shrink-0"
                            />
                            <span
                              className="h-3 w-3 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: style.backgroundColor,
                                border: `2px solid ${style.borderColor}`
                              }}
                            />
                            <span className="text-sm flex-1">{category.name}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with actions */}
            <div className="p-4 border-t flex gap-2 justify-end flex-shrink-0 bg-white">
              <button
                onClick={handleCancel}
                className="btn btn-secondary px-6 py-2 text-sm"
                disabled={isSaving}
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary px-6 py-2 text-sm"
                disabled={isSaving}
              >
                {isSaving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
