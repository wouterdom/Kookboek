import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/import-pdf-status/active
 *
 * Get the most recent active or recently completed PDF import job
 * Used by the processing banner
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the most recent job that's either processing or recently completed (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: job, error } = await supabase
      .from('pdf_import_jobs')
      .select('*')
      .or(`status.eq.processing,and(status.eq.completed,completed_at.gte.${fiveMinutesAgo})`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // No active job found (which is fine)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ job: null })
      }
      throw error
    }

    return NextResponse.json({ job })

  } catch (error) {
    console.error('Error fetching active job:', error)
    return NextResponse.json(
      {
        error: 'Kon status niet ophalen',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
