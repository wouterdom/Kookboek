import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Geen audio bestand ontvangen' },
        { status: 400 }
      )
    }

    // Check file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Audio bestand is te groot. Maximum is 10MB' },
        { status: 400 }
      )
    }

    console.log(`Processing audio file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`)

    // Check if audio file is too small (likely empty/silent)
    const MIN_SIZE = 20000 // 20KB minimum (at least 2-3 seconds of recording)
    if (audioFile.size < MIN_SIZE) {
      console.log('Audio file too small, likely too short recording:', audioFile.size, 'bytes')
      return NextResponse.json(
        { error: 'Opname te kort. Neem minimaal 2 seconden op met duidelijke spraak.' },
        { status: 400 }
      )
    }

    // Convert audio to base64
    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Audio = buffer.toString('base64')

    // Create Supabase client
    const supabase = await createClient()

    // Fetch grocery categories
    const { data: categories, error: categoriesError } = await supabase
      .from('grocery_categories')
      .select('id, slug, name')
      .order('order_index', { ascending: true })

    if (categoriesError) {
      console.error('Failed to fetch categories:', categoriesError)
      return NextResponse.json(
        { error: 'Kan categorieën niet laden' },
        { status: 500 }
      )
    }

    // Use Gemini Flash-Lite for audio processing (as per CLAUDE.md)
    const model = genAI.getGenerativeModel({
      model: 'models/gemini-flash-lite-latest'
    })

    const prompt = `Je bent een assistent die boodschappenlijsten verwerkt uit spraak in het Nederlands.

KRITIEKE REGEL: Als er GEEN duidelijke spraak in de audio is, retourneer dan ALLEEN dit JSON object:
{
  "error": "no_speech",
  "message": "Geen spraak gedetecteerd"
}

Als je WEL duidelijke spraak detecteert met boodschappen items, analyseer de audio en extraheer ALLE genoemde items met hun hoeveelheden.

BELANGRIJKE REGELS:
1. NOOIT items verzinnen als er geen spraak is - retourneer de error JSON
2. Identificeer elk afzonderlijk item uit de spraak
3. Extract de hoeveelheid als die wordt genoemd (bijv. "2 liter melk" → name: "melk", amount: "2 liter")
4. Als er geen hoeveelheid wordt genoemd, laat dan de hoeveelheid leeg
5. Normaliseer de namen (bijv. "appels" en "appel" worden "appels")
6. Negeer vulsels zoals "eh", "uhm", of andere niet-relevante woorden

Retourneer ALLEEN een geldig JSON object in dit EXACTE formaat (geen extra tekst ervoor of erna):
{
  "items": [
    {
      "name": "melk",
      "amount": "2 liter"
    },
    {
      "name": "appels",
      "amount": ""
    }
  ]
}

Als bepaalde informatie niet duidelijk is uit de audio, doe je beste schatting.`

    console.log('Sending audio to Gemini Flash-Lite for processing...')

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: audioFile.type,
          data: base64Audio
        }
      },
      { text: prompt }
    ])

    const response = await result.response
    const text = response.text()

    console.log('Gemini response received:', text.substring(0, 200) + '...')

    // Parse JSON from response - extract JSON from markdown code blocks if present
    let jsonText = text.trim()

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    // Find JSON object in text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Could not find JSON in response:', text)
      return NextResponse.json(
        { error: 'AI kon geen geldige lijst maken uit de opname. Probeer duidelijker te spreken.' },
        { status: 500 }
      )
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Check if the AI detected no speech
    if (parsed.error === 'no_speech') {
      console.log('AI detected no speech in audio')
      return NextResponse.json(
        { error: 'Geen spraak gedetecteerd. Spreek duidelijk je boodschappenlijst in en probeer opnieuw.' },
        { status: 400 }
      )
    }

    // Validate that we have items
    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return NextResponse.json(
        { error: 'Geen items gevonden in de opname. Probeer opnieuw en noem duidelijk de items.' },
        { status: 400 }
      )
    }

    console.log('Successfully parsed items:', parsed.items.length)

    // Import categorization function
    const { categorizeIngredient, getCategoryIdFromSlug } = await import('@/lib/ingredient-categorizer')

    // Categorize each item (process sequentially to avoid overwhelming AI)
    const categorizedItems = []
    for (const item of parsed.items) {
      // Get the category slug using AI
      const categorySlug = await categorizeIngredient(item.name, categories || [])

      // Get the category ID from the slug
      const categoryId = getCategoryIdFromSlug(categorySlug, categories || [])

      // Fallback to first category if no match
      const finalCategoryId = categoryId || ((categories && categories[0]) ? (categories[0] as any).id : "") || ""

      categorizedItems.push({
        name: item.name,
        amount: item.amount || undefined,
        category_id: finalCategoryId
      })
    }

    return NextResponse.json({
      items: categorizedItems,
      transcript: text // Include full response for debugging
    })

  } catch (error) {
    console.error('Voice processing error:', error)

    // More specific error messages
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'API limiet bereikt. Probeer later opnieuw.' },
          { status: 429 }
        )
      }
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Server configuratie fout. Neem contact op met de beheerder.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Er ging iets mis bij het verwerken van de opname. Probeer opnieuw.' },
      { status: 500 }
    )
  }
}
