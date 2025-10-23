import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const supabaseUrl = 'http://192.168.1.63:8000'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.WlwUOz5EkFPO893iYN3f_bJ4GBthoDt88iaqZHdZWQ8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function downloadImage(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`)
  return Buffer.from(await response.arrayBuffer())
}

async function uploadImageToSupabase(imageBuffer, slug, filename) {
  const filepath = `${slug}/${filename}`

  const { data, error } = await supabase.storage
    .from('recipe-images')
    .upload(filepath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    })

  if (error) {
    console.error('Upload error:', error)
    throw error
  }

  const { data: { publicUrl } } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(filepath)

  return publicUrl
}

async function updateRecipeImage(slug, imageUrl) {
  const { error } = await supabase
    .from('recipes')
    .update({ image_url: imageUrl })
    .eq('slug', slug)

  if (error) {
    console.error('Update error:', error)
    throw error
  }
}

async function fixImages() {
  console.log('Starting image fix...')

  // Image URLs for each recipe
  const images = {
    'balletjes-in-tomatensaus': 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=1200&h=800&fit=crop&q=80', // Meatballs in tomato sauce
    'paprikasoep-met-kruidenkaas': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&h=800&fit=crop&q=80' // Red pepper soup
  }

  for (const [slug, imageUrl] of Object.entries(images)) {
    try {
      console.log(`\nProcessing ${slug}...`)
      console.log(`Downloading image from ${imageUrl}`)

      const imageBuffer = await downloadImage(imageUrl)
      console.log(`Downloaded ${imageBuffer.length} bytes`)

      const timestamp = Date.now()
      const filename = `${slug}-${timestamp}.jpg`
      console.log(`Uploading as ${filename}`)

      const publicUrl = await uploadImageToSupabase(imageBuffer, slug, filename)
      console.log(`Uploaded to ${publicUrl}`)

      await updateRecipeImage(slug, publicUrl)
      console.log(`✅ Updated recipe image for ${slug}`)
    } catch (error) {
      console.error(`❌ Failed to process ${slug}:`, error.message)
    }
  }

  console.log('\n✨ Done!')
}

fixImages()
