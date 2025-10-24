// Run site_credentials table migration
const fs = require('fs')
const path = require('path')

const DATABASE_URL = "postgresql://postgres:P93QBHIywFOImydjBtGspqyn7kYoGBQXwQKbZfgMNME=@192.168.1.63:5432/postgres"

async function runMigration() {
  try {
    // Use node-postgres if available, otherwise use fetch with Supabase
    const { createClient } = require('@supabase/supabase-js')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://192.168.1.63:8000'
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MzM4NzM0MDAsCiAgImV4cCI6IDE4OTE2NDAyMDAKfQ.Bc3e8FPa-xWVWDCxnewD0_njnU-WOtGGvxeRN4-NiRI'

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
