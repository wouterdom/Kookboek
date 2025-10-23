"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2, Edit2 } from "lucide-react"
import { CategoryType } from "@/types/supabase"

interface CategoryTypeManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function CategoryTypeManagementModal({
  isOpen,
  onClose,
  onUpdate
}: CategoryTypeManagementModalProps) {
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [newTypeDescription, setNewTypeDescription] = useState("")
  const [editingType, setEditingType] = useState<CategoryType | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCategoryTypes()
    }
  }, [isOpen])

  const loadCategoryTypes = async () => {
    try {
      const response = await fetch('/api/category-types')
      if (response.ok) {
        const data = await response.json()
        setCategoryTypes(data)
      }
    } catch (error) {
      console.error('Error loading category types:', error)
    }
  }

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return

    setIsLoading(true)
    try {
      const slug = newTypeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

      const response = await fetch('/api/category-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTypeName.trim(),
          slug,
          description: newTypeDescription.trim() || null,
          allow_multiple: true,
          order_index: categoryTypes.length + 1
        })
      })

      if (response.ok) {
        setNewTypeName("")
        setNewTypeDescription("")
        loadCategoryTypes()
        onUpdate()
      } else {
        const error = await response.json()
        alert(error.error || 'Fout bij aanmaken categorietype')
      }
    } catch (error) {
      console.error('Error creating category type:', error)
      alert('Fout bij aanmaken categorietype')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteType = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit categorietype wilt verwijderen? Alle labels binnen dit type worden ook verwijderd.')) {
      return
    }

    try {
      const response = await fetch(`/api/category-types/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadCategoryTypes()
        onUpdate()
      } else {
        alert('Fout bij verwijderen categorietype')
      }
    } catch (error) {
      console.error('Error deleting category type:', error)
      alert('Fout bij verwijderen categorietype')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Beheer Categorietypes</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Add New Type */}
        <div className="mb-6 rounded-lg border border-dashed border-gray-300 p-4">
          <h3 className="mb-3 font-medium">Nieuw Categorietype</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Naam (bijv. 'Keuken', 'Moeilijkheidsgraad')"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="input w-full"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateType()}
            />
            <input
              type="text"
              placeholder="Beschrijving (optioneel)"
              value={newTypeDescription}
              onChange={(e) => setNewTypeDescription(e.target.value)}
              className="input w-full"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateType()}
            />
            <button
              onClick={handleCreateType}
              disabled={!newTypeName.trim() || isLoading}
              className="btn btn-primary btn-sm w-full"
            >
              <Plus className="h-4 w-4" />
              Categorietype Toevoegen
            </button>
          </div>
        </div>

        {/* Existing Types */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">Bestaande Categorietypes</h3>
          {categoryTypes.length === 0 ? (
            <p className="text-sm text-gray-500">Geen categorietypes gevonden</p>
          ) : (
            <div className="space-y-2">
              {categoryTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">{type.name}</div>
                    {type.description && (
                      <div className="text-sm text-gray-500">{type.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteType(type.id)}
                      className="rounded p-2 text-red-600 hover:bg-red-50"
                      title="Verwijderen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
