"use client"

import { useState, useRef, useCallback } from "react"
import { X, Upload, Image as ImageIcon, Camera } from "lucide-react"
import Image from "next/image"
import { Modal } from "./modal"

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ImportDialog({ isOpen, onClose, onSuccess }: ImportDialogProps) {
  const [url, setUrl] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [pastedContent, setPastedContent] = useState("")
  const [pastedSourceUrl, setPastedSourceUrl] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean
    title?: string
    message: string
    type: 'info' | 'success' | 'error' | 'warning'
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  })

  const addPhotos = useCallback((files: File[]) => {
    if (photos.length + files.length > 10) {
      setModalConfig({
        isOpen: true,
        message: "Maximum 10 foto's toegestaan",
        type: 'warning'
      })
      return
    }

    const newPhotos = [...photos, ...files.slice(0, 10 - photos.length)]
    setPhotos(newPhotos)

    // Create previews
    const newPreviews: string[] = []
    newPhotos.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string)
        if (newPreviews.length === newPhotos.length) {
          setPhotoPreviews(newPreviews)
        }
      }
      reader.readAsDataURL(file)
    })
  }, [photos.length])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addPhotos(files)
  }, [addPhotos])

  const removePhoto = useCallback((index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newPreviews = photoPreviews.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    setPhotoPreviews(newPreviews)
  }, [photos, photoPreviews])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )
    addPhotos(files)
  }, [addPhotos])

  const handleImport = useCallback(async () => {
    if (!url && photos.length === 0 && !pastedContent) {
      setModalConfig({
        isOpen: true,
        message: "Voer een URL in, upload minimaal 1 foto, of plak de receptinhoud",
        type: 'warning'
      })
      return
    }

    setIsImporting(true)

    try {
      let response

      if (url) {
        // Import from URL using Gemini
        response = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
      } else if (pastedContent) {
        // Import from pasted content
        response = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pastedContent,
            sourceUrl: pastedSourceUrl || undefined
          })
        })
      } else if (photos.length > 0) {
        // Upload photos and extract with Gemini
        const formData = new FormData()
        photos.forEach(photo => formData.append('photos', photo))

        response = await fetch('/api/import', {
          method: 'POST',
          body: formData
        })
      }

      if (response && response.ok) {
        const data = await response.json()
        console.log('Recipe imported successfully:', data)
        onSuccess?.()
        onClose()
      } else {
        const error = await response?.json()
        const errorMessage = error?.error || 'Import failed'

        // If login required, clear URL and show helpful message
        if (error?.loginRequired) {
          setUrl('')
        }

        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Import error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Er ging iets mis bij het importeren. Probeer het opnieuw.'
      setModalConfig({
        isOpen: true,
        message: errorMessage,
        type: 'error'
      })
    } finally {
      setIsImporting(false)
    }
  }, [url, photos, pastedContent, pastedSourceUrl, onSuccess, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[Montserrat] text-xl font-bold">Importeer Recept</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* URL Import Section */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[oklch(var(--primary)/0.1)]">
                <span className="text-sm font-bold text-[oklch(var(--primary))]">1</span>
              </div>
              <h3 className="text-base font-semibold">Van URL</h3>
            </div>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={photos.length > 0 || !!pastedContent}
              className="input"
            />
            <p className="mt-1.5 text-xs text-[oklch(var(--muted-foreground))]">
              AI extraheert automatisch het recept van de pagina
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[oklch(var(--border))]"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-[oklch(var(--muted-foreground))]">of</span>
            </div>
          </div>

          {/* Paste Content Section */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[oklch(var(--primary)/0.1)]">
                <span className="text-sm font-bold text-[oklch(var(--primary))]">2</span>
              </div>
              <h3 className="text-base font-semibold">Plak Receptinhoud</h3>
            </div>
            <textarea
              placeholder="Plak hier de volledige inhoud van de receptpagina..."
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              disabled={!!url || photos.length > 0}
              rows={5}
              className="input resize-none"
            />
            <input
              type="url"
              placeholder="Bron URL (optioneel)"
              value={pastedSourceUrl}
              onChange={(e) => setPastedSourceUrl(e.target.value)}
              disabled={!!url || photos.length > 0 || !pastedContent}
              className="input mt-2"
            />
            <p className="mt-1.5 text-xs text-[oklch(var(--muted-foreground))]">
              💡 Voor login-beveiligde sites: kopieer de hele pagina
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[oklch(var(--border))]"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-[oklch(var(--muted-foreground))]">of</span>
            </div>
          </div>

          {/* Photo Upload Section */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[oklch(var(--primary)/0.1)]">
                <span className="text-sm font-bold text-[oklch(var(--primary))]">3</span>
              </div>
              <h3 className="text-base font-semibold">Van Foto's</h3>
            </div>
            <div
              onClick={() => !url && !pastedContent && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragging ? 'border-[oklch(var(--primary))] bg-[oklch(var(--primary)/0.05)]' :
                'border-[oklch(var(--border))] hover:bg-gray-50'
              } ${url || pastedContent ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Camera className="mx-auto mb-2 h-10 w-10 text-[oklch(var(--muted-foreground))]" />
              <p className="mb-1 text-sm font-medium">
                Sleep foto's hierheen of klik om te uploaden
              </p>
              <p className="text-xs text-[oklch(var(--muted-foreground))]">
                Max 10 foto's tegelijk
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={!!url || !!pastedContent}
              />
            </div>

            {photos.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-[oklch(var(--foreground))]">
                  {photos.length} foto{photos.length !== 1 ? "'s" : ''} geselecteerd
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {photoPreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative aspect-square overflow-hidden rounded border border-[oklch(var(--border))]"
                    >
                      <Image
                        src={preview}
                        alt={`Foto ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-[oklch(var(--primary))]">
                        {index + 1}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removePhoto(index)
                        }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <p className="mt-2 text-xs text-[oklch(var(--muted-foreground))]">
                AI leest en combineert informatie van alle foto's
              </p>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            <button onClick={onClose} className="btn btn-outline flex-1" disabled={isImporting}>
              Annuleren
            </button>
            <button
              onClick={handleImport}
              className="btn btn-primary flex-1"
              disabled={isImporting || (!url && photos.length === 0 && !pastedContent)}
            >
              {isImporting ? 'Bezig met importeren...' : 'Importeren'}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Modal for alerts and errors */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </>
  )
}
