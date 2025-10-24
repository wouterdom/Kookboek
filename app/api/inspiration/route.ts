import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Bericht is verplicht' },
        { status: 400 }
      )
    }

    // Use Gemini Flash-Lite for chat (as per CLAUDE.md)
    const model = genAI.getGenerativeModel({
      model: 'models/gemini-flash-lite-latest'
    })

    // Build context from history if available
    let conversationContext = ''
    if (history && Array.isArray(history)) {
      conversationContext = history
        .map((msg: { type: string; message: string }) => {
          return `${msg.type === 'user' ? 'Gebruiker' : 'AI'}: ${msg.message}`
        })
        .join('\n')
    }

    const prompt = `Je bent een behulpzame kook-assistent voor een Nederlands receptenboek app genaamd "Kookboek".
Je helpt gebruikers met receptinspiratie en kookadvies in het Nederlands.

${conversationContext ? `Vorige conversatie:\n${conversationContext}\n\n` : ''}

Nieuwe vraag van gebruiker: ${message}

BELANGRIJKE REGELS:
1. Antwoord ALTIJD in het Nederlands
2. Wees behulpzaam, vriendelijk en enthousiast over recepten
3. Geef concrete suggesties en receptnamen wanneer gevraagd
4. Als de gebruiker vraagt om een specifiek recept (bijv. "goed recept voor pasta pesto"), geef dan:
   - Een concrete titel voor het recept
   - Een korte beschrijving
   - Eventueel een korte opsomming van hoofdingrediënten
5. Blijf gefocust op het onderwerp koken en recepten
6. Houd antwoorden kort en bruikbaar (max 3-4 zinnen)

Antwoord kort en to-the-point:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({
      reply: text.trim()
    })

  } catch (error) {
    console.error('Inspiration chat error:', error)

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
      { error: 'Er ging iets mis. Probeer opnieuw.' },
      { status: 500 }
    )
  }
}
