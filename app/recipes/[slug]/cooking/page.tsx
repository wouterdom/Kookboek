"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Printer,
  Clock,
  Signal,
  Users,
  Minus,
  Plus,
  BookOpen,
  ChefHat,
  ListChecks,
  LayoutGrid,
  ExternalLink,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Recipe, ParsedIngredient } from "@/types/supabase"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { ChefTip } from "@/components/chef-tip"

export default function CookingModePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [ingredients, setIngredients] = useState<ParsedIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [servings, setServings] = useState<number | null>(null)
  const [baseServings, setBaseServings] = useState<number | null>(null)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [slug, setSlug] = useState<string>('')

  // Unwrap params on mount
  useEffect(() => {
    params.then(p => setSlug(p.slug))
  }, [params])

  // Auto-print if print parameter is present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get('print') === 'true' && !loading && recipe) {
        // Small delay to ensure everything is rendered
        setTimeout(() => {
          window.print()
        }, 500)
      }
    }
  }, [loading, recipe])

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

  const adjustServings = (delta: number) => {
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

    const rounded = Math.round(scaledAmount * 4) / 4
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

  // Parse markdown instructions into steps if they exist
  const parseInstructions = (markdown: string | null) => {
    if (!markdown) return []

    // Try to split by numbered list (1. 2. 3.) or by double line breaks
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

  const instructionSteps = parseInstructions(recipe.content_markdown)

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <header className="no-print sticky top-0 z-50 w-full border-b bg-white shadow-sm">
        <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Terug</span>
          </button>

          {/* Mode Toggle */}
          <div className="relative inline-flex rounded-lg bg-gray-200 p-1">
            <button
              onClick={() => router.push(`/recipes/${slug}`)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Normaal</span>
            </button>
            <button
              className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium shadow-sm"
            >
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">Koken</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 py-6">
        {/* Compact Title Section */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm sm:p-6">
          <h1 className="mb-3 font-serif text-2xl font-bold sm:text-3xl">
            {recipe.title}
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {totalTime > 0 && (
              <>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{totalTime} min</span>
                </div>
                <span className="text-gray-300">•</span>
              </>
            )}
            {recipe.difficulty && (
              <>
                <div className="flex items-center gap-1">
                  <Signal className="h-4 w-4" />
                  <span>{recipe.difficulty}</span>
                </div>
                <span className="text-gray-300">•</span>
              </>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <button
                onClick={() => adjustServings(-1)}
                disabled={servings === null || servings <= 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-border bg-white transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-semibold text-foreground">{servings ?? '?'}</span>
              <button
                onClick={() => adjustServings(1)}
                className="flex h-7 w-7 items-center justify-center rounded border border-border bg-white transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Plus className="h-3 w-3" />
              </button>
              <span>porties</span>
            </div>
            {recipe.source_name && (
              <>
                <span className="hidden text-gray-300 sm:inline">•</span>
                {recipe.source_url ? (
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden items-center gap-1 sm:flex hover:text-primary transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>{recipe.source_name}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <div className="hidden items-center gap-1 sm:flex">
                    <BookOpen className="h-4 w-4" />
                    <span>{recipe.source_name}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Side by Side: Ingredients & Instructions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* LEFT: Ingredients (Sticky on desktop) */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
              <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold">
                <ListChecks className="h-5 w-5 text-primary" />
                Ingrediënten
              </h2>

              <div className="space-y-1">
                {ingredients.length > 0 ? ingredients.map((ingredient, index) => (
                  <div key={ingredient.id}>
                    {ingredient.section && (index === 0 || ingredients[index - 1]?.section !== ingredient.section) && (
                      <h3 className="mb-2 mt-4 text-sm font-semibold text-foreground">
                        {ingredient.section}
                      </h3>
                    )}
                    <label
                      className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checkedIngredients.has(ingredient.id)}
                        onChange={() => toggleIngredient(ingredient.id)}
                        className="mt-0.5 h-5 w-5 cursor-pointer rounded border-2 border-border transition-all checked:border-primary checked:bg-primary"
                      />
                      <span className={`flex-1 text-sm ${checkedIngredients.has(ingredient.id) ? 'opacity-50 line-through' : ''}`}>
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
                  <p className="text-sm text-muted-foreground">Geen ingrediënten beschikbaar</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Instructions (Scrollable) */}
          <div className="lg:col-span-3">
            <div className="rounded-lg bg-white p-4 shadow-sm sm:p-6">
              <h2 className="mb-6 flex items-center gap-2 font-serif text-xl font-semibold">
                <ChefHat className="h-5 w-5 text-primary" />
                Bereidingswijze
              </h2>

              {instructionSteps.length > 0 ? (
                <div className="space-y-6">
                  {instructionSteps.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="leading-relaxed text-gray-700">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                recipe.content_markdown && (
                  <div className="prose prose-lg max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                    >
                      {recipe.content_markdown}
                    </ReactMarkdown>
                  </div>
                )
              )}

              {/* Chef Tip - Notities */}
              {recipe.notes && (
                <ChefTip content={recipe.notes} />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }

          /* Hide non-essential elements */
          .no-print {
            display: none !important;
          }

          /* Reset sticky positioning for print */
          .lg\\:sticky {
            position: relative !important;
            max-height: none !important;
          }

          /* Ensure grid layout works in print */
          .grid {
            display: grid !important;
          }

          /* Force side-by-side layout on print */
          .lg\\:grid-cols-5 {
            grid-template-columns: 2fr 3fr !important;
          }

          /* Remove shadows and backgrounds for cleaner print */
          .shadow-sm {
            box-shadow: none !important;
          }

          .bg-gray-50 {
            background-color: white !important;
          }

          /* Ensure ingredients don't break across pages */
          .lg\\:col-span-2 > div {
            break-inside: avoid !important;
          }

          /* Compact spacing */
          .space-y-6 > div {
            margin-bottom: 0.75rem !important;
          }

          /* Hide checkboxes in print */
          input[type="checkbox"] {
            display: none !important;
          }

          /* Remove line-through from checked ingredients in print */
          .line-through {
            text-decoration: none !important;
            opacity: 1 !important;
          }

          /* Ensure text is black for better print quality */
          body {
            color: black !important;
          }
        }
      `}</style>
    </div>
  )
}
