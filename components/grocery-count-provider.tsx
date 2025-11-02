"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface GroceryCountContextType {
  uncheckedCount: number
  isLoading: boolean
  refresh: () => void
}

const GroceryCountContext = createContext<GroceryCountContextType>({
  uncheckedCount: 0,
  isLoading: true,
  refresh: () => {},
})

export function useGroceryCount() {
  return useContext(GroceryCountContext)
}

interface GroceryCountProviderProps {
  children: React.ReactNode
}

export function GroceryCountProvider({ children }: GroceryCountProviderProps) {
  const [uncheckedCount, setUncheckedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchCount = async () => {
    try {
      // Use API route instead of direct Supabase call (avoids CORS)
      const response = await fetch('/api/groceries')

      if (!response.ok) {
        console.error('Error fetching grocery count:', await response.text())
        return
      }

      const data = await response.json()
      setUncheckedCount(data.unchecked || 0)
    } catch (error) {
      console.error('Error fetching grocery count:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchCount()

    // Subscribe to changes in grocery_items table
    const channel = supabase
      .channel('grocery_items_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items'
        },
        () => {
          // Refetch count when any change occurs
          fetchCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <GroceryCountContext.Provider value={{ uncheckedCount, isLoading, refresh: fetchCount }}>
      {children}
    </GroceryCountContext.Provider>
  )
}
