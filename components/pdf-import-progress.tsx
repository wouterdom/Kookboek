'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { Modal } from './modal'

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

/**
 * Subtle PDF import progress indicator
 * Shows in header as minimal, non-intrusive progress bar
 */
export function PdfImportProgress() {
  const [activeJob, setActiveJob] = useState<PdfImportJob | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    // Check localStorage for active job
    const storedJobId = localStorage.getItem('active_pdf_import')
    if (!storedJobId) return

    let interval: NodeJS.Timeout | null = null

    // Poll for job status every 2 seconds
    const pollJob = async () => {
      try {
        const response = await fetch('/api/import-pdf-status/active')
        const data = await response.json()

        if (data.job) {
          const job = data.job as PdfImportJob

          // If job is already completed on first load (refresh case), just clear it
          if (job.status === 'completed' && !activeJob) {
            console.log('Found completed job on refresh, clearing...')
            localStorage.removeItem('active_pdf_import')
            return
          }

          // Check if job just completed during this session
          if (job.status === 'completed' && activeJob?.status === 'processing') {
            // Show success modal
            setSuccessMessage(
              `${job.recipes_imported} ${job.recipes_imported === 1 ? 'recept' : 'recepten'} succesvol geïmporteerd uit ${job.filename}`
            )
            setShowSuccessModal(true)

            // Clear from localStorage
            localStorage.removeItem('active_pdf_import')

            // Clear active job and stop polling
            setActiveJob(null)
            if (interval) clearInterval(interval)
            return
          }

          // Only show processing jobs
          if (job.status === 'processing') {
            setActiveJob(job)
          } else if (job.status === 'failed') {
            setActiveJob(job)
            // Auto-clear failed jobs after 10 seconds
            setTimeout(() => {
              localStorage.removeItem('active_pdf_import')
              setActiveJob(null)
              if (interval) clearInterval(interval)
            }, 10000)
          } else {
            // Job is completed or other status, clear it
            localStorage.removeItem('active_pdf_import')
            setActiveJob(null)
            if (interval) clearInterval(interval)
          }
        } else {
          // No active job found
          localStorage.removeItem('active_pdf_import')
          setActiveJob(null)
          if (interval) clearInterval(interval)
        }
      } catch (error) {
        console.error('Error polling job status:', error)
        // On error, clear to prevent stuck state
        localStorage.removeItem('active_pdf_import')
        setActiveJob(null)
        if (interval) clearInterval(interval)
      }
    }

    // Poll immediately
    pollJob()

    // Then poll every 2 seconds
    interval = setInterval(pollJob, 2000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeJob?.status])

  // Don't render if no active job
  if (!activeJob) {
    return (
      <>
        <Modal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          message={successMessage}
          type="success"
        />
      </>
    )
  }

  return (
    <>
      {/* Subtle progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        {activeJob.status === 'processing' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-gray-600 hidden sm:inline">
              {activeJob.recipes_found > 0
                ? `${activeJob.recipes_found} ${activeJob.recipes_found === 1 ? 'recept' : 'recepten'} gevonden...`
                : 'PDF wordt verwerkt...'
              }
            </span>
          </>
        )}

        {activeJob.status === 'failed' && (
          <>
            <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <span className="text-red-600 hidden sm:inline">Import mislukt</span>
          </>
        )}
      </div>

      {/* Success modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
        type="success"
      />
    </>
  )
}
