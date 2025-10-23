"use client"

import { CATEGORY_COLORS } from "@/lib/colors"
import { Check } from "lucide-react"

interface ColorPickerProps {
  selectedColor: string
  onColorSelect: (color: string) => void
}

export function ColorPicker({ selectedColor, onColorSelect }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color.value}
          onClick={() => onColorSelect(color.value)}
          className="relative w-10 h-10 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-all hover:scale-110"
          style={{ backgroundColor: color.value }}
          title={color.name}
        >
          {selectedColor === color.value && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="h-5 w-5" style={{ color: color.textClass === 'text-white' ? '#ffffff' : '#111827' }} />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
