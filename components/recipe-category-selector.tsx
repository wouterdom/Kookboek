"use client"

import { useState, useEffect } from "react"
import { X, Plus, Tag } from "lucide-react"
import { Category, CategoryType, CategoriesByType } from "@/types/supabase"
import { getCategoryStyle } from "@/lib/colors"

interface RecipeCategorySelectorProps {
  recipeId: string
  selectedCategoryIds: string[]
  onUpdate: () => void
}

export function RecipeCategorySelector({
  recipeId,
  selectedCategoryIds,
  onUpdate
}: RecipeCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [categoriesByType, setCategoriesByType] = useState<CategoriesByType>({})
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(selectedCategoryIds)
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    setSelectedCategories(new Set(selectedCategoryIds))
  }, [selectedCategoryIds])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories/grouped')
      if (response.ok) {
        const data = await response.json()
        setCategoriesByType(data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

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
      const currentResponse = await fetch(`/api/recipes/${recipeId}/categories`)
      const currentCategories = currentResponse.ok ? await currentResponse.json() : []
      const currentIds = new Set(currentCategories.map((c: any) => c.category_id))

      // Determine what to add and remove
      const toAdd = Array.from(selectedCategories).filter(id => !currentIds.has(id))
      const toRemove = Array.from(currentIds).filter((id): id is string => !selectedCategories.has(id as string))

      // Add new categories
      for (const categoryId of toAdd) {
        await fetch(`/api/recipes/${recipeId}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_id: categoryId })
        })
      }

      // Remove unchecked categories
      for (const categoryId of toRemove) {
        await fetch(`/api/recipes/${recipeId}/categories/${categoryId}`, {
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

  const getSelectedCategoriesList = () => {
    const selected: Category[] = []
    Object.values(categoriesByType).forEach(typeData => {
      typeData.categories.forEach(cat => {
        if (selectedCategories.has(cat.id)) {
          selected.push(cat)
        }
      })
    })
    return selected
  }

  return (
    <div className="relative">
      {/* Display selected categories */}
      <div className="flex flex-wrap gap-2 mb-2">
        {getSelectedCategoriesList().map(category => {
          const style = getCategoryStyle(category.color)
          return (
            <span
              key={category.id}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border-2"
              style={{
                backgroundColor: style.backgroundColor,
                borderColor: style.borderColor,
                color: style.color
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: style.backgroundColor,
                  border: `1px solid ${style.borderColor}`
                }}
              />
              {category.name}
            </span>
          )
        })}
      </div>

      {/* Edit button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-primary hover:text-primary transition-all"
      >
        <Tag className="h-4 w-4" />
        Categorieën beheren
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Categorieën Selecteren</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category selection by type */}
            <div className="space-y-6 mb-6">
              {Object.entries(categoriesByType).map(([typeSlug, typeData]) => (
                <div key={typeSlug} className="space-y-3">
                  <h3 className="font-medium text-gray-900">
                    {typeData.type.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {typeData.categories.length === 0 ? (
                      <p className="text-sm text-gray-500 col-span-2">
                        Geen categorieën beschikbaar
                      </p>
                    ) : (
                      typeData.categories.map(category => {
                        const style = getCategoryStyle(category.color)
                        return (
                          <label
                            key={category.id}
                            className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.has(category.id)}
                              onChange={() => toggleCategory(category.id)}
                              className="checkbox h-4 w-4"
                            />
                            <span
                              className="h-3 w-3 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: style.backgroundColor,
                                border: `2px solid ${style.borderColor}`
                              }}
                            />
                            <span className="text-sm truncate">{category.name}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-outline btn-md"
                disabled={isSaving}
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary btn-md"
                disabled={isSaving}
              >
                {isSaving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
