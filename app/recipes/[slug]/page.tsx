"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import {
  ArrowLeft,
  Edit3,
  Printer,
  Bookmark,
  Clock,
  ChefHat,
  Signal,
  Users,
  Minus,
  Plus,
  BookOpen,
  Lightbulb,
  Settings,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Recipe, ParsedIngredient } from "@/types/supabase"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { CategoryManagementModal } from "@/components/CategoryManagementModal"
import { ImageUploadModal } from "@/components/ImageUploadModal"
import { ConfirmModal } from "@/components/modal"
import { getCategoryStyle, DEFAULT_CATEGORY_COLOR } from "@/lib/colors"
import { ChefTip } from "@/components/chef-tip"
import { RecipeCategorySelector } from "@/components/recipe-category-selector"
import { InlineEditButton } from "@/components/inline-edit-button"

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [ingredients, setIngredients] = useState<ParsedIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"ingredients" | "instructions" | "notes">("ingredients")
  const [servings, setServings] = useState<number | null>(null)
  const [baseServings, setBaseServings] = useState<number | null>(null)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [isFavorite, setIsFavorite] = useState(false)
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [slug, setSlug] = useState<string>('')
  const [labels, setLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [isEditingLabels, setIsEditingLabels] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string; color: string }[]>([])
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showManagementModal, setShowManagementModal] = useState(false)
  const [recipeCategoryIds, setRecipeCategoryIds] = useState<string[]>([])
  const [showImageUploadModal, setShowImageUploadModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Inline edit states for metadata
  const [isEditingMetadata, setIsEditingMetadata] = useState(false)
  const [tempPrepTime, setTempPrepTime] = useState<number | null>(null)
  const [tempCookTime, setTempCookTime] = useState<number | null>(null)
  const [tempDifficulty, setTempDifficulty] = useState<string | null>(null)
  const [tempServings, setTempServings] = useState<number | null>(null)
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)

  // Inline edit states for source
  const [isEditingSource, setIsEditingSource] = useState(false)
  const [tempSourceName, setTempSourceName] = useState<string>('')
  const [tempSourceUrl, setTempSourceUrl] = useState<string>('')
  const [isSavingSource, setIsSavingSource] = useState(false)

  // Inline edit states for title & description
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  const [tempDescription, setTempDescription] = useState('')
  const [isSavingTitle, setIsSavingTitle] = useState(false)

  // Inline edit states for ingredients
  const [isEditingIngredients, setIsEditingIngredients] = useState(false)
  const [tempIngredients, setTempIngredients] = useState<ParsedIngredient[]>([])
  const [isSavingIngredients, setIsSavingIngredients] = useState(false)

  // Inline edit states for instructions
  const [isEditingInstructions, setIsEditingInstructions] = useState(false)
  const [tempInstructions, setTempInstructions] = useState('')
  const [isSavingInstructions, setIsSavingInstructions] = useState(false)

  // Inline edit states for notes
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [tempNotes, setTempNotes] = useState('')
  const [isSavingNotesIndividual, setIsSavingNotesIndividual] = useState(false)
  const [recipeImages, setRecipeImages] = useState<Array<{ id: string; image_url: string; is_primary: boolean }>>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)


  // Unwrap params on mount
  useEffect(() => {
    params.then(p => setSlug(p.slug))
  }, [params])

  // Fetch recipe and ingredients
  const loadRecipe = useCallback(async () => {
    if (!slug) return

    setLoading(true)

    try {
      // Fetch recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('slug', slug)
        .single()

      if (recipeError) throw recipeError

      if (recipeData) {
        const recipe = recipeData as Recipe
        setRecipe(recipe)
        setServings(recipe.servings_default)
        setBaseServings(recipe.servings_default)
        setIsFavorite(recipe.is_favorite || false)
        setNotes(recipe.notes || '')
        setLabels(recipe.labels || [])

        // Fetch recipe categories
        const categoriesResponse = await fetch(`/api/recipes/${slug}/categories`)
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setRecipeCategoryIds(categoriesData.map((rc: any) => rc.category_id))
        }

        // Fetch ingredients
        const { data: ingredientsData, error: ingredientsError } = await supabase
          .from('parsed_ingredients')
          .select('*')
          .eq('recipe_id', recipe.id)
          .order('order_index')

        if (!ingredientsError && ingredientsData) {
          setIngredients(ingredientsData)
        }

        // Fetch all images from recipe_images table
        const { data: imagesData, error: imagesError } = await supabase
          .from('recipe_images')
          .select('id, image_url, is_primary')
          .eq('recipe_id', recipe.id)
          .order('display_order', { ascending: true })

        if (!imagesError && imagesData && imagesData.length > 0) {
          setRecipeImages(imagesData as any)
          // Find primary image index
          const primaryIndex = (imagesData as any[]).findIndex((img: any) => img.is_primary)
          setCurrentImageIndex(primaryIndex >= 0 ? primaryIndex : 0)
        } else if (recipe.image_url) {
          // Fallback: if no images in recipe_images but recipe.image_url exists, create temporary entry
          setRecipeImages([{ id: 'legacy', image_url: recipe.image_url, is_primary: true }])
          setCurrentImageIndex(0)
        }
      }
    } catch (error) {
      console.error('Error fetching recipe:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [slug, supabase, router])

  useEffect(() => {
    loadRecipe()
  }, [loadRecipe])

  // Load available categories
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setAvailableCategories(data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])


  const toggleFavorite = async () => {
    if (!recipe) return

    const newFavoriteState = !isFavorite
    setIsFavorite(newFavoriteState)

    await supabase
      .from('recipes')
      // @ts-ignore - Supabase SSR client type inference issue
      .update({ is_favorite: newFavoriteState })
      .eq('id', (recipe as any).id)
  }

  const addLabel = async () => {
    if (!recipe || !newLabel.trim()) return

    const trimmedLabel = newLabel.trim()
    const updatedLabels = [...labels, trimmedLabel]
    setLabels(updatedLabels)
    setNewLabel('')

    await supabase
      .from('recipes')
      // @ts-ignore - Supabase SSR client type inference issue
      .update({ labels: updatedLabels })
      .eq('id', (recipe as any).id)
  }

  const removeLabel = async (labelToRemove: string) => {
    if (!recipe) return

    const updatedLabels = labels.filter(l => l !== labelToRemove)
    setLabels(updatedLabels)

    await supabase
      .from('recipes')
      // @ts-ignore - Supabase SSR client type inference issue
      .update({ labels: updatedLabels })
      .eq('id', (recipe as any).id)
  }

  const addCategoryToRecipe = async (categoryName: string) => {
    if (!recipe || labels.includes(categoryName)) return

    const updatedLabels = [...labels, categoryName]
    setLabels(updatedLabels)

    await supabase
      .from('recipes')
      // @ts-ignore - Supabase SSR client type inference issue
      .update({ labels: updatedLabels })
      .eq('id', (recipe as any).id)
  }

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim(), color: DEFAULT_CATEGORY_COLOR })
      })

      if (response.ok) {
        const newCategory = await response.json()
        await loadCategories()
        await addCategoryToRecipe(newCategory.name)
        setNewCategoryName('')
        setIsAddingNewCategory(false)
        toast.success('Categorie aangemaakt')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Fout bij aanmaken categorie')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Fout bij aanmaken categorie')
    }
  }

  const adjustServings = (delta: number) => {
    // If servings is null, start from 1 when increasing or keep null when decreasing
    if (servings === null) {
      if (delta > 0) {
        setServings(1 + delta)
        setBaseServings(1 + delta)
      }
      return
    }

    const newServings = servings + delta
    if (newServings >= 1) {
      setServings(newServings)
    }
  }

  const scaleAmount = (amount: number | null, scalable: boolean) => {
    if (!amount || !scalable || servings === null || baseServings === null) return amount
    return (amount * servings) / baseServings
  }

  const formatAmount = (amount: number | null, unit: string | null, scalable: boolean) => {
    const scaledAmount = scaleAmount(amount, scalable)
    if (!scaledAmount) return ''

    // Round to reasonable precision
    const rounded = Math.round(scaledAmount * 4) / 4 // Round to nearest quarter
    return `${rounded}${unit ? ` ${unit}` : ''}`
  }

  const toggleIngredient = (id: string) => {
    const newChecked = new Set(checkedIngredients)
    if (newChecked.has(id)) {
      newChecked.delete(id)
    } else {
      newChecked.add(id)
    }
    setCheckedIngredients(newChecked)
  }

  // Image upload handler - now saves directly
  const handleImageUpload = async (imageUrl: string) => {
    if (!recipe) return

    // Always save directly
    try {
      const response = await fetch(`/api/recipes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
        })
      })

      if (response.ok) {
        await loadRecipe()
        toast.success('Foto opgeslagen')
      } else {
        toast.error('Fout bij opslaan van foto')
      }
    } catch (error) {
      console.error('Error saving image:', error)
      toast.error('Fout bij opslaan van foto')
    }
  }



  const handleDeleteRecipe = async () => {
    if (!recipe) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/recipes/${slug}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete recipe')
      }

      // Navigate back to home after successful deletion
      toast.success('Recept verwijderd')
      router.push('/')
    } catch (error) {
      console.error('Error deleting recipe:', error)
      toast.error('Er ging iets mis bij het verwijderen. Probeer het opnieuw.')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Inline metadata editing functions
  const startEditingMetadata = () => {
    if (!recipe) return
    setTempPrepTime(recipe.prep_time)
    setTempCookTime(recipe.cook_time)
    setTempDifficulty(recipe.difficulty)
    setTempServings(recipe.servings_default)
    setIsEditingMetadata(true)
  }

  const saveMetadata = async () => {
    if (!recipe) return

    setIsSavingMetadata(true)
    try {
      const response = await fetch(`/api/recipes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prep_time: tempPrepTime,
          cook_time: tempCookTime,
          difficulty: tempDifficulty,
          servings_default: tempServings,
        })
      })

      if (response.ok) {
        await loadRecipe()
        setIsEditingMetadata(false)
        toast.success('Metadata opgeslagen')
      } else {
        toast.error('Fout bij opslaan van metadata')
      }
    } catch (error) {
      console.error('Error saving metadata:', error)
      toast.error('Fout bij opslaan van metadata')
    } finally {
      setIsSavingMetadata(false)
    }
  }

  const cancelMetadataEdit = () => {
    setIsEditingMetadata(false)
    setTempPrepTime(null)
    setTempCookTime(null)
    setTempDifficulty(null)
    setTempServings(null)
  }

  // Inline source editing functions
  const startEditingSource = () => {
    if (!recipe) return
    setTempSourceName(recipe.source_name || '')
    setTempSourceUrl(recipe.source_url || '')
    setIsEditingSource(true)
  }

  const saveSource = async () => {
    if (!recipe) return

    setIsSavingSource(true)
    try {
      const response = await fetch(`/api/recipes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_name: tempSourceName || null,
          source_url: tempSourceUrl || null,
        })
      })

      if (response.ok) {
        await loadRecipe()
        setIsEditingSource(false)
        toast.success('Bron opgeslagen')
      } else {
        toast.error('Fout bij opslaan van bron')
      }
    } catch (error) {
      console.error('Error saving source:', error)
      toast.error('Fout bij opslaan van bron')
    } finally {
      setIsSavingSource(false)
    }
  }

  const cancelSourceEdit = () => {
    setIsEditingSource(false)
    setTempSourceName('')
    setTempSourceUrl('')
  }

  // Inline title & description editing functions
  const startEditingTitle = () => {
    if (!recipe) return
    setTempTitle(recipe.title)
    setTempDescription(recipe.description || '')
    setIsEditingTitle(true)
  }

  const saveTitle = async () => {
    if (!recipe) return

    setIsSavingTitle(true)
    try {
      const response = await fetch(`/api/recipes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tempTitle,
          description: tempDescription || null,
        })
      })

      if (response.ok) {
        await loadRecipe()
        setIsEditingTitle(false)
        toast.success('Titel en beschrijving opgeslagen')
      } else {
        toast.error('Fout bij opslaan van titel en beschrijving')
      }
    } catch (error) {
      console.error('Error saving title:', error)
      toast.error('Fout bij opslaan van titel en beschrijving')
    } finally {
      setIsSavingTitle(false)
    }
  }

  const cancelTitleEdit = () => {
    setIsEditingTitle(false)
    setTempTitle('')
    setTempDescription('')
  }

  // Inline ingredients editing functions
  const startEditingIngredients = () => {
    if (!recipe) return
    setTempIngredients([...ingredients])
    setIsEditingIngredients(true)
  }

  const saveIngredients = async () => {
    if (!recipe) return

    setIsSavingIngredients(true)
    try {
      const response = await fetch(`/api/recipes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: tempIngredients.map((ing, index) => ({
            ingredient_name_nl: ing.ingredient_name_nl,
            amount: ing.amount,
            unit: ing.unit,
            amount_display: ing.amount_display,
            scalable: ing.scalable,
            section: ing.section,
            order_index: index
          }))
        })
      })

      if (response.ok) {
        await loadRecipe()
        setIsEditingIngredients(false)
        toast.success('Ingrediënten opgeslagen')
      } else {
        toast.error('Fout bij opslaan van ingrediënten')
      }
    } catch (error) {
      console.error('Error saving ingredients:', error)
      toast.error('Fout bij opslaan van ingrediënten')
    } finally {
      setIsSavingIngredients(false)
    }
  }

  const cancelIngredientsEdit = () => {
    setIsEditingIngredients(false)
    setTempIngredients([])
  }

  const addTempIngredient = () => {
    const newIngredient: ParsedIngredient = {
      id: `new-${Date.now()}`,
      recipe_id: recipe?.id || '',
      ingredient_name_nl: '',
      amount: null,
      unit: null,
      amount_display: '',
      scalable: true,
      section: null,
      order_index: tempIngredients.length,
      created_at: null
    }
    setTempIngredients([...tempIngredients, newIngredient])
  }

  const updateTempIngredient = (index: number, field: keyof ParsedIngredient, value: any) => {
    const updated = [...tempIngredients]
    updated[index] = { ...updated[index], [field]: value }
    setTempIngredients(updated)
  }

  const removeTempIngredient = (index: number) => {
    const updated = tempIngredients.filter((_, i) => i !== index)
    setTempIngredients(updated)
  }

  // Inline instructions editing functions
  const startEditingInstructions = () => {
    if (!recipe) return
    setTempInstructions(recipe.content_markdown || '')
    setIsEditingInstructions(true)
  }

  const saveInstructions = async () => {
    if (!recipe) return

    setIsSavingInstructions(true)
    try {
      const response = await fetch(`/api/recipes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_markdown: tempInstructions,
        })
      })

      if (response.ok) {
        await loadRecipe()
        setIsEditingInstructions(false)
        toast.success('Bereidingswijze opgeslagen')
      } else {
        toast.error('Fout bij opslaan van bereidingswijze')
      }
    } catch (error) {
      console.error('Error saving instructions:', error)
      toast.error('Fout bij opslaan van bereidingswijze')
    } finally {
      setIsSavingInstructions(false)
    }
  }

  const cancelInstructionsEdit = () => {
    setIsEditingInstructions(false)
    setTempInstructions('')
  }

  // Inline notes editing functions
  const startEditingNotes = () => {
    if (!recipe) return
    setTempNotes(recipe.notes || '')
    setIsEditingNotes(true)
  }

  const saveNotes = async () => {
    if (!recipe) return

    setIsSavingNotesIndividual(true)
    try {
      const response = await fetch(`/api/recipes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: tempNotes,
        })
      })

      if (response.ok) {
        await loadRecipe()
        setIsEditingNotes(false)
        toast.success('Notities opgeslagen')
      } else {
        toast.error('Fout bij opslaan van notities')
      }
    } catch (error) {
      console.error('Error saving notes:', error)
      toast.error('Fout bij opslaan van notities')
    } finally {
      setIsSavingNotesIndividual(false)
    }
  }

  const cancelNotesEdit = () => {
    setIsEditingNotes(false)
    setTempNotes('')
  }

  const getDifficultyColor = (difficulty: string | null) => {
    switch(difficulty?.toLowerCase()) {
      case 'makkelijk': return 'badge-primary'
      case 'gemiddeld': return 'badge-accent'
      case 'moeilijk': return 'badge'
      default: return 'badge'
    }
  }

  // Parse markdown instructions into steps
  const parseInstructions = (markdown: string | null) => {
    if (!markdown) return []

    const lines = markdown.split('\n')
    const steps: string[] = []
    let currentStep = ''

    lines.forEach(line => {
      const trimmed = line.trim()
      // Check if line starts with a number followed by . or )
      if (/^\d+[\.\)]/.test(trimmed)) {
        if (currentStep) steps.push(currentStep.trim())
        currentStep = trimmed.replace(/^\d+[\.\)]\s*/, '')
      } else if (trimmed) {
        currentStep += (currentStep ? ' ' : '') + trimmed
      } else if (currentStep) {
        steps.push(currentStep.trim())
        currentStep = ''
      }
    })

    if (currentStep) steps.push(currentStep.trim())

    return steps.length > 0 ? steps : [markdown]
  }

  // Convert markdown formatting to React elements
  const renderMarkdown = (text: string) => {
    const parts = []
    let lastIndex = 0
    const regex = /\*\*(.+?)\*\*/g
    let match

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      // Add bold text
      parts.push(<strong key={match.index}>{match[1]}</strong>)
      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  const instructionSteps = parseInstructions(recipe?.content_markdown || null)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-lg text-[oklch(var(--muted-foreground))]">Recept laden...</div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-lg text-[oklch(var(--muted-foreground))]">Recept niet gevonden</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header with Back and Print buttons */}
      <header className="no-print sticky top-0 z-50 w-full border-b bg-white">
        <div className="container mx-auto flex max-w-5xl items-center px-4 py-4">
          {/* Left: Back button */}
          <div className="flex flex-1 items-center">
            <button
              onClick={() => router.push('/')}
              className="btn btn-outline btn-sm flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Terug</span>
            </button>
          </div>

          {/* Center: Cooking & Print buttons */}
          <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/recipes/${slug}/cooking`)}
                className="btn btn-outline btn-sm flex items-center gap-2 text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <ChefHat className="h-4 w-4" />
                <span className="hidden sm:inline">Koken</span>
              </button>
              <button
                onClick={() => router.push(`/recipes/${slug}/cooking?print=true`)}
                className="btn btn-outline btn-sm flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>

          {/* Right: Delete button */}
          <div className="flex flex-1 items-center justify-end gap-2">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-outline btn-sm flex items-center gap-2 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Verwijder</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-5xl px-2 sm:px-4 py-4 sm:py-8">
        <Card className="overflow-hidden print-recipe">
          {/* Hero Image Gallery */}
          <div className="relative h-96 w-full">
            {recipeImages.length > 0 ? (
              <>
                <Image
                  src={recipeImages[currentImageIndex]?.image_url || "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&h=600&fit=crop"}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                  unoptimized
                />

                {/* Navigation arrows (only show if more than 1 image) */}
                {recipeImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : recipeImages.length - 1))}
                      className="no-print absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all"
                    >
                      <ChevronLeft className="h-6 w-6 text-gray-800" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((prev) => (prev < recipeImages.length - 1 ? prev + 1 : 0))}
                      className="no-print absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all"
                    >
                      <ChevronRight className="h-6 w-6 text-gray-800" />
                    </button>
                  </>
                )}

                {/* Dots indicator (only show if more than 1 image) */}
                {recipeImages.length > 1 && (
                  <div className="no-print absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {recipeImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentImageIndex
                            ? 'w-8 bg-white'
                            : 'w-2 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Image edit button */}
                <button
                  onClick={() => setShowImageUploadModal(true)}
                  className="no-print absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur transition-all hover:bg-white"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Wijzig Foto</span>
                </button>
              </>
            ) : (
              <>
                <Image
                  src={recipe.image_url || "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&h=600&fit=crop"}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {/* Image edit button */}
                <button
                  onClick={() => setShowImageUploadModal(true)}
                  className="no-print absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur transition-all hover:bg-white"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Wijzig Foto</span>
                </button>
              </>
            )}
          </div>

          {/* Recipe Content */}
          <div className="p-4 sm:p-8">
            {/* Title and Description */}
            <div className="mb-6">
              {isEditingTitle ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="w-full font-serif text-xl sm:text-4xl font-bold border-b-2 border-gray-300 focus:border-primary outline-none bg-transparent px-2 py-1"
                    placeholder="Recept titel"
                  />
                  <textarea
                    value={tempDescription}
                    onChange={(e) => setTempDescription(e.target.value)}
                    className="w-full text-base sm:text-lg text-muted-foreground border border-gray-300 rounded-lg p-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                    placeholder="Beschrijving (optioneel)"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <InlineEditButton
                      isEditing={isEditingTitle}
                      onEdit={startEditingTitle}
                      onSave={saveTitle}
                      onCancel={cancelTitleEdit}
                      isSaving={isSavingTitle}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h1 className="mb-3 font-serif text-2xl sm:text-4xl font-bold break-words">
                      {recipe.title}
                    </h1>
                    {recipe.description && (
                      <p className="text-base sm:text-lg text-muted-foreground break-words">
                        {recipe.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <InlineEditButton
                      isEditing={isEditingTitle}
                      onEdit={startEditingTitle}
                      onSave={saveTitle}
                      onCancel={cancelTitleEdit}
                      isSaving={isSavingTitle}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category Section - New */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Categorieën:</h3>
              {recipe && (
                <RecipeCategorySelector
                  recipeSlug={slug}
                  selectedCategoryIds={recipeCategoryIds}
                  onUpdate={loadRecipe}
                />
              )}
            </div>

            {/* Metadata Badges */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Recept details:</h3>
                  {!isEditingMetadata && (
                    <InlineEditButton
                      isEditing={false}
                      onEdit={startEditingMetadata}
                      onSave={saveMetadata}
                      onCancel={cancelMetadataEdit}
                      isSaving={isSavingMetadata}
                    />
                  )}
                  {isEditingMetadata && (
                    <InlineEditButton
                      isEditing={true}
                      onEdit={startEditingMetadata}
                      onSave={saveMetadata}
                      onCancel={cancelMetadataEdit}
                      isSaving={isSavingMetadata}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {isEditingMetadata ? (
                    <>
                      <div className="flex items-center gap-1.5 sm:gap-2 border border-gray-300 rounded-full px-2.5 sm:px-4 py-2 text-xs sm:text-sm">
                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Bereidingstijd:</span>
                        <span className="sm:hidden">Bereid:</span>
                        <input
                          type="number"
                          value={tempPrepTime || ''}
                          onChange={(e) => setTempPrepTime(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-12 sm:w-16 text-xs sm:text-sm border-b border-gray-300 focus:border-primary outline-none bg-transparent"
                          placeholder="0"
                        />
                        <span>min</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 border border-gray-300 rounded-full px-2.5 sm:px-4 py-2 text-xs sm:text-sm">
                        <ChefHat className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Kooktijd:</span>
                        <span className="sm:hidden">Kook:</span>
                        <input
                          type="number"
                          value={tempCookTime || ''}
                          onChange={(e) => setTempCookTime(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-12 sm:w-16 text-xs sm:text-sm border-b border-gray-300 focus:border-primary outline-none bg-transparent"
                          placeholder="0"
                        />
                        <span>min</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 border border-gray-300 rounded-full px-2.5 sm:px-4 py-2 text-xs sm:text-sm">
                        <Signal className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <select
                          value={tempDifficulty || ''}
                          onChange={(e) => setTempDifficulty(e.target.value || null)}
                          className="text-xs sm:text-sm border-b border-gray-300 focus:border-primary outline-none bg-transparent pr-1"
                        >
                          <option value="">Moeilijkheid</option>
                          <option value="Makkelijk">Makkelijk</option>
                          <option value="Gemiddeld">Gemiddeld</option>
                          <option value="Moeilijk">Moeilijk</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 border border-gray-300 rounded-full px-2.5 sm:px-4 py-2 text-xs sm:text-sm">
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <input
                          type="number"
                          value={tempServings || ''}
                          onChange={(e) => setTempServings(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-12 sm:w-16 text-xs sm:text-sm border-b border-gray-300 focus:border-primary outline-none bg-transparent"
                          placeholder="0"
                        />
                        <span>porties</span>
                      </div>
                    </>
                  ) : (
                <>
                    {recipe.prep_time && (
                      <Badge className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Bereidingstijd: {recipe.prep_time} min</span>
                      </Badge>
                    )}
                    {recipe.cook_time && (
                      <Badge className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4" />
                        <span>Kooktijd: {recipe.cook_time} min</span>
                      </Badge>
                    )}
                    {recipe.difficulty && (
                      <Badge variant="accent" className="flex items-center gap-2">
                        <Signal className="h-4 w-4" />
                        <span>{recipe.difficulty}</span>
                      </Badge>
                    )}
                    <Badge className="flex items-center gap-3">
                      <Users className="h-4 w-4" />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustServings(-1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={servings === null}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span>{servings ?? '?'}</span>
                        <button
                          onClick={() => adjustServings(1)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <span>porties</span>
                      </div>
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Source Section - Separate from metadata */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Bron:</h3>
                  {!isEditingSource && (
                    <InlineEditButton
                      isEditing={false}
                      onEdit={startEditingSource}
                      onSave={saveSource}
                      onCancel={cancelSourceEdit}
                      isSaving={isSavingSource}
                    />
                  )}
                  {isEditingSource && (
                    <InlineEditButton
                      isEditing={true}
                      onEdit={startEditingSource}
                      onSave={saveSource}
                      onCancel={cancelSourceEdit}
                      isSaving={isSavingSource}
                    />
                  )}
                </div>
                {isEditingSource ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <input
                        type="text"
                        value={tempSourceName}
                        onChange={(e) => setTempSourceName(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Bron naam (bijv. Jeroen Meus, Laura Bakeries)"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <input
                        type="url"
                        value={tempSourceUrl}
                        onChange={(e) => setTempSourceUrl(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Bron URL (optioneel)"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {recipe.source_name ? (
                      recipe.source_url ? (
                        <a
                          href={recipe.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Badge variant="primary" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                            <BookOpen className="h-4 w-4" />
                            <span>{recipe.source_name}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Badge>
                        </a>
                      ) : (
                        <Badge variant="primary" className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>{recipe.source_name}</span>
                        </Badge>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">Geen bron toegevoegd</p>
                    )}
                  </div>
                )}
              </div>

            <div className="my-6 h-px bg-border" />

            {/* Tabs */}
            <div className="mb-6 flex gap-1 sm:gap-2 border-b border-border overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab("ingredients")}
                className={`border-b-2 px-3 sm:px-6 py-3 font-medium text-sm sm:text-base transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === "ingredients"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Ingrediënten
              </button>
              <button
                onClick={() => setActiveTab("instructions")}
                className={`border-b-2 px-3 sm:px-6 py-3 font-medium text-sm sm:text-base transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === "instructions"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Bereidingswijze
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`no-print border-b-2 px-3 sm:px-6 py-3 font-medium text-sm sm:text-base transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === "notes"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Notities
              </button>
            </div>

            {/* Tab Content: Ingredients */}
            {activeTab === "ingredients" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-2xl font-semibold">
                    Ingrediënten
                  </h2>
                  <div className="flex items-center gap-2">
                    {isEditingIngredients && (
                      <button
                        onClick={addTempIngredient}
                        className="btn btn-sm btn-primary flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Toevoegen
                      </button>
                    )}
                    <InlineEditButton
                      isEditing={isEditingIngredients}
                      onEdit={startEditingIngredients}
                      onSave={saveIngredients}
                      onCancel={cancelIngredientsEdit}
                      isSaving={isSavingIngredients}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {isEditingIngredients ? (
                    <>
                      {tempIngredients.length > 0 ? tempIngredients.map((ingredient, index) => (
                        <div key={ingredient.id || index} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <div className="flex gap-2 flex-1">
                            <input
                              type="number"
                              value={ingredient.amount || ''}
                              onChange={(e) => updateTempIngredient(index, 'amount', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:border-primary outline-none"
                              placeholder="Aantal"
                            />
                            <input
                              type="text"
                              value={ingredient.unit || ''}
                              onChange={(e) => updateTempIngredient(index, 'unit', e.target.value)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:border-primary outline-none"
                              placeholder="Eenheid"
                            />
                            <input
                              type="text"
                              value={ingredient.ingredient_name_nl}
                              onChange={(e) => updateTempIngredient(index, 'ingredient_name_nl', e.target.value)}
                              className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded focus:border-primary outline-none"
                              placeholder="Ingrediënt"
                            />
                          </div>
                          <div className="flex items-center gap-2 justify-between sm:justify-start">
                            <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={ingredient.scalable ?? false}
                                onChange={(e) => updateTempIngredient(index, 'scalable', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-xs text-gray-600">Schaalbaar</span>
                            </label>
                            <button
                              onClick={() => removeTempIngredient(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                              title="Verwijder ingrediënt"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )) : (
                        <p className="text-muted-foreground">Geen ingrediënten toegevoegd</p>
                      )}
                    </>
                  ) : (
                    <>
                      {ingredients.length > 0 ? ingredients.map((ingredient, index) => (
                        <div key={ingredient.id}>
                          {ingredient.section && (index === 0 || ingredients[index - 1]?.section !== ingredient.section) && (
                            <h3 className="mt-4 mb-2 font-semibold text-md">
                              {ingredient.section}
                            </h3>
                          )}
                          <label
                            className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={checkedIngredients.has(ingredient.id)}
                              onChange={() => toggleIngredient(ingredient.id)}
                              className="mt-0.5 h-5 w-5 cursor-pointer rounded border-2 border-border transition-all checked:border-primary checked:bg-primary"
                            />
                            <span className="flex-1">
                              {ingredient.scalable && ingredient.amount ? (
                                <>
                                  <strong>{formatAmount(ingredient.amount, ingredient.unit, ingredient.scalable)}</strong> {ingredient.ingredient_name_nl}
                                </>
                              ) : (
                                <>
                                  {ingredient.amount_display && <strong>{ingredient.amount_display}</strong>} {ingredient.ingredient_name_nl}
                                </>
                              )}
                            </span>
                          </label>
                        </div>
                      )) : (
                        <p className="text-muted-foreground">Geen ingrediënten beschikbaar</p>
                      )}
                    </>
                  )}
                </div>

                {/* Chef Tip - Notities */}
                {recipe.notes && (
                  <ChefTip content={recipe.notes} />
                )}
              </div>
            )}

            {/* Tab Content: Instructions */}
            {activeTab === "instructions" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl font-semibold">
                    Bereidingswijze
                  </h2>
                  <InlineEditButton
                    isEditing={isEditingInstructions}
                    onEdit={startEditingInstructions}
                    onSave={saveInstructions}
                    onCancel={cancelInstructionsEdit}
                    isSaving={isSavingInstructions}
                  />
                </div>
                {isEditingInstructions ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instructies (Markdown format)
                      </label>
                      <textarea
                        value={tempInstructions}
                        onChange={(e) => setTempInstructions(e.target.value)}
                        className="w-full min-h-[400px] p-4 text-sm border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono"
                        placeholder="Voer de bereidingsstappen in. Gebruik nummering (1. 2. 3.) of bullet points (- )&#10;&#10;Voorbeeld:&#10;1. Verwarm de oven voor op 180°C.&#10;2. Meng de bloem met het zout.&#10;3. Voeg de eieren toe en meng goed."
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Tip: Gebruik Markdown formatting. Bijvoorbeeld: **vet**, *cursief*, nummering (1. 2. 3.) of bullets (- )
                      </p>
                    </div>
                    {tempInstructions && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
                        <div className="space-y-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                          {parseInstructions(tempInstructions).map((step, index) => (
                            <div key={index} className="flex gap-4">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="leading-relaxed text-gray-700">{renderMarkdown(step)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {instructionSteps.length > 0 && instructionSteps[0] !== '' ? (
                      <div className="space-y-6">
                        {instructionSteps.map((step, index) => (
                          <div key={index} className="flex gap-4">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="leading-relaxed text-gray-700">{renderMarkdown(step)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Geen bereidingswijze beschikbaar</p>
                    )}
                  </>
                )}

                {/* Chef Tip - Notities */}
                {recipe.notes && (
                  <ChefTip content={recipe.notes} />
                )}
              </div>
            )}

            {/* Tab Content: Notes */}
            {activeTab === "notes" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl font-semibold">
                    Notities
                  </h2>
                  <InlineEditButton
                    isEditing={isEditingNotes}
                    onEdit={startEditingNotes}
                    onSave={saveNotes}
                    onCancel={cancelNotesEdit}
                    isSaving={isSavingNotesIndividual}
                  />
                </div>
                {isEditingNotes ? (
                  <div>
                    <textarea
                      value={tempNotes}
                      onChange={(e) => setTempNotes(e.target.value)}
                      className="w-full min-h-[300px] p-4 text-sm border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Voeg persoonlijke notities toe over dit recept..."
                    />
                  </div>
                ) : (
                  <>
                    {recipe.notes ? (
                      <div className="rounded-lg border border-border p-4">
                        <p className="whitespace-pre-wrap">{recipe.notes}</p>
                        {recipe.notes_updated_at && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            Laatst bijgewerkt: {new Date(recipe.notes_updated_at).toLocaleDateString("nl-NL")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Nog geen notities toegevoegd
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="no-print mt-12 border-t bg-muted">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2025 Kookboek. Gemaakt met liefde en goede ingrediënten.</p>
          </div>
        </div>
      </footer>

      {/* Category Management Modal */}
      {showManagementModal && (
        <CategoryManagementModal
          categories={availableCategories}
          onClose={() => setShowManagementModal(false)}
          onUpdate={loadCategories}
        />
      )}

      {/* Image Upload Modal */}
      {showImageUploadModal && recipe && (
        <ImageUploadModal
          isOpen={showImageUploadModal}
          onClose={() => setShowImageUploadModal(false)}
          onUpload={handleImageUpload}
          currentImageUrl={recipe?.image_url || undefined}
          recipeSlug={slug}
          recipeTitle={recipe?.title}
          recipeDescription={recipe?.description ?? undefined}
          recipeIngredients={ingredients.slice(0, 5).map(ing => ing.ingredient_name_nl)}
          recipeId={recipe.id}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteRecipe}
        title="Recept verwijderen?"
        message={`Weet je zeker dat je "${recipe?.title}" wilt verwijderen? Deze actie kan niet ongedaan gemaakt worden.`}
        confirmText={isDeleting ? "Verwijderen..." : "Verwijderen"}
        cancelText="Annuleren"
      />

      {/* Simple print styles - main printing is done from cooking mode */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
