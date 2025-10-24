'use client'

import { useRef, useState, useCallback } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingOverlay } from '@/components/loading-overlay'

export function PdfImportButton() {
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_SIZE = 100 * 1024 * 1024 // 100MB
    if (file.size > MAX_SIZE) {
      toast.error('PDF bestand is te groot. Maximum is 100MB')
      return
    }

    if (file.type !== 'application/pdf') {
      toast.error('Alleen PDF bestanden zijn toegestaan')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const response = await fetch('/api/import-pdf', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        // Store job ID in localStorage for progress indicator to pick up
        localStorage.setItem('active_pdf_import', data.jobId)

        toast.success(`${file.name} wordt verwerkt op de achtergrond. Je ontvangt een melding wanneer het klaar is.`, {
          duration: 5000
        })
      } else {
        throw new Error(data.error || 'Import mislukt')
      }
    } catch (error) {
      console.error('PDF upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Er ging iets mis bij het uploaden')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (pdfInputRef.current) {
        pdfInputRef.current.value = ''
      }
    }
  }, [])

  return (
    <>
      <LoadingOverlay
        message="PDF kookboek aan het uploaden..."
        isOpen={isUploading}
      />
      <button
        onClick={() => pdfInputRef.current?.click()}
        disabled={isUploading}
        className="btn btn-outline btn-sm flex items-center gap-2 text-xs opacity-70 hover:opacity-100 transition-opacity"
        title="Importeer heel kookboek uit PDF"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">PDF Kookboek</span>
      </button>

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handlePdfUpload}
        disabled={isUploading}
      />
    </>
  )
}
