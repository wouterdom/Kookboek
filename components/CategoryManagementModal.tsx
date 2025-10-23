"use client"

import { useState } from "react"
import { X, Trash2, Edit2, Check } from "lucide-react"
import { ColorPicker } from "./ColorPicker"
import { CategoryDeleteModal } from "./CategoryDeleteModal"
import { getCategoryStyle } from "@/lib/colors"

interface Category {
  id: string
  name: string
  color: string
}

interface CategoryManagementModalProps {
  categories: Category[]
  onClose: () => void
  onUpdate: () => void
}

export function CategoryManagementModal({ categories, onClose, onUpdate }: CategoryManagementModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
    setEditColor(category.color)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditColor("")
  }

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return

    try {
      const response = await fetch(`/api/categories/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor })
      })

      if (response.ok) {
        onUpdate()
        cancelEdit()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update category')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Failed to update category')
    }
  }

  const handleDelete = async () => {
    if (!deleteCategory) return

    try {
      const response = await fetch(`/api/categories/${deleteCategory.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onUpdate()
        setDeleteCategory(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Categorieën beheren</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                {editingId === category.id ? (
                  <>
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="Categorie naam"
                      />
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Kies een kleur:</p>
                        <ColorPicker
                          selectedColor={editColor}
                          onColorSelect={setEditColor}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="Opslaan"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="Annuleren"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="px-4 py-2 rounded-full text-sm font-medium"
                      style={getCategoryStyle(category.color)}
                    >
                      {category.name}
                    </div>
                    <div className="flex-1" />
                    <button
                      onClick={() => startEdit(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Bewerken"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setDeleteCategory(category)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Verwijderen"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90"
            >
              Sluiten
            </button>
          </div>
        </div>
      </div>

      {deleteCategory && (
        <CategoryDeleteModal
          categoryName={deleteCategory.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteCategory(null)}
        />
      )}
    </>
  )
}
