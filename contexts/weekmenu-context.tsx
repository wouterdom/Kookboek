"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentWeekMonday, formatDateForDB } from '@/lib/week-utils'
import type { WeeklyMenuItem as DBWeeklyMenuItem, WeeklyMenuItemInsert } from '@/types/supabase'

/**
 * WeekMenu Context
 *
 * Manages global state for weekmenu items and bookmark synchronization
 * Ensures bookmark icons are synchronized across all views (homepage, detail page, search, etc.)
 */

export interface WeekMenuItem {
  id: string
  recipe_id: string
  week_date: string
  day_of_week: number | null
  servings: number
  is_completed: boolean
  order_index: number
  created_at: string
}

interface WeekMenuContextType {
  // State
  bookmarkedRecipeIds: Set<string>
  isLoading: boolean
  currentWeek: Date

  // Actions
  addToWeekMenu: (recipeId: string, onSuccess?: (item: WeekMenuItem) => void) => Promise<void>
  removeFromWeekMenu: (recipeId: string) => Promise<void>
  isRecipeInWeekMenu: (recipeId: string) => boolean
  refreshBookmarks: () => Promise<void>
  clearWeek: (weekDate: Date) => Promise<void>
  setCurrentWeek: (date: Date) => void
}

const WeekMenuContext = createContext<WeekMenuContextType | undefined>(undefined)

export function WeekMenuProvider({ children }: { children: React.ReactNode }) {
  const [bookmarkedRecipeIds, setBookmarkedRecipeIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState<Date>(getCurrentWeekMonday())
  const supabase = createClient()

  // Load bookmarked recipes on mount and when week changes
  const refreshBookmarks = useCallback(async () => {
    try {
      setIsLoading(true)

      // Get all recipes in the current week (regardless of day assignment)
      const weekDate = formatDateForDB(currentWeek)

      // Use API route instead of direct Supabase call (avoids CORS)
      const response = await fetch(`/api/weekmenu?week=${weekDate}`)

      if (!response.ok) {
        console.error('Error fetching weekmenu items:', await response.text())
        return
      }

      const data = await response.json()

      const recipeIds = new Set(
        (data || [])
          .map((item: any) => item.recipe_id)
          .filter((id: string | null): id is string => id !== null)
      )
      setBookmarkedRecipeIds(recipeIds)
    } catch (error) {
      console.error('Error refreshing bookmarks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentWeek])

  useEffect(() => {
    refreshBookmarks()
  }, [refreshBookmarks])

  // Add recipe to weekmenu
  const addToWeekMenu = useCallback(async (
    recipeId: string,
    onSuccess?: (item: WeekMenuItem) => void
  ) => {
    try {
      const weekDate = formatDateForDB(currentWeek)

      // Check if already exists
      const { data: existing } = await supabase
        .from('weekly_menu_items')
        .select('*')
        .eq('recipe_id', recipeId)
        .eq('week_date', weekDate)
        .maybeSingle()

      if (existing) {
        console.log('Recipe already in weekmenu')
        return
      }

      // Get recipe default servings
      const { data: recipe } = await supabase
        .from('recipes')
        .select('servings_default')
        .eq('id', recipeId)
        .single()

      const typedRecipe = recipe as { servings_default: number } | null

      // Insert into weekmenu (no day assigned yet)
      const insertData: WeeklyMenuItemInsert = {
        recipe_id: recipeId,
        week_date: weekDate,
        day_of_week: null, // No day assigned initially
        servings: typedRecipe?.servings_default || 4,
        is_completed: false,
        order_index: 0,
      }

      const { data: newItem, error } = await supabase
        .from('weekly_menu_items')
        .insert(insertData as any)
        .select()
        .single()

      const typedNewItem = newItem as DBWeeklyMenuItem | null

      if (error) {
        console.error('Error adding to weekmenu:', error)
        throw error
      }

      // Update local state
      setBookmarkedRecipeIds(prev => new Set(prev).add(recipeId))

      // Call success callback
      if (onSuccess && typedNewItem) {
        onSuccess(typedNewItem as WeekMenuItem)
      }
    } catch (error) {
      console.error('Error in addToWeekMenu:', error)
      throw error
    }
  }, [currentWeek, supabase])

  // Remove recipe from weekmenu
  const removeFromWeekMenu = useCallback(async (recipeId: string) => {
    try {
      const weekDate = formatDateForDB(currentWeek)

      const { error } = await supabase
        .from('weekly_menu_items')
        .delete()
        .eq('recipe_id', recipeId)
        .eq('week_date', weekDate)

      if (error) {
        console.error('Error removing from weekmenu:', error)
        throw error
      }

      // Update local state
      setBookmarkedRecipeIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(recipeId)
        return newSet
      })
    } catch (error) {
      console.error('Error in removeFromWeekMenu:', error)
      throw error
    }
  }, [currentWeek, supabase])

  // Check if recipe is in weekmenu
  const isRecipeInWeekMenu = useCallback((recipeId: string): boolean => {
    return bookmarkedRecipeIds.has(recipeId)
  }, [bookmarkedRecipeIds])

  // Clear entire week
  const clearWeek = useCallback(async (weekDate: Date) => {
    try {
      const weekDateStr = formatDateForDB(weekDate)

      const { error } = await supabase
        .from('weekly_menu_items')
        .delete()
        .eq('week_date', weekDateStr)

      if (error) {
        console.error('Error clearing week:', error)
        throw error
      }

      // Update local state
      setBookmarkedRecipeIds(new Set())
    } catch (error) {
      console.error('Error in clearWeek:', error)
      throw error
    }
  }, [supabase])

  const value: WeekMenuContextType = {
    bookmarkedRecipeIds,
    isLoading,
    currentWeek,
    addToWeekMenu,
    removeFromWeekMenu,
    isRecipeInWeekMenu,
    refreshBookmarks,
    clearWeek,
    setCurrentWeek,
  }

  return (
    <WeekMenuContext.Provider value={value}>
      {children}
    </WeekMenuContext.Provider>
  )
}

export function useWeekMenu() {
  const context = useContext(WeekMenuContext)
  if (context === undefined) {
    throw new Error('useWeekMenu must be used within a WeekMenuProvider')
  }
  return context
}
