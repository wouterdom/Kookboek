import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

  const updates = []
  const issues = []

  for (const recipe of recipes) {
    const imageUrl = recipe.image_url
    let needsUpdate = false
    let newUrl = imageUrl

    // Check for old patterns that need fixing
    const oldPatterns = [
      // Old external URLs pointing to wrong domain
      /https?:\/\/[^\/]*\.supabase\.co\/storage\/v1\/object\/public\/recipe-images\//,
      // Old internal URLs without proper path
      /https?:\/\/192\.168\.1\.63:54321\/storage\/v1\/object\/public\/(?!recipe-images\/)/,
      // URLs with incorrect bucket structure (double recipe-images)
      /\/storage\/v1\/object\/public\/recipe-images\/recipe-images\//,
      // Wrong port
      /192\.168\.1\.63:54322/,
    ]

    for (const pattern of oldPatterns) {
      if (pattern.test(imageUrl)) {
        needsUpdate = true
        break
      }
    }

    // Also check if URL is accessible
    if (imageUrl.includes('192.168.1.63')) {
      const correctUrl = imageUrl.replace('192.168.1.63:54322', '192.168.1.63:54321')
      if (correctUrl !== imageUrl) {
        needsUpdate = true
      }
    }

    if (needsUpdate) {
      // Extract just the filename
      const filenameMatch = imageUrl.match(/([^\/]+\.(jpg|jpeg|png|webp|gif))$/i)

      if (filenameMatch) {
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
              oldUrl: imageUrl,
              newUrl
            })
          }
        } else {
          issues.push({
            title: recipe.title,
            url: imageUrl,
            filename,
            reason: 'File not found in storage'
          })
        }
      } else {
        issues.push({
          title: recipe.title,
          url: imageUrl,
          reason: 'Could not extract filename'
        })
      }
    }
  }

  if (issues.length > 0) {
    console.log(`⚠️  Found ${issues.length} issues:\n`)
    for (const issue of issues) {
      console.log(`Recipe: ${issue.title}`)
      console.log(`  URL: ${issue.url}`)
      console.log(`  Issue: ${issue.reason}`)
      if (issue.filename) {
        console.log(`  Filename: ${issue.filename}`)
      }
      console.log('')
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
