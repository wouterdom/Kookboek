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

async function checkUrls() {
  console.log('🔍 Checking all image URLs in database...\n')

  // Get all recipes with image URLs
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, title, image_url')
    .not('image_url', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching recipes:', error)
    return
  }

  console.log(`Found ${recipes.length} recipes with images\n`)

  // Group by URL pattern
  const urlPatterns = {}

  for (const recipe of recipes) {
    const url = recipe.image_url

    // Extract the base pattern
    let pattern = 'unknown'

    if (url.includes('192.168.1.63:54321')) {
      pattern = '192.168.1.63:54321 (internal - correct port)'
    } else if (url.includes('192.168.1.63:54322')) {
      pattern = '192.168.1.63:54322 (internal - WRONG port)'
    } else if (url.includes('192.168.1.63')) {
      pattern = '192.168.1.63 (internal - unknown port)'
    } else if (url.includes('supabase.co')) {
      pattern = 'supabase.co (external - old)'
    } else if (url.startsWith('http')) {
      pattern = 'other http(s)'
    } else {
      pattern = 'relative or unknown'
    }

    if (!urlPatterns[pattern]) {
      urlPatterns[pattern] = []
    }

    urlPatterns[pattern].push({
      title: recipe.title,
      url: url
    })
  }

  // Display grouped results
  console.log('URLs grouped by pattern:\n')

  for (const [pattern, items] of Object.entries(urlPatterns)) {
    console.log(`\n📁 ${pattern} (${items.length} recipes)`)
    console.log('─'.repeat(80))

    for (const item of items.slice(0, 3)) {  // Show first 3 examples
      console.log(`  ${item.title}`)
      console.log(`  → ${item.url}`)
      console.log('')
    }

    if (items.length > 3) {
      console.log(`  ... and ${items.length - 3} more`)
      console.log('')
    }
  }
}

checkUrls().catch(console.error)
