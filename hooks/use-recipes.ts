import useSWR from 'swr'
import { Recipe } from '@/types/supabase'

interface RecipesResponse {
  recipes: Recipe[]
  totalCount: number
  page: number
  pageSize: number
  hasMore: boolean
}

interface UseRecipesOptions {
  page?: number
  pageSize?: number
  search?: string
  favorites?: boolean
  categoryIds?: string[]
  weekmenuIds?: string[]
  weekmenuActive?: boolean
}

// Fetcher function for SWR
const fetcher = async (url: string): Promise<RecipesResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch recipes')
  }
  return res.json()
}

// Build query string from options
const buildQueryString = (options: UseRecipesOptions): string => {
  const params = new URLSearchParams()

  if (options.page !== undefined) params.set('page', options.page.toString())
  if (options.pageSize !== undefined) params.set('pageSize', options.pageSize.toString())
  if (options.search?.trim()) params.set('search', options.search.trim())
  if (options.favorites) params.set('favorites', 'true')
  if (options.categoryIds && options.categoryIds.length > 0) {
    params.set('categoryIds', options.categoryIds.join(','))
  }
  if (options.weekmenuActive) {
    params.set('weekmenuIds', (options.weekmenuIds || []).join(','))
  }

  return params.toString()
}

export function useRecipes(options: UseRecipesOptions = {}) {
  const queryString = buildQueryString(options)
  const url = `/api/recipes?${queryString}`

  const { data, error, isLoading, mutate } = useSWR<RecipesResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false, // Don't refetch on window focus
      revalidateOnReconnect: true, // Refetch on reconnect
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      keepPreviousData: true, // Keep previous data while loading new data
    }
  )

  return {
    recipes: data?.recipes || [],
    totalCount: data?.totalCount || 0,
    hasMore: data?.hasMore || false,
    isLoading,
    isError: error,
    mutate, // Expose mutate for manual cache updates
  }
}
