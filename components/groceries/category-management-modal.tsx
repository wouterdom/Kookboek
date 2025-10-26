"use client"

import { useState } from "react"
import { GripVertical, Palette, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GroceryCategory } from "./expanded-view"
import { ColorPicker } from "@/components/ColorPicker"

export interface CategoryManagementModalProps {
  isOpen: boolean
  onClose: () => void
  categories: GroceryCategory[]
  onUpdateCategory: (categoryId: string, updates: Partial<GroceryCategory>) => void
  onAddCategory: (category: { name: string; icon: string; color: string }) => void
  onDeleteCategory?: (categoryId: string) => void
  onReorderCategories: (categories: GroceryCategory[]) => void
}

export function CategoryManagementModal({
  isOpen,
  onClose,
  categories,
  onUpdateCategory,
  onAddCategory,
  onDeleteCategory,
  onReorderCategories
}: CategoryManagementModalProps) {
  const [editingColorId, setEditingColorId] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState(categories)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryIcon, setNewCategoryIcon] = useState("📦")
  const [newCategoryColor, setNewCategoryColor] = useState("#6B7280")
  const [showAddForm, setShowAddForm] = useState(false)

  // Update local categories when prop changes
  if (categories !== localCategories && !showAddForm) {
    setLocalCategories(categories)
  }

  const systemCategories = localCategories.filter(c => c.slug !== 'overige')
  const customCategories = localCategories.filter(c => !systemCategories.includes(c))

  const handleSave = () => {
    onReorderCategories(localCategories)
    onClose()
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return

    onAddCategory({
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      color: newCategoryColor
    })

    setNewCategoryName("")
    setNewCategoryIcon("📦")
    setNewCategoryColor("#6B7280")
    setShowAddForm(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <h3 className="font-[Montserrat] text-lg font-bold">
            Boodschappen Categorieën
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 transition-colors hover:bg-gray-100"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* System categories */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              Standaard categorieën
            </h4>
            <div className="space-y-2">
              {systemCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 rounded-lg border border-border p-2"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-xl">{category.icon}</span>
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => {
                      onUpdateCategory(category.id, { name: e.target.value })
                    }}
                    className="input flex-1"
                  />
                  <div className="relative">
                    <button
                      onClick={() => setEditingColorId(
                        editingColorId === category.id ? null : category.id
                      )}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <Palette className="h-4 w-4" />
                      <div
                        className="h-4 w-4 rounded border border-border"
                        style={{ backgroundColor: category.color }}
                      />
                    </button>
                    {editingColorId === category.id && (
                      <div className="absolute right-0 top-full z-10 mt-2">
                        <ColorPicker
                          selectedColor={category.color}
                          onColorSelect={(color) => {
                            onUpdateCategory(category.id, { color })
                            setEditingColorId(null)
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom categories */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              Eigen categorieën
            </h4>
            <div className="space-y-2">
              {customCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-2 rounded-lg border border-border p-2"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-xl">{category.icon}</span>
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => {
                      onUpdateCategory(category.id, { name: e.target.value })
                    }}
                    className="input flex-1"
                  />
                  {onDeleteCategory && (
                    <button
                      onClick={() => onDeleteCategory(category.id)}
                      className="btn btn-error btn-sm"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add new category form */}
              {showAddForm ? (
                <div className="rounded-lg border-2 border-dashed border-primary bg-primary/5 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      placeholder="📦"
                      className="input w-16 text-center text-xl"
                      maxLength={2}
                    />
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Naam van categorie"
                      className="input flex-1"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddForm(false)
                        setNewCategoryName("")
                        setNewCategoryIcon("📦")
                      }}
                      className="flex-1"
                    >
                      Annuleren
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim()}
                      className="flex-1"
                    >
                      Toevoegen
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn btn-outline w-full"
                >
                  <Plus className="h-4 w-4" />
                  Nieuwe categorie
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border p-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuleren
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Opslaan
          </Button>
        </div>
      </div>
    </div>
  )
}
