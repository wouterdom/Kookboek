// Run site_credentials table migration
const fs = require('fs')
const path = require('path')

async function runMigration() {
  try {
    // Use node-postgres if available, otherwise use fetch with Supabase
    const { createClient } = require('@supabase/supabase-js')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const sql = fs.readFileSync(path.join(__dirname, 'create-site-credentials-table.sql'), 'utf8')

    console.log('Running migration...')
    console.log(sql)
    console.log('\n---\n')

    // Split by semicolon and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })
        if (error) {
          console.error(`Error:`, error)
        } else {
          console.log('✓ Success')
        }
      }
    }

    console.log('\n✅ Migration completed!')

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
