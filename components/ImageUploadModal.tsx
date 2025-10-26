"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { X, Upload, Image as ImageIcon, Loader2, Sparkles, Star, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmModal, Modal } from './modal'

type RecipeImage = {
  id: string
  recipe_id: string
  image_url: string
  is_primary: boolean | null
  display_order: number | null
  created_at: string | null
  updated_at: string | null
}

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (imageUrl: string) => void
  currentImageUrl?: string
  recipeSlug: string
  recipeTitle?: string
  recipeDescription?: string
  recipeIngredients?: string[]
  recipeId: string
}

export function ImageUploadModal({
  isOpen,
  onClose,
  currentImageUrl,
  recipeSlug,
  onUpload,
  recipeTitle,
  recipeDescription,
  recipeIngredients,
  recipeId
}: ImageUploadModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [images, setImages] = useState<RecipeImage[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<string | null>(null)
  const [modalConfig, setModalConfig] = useState({ isOpen: false, message: '', type: 'info' as 'info' | 'success' | 'error' | 'warning' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Fetch images for this recipe
  const fetchImages = useCallback(async () => {
    if (!recipeId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('recipe_images')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching images:', error)
    } else {
      const images = (data || []) as RecipeImage[]
      setImages(images)
      // Find the primary image and set as current
      const primaryIndex = images.findIndex(img => img.is_primary) ?? 0
      setCurrentImageIndex(primaryIndex >= 0 ? primaryIndex : 0)
    }
    setLoading(false)
  }, [recipeId, supabase])

  useEffect(() => {
    if (isOpen) {
      fetchImages()
    }
  }, [isOpen, fetchImages])

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setModalConfig({
        isOpen: true,
        message: 'Upload alleen afbeeldingen!',
        type: 'warning'
      })
      return
    }

    // Upload to server
    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('recipeSlug', recipeSlug)
      formData.append('recipeId', recipeId)

      // Simulate progress
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

        // Check if this URL already exists for this recipe
        const existingImage = images.find(img => img.image_url === data.url)

        if (!existingImage) {
          // Add to recipe_images table only if it doesn't exist
          const isPrimary = images.length === 0 // First image is primary
          // @ts-ignore - Supabase type inference issue
          const { error } = await supabase
            .from('recipe_images')
            // @ts-ignore - Supabase type inference issue
            .insert({
              recipe_id: recipeId,
              image_url: data.url,
              is_primary: isPrimary,
              display_order: images.length
            })

          if (error) {
            console.error('Error saving image to database:', error)
          } else {
            // Refresh images
            await fetchImages()
            if (isPrimary) {
              onUpload(data.url)
            }
          }
          setUploadProgress(0)
        } else {
          // Image already exists, just refresh
          await fetchImages()
          setUploadProgress(0)
        }
      } else {
        setModalConfig({
          isOpen: true,
          message: 'Er ging iets mis bij het uploaden van de foto',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      setModalConfig({
        isOpen: true,
        message: 'Er ging iets mis bij het uploaden van de foto',
        type: 'error'
      })
    } finally {
      setUploading(false)
    }
  }, [recipeSlug, recipeId, images.length, supabase, fetchImages, onUpload])

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
      // Handle multiple files
      Array.from(e.target.files).forEach(file => {
        handleFile(file)
      })
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
          recipeIngredients,
          recipeId
        })
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const data = await response.json()

        // Check if this URL already exists for this recipe
        const existingImage = images.find(img => img.image_url === data.url)

        if (!existingImage) {
          // Add to recipe_images table only if it doesn't exist
          const isPrimary = images.length === 0
          // @ts-ignore - Supabase type inference issue
          await supabase
            .from('recipe_images')
            // @ts-ignore - Supabase type inference issue
            .insert({
              recipe_id: recipeId,
              image_url: data.url,
              is_primary: isPrimary,
              display_order: images.length
            })

          // Refresh images
          await fetchImages()
          if (isPrimary) {
            onUpload(data.url)
          }
          setUploadProgress(0)
        } else {
          // Image already exists, just refresh
          await fetchImages()
          setUploadProgress(0)
        }
      } else {
        const error = await response.json()
        setModalConfig({
          isOpen: true,
          message: error.error || 'Er ging iets mis bij het genereren van de foto',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error generating image:', error)
      setModalConfig({
        isOpen: true,
        message: 'Er ging iets mis bij het genereren van de foto',
        type: 'error'
      })
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleSetPrimary = async (imageId: string) => {
    // Remove primary from all images
    // @ts-ignore - Supabase type inference issue
    await supabase
      .from('recipe_images')
      // @ts-ignore - Supabase type inference issue
      .update({ is_primary: false })
      .eq('recipe_id', recipeId)

    // Set new primary
    // @ts-ignore - Supabase type inference issue
    const { error } = await supabase
      .from('recipe_images')
      // @ts-ignore - Supabase type inference issue
      .update({ is_primary: true })
      .eq('id', imageId)

    if (error) {
      console.error('Error setting primary image:', error)
      setModalConfig({
        isOpen: true,
        message: 'Er ging iets mis bij het instellen van de hoofdfoto',
        type: 'error'
      })
    } else {
      const primaryImage = images.find(img => img.id === imageId)
      if (primaryImage) {
        // Also update recipes.image_url for backwards compatibility
        // @ts-ignore - Supabase type inference issue
        await supabase
          .from('recipes')
          // @ts-ignore - Supabase type inference issue
          .update({ image_url: primaryImage.image_url })
          .eq('id', recipeId)

        onUpload(primaryImage.image_url)
      }
      await fetchImages()
    }
  }

  const handleDeleteClick = (imageId: string) => {
    setImageToDelete(imageId)
    setShowDeleteConfirm(true)
  }

  const handleDeleteImage = async () => {
    if (!imageToDelete) return

    const imageId = imageToDelete
    const imageToDeleteData = images.find(img => img.id === imageId)
    const wasPrimary = imageToDeleteData?.is_primary

    const { error } = await supabase
      .from('recipe_images')
      .delete()
      .eq('id', imageId)

    if (error) {
      console.error('Error deleting image:', error)
      setModalConfig({
        isOpen: true,
        message: 'Er ging iets mis bij het verwijderen van de foto',
        type: 'error'
      })
      setShowDeleteConfirm(false)
      setImageToDelete(null)
      return
    }
      // If we deleted the primary image and there are other images, set the first remaining as primary
      if (wasPrimary && images.length > 1) {
        const remainingImages = images.filter(img => img.id !== imageId)
        if (remainingImages.length > 0) {
          const newPrimary = remainingImages[0]

          // @ts-ignore - Supabase type inference issue
          await supabase
            .from('recipe_images')
            // @ts-ignore - Supabase type inference issue
            .update({ is_primary: true })
            .eq('id', newPrimary.id)

          // Update recipes.image_url
          // @ts-ignore - Supabase type inference issue
          await supabase
            .from('recipes')
            // @ts-ignore - Supabase type inference issue
            .update({ image_url: newPrimary.image_url })
            .eq('id', recipeId)

          onUpload(newPrimary.image_url)
        } else {
          // No more images, clear recipes.image_url
          // @ts-ignore - Supabase type inference issue
          await supabase
            .from('recipes')
            // @ts-ignore - Supabase type inference issue
            .update({ image_url: null })
            .eq('id', recipeId)

          onUpload('')
        }
      }

    await fetchImages()
    // Update current index if needed
    if (currentImageIndex >= images.length - 1) {
      setCurrentImageIndex(Math.max(0, images.length - 2))
    }

    setShowDeleteConfirm(false)
    setImageToDelete(null)
  }

  const goToPrevious = () => {
    setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const goToNext = () => {
    setCurrentImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
  }

  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrevious()
    }
  }

  if (!isOpen) return null

  const currentImage = images[currentImageIndex]

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
          {/* Current Images Gallery */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : images.length > 0 && !uploading && !generatingAI ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                Huidige foto&apos;s ({currentImageIndex + 1}/{images.length})
              </h3>
              <div
                className="relative h-48 sm:h-64 w-full rounded-lg sm:rounded-xl overflow-hidden border-2 border-gray-200"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <Image
                  src={currentImage.image_url}
                  alt="Recipe preview"
                  fill
                  className="object-cover"
                  unoptimized
                />

                {/* Navigation buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevious}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all"
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-800" />
                    </button>
                    <button
                      onClick={goToNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-all"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-800" />
                    </button>
                  </>
                )}

                {/* Star and delete buttons */}
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => handleSetPrimary(currentImage.id)}
                    className={`p-2 rounded-full shadow-lg transition-all ${
                      currentImage.is_primary
                        ? 'bg-yellow-400 hover:bg-yellow-500'
                        : 'bg-white/80 hover:bg-white'
                    }`}
                    title={currentImage.is_primary ? 'Hoofdfoto' : 'Stel in als hoofdfoto'}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        currentImage.is_primary ? 'text-white fill-white' : 'text-gray-800'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(currentImage.id)}
                    className="p-2 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all"
                    title="Verwijder foto"
                  >
                    <Trash2 className="h-5 w-5 text-white" />
                  </button>
                </div>

                {/* Dots indicator */}
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentImageIndex
                            ? 'w-6 bg-white'
                            : 'w-2 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

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
                multiple
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
            Sluiten
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setImageToDelete(null)
        }}
        onConfirm={handleDeleteImage}
        title="Foto verwijderen?"
        message="Weet je zeker dat je deze foto wilt verwijderen? Deze actie kan niet ongedaan gemaakt worden."
        confirmText="Verwijderen"
        cancelText="Annuleren"
      />

      {/* Error Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </div>
  )
}
