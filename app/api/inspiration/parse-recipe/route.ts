import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Bericht is verplicht' },
        { status: 400 }
      )
    }

    // Use Gemini Flash-Lite to parse the chat message into a structured recipe
    const model = genAI.getGenerativeModel({
      model: 'models/gemini-flash-lite-latest'
    })

    const prompt = `Je bent een professionele recept-curator voor een Nederlands receptenboek. Je krijgt een AI chat bericht over een recept.

Je taak is om dit bericht om te zetten in een COMPLEET, PROFESSIONEEL recept dat direct bruikbaar is in een kookboek.

BERICHT OM TE PARSEREN:
${message}

ANALYSEER en CREËER het volgende:

1. **Titel**: Aantrekkelijke, duidelijke naam (als het bericht een titel heeft tussen ** **, gebruik die)

2. **Beschrijving**: Een korte, smakelijke beschrijving van 1-2 zinnen. Vermeld belangrijke kenmerken zoals "authentiek", "zonder room", "traditioneel", etc.

3. **Ingrediënten**:
   - ALTIJD voor EXACT 4 PERSONEN (tenzij anders vermeld in het bericht)
   - ALTIJD specifieke hoeveelheden (bijv. "400g spaghetti", "4 eieren", "100g Pecorino Romano")
   - Als het bericht ingrediënten noemt zonder hoeveelheden: gebruik standaard recepthoeveelheden voor 4 personen
   - Gebruik realistische, authentieke hoeveelheden
   - Voorbeelden:
     * Pasta hoofdgerecht: 400g pasta voor 4 personen
     * Eieren voor carbonara: 4 stuks voor 4 personen
     * Kaas: 100-150g afhankelijk van het gerecht
     * Groenten: 500-600g voor 4 personen

4. **Bereidingswijze**:
   - Schrijf GEDETAILLEERDE, PROFESSIONELE stappen
   - Elk stap moet duidelijk en compleet zijn
   - Voeg praktische tips toe (bijv. temperaturen, timing, technieken)
   - Nummeer elke stap (1., 2., 3., etc.)
   - Als het bericht slechts een hint geeft, werk dit uit tot volledige stappen
   - Voorbeeld: Niet "Kook de pasta", maar "Breng een grote pan met ruim gezouten water aan de kook. Voeg de spaghetti toe en kook deze volgens de verpakking al dente (circa 10 minuten)."

5. **Tijden**:
   - Voorbereidingstijd: realistische schatting in minuten
   - Bereidingstijd: realistische schatting in minuten

6. **Porties**: Standaard 4 (tenzij anders vermeld)

7. **Moeilijkheidsgraad**: "easy", "medium", of "hard" (gebaseerd op technieken en tijdsinvestering)

8. **Gang**: EXACT ÉÉN van: "Amuse", "Voorgerecht", "Soep", "Hoofdgerecht", "Dessert", "Bijgerecht"

BELANGRIJKE REGELS:
- GEEN "hoeveelheid niet gespecificeerd" - bereken altijd specifieke hoeveelheden
- Bereidingsstappen moeten zo geschreven zijn dat iemand die niet kan koken het recept kan volgen
- Gebruik professionele maar toegankelijke taal
- Respecteer authenticiteit als vermeld (bijv. "geen room in carbonara")
- Wees consistent met Nederlandse maten (gram, eetlepel, etc.)

Retourneer ALLEEN een geldig JSON object in dit EXACTE formaat (geen extra tekst):
{
  "title": "Titel van het recept",
  "description": "Korte, smakelijke beschrijving",
  "ingredients": ["400g spaghetti", "4 eieren", "100g Pecorino Romano", "100g guanciale", "zwarte peper naar smaak"],
  "instructions": "1. Breng een grote pan met ruim gezouten water aan de kook.\\n2. Snijd de guanciale in blokjes van ongeveer 1cm en bak deze op middelhoog vuur in een koekenpan tot ze knapperig en goudbruin zijn (ongeveer 5-7 minuten).\\n3. Klop intussen de eieren in een kom en meng hier de geraspte Pecorino Romano doorheen. Voeg royaal gemalen zwarte peper toe.\\n4. Kook de spaghetti al dente volgens de verpakking (circa 10 minuten).\\n5. Bewaar een kopje pastakookwater. Giet de pasta af en doe deze direct in de pan met guanciale (van het vuur).\\n6. Voeg het eimengsel toe en roer snel door, waarbij je het pastakookwater beetje bij beetje toevoegt tot een romige saus ontstaat.\\n7. Serveer direct met extra Pecorino en zwarte peper.",
  "prep_time": 10,
  "cook_time": 15,
  "servings": 4,
  "difficulty": "medium",
  "gang": "Hoofdgerecht"
}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log('Gemini parse response:', text.substring(0, 200) + '...')

    // Parse JSON from response
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
        { error: 'Kon geen geldig recept maken uit dit bericht. Probeer opnieuw.' },
        { status: 500 }
      )
    }

    const recipe = JSON.parse(jsonMatch[0])

    // Validate that we at least have a title
    if (!recipe.title) {
      return NextResponse.json(
        { error: 'Kon geen titel vinden in het bericht.' },
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

    return NextResponse.json({ recipe })

  } catch (error) {
    console.error('Recipe parsing error:', error)

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
      { error: 'Er ging iets mis bij het verwerken. Probeer opnieuw.' },
      { status: 500 }
    )
  }
}
