"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { X, Upload, Image as ImageIcon, Loader2, Sparkles, Star, Trash2, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmModal, Modal } from './modal'
import type { RecipeImage, RecipeImageUpdate } from '@/types/supabase'

type PendingImage = {
  url: string
  path: string // Storage path for cleanup
  tempId: string
  isPending: true
}

type CombinedImage = RecipeImage | PendingImage

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
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [pendingPrimaryId, setPendingPrimaryId] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<string | null>(null)
  const [modalConfig, setModalConfig] = useState({ isOpen: false, message: '', type: 'info' as 'info' | 'success' | 'error' | 'warning' })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Combined list of images (existing + pending)
  const allImages: CombinedImage[] = [...images, ...pendingImages]

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
      // Clear pending images when modal opens
      setPendingImages([])
      setPendingPrimaryId(null)
    }
  }, [isOpen, fetchImages])

  // Delete image from storage
  const deleteFromStorage = async (url: string) => {
    try {
      // Extract path from URL
      const urlObj = new URL(url)
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/recipe-images\/(.+)/)
      if (pathMatch && pathMatch[1]) {
        const path = decodeURIComponent(pathMatch[1])
        await supabase.storage.from('recipe-images').remove([path])
      }
    } catch (error) {
      console.error('Error deleting from storage:', error)
    }
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setModalConfig({
        isOpen: true,
        message: 'Upload alleen afbeeldingen!',
        type: 'warning'
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('recipeSlug', recipeSlug)
      formData.append('recipeId', recipeId)

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

        // Check if URL already exists
        const existsInImages = images.some(img => img.image_url === data.url)
        const existsInPending = pendingImages.some(img => img.url === data.url)

        if (!existsInImages && !existsInPending) {
          // Add to pending images (NOT to database yet)
          const newPending: PendingImage = {
            url: data.url,
            path: data.path,
            tempId: `temp-${Date.now()}`,
            isPending: true
          }
          setPendingImages(prev => [...prev, newPending])

          // If this is the first image overall, set as pending primary
          if (allImages.length === 0) {
            setPendingPrimaryId(newPending.tempId)
          }
        }
        setUploadProgress(0)
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
  }, [recipeSlug, recipeId, images, pendingImages, allImages.length])

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

        const existsInImages = images.some(img => img.image_url === data.url)
        const existsInPending = pendingImages.some(img => img.url === data.url)

        if (!existsInImages && !existsInPending) {
          const newPending: PendingImage = {
            url: data.url,
            path: data.path,
            tempId: `temp-${Date.now()}`,
            isPending: true
          }
          setPendingImages(prev => [...prev, newPending])

          if (allImages.length === 0) {
            setPendingPrimaryId(newPending.tempId)
          }
        }
        setUploadProgress(0)
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

  const handleSetPrimary = (imageId: string) => {
    const image = allImages.find(img =>
      'isPending' in img ? img.tempId === imageId : img.id === imageId
    )

    if (image && 'isPending' in image) {
      // Pending image - just update state
      setPendingPrimaryId(image.tempId)
    } else {
      // Existing image - mark for making primary on save
      // For now, we'll handle this immediately as before
      handleSetPrimaryImmediate(imageId)
    }
  }

  const handleSetPrimaryImmediate = async (imageId: string) => {
    try {
      const { error: removePrimaryError } = await supabase
        .from('recipe_images')
        // @ts-expect-error - Supabase type inference issue
        .update({ is_primary: false })
        .eq('recipe_id', recipeId)

      if (removePrimaryError) throw removePrimaryError

      const { error: setPrimaryError } = await supabase
        .from('recipe_images')
        // @ts-expect-error - Supabase type inference issue
        .update({ is_primary: true })
        .eq('id', imageId)

      if (setPrimaryError) throw setPrimaryError

      const primaryImage = images.find(img => img.id === imageId)
      if (primaryImage) {
        const { error: updateRecipeError } = await supabase
          .from('recipes')
          // @ts-expect-error - Supabase type inference issue
          .update({ image_url: primaryImage.image_url })
          .eq('id', recipeId)

        if (updateRecipeError) throw updateRecipeError

        await fetchImages()
        onUpload(primaryImage.image_url)
      }
    } catch (error) {
      console.error('Error setting primary image:', error)
      setModalConfig({
        isOpen: true,
        message: 'Er ging iets mis bij het instellen van de hoofdfoto',
        type: 'error'
      })
    }
  }

  const handleDeleteClick = (imageId: string) => {
    setImageToDelete(imageId)
    setShowDeleteConfirm(true)
  }

  const handleDeleteImage = async () => {
    if (!imageToDelete) return

    const imageId = imageToDelete

    // Check if it's a pending image
    const pendingImage = pendingImages.find(img => img.tempId === imageId)
    if (pendingImage) {
      // Delete from storage and remove from pending
      await deleteFromStorage(pendingImage.url)
      setPendingImages(prev => prev.filter(img => img.tempId !== imageId))

      // If it was pending primary, clear that
      if (pendingPrimaryId === imageId) {
        setPendingPrimaryId(null)
      }

      setShowDeleteConfirm(false)
      setImageToDelete(null)
      return
    }

    // It's an existing image - delete from database immediately
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

    if (wasPrimary && images.length > 1) {
      const remainingImages = images.filter(img => img.id !== imageId)
      if (remainingImages.length > 0) {
        const newPrimary = remainingImages[0]

        await supabase
          .from('recipe_images')
          // @ts-expect-error - Supabase type inference issue
          .update({ is_primary: true })
          .eq('id', newPrimary.id)

        await supabase
          .from('recipes')
          // @ts-expect-error - Supabase type inference issue
          .update({ image_url: newPrimary.image_url })
          .eq('id', recipeId)

        onUpload(newPrimary.image_url)
      } else {
        await supabase
          .from('recipes')
          // @ts-expect-error - Supabase type inference issue
          .update({ image_url: null })
          .eq('id', recipeId)

        onUpload('')
      }
    }

    await fetchImages()
    if (currentImageIndex >= allImages.length - 1) {
      setCurrentImageIndex(Math.max(0, allImages.length - 2))
    }

    setShowDeleteConfirm(false)
    setImageToDelete(null)
  }

  const handleSave = async () => {
    if (pendingImages.length === 0) {
      onClose()
      return
    }

    setIsSaving(true)

    try {
      // Insert all pending images into database
      const insertData = pendingImages.map((img, index) => ({
        recipe_id: recipeId,
        image_url: img.url,
        is_primary: img.tempId === pendingPrimaryId,
        display_order: images.length + index
      }))

      const { error: insertError } = await supabase
        .from('recipe_images')
        // @ts-expect-error - Supabase type inference issue
        .insert(insertData)

      if (insertError) throw insertError

      let primaryUrl = currentImageUrl

      // Update recipe's image_url if we have a new primary
      if (pendingPrimaryId) {
        const primaryPending = pendingImages.find(img => img.tempId === pendingPrimaryId)
        if (primaryPending) {
          // First, unset all existing primaries
          await supabase
            .from('recipe_images')
            // @ts-expect-error - Supabase type inference issue
            .update({ is_primary: false })
            .eq('recipe_id', recipeId)

          // Then set the new one as primary in the recipe_images we just inserted
          await supabase
            .from('recipe_images')
            // @ts-expect-error - Supabase type inference issue
            .update({ is_primary: true })
            .eq('recipe_id', recipeId)
            .eq('image_url', primaryPending.url)

          // Update recipes table
          await supabase
            .from('recipes')
            // @ts-expect-error - Supabase type inference issue
            .update({ image_url: primaryPending.url })
            .eq('id', recipeId)

          primaryUrl = primaryPending.url
        }
      }

      // Clear pending state
      setPendingImages([])
      setPendingPrimaryId(null)

      // Refresh images
      await fetchImages()

      // ALWAYS call onUpload to trigger parent refresh, even if primary didn't change
      // This ensures the parent component reloads and shows all new images
      if (primaryUrl) {
        onUpload(primaryUrl)
      }

      // Close modal
      onClose()

    } catch (error) {
      console.error('Error saving images:', error)
      setModalConfig({
        isOpen: true,
        message: 'Er ging iets mis bij het opslaan van de foto\'s',
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = async () => {
    if (pendingImages.length > 0) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  const handleConfirmClose = async () => {
    // Delete all pending images from storage
    for (const img of pendingImages) {
      await deleteFromStorage(img.url)
    }

    // Clear pending state
    setPendingImages([])
    setPendingPrimaryId(null)
    setShowCloseConfirm(false)
    onClose()
  }

  const goToPrevious = () => {
    setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1))
  }

  const goToNext = () => {
    setCurrentImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0))
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

  const currentImage = allImages[currentImageIndex]
  const isPendingImage = currentImage && 'isPending' in currentImage

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Wijzig Foto</h2>
          <button
            onClick={handleClose}
            disabled={uploading || generatingAI || isSaving}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Current Images Gallery */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : allImages.length > 0 && !uploading && !generatingAI ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                {isPendingImage ? 'Nieuwe foto' : 'Huidige foto\'s'} ({currentImageIndex + 1}/{allImages.length})
              </h3>
              <div
                className="relative h-48 sm:h-56 w-full rounded-lg overflow-hidden border-2 border-gray-200"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <Image
                  src={'isPending' in currentImage ? currentImage.url : currentImage.image_url}
                  alt="Recipe preview"
                  fill
                  className="object-cover"
                  unoptimized
                />

                {/* Pending badge */}
                {isPendingImage && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                    Nieuw
                  </div>
                )}

                {/* Navigation buttons */}
                {allImages.length > 1 && (
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
                    onClick={() => handleSetPrimary(isPendingImage ? currentImage.tempId : currentImage.id)}
                    className={`p-2 rounded-full shadow-lg transition-all ${
                      (isPendingImage && currentImage.tempId === pendingPrimaryId) ||
                      (!isPendingImage && currentImage.is_primary)
                        ? 'bg-yellow-400 hover:bg-yellow-500'
                        : 'bg-white/80 hover:bg-white'
                    }`}
                    title={
                      (isPendingImage && currentImage.tempId === pendingPrimaryId) ||
                      (!isPendingImage && currentImage.is_primary)
                        ? 'Hoofdfoto'
                        : 'Stel in als hoofdfoto'
                    }
                  >
                    <Star
                      className={`h-5 w-5 ${
                        (isPendingImage && currentImage.tempId === pendingPrimaryId) ||
                        (!isPendingImage && currentImage.is_primary)
                          ? 'text-white fill-white'
                          : 'text-gray-800'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(isPendingImage ? currentImage.tempId : currentImage.id)}
                    className="p-2 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all"
                    title="Verwijder foto"
                  >
                    <Trash2 className="h-5 w-5 text-white" />
                  </button>
                </div>

                {/* Dots indicator */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allImages.map((_, idx) => (
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

          {/* Upload Area - More Compact */}
          {!uploading && !generatingAI && (
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-all ${
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

              <div className="space-y-3">
                <div className="flex justify-center">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <ImageIcon className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-base font-medium text-gray-900">
                    Sleep een foto hierheen
                  </p>
                  <p className="text-sm text-gray-500">
                    of kies een optie:
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={handleButtonClick}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Selecteer bestand
                  </button>

                  {recipeTitle && (
                    <button
                      onClick={handleAIGenerate}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all text-sm"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI Genereren
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  PNG, JPG, GIF tot 10MB
                </p>
              </div>
            </div>
          )}

          {/* Upload/Generate Progress */}
          {(uploading || generatingAI) && (
            <div className="space-y-3">
              <div className="relative h-40 w-full rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                <div className="relative z-10 flex flex-col items-center gap-3 bg-white/90 backdrop-blur-sm rounded-xl p-6">
                  {generatingAI ? (
                    <Sparkles className="h-10 w-10 text-purple-600 animate-pulse" />
                  ) : (
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  )}
                  <div className="space-y-1 text-center">
                    <p className="text-base font-medium text-gray-900">
                      {generatingAI ? 'AI foto genereren...' : 'Foto uploaden...'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {uploadProgress}%
                    </p>
                  </div>
                </div>
              </div>

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

        {/* Footer - Fixed, Always Visible */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClose}
            disabled={uploading || generatingAI || isSaving}
            className="px-4 py-2 text-sm text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Sluiten
          </button>
          {pendingImages.length > 0 && (
            <button
              onClick={handleSave}
              disabled={uploading || generatingAI || isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opslaan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Opslaan ({pendingImages.length})
                </>
              )}
            </button>
          )}
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

      {/* Close Confirmation Modal */}
      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleConfirmClose}
        title="Sluiten zonder opslaan?"
        message={`Je hebt ${pendingImages.length} nieuwe foto${pendingImages.length > 1 ? "'s" : ''} toegevoegd. Weet je zeker dat je wilt sluiten zonder op te slaan?`}
        confirmText="Sluiten zonder opslaan"
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
