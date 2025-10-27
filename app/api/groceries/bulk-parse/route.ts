import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { categorizeIngredient, getCategoryIdFromSlug } from "@/lib/ingredient-categorizer"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      )
    }

    // Initialize GenAI inside the function to ensure env vars are loaded
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      console.error("GOOGLE_AI_API_KEY is not set")
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    // Create Supabase client
    const supabase = await createClient()

    // Fetch grocery categories
    const { data: categories, error: categoriesError } = await supabase
      .from("grocery_categories")
      .select("id, slug, name")
      .order("order_index", { ascending: true })

    if (categoriesError) {
      console.error("Failed to fetch categories:", categoriesError)
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      )
    }

    // Use Gemini AI to parse the shopping list
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-lite-latest"
    })

    const prompt = `Je bent een assistent die boodschappenlijsten verwerkt.

Gegeven de volgende tekst, extract ALLE voedingsmiddelen/boodschappen items met hun hoeveelheid.

BELANGRIJKE REGELS:
1. Identificeer elk afzonderlijk item
2. Extract de hoeveelheid als die wordt genoemd (bijv. "2 liter", "500 gram", "3 stuks")
3. Als er geen hoeveelheid wordt genoemd, laat dan de hoeveelheid leeg
4. Negeer irrelevante tekst of vulsels
5. Normaliseer de namen (bijv. "appels" en "appel" worden "appels")

TEKST:
${text}

Geef het antwoord als een JSON array met objecten in het volgende formaat:
[
  {
    "name": "melk",
    "amount": "2 liter"
  },
  {
    "name": "appels",
    "amount": ""
  }
]

Geef ALLEEN de JSON array terug, zonder extra tekst of markdown.`

    const result = await model.generateContent(prompt)
    const response = result.response
    let aiText = response.text()

    // Clean up markdown code blocks if present
    aiText = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()

    // Parse the AI response
    let parsedItems: Array<{ name: string; amount?: string }>
    try {
      parsedItems = JSON.parse(aiText)
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiText)
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      )
    }

    if (!Array.isArray(parsedItems)) {
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      )
    }

    // Categorize each item (process sequentially to avoid overwhelming AI)
    const items = []
    for (const item of parsedItems) {
      // Get the category slug using AI
      const categorySlug = await categorizeIngredient(item.name, categories || [])

      // Get the category ID from the slug
      const categoryId = getCategoryIdFromSlug(categorySlug, categories || [])

      // Fallback to first category if no match
      const finalCategoryId = categoryId || ((categories && categories[0]) ? (categories[0] as any).id : "") || ""

      items.push({
        name: item.name,
        amount: item.amount || undefined,
        category_id: finalCategoryId
      })
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Error parsing bulk items:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
