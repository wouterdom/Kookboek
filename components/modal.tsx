"use client"

import { X, AlertCircle, CheckCircle, Info } from "lucide-react"
import { useEffect, useState } from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: 'info' | 'success' | 'error' | 'warning'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  showCancel?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Annuleren',
  onConfirm,
  showCancel = false
}: ModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const icons = {
    info: <Info className="h-6 w-6 text-blue-500" />,
    success: <CheckCircle className="h-6 w-6 text-green-500" />,
    error: <AlertCircle className="h-6 w-6 text-red-500" />,
    warning: <AlertCircle className="h-6 w-6 text-amber-500" />
  }

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            {icons[type]}
            <div>
              {title && (
                <h2 className="font-[Montserrat] text-lg font-bold mb-1">{title}</h2>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 pl-9 text-sm text-gray-700 whitespace-pre-line">
          {message}
        </div>

        <div className="flex gap-3 justify-end">
          {showCancel && (
            <button
              onClick={onClose}
              className="btn btn-outline btn-md"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`btn btn-md ${type === 'error' || type === 'warning' ? 'btn-error' : 'btn-primary'}`}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook for using modal with state
export function useModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<Omit<ModalProps, 'isOpen' | 'onClose'>>({
    message: ''
  })

  const showModal = (newConfig: Omit<ModalProps, 'isOpen' | 'onClose'>) => {
    setConfig(newConfig)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
  }

  return {
    isOpen,
    config,
    showModal,
    closeModal
  }
}

// Helper components for common use cases
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Bevestigen",
  message,
  confirmText = "Bevestigen",
  cancelText = "Annuleren"
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      message={message}
      type="warning"
      confirmText={confirmText}
      cancelText={cancelText}
      onConfirm={onConfirm}
      showCancel={true}
    />
  )
}
