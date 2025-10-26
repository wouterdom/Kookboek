"use client"

import { useState, useEffect } from "react"
import {
  ShoppingCart,
  Trash2,
  LayoutGrid,
  List,
  Plus
} from "lucide-react"
import { Header } from "@/components/header"
import { ExpandedView } from "@/components/groceries/expanded-view"
import { CompactView } from "@/components/groceries/compact-view"
import { AddItemModal } from "@/components/groceries/add-item-modal"
import { BulkAddItemsModal } from "@/components/groceries/bulk-add-items-modal"
import { ClearListModal } from "@/components/groceries/clear-list-modal"
import { Modal } from "@/components/modal"
import type { GroceryCategory, GroceryItemData } from "@/components/groceries/expanded-view"
import { categorizeIngredient, getCategoryIdFromSlug } from "@/lib/ingredient-categorizer"

type ViewMode = "expanded" | "compact"

export default function BoodschappenPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("expanded")
  const [categories, setCategories] = useState<GroceryCategory[]>([])
  const [items, setItems] = useState<GroceryItemData[]>([])
  const [recipes, setRecipes] = useState<Map<string, { id: string; title: string }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkAddModal, setShowBulkAddModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<string | undefined>()
  const [recentItems, setRecentItems] = useState<string[]>([])
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    message: "",
    type: "info" as "info" | "success" | "error" | "warning"
  })

  // Load data on mount
  useEffect(() => {
    loadCategories()
    loadItems()
    loadRecentItems()
  }, [])

  // Load categories
  const loadCategories = async () => {
    try {
      const res = await fetch("/api/groceries/categories")
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Failed to load categories:", error)
    }
  }

  // Load grocery items
  const loadItems = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/groceries")
      if (res.ok) {
        const data = await res.json()

        // Extract items from grouped data
        const allItems: GroceryItemData[] = []
        const recipeMap = new Map<string, { id: string; title: string }>()

        data.grouped?.forEach((group: any) => {
          group.items.forEach((item: any) => {
            allItems.push({
              id: item.id,
              name: item.name,
              amount: item.amount,
              is_checked: item.is_checked,
              category_id: item.category?.id,
              from_recipe_id: item.from_recipe_id
            })

            // Build recipe map
            if (item.recipe) {
              recipeMap.set(item.recipe.id, {
                id: item.recipe.id,
                title: item.recipe.title
              })
            }
          })
        })

        setItems(allItems)
        setRecipes(recipeMap)
      }
    } catch (error) {
      console.error("Failed to load items:", error)
      setModalConfig({
        isOpen: true,
        message: "Kan boodschappenlijst niet laden",
        type: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  // Load recent items from localStorage
  const loadRecentItems = () => {
    try {
      const stored = localStorage.getItem("recent-grocery-items")
      if (stored) {
        setRecentItems(JSON.parse(stored))
      }
    } catch (error) {
      console.error("Failed to load recent items:", error)
    }
  }

  // Save recent item
  const saveRecentItem = (name: string) => {
    try {
      const updated = [name, ...recentItems.filter(i => i !== name)].slice(0, 10)
      setRecentItems(updated)
      localStorage.setItem("recent-grocery-items", JSON.stringify(updated))
    } catch (error) {
      console.error("Failed to save recent item:", error)
    }
  }

  // Check/uncheck item
  const handleItemCheck = async (itemId: string, checked: boolean) => {
    try {
      const res = await fetch(`/api/groceries/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_checked: checked })
      })

      if (res.ok) {
        setItems(items.map(item =>
          item.id === itemId ? { ...item, is_checked: checked } : item
        ))
      }
    } catch (error) {
      console.error("Failed to update item:", error)
    }
  }

  // Delete item
  const handleItemDelete = async (itemId: string) => {
    try {
      const res = await fetch(`/api/groceries/${itemId}`, {
        method: "DELETE"
      })

      if (res.ok) {
        setItems(items.filter(item => item.id !== itemId))
      }
    } catch (error) {
      console.error("Failed to delete item:", error)
    }
  }

  // Add new item
  const handleAddItem = async (newItem: {
    name: string
    amount?: string
    category_id: string
  }) => {
    try {
      const res = await fetch("/api/groceries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      })

      if (res.ok) {
        const item = await res.json()
        setItems([...items, {
          id: item.id,
          name: item.name,
          amount: item.amount,
          is_checked: false,
          category_id: item.category?.id
        }])
        saveRecentItem(newItem.name)
      }
    } catch (error) {
      console.error("Failed to add item:", error)
      setModalConfig({
        isOpen: true,
        message: "Kan item niet toevoegen",
        type: "error"
      })
    }
  }

  // Bulk add items
  const handleBulkAddItems = async (newItems: Array<{
    name: string
    amount?: string
    category_id: string
  }>) => {
    try {
      // Add all items in parallel
      const promises = newItems.map(item =>
        fetch("/api/groceries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        }).then(res => res.json())
      )

      const addedItems = await Promise.all(promises)

      // Update state with all new items
      const newItemsData = addedItems.map(item => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        is_checked: false,
        category_id: item.category?.id
      }))

      setItems([...items, ...newItemsData])

      // Save recent items
      newItems.forEach(item => saveRecentItem(item.name))
    } catch (error) {
      console.error("Failed to add items:", error)
      setModalConfig({
        isOpen: true,
        message: "Kan items niet toevoegen",
        type: "error"
      })
    }
  }

  // Clear list
  const handleClearList = async (mode: "checked" | "all") => {
    try {
      const res = await fetch(`/api/groceries/clear?mode=${mode}`, {
        method: "DELETE"
      })

      if (res.ok) {
        if (mode === "all") {
          setItems([])
        } else {
          setItems(items.filter(item => !item.is_checked))
        }
        setModalConfig({
          isOpen: true,
          message: mode === "all" ? "Lijst geleegd" : "Afgevinkte items verwijderd",
          type: "success"
        })
      }
    } catch (error) {
      console.error("Failed to clear list:", error)
      setModalConfig({
        isOpen: true,
        message: "Kan lijst niet legen",
        type: "error"
      })
    }
  }


  // Update category
  const handleUpdateCategory = async (categoryId: string, updates: Partial<GroceryCategory>) => {
    try {
      const res = await fetch(`/api/groceries/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        setCategories(categories.map(cat =>
          cat.id === categoryId ? { ...cat, ...updates } : cat
        ))
      }
    } catch (error) {
      console.error("Failed to update category:", error)
    }
  }

  // Add category
  const handleAddCategory = async (newCategory: {
    name: string
    icon: string
    color: string
  }) => {
    try {
      const res = await fetch("/api/groceries/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCategory,
          slug: newCategory.name.toLowerCase().replace(/\s+/g, "-"),
          order_index: categories.length + 1,
          is_system: false
        })
      })

      if (res.ok) {
        const category = await res.json()
        setCategories([...categories, category])
      }
    } catch (error) {
      console.error("Failed to add category:", error)
    }
  }

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const res = await fetch(`/api/groceries/categories/${categoryId}`, {
        method: "DELETE"
      })

      if (res.ok) {
        setCategories(categories.filter(cat => cat.id !== categoryId))
      }
    } catch (error) {
      console.error("Failed to delete category:", error)
    }
  }

  // Reorder categories
  const handleReorderCategories = async (reordered: GroceryCategory[]) => {
    setCategories(reordered)
    // TODO: Implement batch update endpoint
  }

  // Show add modal with category preselection
  const handleShowAddModal = (categoryId?: string) => {
    setPreselectedCategoryId(categoryId)
    setShowAddModal(true)
  }

  const checkedCount = items.filter(item => item.is_checked).length
  const totalCount = items.length

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header with Navigation */}
      <Header>
        {/* View Toggle */}
        <div className="inline-flex items-center rounded-lg bg-muted p-0.5 no-print">
          <button
            onClick={() => setViewMode("expanded")}
            className={`flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "expanded"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Uitgebreid</span>
          </button>
          <button
            onClick={() => setViewMode("compact")}
            className={`flex items-center gap-1.5 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === "compact"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Compact</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          <button
            onClick={() => setShowBulkAddModal(true)}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            title="Toevoegen"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={() => setShowClearModal(true)}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
            title="Legen"
          >
            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </Header>

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-4 py-6">
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground opacity-50" />
            <h2 className="mt-4 font-[Montserrat] text-xl font-semibold">
              Je boodschappenlijst is leeg
            </h2>
            <p className="mt-2 text-muted-foreground">
              Voeg items toe om te beginnen
            </p>
            <button
              onClick={() => handleShowAddModal()}
              className="btn btn-primary mt-6"
            >
              <Plus className="h-4 w-4" />
              Item toevoegen
            </button>
          </div>
        ) : viewMode === "expanded" ? (
          <ExpandedView
            categories={categories}
            items={items}
            recipes={recipes}
            onItemCheck={handleItemCheck}
            onItemDelete={handleItemDelete}
            onAddItem={handleShowAddModal}
          />
        ) : (
          <CompactView
            categories={categories}
            items={items}
            onItemCheck={handleItemCheck}
            onAddItem={handleShowAddModal}
          />
        )}
      </main>

      {/* Floating Action Button (mobile) */}
      {items.length > 0 && (
        <button
          onClick={() => handleShowAddModal()}
          className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110 sm:hidden no-print"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Modals */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setPreselectedCategoryId(undefined)
        }}
        onAdd={handleAddItem}
        categories={categories}
        preselectedCategoryId={preselectedCategoryId}
        recentItems={recentItems}
      />

      <BulkAddItemsModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        onAdd={handleBulkAddItems}
      />

      <ClearListModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onClear={handleClearList}
        checkedCount={checkedCount}
        totalCount={totalCount}
      />

      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </>
  )
}
