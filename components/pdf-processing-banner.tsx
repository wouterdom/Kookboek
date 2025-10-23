'use client'

import { useState, useEffect } from 'react'
import { X, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface PdfImportJob {
  id: string
  filename: string
  file_size: number
  status: 'processing' | 'completed' | 'failed'
  total_pages: number
  current_page: number
  recipes_found: number
  recipes_imported: number
  error_message?: string
  created_at: string
  completed_at?: string
}

export function PdfProcessingBanner() {
  const [activeJob, setActiveJob] = useState<PdfImportJob | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check localStorage for active job
    const storedJobId = localStorage.getItem('active_pdf_import')
    if (!storedJobId) return

    // Poll for job status every 2 seconds
    const pollJob = async () => {
      try {
        const response = await fetch('/api/import-pdf-status/active')
        const data = await response.json()

        if (data.job) {
          setActiveJob(data.job)

          // If job is completed or failed, stop polling after 5 seconds
          if (data.job.status === 'completed' || data.job.status === 'failed') {
            setTimeout(() => {
              // Only auto-dismiss completed jobs, keep failed ones visible
              if (data.job.status === 'completed') {
                localStorage.removeItem('active_pdf_import')
                setActiveJob(null)
              }
            }, 5000)
          }
        } else {
          // No active job
          localStorage.removeItem('active_pdf_import')
          setActiveJob(null)
        }
      } catch (error) {
        console.error('Error polling job status:', error)
      }
    }

    // Poll immediately
    pollJob()

    // Then poll every 2 seconds
    const interval = setInterval(pollJob, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    if (activeJob?.status === 'completed') {
      localStorage.removeItem('active_pdf_import')
    }
  }

  if (!activeJob || isDismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 shadow-md animate-slide-down">
      {activeJob.status === 'processing' && (
        <div className="bg-blue-500 text-white px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium truncate">{activeJob.filename}</span>
                  <span className="text-sm opacity-90">wordt verwerkt...</span>
                </div>
                {activeJob.recipes_found > 0 && (
                  <div className="text-sm opacity-90 mt-1">
                    {activeJob.recipes_found} {activeJob.recipes_found === 1 ? 'recept' : 'recepten'} gevonden
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="ml-4 p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
              aria-label="Sluiten"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {activeJob.status === 'completed' && (
        <div className="bg-green-500 text-white px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">
                    {activeJob.recipes_imported} {activeJob.recipes_imported === 1 ? 'recept' : 'recepten'} geïmporteerd
                  </span>
                  <span className="text-sm opacity-90">uit {activeJob.filename}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <Link
                href={`/pdf-import/${activeJob.id}`}
                className="btn btn-sm bg-white text-green-600 hover:bg-gray-100 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Bekijk recepten
              </Link>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Sluiten"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeJob.status === 'failed' && (
        <div className="bg-red-500 text-white px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <XCircle className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Import mislukt</div>
                <div className="text-sm opacity-90 mt-1">
                  {activeJob.error_message || 'Er ging iets mis bij het verwerken van de PDF'}
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="ml-4 p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
              aria-label="Sluiten"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
