// Fixed soft yellow color for all category labels
export const CATEGORY_LABEL_COLOR = {
  value: '#fef3c7', // amber-100
  textColor: '#92400e', // amber-800
  borderColor: '#fde68a', // amber-200
} as const;

// Legacy color array - kept for backward compatibility but no longer used for new categories
export const CATEGORY_COLORS = [
  { name: 'Rood', value: '#ef4444', bgClass: 'bg-red-500', textClass: 'text-white' },
  { name: 'Oranje', value: '#f97316', bgClass: 'bg-orange-500', textClass: 'text-white' },
  { name: 'Amber', value: '#f59e0b', bgClass: 'bg-amber-500', textClass: 'text-white' },
  { name: 'Geel', value: '#eab308', bgClass: 'bg-yellow-500', textClass: 'text-gray-900' },
  { name: 'Limoen', value: '#84cc16', bgClass: 'bg-lime-500', textClass: 'text-gray-900' },
  { name: 'Groen', value: '#22c55e', bgClass: 'bg-green-500', textClass: 'text-white' },
  { name: 'Smaragd', value: '#10b981', bgClass: 'bg-emerald-500', textClass: 'text-white' },
  { name: 'Teal', value: '#14b8a6', bgClass: 'bg-teal-500', textClass: 'text-white' },
  { name: 'Cyaan', value: '#06b6d4', bgClass: 'bg-cyan-500', textClass: 'text-white' },
  { name: 'Blauw', value: '#3b82f6', bgClass: 'bg-blue-500', textClass: 'text-white' },
  { name: 'Indigo', value: '#6366f1', bgClass: 'bg-indigo-500', textClass: 'text-white' },
  { name: 'Violet', value: '#8b5cf6', bgClass: 'bg-violet-500', textClass: 'text-white' },
  { name: 'Paars', value: '#a855f7', bgClass: 'bg-purple-500', textClass: 'text-white' },
  { name: 'Fuchsia', value: '#d946ef', bgClass: 'bg-fuchsia-500', textClass: 'text-white' },
  { name: 'Roze', value: '#ec4899', bgClass: 'bg-pink-500', textClass: 'text-white' },
  { name: 'Rose', value: '#f43f5e', bgClass: 'bg-rose-500', textClass: 'text-white' },
  { name: 'Grijs', value: '#6b7280', bgClass: 'bg-gray-500', textClass: 'text-white' },
  { name: 'Slate', value: '#64748b', bgClass: 'bg-slate-500', textClass: 'text-white' },
] as const;

// Always returns the fixed soft yellow color for all categories
export function getCategoryStyle(color?: string) {
  return {
    backgroundColor: CATEGORY_LABEL_COLOR.value,
    color: CATEGORY_LABEL_COLOR.textColor,
    borderColor: CATEGORY_LABEL_COLOR.borderColor,
  };
}
