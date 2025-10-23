"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2, Edit2 } from "lucide-react"
import { Category, CategoryType } from "@/types/supabase"
import { CATEGORY_LABEL_COLOR } from "@/lib/colors"

interface CategoryLabelManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  categoryType: CategoryType
}

export function CategoryLabelManagementModal({
  isOpen,
  onClose,
  onUpdate,
  categoryType
}: CategoryLabelManagementModalProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")
  const [editingLabel, setEditingLabel] = useState<Category | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen, categoryType.id])

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/categories?type=${categoryType.slug}`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: CATEGORY_LABEL_COLOR.value,
          type_id: categoryType.id
        })
      })

      if (response.ok) {
        setNewLabelName("")
        loadCategories()
        onUpdate()
      } else {
        const error = await response.json()
        alert(error.error || 'Fout bij aanmaken label')
      }
    } catch (error) {
      console.error('Error creating label:', error)
      alert('Fout bij aanmaken label')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteLabel = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit label wilt verwijderen?')) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadCategories()
        onUpdate()
      } else {
        alert('Fout bij verwijderen label')
      }
    } catch (error) {
      console.error('Error deleting label:', error)
      alert('Fout bij verwijderen label')
    }
  }

  const handleUpdateLabel = async (label: Category) => {
    if (!label.name.trim()) return

    try {
      const response = await fetch(`/api/categories/${label.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: label.name.trim()
        })
      })

      if (response.ok) {
        setEditingLabel(null)
        loadCategories()
        onUpdate()
      } else {
        alert('Fout bij updaten label')
      }
    } catch (error) {
      console.error('Error updating label:', error)
      alert('Fout bij updaten label')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Beheer Labels</h2>
            <p className="text-sm text-gray-600">{categoryType.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Add New Label */}
        <div className="mb-6 rounded-lg border border-dashed border-gray-300 p-4">
          <h3 className="mb-3 font-medium">Nieuw Label</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Label naam"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="input flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
            />
            <button
              onClick={handleCreateLabel}
              disabled={!newLabelName.trim() || isLoading}
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4" />
              Toevoegen
            </button>
          </div>
        </div>

        {/* Existing Labels */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-700">Bestaande Labels</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">Geen labels gevonden</p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
                >
                  {editingLabel?.id === category.id ? (
                    <div className="flex flex-1 items-center gap-3">
                      <input
                        type="text"
                        value={editingLabel.name}
                        onChange={(e) =>
                          setEditingLabel({ ...editingLabel, name: e.target.value })
                        }
                        className="input flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateLabel(editingLabel)
                          if (e.key === 'Escape') setEditingLabel(null)
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateLabel(editingLabel)}
                        className="btn btn-primary btn-sm"
                      >
                        Opslaan
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: CATEGORY_LABEL_COLOR.value,
                            border: `2px solid ${CATEGORY_LABEL_COLOR.borderColor}`
                          }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingLabel(category)}
                          className="rounded p-2 text-gray-600 hover:bg-gray-100"
                          title="Bewerken"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLabel(category.id)}
                          className="rounded p-2 text-red-600 hover:bg-red-50"
                          title="Verwijderen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
