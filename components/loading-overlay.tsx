"use client"

import { Spinner } from "@/components/ui/spinner"

interface LoadingOverlayProps {
  message?: string
  isOpen: boolean
}

export function LoadingOverlay({ message = "Laden...", isOpen }: LoadingOverlayProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-lg bg-white p-8 shadow-2xl dark:bg-gray-800 animate-in fade-in zoom-in duration-200">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}