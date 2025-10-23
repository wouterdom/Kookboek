-- Create pdf_import_jobs table for tracking PDF imports
CREATE TABLE IF NOT EXISTS pdf_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  total_pages INTEGER,
  current_page INTEGER DEFAULT 0,
  recipes_found INTEGER DEFAULT 0,
  recipes_imported INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_import_jobs_status ON pdf_import_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_import_jobs_created_at ON pdf_import_jobs(created_at DESC);

-- Add columns to recipes table to track PDF source
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS pdf_import_job_id UUID REFERENCES pdf_import_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pdf_source_pages INTEGER[];

-- Add index on recipes for pdf imports
CREATE INDEX IF NOT EXISTS idx_recipes_pdf_import_job ON recipes(pdf_import_job_id) WHERE pdf_import_job_id IS NOT NULL;

-- Add comment
COMMENT ON TABLE pdf_import_jobs IS 'Tracks PDF cookbook import jobs for bulk recipe extraction';
