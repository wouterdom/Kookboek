"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, List, Trash2, Plus } from "lucide-react"
import { Header } from "@/components/header"
import { WeeklyMenuItemWithRecipe } from "@/types/supabase"
import { ConfirmModal } from "@/components/modal"
import { AddToWeekmenuModal } from "@/components/add-to-weekmenu-modal"
import { useWeekMenu } from "@/contexts/weekmenu-context"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  rectIntersection,
  pointerWithin,
} from '@dnd-kit/core'
import {
  getCurrentWeekMonday,
  formatDateForDB,
  groupItemsByDay,
} from "@/lib/weekmenu-utils"
import { WeekMenuDayColumn } from "@/components/weekmenu/week-menu-day-column"
import { WeekMenuListView } from "@/components/weekmenu/week-menu-list-view"
import { WeekMenuUnassigned } from "@/components/weekmenu/week-menu-unassigned"

type ViewMode = 'week' | 'list'

export default function WeekmenuPage() {
  const [currentWeek] = useState<Date>(getCurrentWeekMonday()) // Only current week, no navigation
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [weekMenuItems, setWeekMenuItems] = useState<WeeklyMenuItemWithRecipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showClearModal, setShowClearModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const { refreshBookmarks } = useWeekMenu()

  // Configure sensors for drag & drop - optimized for both desktop and mobile
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Desktop drag with mouse - very responsive
      activationConstraint: {
        distance: 3, // 3px of movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      // Mobile drag with touch - optimized for better responsiveness
      activationConstraint: {
        delay: 100, // 100ms hold before drag starts on touch
        tolerance: 5, // 5px tolerance for touch movement
      },
    })
  )

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    console.log('Drag started:', event.active.id)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    setOverId(over?.id as string || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    console.log('Drag ended:', { active: active.id, over: over?.id })

    // Use overId from handleDragOver if over is null
    const targetId = over?.id || overId

    if (!targetId) {
      console.log('No drop target')
      return
    }

    const activeItem = weekMenuItems.find(item => item.id === active.id)
    if (!activeItem) {
      console.log('Active item not found')
      return
    }

    // Extract day from targetId (format: "day-0" to "day-6" or "unassigned")
    const targetIdStr = targetId as string
    let newDayOfWeek: number | null = null

    if (targetIdStr.startsWith('day-')) {
      newDayOfWeek = parseInt(targetIdStr.split('-')[1])
      console.log(`Dropping into day ${newDayOfWeek}`)
    } else if (targetIdStr === 'unassigned') {
      newDayOfWeek = null
      console.log('Dropping into unassigned')
    } else {
      console.log('Drop target is another item, ignoring')
      return // Dropped on another item, not a day column
    }

    // Only update if day changed
    if (activeItem.day_of_week === newDayOfWeek) {
      console.log('Day unchanged, skipping update')
      return
    }

    console.log(`Moving item from day ${activeItem.day_of_week} to day ${newDayOfWeek}`)

    try {
      const response = await fetch(`/api/weekmenu/${activeItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_of_week: newDayOfWeek })
      })

      if (response.ok) {
        console.log('Successfully moved item')
        await loadWeekMenu()
      } else {
        console.error('Failed to move item:', response.status)
      }
    } catch (error) {
      console.error('Error moving item:', error)
    }
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
        {/* View Toggle */}
        <div className="flex items-center gap-0.5 bg-[oklch(var(--muted))] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'week'
                ? 'bg-white shadow-sm'
                : 'text-[oklch(var(--muted-foreground))] hover:text-[oklch(var(--foreground))]'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Week</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-white shadow-sm'
                : 'text-[oklch(var(--muted-foreground))] hover:text-[oklch(var(--foreground))]'
            }`}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lijst</span>
          </button>
        </div>

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
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {viewMode === 'week' ? (
              <>
                {/* Desktop Week Grid */}
                <div className="hidden md:grid md:grid-cols-7 gap-3 mb-4">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => (
                    <WeekMenuDayColumn
                      key={day}
                      day={day}
                      currentWeek={currentWeek}
                      items={groupedItems[day]}
                      onRemove={handleRemoveItem}
                      onServingsChange={handleServingsChange}
                    />
                  ))}
                </div>

                {/* Mobile Week View - Drag & drop enabled */}
                <div className="md:hidden space-y-2 mb-4">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => (
                    <WeekMenuDayColumn
                      key={day}
                      day={day}
                      currentWeek={currentWeek}
                      items={groupedItems[day]}
                      onRemove={handleRemoveItem}
                      onServingsChange={handleServingsChange}
                      compact
                    />
                  ))}
                </div>

                {/* Unassigned Section */}
                {groupedItems.unassigned.length > 0 && (
                  <WeekMenuUnassigned
                    items={groupedItems.unassigned}
                    onRemove={handleRemoveItem}
                    onServingsChange={handleServingsChange}
                  />
                )}
              </>
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

            {/* Drag Overlay */}
            <DragOverlay>
              {activeId ? (() => {
                const activeDragItem = weekMenuItems.find(item => item.id === activeId)
                return activeDragItem ? (
                  <div className="bg-white border-2 border-primary rounded-lg p-2 shadow-lg">
                    <div className="font-semibold text-xs">
                      {activeDragItem.recipe?.title || (activeDragItem as any).custom_title}
                    </div>
                  </div>
                ) : null
              })() : null}
            </DragOverlay>
          </DndContext>
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
