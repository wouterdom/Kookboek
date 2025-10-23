import { Edit3, Check, X } from "lucide-react"

interface InlineEditButtonProps {
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  isSaving?: boolean
  showOnHover?: boolean
}

export function InlineEditButton({
  isEditing,
  onEdit,
  onSave,
  onCancel,
  isSaving = false,
  showOnHover = false,
}: InlineEditButtonProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Opslaan"
        >
          <Check className="h-4 w-4" />
          <span>{isSaving ? 'Opslaan...' : 'Opslaan'}</span>
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Annuleren"
        >
          <X className="h-4 w-4" />
          <span>Annuleren</span>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onEdit}
      className={`flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-200 ml-2 ${
        showOnHover ? 'opacity-0 group-hover:opacity-100' : ''
      }`}
      title="Bewerken"
    >
      <Edit3 className="h-4 w-4" />
      <span className="hidden sm:inline">Bewerk</span>
    </button>
  )
}
