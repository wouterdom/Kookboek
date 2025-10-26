import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import type { RecipeUpdate } from '@/types/supabase'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { recipeId, title, description } = await request.json()

    if (!recipeId || !title) {
      return NextResponse.json(
        { error: 'Recipe ID and title zijn verplicht' },
        { status: 400 }
      )
    }

    console.log(`Generating image for recipe: ${title}`)

    const supabase = await createClient()

    // Get recipe slug for file naming
    const { data: recipeData, error: recipeError } = await supabase
      .from('recipes')
      .select('slug')
      .eq('id', recipeId)
      .single()

    if (recipeError || !recipeData) {
      return NextResponse.json(
        { error: 'Recept niet gevonden' },
        { status: 404 }
      )
    }

    const recipeSlug = (recipeData as any).slug

    // Build prompt for image generation
    const prompt = `Generate a beautiful, appetizing food photography image of ${title}.
${description ? description : ''}

The image should be:
- High quality, professional food photography
- Well-lit with natural lighting
- Appetizing and inviting
- Focus on the finished dish
- Restaurant-quality plating
- Warm, inviting colors
- Shallow depth of field (blurred background)
- Top-down or 45-degree angle
- Photorealistic, 4K quality

Create an image that represents this dish in the most appealing way possible.`

    console.log('Generating image with Gemini 2.5 Flash-Image...')

    // IMPORTANT: Use Gemini 2.5 Flash-Image for image generation (as per CLAUDE.md)
    const model = genAI.getGenerativeModel({
      model: 'models/gemini-2.5-flash-image'
    })

    const result = await model.generateContent([{ text: prompt }])
    const response = result.response

    // Extract generated image from response
    const generatedImage = response.candidates?.[0]?.content?.parts?.find(
      part => part.inlineData
    )

    if (!generatedImage?.inlineData) {
      throw new Error('Geen foto gegenereerd door AI')
    }

    console.log('Image generated, uploading to storage...')

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(generatedImage.inlineData.data, 'base64')

    // Upload to Supabase Storage
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${recipeSlug}-ai-${timestamp}-${randomStr}.png`
    const filepath = `${recipeSlug}/${filename}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(filepath, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      throw new Error('Foto uploaden mislukt')
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filepath)

    console.log('Image uploaded, updating recipe...')

    // Update recipe with image URL
    const updateData: RecipeUpdate = {
      image_url: publicUrl
    }

    const { error: updateError } = await supabase
      .from('recipes')
      // @ts-ignore - Supabase SSR client type inference issue
      .update(updateData)
      .eq('id', recipeId)

    if (updateError) {
      console.error('Error updating recipe:', updateError)
      // Don't fail - image is uploaded, just log the error
    }

    console.log('Recipe image generation complete!')

    return NextResponse.json({
      imageUrl: publicUrl,
      success: true
    })

  } catch (error) {
    console.error('Image generation error:', error)

    // More specific error messages
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'API limiet bereikt. Foto kan later handmatig worden toegevoegd.' },
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
      {
        error: 'Foto genereren mislukt. Je kunt later een eigen foto uploaden.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
