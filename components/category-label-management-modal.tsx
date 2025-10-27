"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2, Edit2, Palette, Search } from "lucide-react"
import { Category, CategoryType } from "@/types/supabase"
import { DEFAULT_CATEGORY_COLOR } from "@/lib/colors"
import { ColorPicker } from "@/components/ColorPicker"
import { Modal } from "@/components/modal"

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
  const [newLabelColor, setNewLabelColor] = useState(DEFAULT_CATEGORY_COLOR)
  const [editingLabel, setEditingLabel] = useState<Category | null>(null)
  const [showColorPickerFor, setShowColorPickerFor] = useState<'new' | string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

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
          color: newLabelColor,
          type_id: categoryType.id
        })
      })

      if (response.ok) {
        setNewLabelName("")
        setNewLabelColor(DEFAULT_CATEGORY_COLOR)
        loadCategories()
        onUpdate()
      } else {
        const error = await response.json()
        setErrorMessage(error.error || 'Fout bij aanmaken label')
      }
    } catch (error) {
      console.error('Error creating label:', error)
      setErrorMessage('Fout bij aanmaken label')
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
          name: label.name.trim(),
          color: label.color
        })
      })

      if (response.ok) {
        setEditingLabel(null)
        loadCategories()
        onUpdate()
      } else {
        setErrorMessage('Fout bij updaten label')
      }
    } catch (error) {
      console.error('Error updating label:', error)
      setErrorMessage('Fout bij updaten label')
    }
  }

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold">Beheer Labels</h2>
            <p className="text-xs text-gray-600">{categoryType.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {/* Add New Label */}
          <div className="mb-4 rounded-lg border border-dashed border-gray-300 p-3">
            <h3 className="mb-2 text-sm font-medium">Nieuw Label</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Label naam"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="input flex-1 text-sm h-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateLabel()}
                />
                <button
                  onClick={() => setShowColorPickerFor('new')}
                  className="rounded-lg p-2 border-2 hover:border-gray-400 transition-all flex-shrink-0"
                  style={{ backgroundColor: newLabelColor }}
                  title="Kies kleur"
                >
                  <Palette className="h-4 w-4" style={{ color: '#ffffff' }} />
                </button>
                <button
                  onClick={handleCreateLabel}
                  disabled={!newLabelName.trim() || isLoading}
                  className="btn btn-primary text-xs px-3 h-9 flex-shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Toevoegen
                </button>
              </div>
              {showColorPickerFor === 'new' && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Kies een kleur</span>
                    <button
                      onClick={() => setShowColorPickerFor(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ColorPicker
                    selectedColor={newLabelColor}
                    onColorSelect={(color) => {
                      setNewLabelColor(color)
                      setShowColorPickerFor(null)
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Zoek labels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 text-sm h-9 w-full"
              />
            </div>
          </div>

          {/* Existing Labels */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Bestaande Labels</h3>
              <span className="text-xs text-gray-500">
                {filteredCategories.length} van {categories.length}
              </span>
            </div>
            {categories.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">Geen labels gevonden</p>
            ) : filteredCategories.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">Geen labels gevonden voor "{searchQuery}"</p>
            ) : (
              <div className="space-y-1.5">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-lg border p-2 hover:bg-gray-50"
                  >
                    {editingLabel?.id === category.id ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingLabel.name}
                            onChange={(e) =>
                              setEditingLabel({ ...editingLabel, name: e.target.value })
                            }
                            className="input flex-1 text-sm h-9"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateLabel(editingLabel)
                              if (e.key === 'Escape') setEditingLabel(null)
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => setShowColorPickerFor(category.id)}
                            className="rounded-lg p-2 border-2 hover:border-gray-400 transition-all flex-shrink-0"
                            style={{ backgroundColor: editingLabel.color }}
                            title="Kies kleur"
                          >
                            <Palette className="h-4 w-4" style={{ color: '#ffffff' }} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingLabel(null)}
                            className="btn btn-outline text-xs px-3 h-8 flex-1"
                          >
                            Annuleren
                          </button>
                          <button
                            onClick={() => handleUpdateLabel(editingLabel)}
                            className="btn btn-primary text-xs px-3 h-8 flex-1"
                          >
                            Opslaan
                          </button>
                        </div>
                        {showColorPickerFor === category.id && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium">Kies een kleur</span>
                              <button
                                onClick={() => setShowColorPickerFor(null)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <ColorPicker
                              selectedColor={editingLabel.color}
                              onColorSelect={(color) => {
                                setEditingLabel({ ...editingLabel, color })
                                setShowColorPickerFor(null)
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: category.color,
                              border: `2px solid ${category.color}`
                            }}
                          />
                          <span className="text-sm font-medium truncate">{category.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingLabel(category)}
                            className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                            title="Bewerken"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLabel(category.id)}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            title="Verwijderen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Error Modal */}
      {errorMessage && (
        <Modal
          isOpen={!!errorMessage}
          onClose={() => setErrorMessage(null)}
          message={errorMessage}
          type="error"
        />
      )}
    </div>
  )
}
