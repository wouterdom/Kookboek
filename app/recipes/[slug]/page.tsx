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
  const [servings, setServings] = useState(4)
  const [baseServings, setBaseServings] = useState(4)
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
        setServings(recipeData.servings_default || 4)
        setBaseServings(recipeData.servings_default || 4)
        setIsFavorite(recipeData.is_favorite || false)
        setNotes(recipeData.notes || '')
        setLabels(recipeData.labels || [])

        // Fetch ingredients
        const { data: ingredientsData, error: ingredientsError } = await supabase
          .from('parsed_ingredients')
          .select('*')
          .eq('recipe_id', recipeData.id)
          .order('order_index')

        if (!ingredientsError && ingredientsData) {
          setIngredients(ingredientsData)
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
        alert(error.error || 'Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Failed to create category')
    }
  }

  const adjustServings = (delta: number) => {
    const newServings = servings + delta
    if (newServings >= 1) {
      setServings(newServings)
    }
  }

  const scaleAmount = (amount: number | null, scalable: boolean) => {
    if (!amount || !scalable) return amount
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
            Terug
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className="btn btn-primary btn-sm flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              {isEditMode ? 'Opslaan' : 'Bewerk'}
            </button>
            <button
              onClick={() => window.print()}
              className="btn btn-outline btn-sm flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <Card className="overflow-hidden print-recipe">
          {/* Hero Image */}
          <div className="relative h-96 w-full">
            <Image
              src={
                recipe.image_url ||
                "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&h=600&fit=crop"
              }
              alt={recipe.title}
              fill
              className="object-cover"
              unoptimized
            />
            <button className="no-print absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-white/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur transition-all hover:bg-white">
              <Bookmark className="h-4 w-4" />
              Bewaar
            </button>
          </div>

          {/* Recipe Content */}
          <div className="p-8">
            {/* Title and Description */}
            <div className="mb-6">
              <h1 className="mb-3 font-serif text-4xl font-bold">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="text-lg text-muted-foreground">
                  {recipe.description}
                </p>
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
                      className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1"
                      style={category ? getCategoryStyle(category.color) : undefined}
                    >
                      <span>{label}</span>
                      {isEditingLabels && (
                        <button
                          onClick={() => removeLabel(label)}
                          className="ml-1 hover:opacity-70"
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
            <div className="mb-8 flex flex-wrap gap-3">
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
                    className="flex h-6 w-6 items-center justify-center rounded border border-border bg-background transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span>{servings}</span>
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
            </div>

            <div className="my-6 h-px bg-border" />

            {/* Tabs */}
            <div className="mb-6 flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab("ingredients")}
                className={`border-b-2 px-6 py-3 font-medium transition-all ${
                  activeTab === "ingredients"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Ingrediënten
              </button>
              <button
                onClick={() => setActiveTab("instructions")}
                className={`border-b-2 px-6 py-3 font-medium transition-all ${
                  activeTab === "instructions"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Bereidingswijze
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`no-print border-b-2 px-6 py-3 font-medium transition-all ${
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
                <h2 className="mb-4 font-serif text-2xl font-semibold">
                  Ingrediënten
                </h2>
                <div className="space-y-1">
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
                          <strong>{ingredient.amount_display}</strong> {ingredient.ingredient_name_nl}
                        </span>
                      </label>
                    </div>
                  )) : (
                    <p className="text-muted-foreground">Geen ingrediënten beschikbaar</p>
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
              </div>
            )}

            {/* Tab Content: Notes */}
            {activeTab === "notes" && (
              <div>
                <h2 className="mb-6 font-serif text-2xl font-semibold">
                  Notities
                </h2>
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
    </div>
  )
}
