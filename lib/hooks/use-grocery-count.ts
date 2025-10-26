"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Hook to get the count of unchecked grocery items
 * Updates in real-time when grocery items change
 */
export function useGroceryCount() {
  const [uncheckedCount, setUncheckedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from('grocery_items')
          .select('*', { count: 'exact', head: true })
          .eq('is_checked', false)

        if (!error && count !== null) {
          setUncheckedCount(count)
        }
      } catch (error) {
        console.error('Error fetching grocery count:', error)
      } finally {
        setIsLoading(false)
      }
    }

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

  return { uncheckedCount, isLoading }
}
