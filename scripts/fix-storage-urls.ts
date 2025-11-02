import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixStorageUrls() {
  console.log('🔍 Checking for old storage URLs...\n')

  // Get all recipes with image URLs
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, title, image_url')
    .not('image_url', 'is', null)

  if (error) {
    console.error('❌ Error fetching recipes:', error)
    return
  }

  console.log(`Found ${recipes.length} recipes with images\n`)

  const updates: Array<{ id: string; title: string; oldUrl: string; newUrl: string }> = []

  for (const recipe of recipes) {
    let needsUpdate = false
    let newUrl = recipe.image_url

    // Check for old patterns that need fixing
    const oldPatterns = [
      // Old external URLs
      /https?:\/\/[^\/]*\.supabase\.co\/storage\/v1\/object\/public\/recipe-images\//,
      // Old internal URLs without proper path
      /https?:\/\/192\.168\.1\.63:54321\/storage\/v1\/object\/public\/(?!recipe-images\/)/,
      // URLs with incorrect bucket structure
      /\/storage\/v1\/object\/public\/recipe-images\/recipe-images\//,
    ]

    for (const pattern of oldPatterns) {
      if (pattern.test(recipe.image_url)) {
        needsUpdate = true
        break
      }
    }

    // Extract just the filename
    const filenameMatch = recipe.image_url.match(/([^\/]+\.(jpg|jpeg|png|webp|gif))$/i)

    if (needsUpdate && filenameMatch) {
      const filename = filenameMatch[1]

      // Check if file exists in storage
      const { data: files } = await supabase.storage
        .from('recipe-images')
        .list('', { search: filename })

      if (files && files.length > 0) {
        // Get public URL using the correct method
        const { data: publicUrlData } = supabase.storage
          .from('recipe-images')
          .getPublicUrl(filename)

        if (publicUrlData?.publicUrl) {
          newUrl = publicUrlData.publicUrl
          updates.push({
            id: recipe.id,
            title: recipe.title,
            oldUrl: recipe.image_url,
            newUrl
          })
        }
      } else {
        console.log(`⚠️  File not found in storage: ${filename} (${recipe.title})`)
      }
    }
  }

  if (updates.length === 0) {
    console.log('✅ No URLs need updating!')
    return
  }

  console.log(`\n📝 Found ${updates.length} URLs to update:\n`)

  for (const update of updates) {
    console.log(`Recipe: ${update.title}`)
    console.log(`  Old: ${update.oldUrl}`)
    console.log(`  New: ${update.newUrl}`)
    console.log('')
  }

  // Ask for confirmation (in production, you might want to skip this)
  console.log('Updating...\n')

  let successCount = 0
  let errorCount = 0

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ image_url: update.newUrl })
      .eq('id', update.id)

    if (updateError) {
      console.error(`❌ Error updating ${update.title}:`, updateError)
      errorCount++
    } else {
      console.log(`✅ Updated ${update.title}`)
      successCount++
    }
  }

  console.log(`\n✨ Done! ${successCount} updated, ${errorCount} errors`)
}

fixStorageUrls().catch(console.error)
