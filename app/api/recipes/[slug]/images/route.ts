import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch recipe images by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createClient()

    // First get the recipe ID from slug
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id')
      .eq('slug', slug)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Fetch images for this recipe
    const { data: images, error: imagesError } = await supabase
      .from('recipe_images')
      .select('id, image_url, is_primary, display_order')
      .eq('recipe_id', (recipe as any).id)
      .order('display_order', { ascending: true })

    if (imagesError) {
      console.error('Error fetching images:', imagesError)
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
    }

    return NextResponse.json(images || [])
  } catch (error) {
    console.error('Error fetching recipe images:', error)
    return NextResponse.json({ error: 'Failed to fetch recipe images' }, { status: 500 })
  }
}
