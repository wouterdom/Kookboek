"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Recipe, ParsedIngredient } from "@/types/supabase"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { ColorPicker } from "@/components/ColorPicker"
import { CategoryManagementModal } from "@/components/CategoryManagementModal"
import { ImageUploadModal } from "@/components/ImageUploadModal"
import { ConfirmModal, Modal } from "@/components/modal"
import { getCategoryStyle, CATEGORY_COLORS } from "@/lib/colors"

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
  const [isEditMode, setIsEditMode] = useState(false)
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [slug, setSlug] = useState<string>('')
  const [labels, setLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [isEditingLabels, setIsEditingLabels] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string; color: string }[]>([])
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].value)
  const [showManagementModal, setShowManagementModal] = useState(false)
  const [showImageUploadModal, setShowImageUploadModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Modal state for alerts
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean
    title?: string
    message: string
    type: 'info' | 'success' | 'error' | 'warning'
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  // Edit mode states
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPrepTime, setEditPrepTime] = useState<number | null>(null)
  const [editCookTime, setEditCookTime] = useState<number | null>(null)
  const [editServings, setEditServings] = useState<number | null>(null)
  const [editDifficulty, setEditDifficulty] = useState<string | null>(null)
  const [editInstructions, setEditInstructions] = useState('')
  const [editSourceName, setEditSourceName] = useState('')
  const [editIngredients, setEditIngredients] = useState<ParsedIngredient[]>([])
  const [editImageUrl, setEditImageUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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
        setRecipe(recipeData)
        setServings(recipeData.servings_default)
        setBaseServings(recipeData.servings_default)
        setIsFavorite(recipeData.is_favorite || false)
        setNotes(recipeData.notes || '')
        setLabels(recipeData.labels || [])

        // Initialize edit states
        setEditTitle(recipeData.title)
        setEditDescription(recipeData.description || '')
        setEditPrepTime(recipeData.prep_time)
        setEditCookTime(recipeData.cook_time)
        setEditServings(recipeData.servings_default)
        setEditDifficulty(recipeData.difficulty)
        setEditInstructions(recipeData.content_markdown || '')
        setEditSourceName(recipeData.source_name || '')
        setEditImageUrl(recipeData.image_url || '')

        // Fetch ingredients
        const { data: ingredientsData, error: ingredientsError } = await supabase
          .from('parsed_ingredients')
          .select('*')
          .eq('recipe_id', recipeData.id)
          .order('order_index')

        if (!ingredientsError && ingredientsData) {
          setIngredients(ingredientsData)
          setEditIngredients(ingredientsData)
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

  // Auto-save notes after 2 seconds of inactivity
  useEffect(() => {
    if (!recipe || !isEditMode) return

    const timer = setTimeout(async () => {
      if (notes !== recipe.notes) {
        setIsSavingNotes(true)
        await supabase
          .from('recipes')
          .update({
            notes,
            notes_updated_at: new Date().toISOString()
          })
          .eq('id', recipe.id)
        setIsSavingNotes(false)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [notes, recipe, supabase, isEditMode])

  const toggleFavorite = async () => {
    if (!recipe) return

    const newFavoriteState = !isFavorite
    setIsFavorite(newFavoriteState)

    await supabase
      .from('recipes')
      .update({ is_favorite: newFavoriteState })
      .eq('id', recipe.id)
  }

  const addLabel = async () => {
    if (!recipe || !newLabel.trim()) return

    const trimmedLabel = newLabel.trim()
    const updatedLabels = [...labels, trimmedLabel]
    setLabels(updatedLabels)
    setNewLabel('')

    await supabase
      .from('recipes')
      .update({ labels: updatedLabels })
      .eq('id', recipe.id)
  }

  const removeLabel = async (labelToRemove: string) => {
    if (!recipe) return

    const updatedLabels = labels.filter(l => l !== labelToRemove)
    setLabels(updatedLabels)

    await supabase
      .from('recipes')
      .update({ labels: updatedLabels })
      .eq('id', recipe.id)
  }

  const addCategoryToRecipe = async (categoryName: string) => {
    if (!recipe || labels.includes(categoryName)) return

    const updatedLabels = [...labels, categoryName]
    setLabels(updatedLabels)

    await supabase
      .from('recipes')
      .update({ labels: updatedLabels })
      .eq('id', recipe.id)
  }

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim(), color: newCategoryColor })
      })

      if (response.ok) {
        const newCategory = await response.json()
        await loadCategories()
        await addCategoryToRecipe(newCategory.name)
        setNewCategoryName('')
        setNewCategoryColor(CATEGORY_COLORS[0].value)
        setIsAddingNewCategory(false)
      } else {
        const error = await response.json()
        setModalConfig({
          isOpen: true,
          message: error.error || 'Fout bij aanmaken categorie',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error creating category:', error)
      setModalConfig({
        isOpen: true,
        message: 'Fout bij aanmaken categorie',
        type: 'error'
      })
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

  // Image upload handler
  const handleImageUpload = (imageUrl: string) => {
    setEditImageUrl(imageUrl)
  }

  // Add ingredient
  const addIngredient = () => {
    const newIngredient: ParsedIngredient = {
      id: `temp-${Date.now()}`,
      recipe_id: recipe?.id || '',
      ingredient_name_nl: '',
      amount: null,
      unit: null,
      amount_display: '',
      scalable: true,
      section: null,
      order_index: editIngredients.length,
      created_at: new Date().toISOString()
    }
    setEditIngredients([...editIngredients, newIngredient])
  }

  // Remove ingredient
  const removeIngredient = (index: number) => {
    const updated = editIngredients.filter((_, i) => i !== index)
    setEditIngredients(updated)
  }

  // Update ingredient
  const updateIngredient = (index: number, field: keyof ParsedIngredient, value: any) => {
    const updated = [...editIngredients]
    updated[index] = { ...updated[index], [field]: value }

    // Update amount_display when amount or unit changes
    if (field === 'amount' || field === 'unit') {
      const ing = updated[index]
      if (ing.amount && ing.unit) {
        ing.amount_display = `${ing.amount} ${ing.unit}`
      } else if (ing.amount) {
        ing.amount_display = `${ing.amount}`
      } else {
        ing.amount_display = ''
      }
    }

    setEditIngredients(updated)
  }

  // Save all changes
  const saveChanges = async () => {
    if (!recipe) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/recipes/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          prep_time: editPrepTime,
          cook_time: editCookTime,
          servings_default: editServings,
          difficulty: editDifficulty,
          content_markdown: editInstructions,
          source_name: editSourceName,
          image_url: editImageUrl,
          ingredients: editIngredients.map((ing, index) => ({
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
        // Reload recipe to show updated data
        await loadRecipe()
        setIsEditMode(false)
        setModalConfig({
          isOpen: true,
          title: 'Opgeslagen!',
          message: 'Recept succesvol opgeslagen',
          type: 'success'
        })
      } else {
        setModalConfig({
          isOpen: true,
          message: 'Fout bij opslaan van recept',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error saving recipe:', error)
      setModalConfig({
        isOpen: true,
        message: 'Fout bij opslaan van recept',
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Cancel edit mode
  const cancelEdit = () => {
    if (!recipe) return

    // Reset all edit states to current recipe data
    setEditTitle(recipe.title)
    setEditDescription(recipe.description || '')
    setEditPrepTime(recipe.prep_time)
    setEditCookTime(recipe.cook_time)
    setEditServings(recipe.servings_default)
    setEditDifficulty(recipe.difficulty)
    setEditInstructions(recipe.content_markdown || '')
    setEditSourceName(recipe.source_name || '')
    setEditImageUrl(recipe.image_url || '')
    setEditIngredients([...ingredients])
    setIsEditMode(false)
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
      router.push('/')
    } catch (error) {
      console.error('Error deleting recipe:', error)
      setModalConfig({
        isOpen: true,
        message: 'Er ging iets mis bij het verwijderen. Probeer het opnieuw.',
        type: 'error'
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const getDifficultyColor = (difficulty: string | null) => {
    switch(difficulty?.toLowerCase()) {
      case 'makkelijk': return 'badge-primary'
      case 'gemiddeld': return 'badge-accent'
      case 'moeilijk': return 'badge'
      default: return 'badge'
    }
  }

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
        <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <button
            onClick={() => router.back()}
            className="btn btn-outline btn-sm flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Terug</span>
          </button>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <button
                  onClick={saveChanges}
                  disabled={isSaving}
                  className="btn btn-primary btn-sm flex items-center gap-2"
                >
                  {isSaving ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={isSaving}
                  className="btn btn-outline btn-sm"
                >
                  Annuleren
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="btn btn-primary btn-sm flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Bewerk</span>
                </button>
                <button
                  onClick={() => router.push(`/recipes/${slug}/cooking`)}
                  className="btn btn-outline btn-sm flex items-center gap-2 text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <ChefHat className="h-4 w-4" />
                  <span className="hidden sm:inline">Koken</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn btn-outline btn-sm flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-outline btn-sm flex items-center gap-2 text-red-600 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Verwijder</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-5xl px-2 sm:px-4 py-4 sm:py-8">
        <Card className="overflow-hidden print-recipe">
          {/* Hero Image */}
          <div className="relative h-96 w-full">
            <Image
              src={
                (isEditMode ? editImageUrl : recipe.image_url) ||
                "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&h=600&fit=crop"
              }
              alt={recipe.title}
              fill
              className="object-cover"
              unoptimized
            />
            {isEditMode ? (
              <button
                onClick={() => setShowImageUploadModal(true)}
                className="no-print absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90"
              >
                <Edit3 className="h-4 w-4" />
                Wijzig Foto
              </button>
            ) : (
              <button className="no-print absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur transition-all hover:bg-white">
                <Bookmark className="h-4 w-4" />
                Bewaar
              </button>
            )}
          </div>

          {/* Recipe Content */}
          <div className="p-4 sm:p-8">
            {/* Title and Description */}
            <div className="mb-6">
              {isEditMode ? (
                <>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mb-3 w-full font-serif text-2xl sm:text-4xl font-bold border-b-2 border-gray-300 focus:border-primary outline-none bg-transparent break-words"
                    placeholder="Recept titel"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-lg text-muted-foreground border border-gray-300 rounded p-2 focus:border-primary outline-none"
                    placeholder="Beschrijving (optioneel)"
                    rows={2}
                  />
                </>
              ) : (
                <>
                  <h1 className="mb-3 font-serif text-2xl sm:text-4xl font-bold break-words">
                    {recipe.title}
                  </h1>
                  {recipe.description && (
                    <p className="text-base sm:text-lg text-muted-foreground break-words">
                      {recipe.description}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Category Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Categorie:</h3>
                <button
                  onClick={() => setIsEditingLabels(!isEditingLabels)}
                  className="text-xs text-primary hover:underline"
                >
                  {isEditingLabels ? 'Klaar' : 'Wijzigen'}
                </button>
                <button
                  onClick={() => setShowManagementModal(true)}
                  className="text-xs text-gray-600 hover:underline flex items-center gap-1"
                  title="Beheer categorieën"
                >
                  <Settings className="h-3 w-3" />
                  Beheer
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => {
                  const category = availableCategories.find(c => c.name === label)
                  return (
                    <div
                      key={label}
                      className="px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 break-words max-w-full"
                      style={category ? getCategoryStyle(category.color) : undefined}
                    >
                      <span className="break-words">{label}</span>
                      {isEditingLabels && (
                        <button
                          onClick={() => removeLabel(label)}
                          className="ml-1 hover:opacity-70 flex-shrink-0"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}
                {isEditingLabels && (
                  <>
                    {availableCategories
                      .filter(cat => !labels.includes(cat.name))
                      .map((category) => (
                        <button
                          key={category.id}
                          onClick={() => addCategoryToRecipe(category.name)}
                          className="px-4 py-2 rounded-full text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
                          style={getCategoryStyle(category.color)}
                        >
                          + {category.name}
                        </button>
                      ))}
                    {!isAddingNewCategory ? (
                      <button
                        onClick={() => setIsAddingNewCategory(true)}
                        className="px-4 py-2 rounded-full text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
                      >
                        + Nieuwe categorie
                      </button>
                    ) : (
                      <div className="w-full bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') createNewCategory()
                            if (e.key === 'Escape') {
                              setIsAddingNewCategory(false)
                              setNewCategoryName('')
                              setNewCategoryColor(CATEGORY_COLORS[0].value)
                            }
                          }}
                          placeholder="Categorie naam"
                          autoFocus
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                        />
                        <div>
                          <p className="text-xs text-gray-600 mb-2">Kies een kleur:</p>
                          <ColorPicker
                            selectedColor={newCategoryColor}
                            onColorSelect={setNewCategoryColor}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={createNewCategory}
                            className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90"
                          >
                            Toevoegen
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingNewCategory(false)
                              setNewCategoryName('')
                              setNewCategoryColor(CATEGORY_COLORS[0].value)
                            }}
                            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                          >
                            Annuleren
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Metadata Badges */}
            <div className="mb-8 flex flex-wrap gap-2 sm:gap-3">
              {isEditMode ? (
                <>
                  <div className="flex items-center gap-1.5 sm:gap-2 border border-gray-300 rounded-full px-2.5 sm:px-4 py-2 text-xs sm:text-sm">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Bereidingstijd:</span>
                    <span className="sm:hidden">Bereid:</span>
                    <input
                      type="number"
                      value={editPrepTime || ''}
                      onChange={(e) => setEditPrepTime(e.target.value ? parseInt(e.target.value) : null)}
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
                      value={editCookTime || ''}
                      onChange={(e) => setEditCookTime(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-12 sm:w-16 text-xs sm:text-sm border-b border-gray-300 focus:border-primary outline-none bg-transparent"
                      placeholder="0"
                    />
                    <span>min</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 border border-gray-300 rounded-full px-2.5 sm:px-4 py-2 text-xs sm:text-sm">
                    <Signal className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <select
                      value={editDifficulty || ''}
                      onChange={(e) => setEditDifficulty(e.target.value || null)}
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
                      value={editServings || ''}
                      onChange={(e) => setEditServings(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-12 sm:w-16 text-xs sm:text-sm border-b border-gray-300 focus:border-primary outline-none bg-transparent"
                      placeholder="0"
                    />
                    <span>porties</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 border border-gray-300 rounded-full px-2.5 sm:px-4 py-2 text-xs sm:text-sm min-w-0">
                    <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <input
                      type="text"
                      value={editSourceName}
                      onChange={(e) => setEditSourceName(e.target.value)}
                      className="w-20 sm:w-32 text-xs sm:text-sm border-b border-gray-300 focus:border-primary outline-none bg-transparent min-w-0"
                      placeholder="Bron"
                    />
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
                  {recipe.source_name && (
                    <Badge variant="primary" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{recipe.source_name}</span>
                    </Badge>
                  )}
                </>
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
                  {isEditMode && (
                    <button
                      onClick={addIngredient}
                      className="btn btn-sm btn-primary flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Toevoegen
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {isEditMode ? (
                    <>
                      {editIngredients.length > 0 ? editIngredients.map((ingredient, index) => (
                        <div key={ingredient.id || index} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <div className="flex gap-2 flex-1">
                            <input
                              type="number"
                              value={ingredient.amount || ''}
                              onChange={(e) => updateIngredient(index, 'amount', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:border-primary outline-none"
                              placeholder="Aantal"
                            />
                            <input
                              type="text"
                              value={ingredient.unit || ''}
                              onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:border-primary outline-none"
                              placeholder="Eenheid"
                            />
                            <input
                              type="text"
                              value={ingredient.ingredient_name_nl}
                              onChange={(e) => updateIngredient(index, 'ingredient_name_nl', e.target.value)}
                              className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded focus:border-primary outline-none"
                              placeholder="Ingrediënt"
                            />
                          </div>
                          <div className="flex items-center gap-2 justify-between sm:justify-start">
                            <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={ingredient.scalable}
                                onChange={(e) => updateIngredient(index, 'scalable', e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-xs text-gray-600">Schaalbaar</span>
                            </label>
                            <button
                              onClick={() => removeIngredient(index)}
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
              </div>
            )}

            {/* Tab Content: Instructions */}
            {activeTab === "instructions" && (
              <div>
                <h2 className="mb-6 font-serif text-2xl font-semibold">
                  Bereidingswijze
                </h2>
                {isEditMode ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instructies (Markdown format)
                      </label>
                      <textarea
                        value={editInstructions}
                        onChange={(e) => setEditInstructions(e.target.value)}
                        className="w-full min-h-[400px] p-4 text-sm border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono"
                        placeholder="Voer de bereidingsstappen in. Gebruik nummering (1. 2. 3.) of bullet points (- )&#10;&#10;Voorbeeld:&#10;1. Verwarm de oven voor op 180°C.&#10;2. Meng de bloem met het zout.&#10;3. Voeg de eieren toe en meng goed."
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Tip: Gebruik Markdown formatting. Bijvoorbeeld: **vet**, *cursief*, nummering (1. 2. 3.) of bullets (- )
                      </p>
                    </div>
                    {editInstructions && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
                        <div className="prose prose-lg max-w-none p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSanitize]}
                          >
                            {editInstructions}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {recipe.content_markdown ? (
                      <div className="prose prose-lg max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeSanitize]}
                        >
                          {recipe.content_markdown}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Geen bereidingswijze beschikbaar</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tab Content: Notes */}
            {activeTab === "notes" && (
              <div>
                <h2 className="mb-6 font-serif text-2xl font-semibold">
                  Notities
                </h2>
                {isEditMode ? (
                  <div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full min-h-[300px] p-4 text-sm border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Voeg persoonlijke notities toe over dit recept..."
                    />
                    {isSavingNotes && (
                      <p className="mt-2 text-xs text-gray-500">Opslaan...</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      Notities worden automatisch opgeslagen
                    </p>
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
      {showImageUploadModal && (
        <ImageUploadModal
          isOpen={showImageUploadModal}
          onClose={() => setShowImageUploadModal(false)}
          onUpload={handleImageUpload}
          currentImageUrl={editImageUrl || recipe?.image_url}
          recipeSlug={slug}
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

      {/* Alert/Message Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </div>
  )
}
