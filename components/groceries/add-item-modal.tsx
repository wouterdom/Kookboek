"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GroceryCategory } from "./expanded-view"

export interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (item: {
    name: string
    amount?: string
    category_id: string
  }) => void
  categories: GroceryCategory[]
  preselectedCategoryId?: string
  recentItems?: string[]
}

export function AddItemModal({
  isOpen,
  onClose,
  onAdd,
  categories,
  preselectedCategoryId,
  recentItems = []
}: AddItemModalProps) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState(
    preselectedCategoryId || categories[0]?.id || ""
  )

  // Update category when preselected changes
  useEffect(() => {
    if (preselectedCategoryId) {
      setCategoryId(preselectedCategoryId)
    }
  }, [preselectedCategoryId])

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen])

  const handleClose = () => {
    setName("")
    setAmount("")
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) return

    onAdd({
      name: name.trim(),
      amount: amount.trim() || undefined,
      category_id: categoryId
    })

    handleClose()
  }

  const handleRecentClick = (recentItem: string) => {
    setName(recentItem)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <h3 className="font-[Montserrat] text-lg font-bold">Item toevoegen</h3>
          <button
            onClick={handleClose}
            className="rounded-full p-1 transition-colors hover:bg-gray-100"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Category selector */}
          <div>
            <label className="mb-2 block text-sm font-medium">Categorie</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input w-full"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Name input */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Naam <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Melk"
              className="input w-full"
              autoFocus
            />
          </div>

          {/* Amount input */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Hoeveelheid (optioneel)
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="bijv. 1 liter"
              className="input w-full"
            />
          </div>

          {/* Recent items */}
          {recentItems.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Recent gebruikt
              </label>
              <div className="flex flex-wrap gap-2">
                {recentItems.slice(0, 6).map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleRecentClick(item)}
                    className="btn btn-outline btn-sm"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="flex-1"
            >
              Toevoegen
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
