"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { ConfirmModal } from "@/components/modal"

export interface ClearListModalProps {
  isOpen: boolean
  onClose: () => void
  onClear: (mode: "checked" | "all") => void
  checkedCount: number
  totalCount: number
}

export function ClearListModal({
  isOpen,
  onClose,
  onClear,
  checkedCount,
  totalCount
}: ClearListModalProps) {
  const [mode, setMode] = useState<"checked" | "all">("checked")

  const handleConfirm = () => {
    onClear(mode)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-border p-6">
          <h3 className="flex items-center gap-2 font-[Montserrat] text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Lijst legen?
          </h3>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="mb-4 text-sm text-foreground">
            Wat wil je verwijderen?
          </p>

          <div className="space-y-2">
            {/* Checked items option */}
            <label
              className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border p-3 transition-colors hover:bg-gray-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="clear-option"
                value="checked"
                checked={mode === "checked"}
                onChange={() => setMode("checked")}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <div className="font-medium">Alleen afgevinkte items</div>
                <div className="text-sm text-muted-foreground">
                  {checkedCount} {checkedCount === 1 ? "item" : "items"}
                </div>
              </div>
            </label>

            {/* All items option */}
            <label
              className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border p-3 transition-colors hover:bg-gray-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="clear-option"
                value="all"
                checked={mode === "all"}
                onChange={() => setMode("all")}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <div className="font-medium">Hele boodschappenlijst</div>
                <div className="text-sm text-muted-foreground">
                  {totalCount} {totalCount === 1 ? "item" : "items"}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border p-6">
          <button
            onClick={onClose}
            className="btn btn-outline btn-md flex-1"
          >
            Annuleren
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-error btn-md flex-1"
            disabled={mode === "checked" && checkedCount === 0}
          >
            Verwijderen
          </button>
        </div>
      </div>
    </div>
  )
}
