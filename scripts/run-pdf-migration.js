/**
 * Run PDF Import Migration
 *
 * This script applies the pdf_import_jobs table migration
 */

const fs = require('fs');
const path = require('path');

// Read the SQL migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250123001_create_pdf_import_jobs.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('Running PDF import migration...');
console.log('SQL:', migrationSQL);
console.log('\nPlease run this SQL in your Supabase SQL editor or using psql');
console.log('\nOr use the DATABASE_URL environment variable with:');
console.log('node -e "require(\'pg\').Pool({connectionString:process.env.DATABASE_URL}).query(require(\'fs\').readFileSync(\'./supabase/migrations/20250123001_create_pdf_import_jobs.sql\',\'utf8\'))"');
