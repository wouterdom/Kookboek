"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { CategoriesByType } from "@/types/supabase"

interface CategoriesContextType {
  categoriesByType: CategoriesByType
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined)

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categoriesByType, setCategoriesByType] = useState<CategoriesByType>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/categories/grouped')
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }
      const data = await response.json()
      setCategoriesByType(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error loading categories:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return (
    <CategoriesContext.Provider
      value={{
        categoriesByType,
        isLoading,
        error,
        refetch: fetchCategories
      }}
    >
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  const context = useContext(CategoriesContext)
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoriesProvider')
  }
  return context
}
