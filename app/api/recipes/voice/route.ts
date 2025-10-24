import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

    // Convert audio to base64
    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Audio = buffer.toString('base64')

    // Use Gemini Flash-Lite for audio processing (as per CLAUDE.md)
    const model = genAI.getGenerativeModel({
      model: 'models/gemini-flash-lite-latest'
    })

    const prompt = `Je bent een recept-extractie assistent. De gebruiker heeft een recept ingesproken in het Nederlands.

Analyseer de audio en extraheer de volgende informatie:
- Titel van het recept
- Korte beschrijving (optioneel, als de gebruiker een beschrijving geeft)
- Lijst met ingrediënten met hoeveelheden (elk ingrediënt op een nieuwe regel)
- Bereidingsinstructies (genummerde stappen, elk op een nieuwe regel)
- Voorbereidingstijd in minuten (schatting als niet genoemd)
- Bereidingstijd in minuten (schatting als niet genoemd)
- Aantal porties (schatting als niet genoemd)
- Moeilijkheidsgraad: "easy", "medium", of "hard" (schatting gebaseerd op complexiteit)
- Gang: Classificeer het recept in EXACT ÉÉN van deze categorieën: "Amuse", "Voorgerecht", "Soep", "Hoofdgerecht", "Dessert", "Bijgerecht"

BELANGRIJKE REGELS:
1. Als de gebruiker "oma's appeltaart" zegt, schrijf het dan met hoofdletter: "Oma's Appeltaart"
2. Ingrediënten moeten specifiek zijn met hoeveelheden (bijv. "250g bloem", niet alleen "bloem")
3. Bereidingsstappen moeten genummerd zijn (1., 2., 3., etc.)
4. Als tijden niet genoemd worden, schat deze realistisch
5. Gang moet ALTIJD ingevuld zijn met EXACT één van deze 6 opties: Amuse, Voorgerecht, Soep, Hoofdgerecht, Dessert, Bijgerecht
6. Voorbeelden: pasta/vlees/vis = Hoofdgerecht, salade als starter = Voorgerecht, taart = Dessert, groenten als side = Bijgerecht

Retourneer ALLEEN een geldig JSON object in dit EXACTE formaat (geen extra tekst ervoor of erna):
{
  "title": "Titel van het recept",
  "description": "Korte beschrijving van het recept",
  "ingredients": ["250g bloem", "3 eieren", "200g suiker"],
  "instructions": "1. Eerste stap\\n2. Tweede stap\\n3. Derde stap",
  "prep_time": 20,
  "cook_time": 45,
  "servings": 4,
  "difficulty": "medium",
  "gang": "Dessert"
}

Als bepaalde velden niet duidelijk zijn uit de audio, doe je beste schatting.`

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
        { error: 'AI kon geen geldig recept maken uit de opname. Probeer duidelijker te spreken.' },
        { status: 500 }
      )
    }

    const recipe = JSON.parse(jsonMatch[0])

    // Validate that we at least have a title
    if (!recipe.title) {
      return NextResponse.json(
        { error: 'AI kon geen titel vinden in de opname. Probeer opnieuw en begin met "Ik ga een recept maken voor..."' },
        { status: 400 }
      )
    }

    // Ensure ingredients is an array
    if (!Array.isArray(recipe.ingredients)) {
      recipe.ingredients = []
    }

    // Ensure instructions is a string
    if (typeof recipe.instructions !== 'string') {
      recipe.instructions = ''
    }

    console.log('Successfully parsed recipe:', recipe.title)

    return NextResponse.json({
      recipe,
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
