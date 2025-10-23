import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/import-pdf-status/[jobId]
 *
 * Get status of a specific PDF import job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  try {
    const supabase = await createClient()

    const { data: job, error } = await supabase
      .from('pdf_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job niet gevonden' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ job })

  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error)
    return NextResponse.json(
      {
        error: 'Kon job status niet ophalen',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
