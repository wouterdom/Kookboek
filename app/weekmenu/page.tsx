"use client"

import { useState, useEffect, useCallback } from "react"
import { Trash2, Plus } from "lucide-react"
import { Header } from "@/components/header"
import { WeeklyMenuItemWithRecipe } from "@/types/supabase"
import { ConfirmModal } from "@/components/modal"
import { AddToWeekmenuModal } from "@/components/add-to-weekmenu-modal"
import { useWeekMenu } from "@/contexts/weekmenu-context"
import {
  getCurrentWeekMonday,
  formatDateForDB,
  groupItemsByDay,
} from "@/lib/weekmenu-utils"
import { WeekMenuListView } from "@/components/weekmenu/week-menu-list-view"

export default function WeekmenuPage() {
  const [currentWeek] = useState<Date>(getCurrentWeekMonday()) // Only current week, no navigation
  const [weekMenuItems, setWeekMenuItems] = useState<WeeklyMenuItemWithRecipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showClearModal, setShowClearModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const { refreshBookmarks } = useWeekMenu()

  const loadWeekMenu = useCallback(async () => {
    setIsLoading(true)
    try {
      const weekDate = formatDateForDB(currentWeek)
      const response = await fetch(`/api/weekmenu?week=${weekDate}`)
      if (response.ok) {
        const data = await response.json()
        setWeekMenuItems(data)
      }
    } catch (error) {
      console.error('Error loading weekmenu:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentWeek])

  useEffect(() => {
    loadWeekMenu()
  }, [loadWeekMenu])

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/weekmenu/${itemId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setWeekMenuItems(prev => prev.filter(item => item.id !== itemId))
        // Refresh bookmarks to sync with recipe list
        await refreshBookmarks()
      }
    } catch (error) {
      console.error('Error removing item:', error)
    }
  }

  const handleServingsChange = async (itemId: string, servings: number) => {
    try {
      const response = await fetch(`/api/weekmenu/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servings })
      })
      if (response.ok) {
        setWeekMenuItems(prev =>
          prev.map(item => item.id === itemId ? { ...item, servings } : item)
        )
      }
    } catch (error) {
      console.error('Error updating servings:', error)
    }
  }

  const handleClearWeek = async () => {
    try {
      const weekDate = formatDateForDB(currentWeek)
      const response = await fetch(`/api/weekmenu?week=${weekDate}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setWeekMenuItems([])
        setShowClearModal(false)
        // Refresh bookmarks to sync with recipe list
        await refreshBookmarks()
      }
    } catch (error) {
      console.error('Error clearing week:', error)
    }
  }

  const handleAddRecipe = () => {
    setShowAddModal(true)
  }

  const handleCompleteToggle = async (itemId: string, isCompleted: boolean) => {
    try {
      const response = await fetch(`/api/weekmenu/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: isCompleted })
      })
      if (response.ok) {
        setWeekMenuItems(prev =>
          prev.map(item => item.id === itemId ? { ...item, is_completed: isCompleted } : item)
        )
      }
    } catch (error) {
      console.error('Error updating completion:', error)
    }
  }

  const groupedItems = groupItemsByDay(weekMenuItems)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation */}
      <Header>
        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleAddRecipe}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            title="Recept toevoegen"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowClearModal(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={weekMenuItems.length === 0}
            title="Week legen"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </Header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-3">

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <WeekMenuListView
            groupedItems={groupedItems}
            currentWeek={currentWeek}
            onCompleteToggle={handleCompleteToggle}
            onRemove={handleRemoveItem}
            onServingsChange={handleServingsChange}
            onDayChange={async (itemId, dayOfWeek) => {
              try {
                const response = await fetch(`/api/weekmenu/${itemId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ day_of_week: dayOfWeek })
                })
                if (response.ok) {
                  await loadWeekMenu()
                }
              } catch (error) {
                console.error('Error updating day:', error)
              }
            }}
          />
        )}
      </main>

      {/* Add Recipe Modal */}
      <AddToWeekmenuModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          loadWeekMenu() // Refresh the week menu after adding
        }}
      />

      {/* Clear Week Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearWeek}
        title="Week legen?"
        message="Weet je zeker dat je het complete weekmenu wilt legen? Alle recepten worden verwijderd uit de planning."
        confirmText="Week legen"
        cancelText="Annuleren"
      />
    </div>
  )
}
