"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface CategoryDeleteModalProps {
  categoryName: string
  onConfirm: () => void
  onCancel: () => void
}

export function CategoryDeleteModal({ categoryName, onConfirm, onCancel }: CategoryDeleteModalProps) {
  const [confirmChecked, setConfirmChecked] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Categorie verwijderen</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Weet je zeker dat je de categorie <strong>"{categoryName}"</strong> wilt verwijderen?
          </p>
          <p className="text-sm text-red-600 mb-4">
            Let op: Deze actie kan niet ongedaan worden gemaakt.
          </p>

          <label className="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-200">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-0.5 h-5 w-5 cursor-pointer rounded border-2 border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Ik begrijp dat deze categorie van alle recepten verwijderd zal worden
            </span>
          </label>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Annuleren
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmChecked}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verwijderen
          </button>
        </div>
      </div>
    </div>
  )
}
