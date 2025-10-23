import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const recipeSlug = formData.get('recipeSlug') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!recipeSlug) {
      return NextResponse.json({ error: 'Recipe slug is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `${recipeSlug}-${timestamp}-${randomStr}.${extension}`
    const filepath = `${recipeSlug}/${filename}`

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .upload(filepath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Error uploading image:', error)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filepath)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filepath
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
