import { Lightbulb } from "lucide-react"

interface ChefTipProps {
  content: string
}

export function ChefTip({ content }: ChefTipProps) {
  return (
    <div className="mt-8 rounded-lg bg-teal-600 p-5">
      <div className="flex gap-3">
        <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-white" />
        <div className="flex-1">
          <strong className="mb-1.5 block text-base text-white">Tip van ons Tiske</strong>
          <p className="whitespace-pre-wrap text-sm text-white leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  )
}
