'use client'

import { Mic, Settings, X } from 'lucide-react'

interface MicrophonePermissionModalProps {
  isOpen: boolean
  onClose: () => void
  onRequestPermission: () => void
}

export default function MicrophonePermissionModal({
  isOpen,
  onClose,
  onRequestPermission
}: MicrophonePermissionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-full">
                <Mic className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold">Microfoon Toegang</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Om recepten te kunnen dicteren heeft deze app toegang tot je microfoon nodig.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Wat gebeurt er nu?
            </h3>
            <ol className="text-sm text-blue-800 space-y-2">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Chrome vraagt om toestemming voor de microfoon</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Klik op "Toestaan" in de browser popup</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Begin met het dicteren van je recept</span>
              </li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Als je per ongeluk "Blokkeren" hebt geklikt:
            </h3>
            <p className="text-sm text-amber-800">
              Klik op het slotje (🔒) in de adresbalk en zet "Microfoon" op "Toestaan"
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onRequestPermission}
            className="flex-1 btn btn-primary"
          >
            <Mic className="h-4 w-4 mr-2" />
            Microfoon Activeren
          </button>
          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}