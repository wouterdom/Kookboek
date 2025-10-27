/**
 * Migration script to move images from flat 'recipe-images/' structure
 * to organized recipe slug folders
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ImageToMigrate {
  currentPath: string
  recipeSlug: string
  filename: string
  newPath: string
}

async function migrateImages() {
  console.log('Starting image migration...\n')

  // Step 1: Get all images from the 'recipe-images/' subfolder
  const { data: files, error: listError } = await supabase.storage
    .from('recipe-images')
    .list('recipe-images', {
      limit: 1000,
      offset: 0,
    })

  if (listError) {
    console.error('Error listing files:', listError)
    return
  }

  if (!files || files.length === 0) {
    console.log('No files found in recipe-images/ subfolder. Migration complete!')
    return
  }

  console.log(`Found ${files.length} files in recipe-images/ subfolder\n`)

  // Step 2: Get all recipes to match images to recipe slugs
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('id, slug, title, image_url')

  if (recipesError) {
    console.error('Error fetching recipes:', recipesError)
    return
  }

  console.log(`Found ${recipes?.length || 0} recipes\n`)

  // Step 3: Match images to recipes and create migration plan
  const imagesToMigrate: ImageToMigrate[] = []

  for (const file of files) {
    const currentPath = `recipe-images/${file.name}`
    const filename = file.name

    // Try to extract recipe slug from filename
    // Format: recipe-slug-timestamp-random.ext or just filename.ext
    let recipeSlug: string | undefined

    // First, check if any recipe's image_url contains this filename
    const matchingRecipe = recipes?.find(r =>
      r.image_url && r.image_url.includes(filename)
    )

    if (matchingRecipe) {
      recipeSlug = matchingRecipe.slug
    } else {
      // Try to extract from filename pattern
      // Look for pattern: slug-timestamp-random.ext
      const parts = filename.split('-')
      if (parts.length >= 3) {
        // Try to find matching recipe by reconstructing slug
        for (let i = parts.length - 2; i > 0; i--) {
          const potentialSlug = parts.slice(0, i).join('-')
          const recipe = recipes?.find(r => r.slug === potentialSlug)
          if (recipe) {
            recipeSlug = recipe.slug
            break
          }
        }
      }
    }

    if (recipeSlug) {
      imagesToMigrate.push({
        currentPath,
        recipeSlug,
        filename,
        newPath: `${recipeSlug}/${filename}`
      })
    } else {
      console.log(`⚠️  Could not find recipe for: ${filename}`)
    }
  }

  console.log(`\nMigration plan: ${imagesToMigrate.length} images to move\n`)

  // Step 4: Perform the migration
  let successCount = 0
  let errorCount = 0

  for (const image of imagesToMigrate) {
    console.log(`Moving: ${image.currentPath} -> ${image.newPath}`)

    try {
      // Copy file to new location
      const { data: copyData, error: copyError } = await supabase.storage
        .from('recipe-images')
        .copy(image.currentPath, image.newPath)

      if (copyError) {
        console.error(`  ❌ Copy error:`, copyError.message)
        errorCount++
        continue
      }

      // Update database URLs
      const oldUrl = `recipe-images/${image.filename}`
      const newUrl = `${image.recipeSlug}/${image.filename}`

      // Update recipes table
      await supabase
        .from('recipes')
        .update({
          image_url: supabase.storage
            .from('recipe-images')
            .getPublicUrl(image.newPath).data.publicUrl
        })
        .eq('slug', image.recipeSlug)
        .like('image_url', `%${image.filename}%`)

      // Update recipe_images table
      await supabase
        .from('recipe_images')
        .update({
          image_url: supabase.storage
            .from('recipe-images')
            .getPublicUrl(image.newPath).data.publicUrl
        })
        .eq('recipe_id', (await supabase.from('recipes').select('id').eq('slug', image.recipeSlug).single()).data?.id)
        .like('image_url', `%${image.filename}%`)

      // Delete old file
      const { error: deleteError } = await supabase.storage
        .from('recipe-images')
        .remove([image.currentPath])

      if (deleteError) {
        console.error(`  ⚠️  Delete error (old file):`, deleteError.message)
      }

      console.log(`  ✅ Success`)
      successCount++
    } catch (error) {
      console.error(`  ❌ Error:`, error)
      errorCount++
    }
  }

  console.log(`\n✅ Migration complete!`)
  console.log(`   Success: ${successCount}`)
  console.log(`   Errors: ${errorCount}`)
}

// Run migration
migrateImages()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
