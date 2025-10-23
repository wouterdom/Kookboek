import { createClient } from '@/lib/supabase/client'

export async function uploadRecipeImage(file: File): Promise<string | null> {
  const supabase = createClient()

  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const filePath = `recipes/${fileName}`

    // Upload file to Supabase Storage
    const { error: uploadError, data } = await supabase.storage
      .from('recipe-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    return null
  }
}

export async function deleteRecipeImage(url: string): Promise<boolean> {
  const supabase = createClient()

  try {
    // Extract file path from URL
    const urlParts = url.split('/recipe-images/')
    if (urlParts.length !== 2) return false

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('recipe-images')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting image:', error)
    return false
  }
}