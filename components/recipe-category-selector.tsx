"use client"

import { useState, useEffect, useMemo } from "react"
import { X, Plus, Tag, Search } from "lucide-react"
import { Category, CategoryType, CategoriesByType } from "@/types/supabase"
import { getCategoryStyle } from "@/lib/colors"

interface RecipeCategorySelectorProps {
  recipeSlug: string
  selectedCategoryIds: string[]
  onUpdate: () => void
}

export function RecipeCategorySelector({
  recipeSlug,
  selectedCategoryIds,
  onUpdate
}: RecipeCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [categoriesByType, setCategoriesByType] = useState<CategoriesByType>({})
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(selectedCategoryIds)
  )
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    setSelectedCategories(new Set(selectedCategoryIds))
  }, [selectedCategoryIds])

  useEffect(() => {
    // Clear search when modal opens
    if (isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

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
      // Send all selected category IDs in a single batch request
      const response = await fetch(`/api/recipes/${recipeSlug}/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_ids: Array.from(selectedCategories)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update categories')
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

      // Always include the type, even if no categories match
      filtered[typeSlug] = {
        type: typeData.type,
        categories: matchingCategories
      }
    })

    return filtered
  }, [categoriesByType, searchQuery])

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-lg bg-white shadow-xl flex flex-col">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b">
              <h2 className="text-lg font-bold">Categorieën Selecteren</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Input - Fixed */}
            <div className="flex-shrink-0 px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Zoek categorieën..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Category selection by type - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-4">
              {Object.entries(filteredCategoriesByType).map(([typeSlug, typeData]) => (
                <div key={typeSlug} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    {typeData.type.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {typeData.categories.length === 0 ? (
                      <p className="text-xs text-gray-500 col-span-2 italic py-1">
                        {searchQuery.trim()
                          ? `Geen resultaten voor "${searchQuery}"`
                          : 'Geen categorieën beschikbaar'
                        }
                      </p>
                    ) : (
                      typeData.categories.map(category => {
                        const style = getCategoryStyle(category.color)
                        return (
                          <label
                            key={category.id}
                            className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.has(category.id)}
                              onChange={() => toggleCategory(category.id)}
                              className="checkbox h-3.5 w-3.5"
                            />
                            <span
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: style.backgroundColor,
                                border: `2px solid ${style.borderColor}`
                              }}
                            />
                            <span className="text-xs truncate">{category.name}</span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>

            {/* Actions - Fixed Footer */}
            <div className="flex-shrink-0 flex gap-2 p-3 border-t bg-white rounded-b-lg">
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-outline text-sm px-4 py-2 flex-1"
                disabled={isSaving}
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary text-sm px-4 py-2 flex-1"
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
