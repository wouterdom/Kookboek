"use client"

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { X, Upload, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (imageUrl: string) => void
  currentImageUrl?: string
  recipeSlug: string
  recipeTitle?: string
  recipeDescription?: string
  recipeIngredients?: string[]
}

export function ImageUploadModal({
  isOpen,
  onClose,
  currentImageUrl,
  recipeSlug,
  onUpload,
  recipeTitle,
  recipeDescription,
  recipeIngredients
}: ImageUploadModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [generatingAI, setGeneratingAI] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Upload alleen afbeeldingen!')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to server
    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('recipeSlug', recipeSlug)

      // Simulate progress (since we don't have real progress from fetch)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const data = await response.json()
        setTimeout(() => {
          onUpload(data.url)
          onClose()
          setPreview(null)
          setUploadProgress(0)
        }, 500)
      } else {
        alert('Fout bij uploaden van afbeelding')
        setPreview(null)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Fout bij uploaden van afbeelding')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }, [recipeSlug, onUpload, onClose])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleAIGenerate = async () => {
    setGeneratingAI(true)
    setUploadProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 5
        })
      }, 500)

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeSlug,
          recipeTitle,
          recipeDescription,
          recipeIngredients
        })
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const data = await response.json()
        setTimeout(() => {
          setPreview(data.url)
          onUpload(data.url)
          onClose()
          setUploadProgress(0)
        }, 500)
      } else {
        const error = await response.json()
        alert(error.error || 'Fout bij genereren van afbeelding')
      }
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Fout bij genereren van afbeelding')
    } finally {
      setGeneratingAI(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="relative w-full max-w-lg sm:max-w-2xl bg-white rounded-lg sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Wijzig Foto</h2>
          <button
            onClick={onClose}
            disabled={uploading || generatingAI}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Current Image Preview */}
          {(currentImageUrl || preview) && !uploading && !generatingAI && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                {preview ? 'Nieuwe foto' : 'Huidige foto'}
              </h3>
              <div className="relative h-48 sm:h-64 w-full rounded-lg sm:rounded-xl overflow-hidden border-2 border-gray-200">
                <Image
                  src={preview || currentImageUrl || ''}
                  alt="Recipe preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Upload Area */}
          {!uploading && !generatingAI && (
            <div
              className={`relative border-2 border-dashed rounded-lg sm:rounded-xl p-6 sm:p-12 text-center transition-all ${
                dragActive
                  ? 'border-primary bg-primary/5 scale-105'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
              />

              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 sm:p-4 bg-primary/10 rounded-full">
                    <ImageIcon className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-base sm:text-lg font-medium text-gray-900">
                    Sleep een foto hierheen
                  </p>
                  <p className="text-sm text-gray-500">
                    of kies een optie:
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                  <button
                    onClick={handleButtonClick}
                    className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base"
                  >
                    <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                    Selecteer bestand
                  </button>

                  {recipeTitle && (
                    <button
                      onClick={handleAIGenerate}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all text-sm sm:text-base"
                    >
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                      AI Genereren
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-400 mt-2 sm:mt-4">
                  PNG, JPG, GIF tot 10MB
                </p>
              </div>
            </div>
          )}

          {/* Upload/Generate Progress */}
          {(uploading || generatingAI) && (
            <div className="space-y-4">
              <div className="relative h-48 sm:h-64 w-full rounded-lg sm:rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {preview && (
                  <Image
                    src={preview}
                    alt="Processing preview"
                    fill
                    className="object-cover opacity-50"
                    unoptimized
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-6 sm:p-8 mx-4">
                  {generatingAI ? (
                    <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 text-purple-600 animate-pulse" />
                  ) : (
                    <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary animate-spin" />
                  )}
                  <div className="space-y-1 sm:space-y-2 text-center">
                    <p className="text-base sm:text-lg font-medium text-gray-900">
                      {generatingAI ? 'AI foto genereren...' : 'Foto uploaden...'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {uploadProgress}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ease-out ${
                    generatingAI ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-primary'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={uploading || generatingAI}
            className="px-4 sm:px-6 py-2 text-sm sm:text-base text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  )
}
