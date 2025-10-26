// Default color for new categories (improved blue with better contrast)
export const DEFAULT_CATEGORY_COLOR = '#3b82f6'; // blue-500

// Color palette for category customization
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

/**
 * Calculate if a color is light or dark to determine text color
 * Uses relative luminance formula for accessibility
 */
function isLightColor(hexColor: string): boolean {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return true if light (use dark text), false if dark (use white text)
  return luminance > 0.5;
}

/**
 * Get category styling based on the provided color
 * Uses the color from database or falls back to default
 */
export function getCategoryStyle(color?: string) {
  const bgColor = color || DEFAULT_CATEGORY_COLOR;
  const textColor = isLightColor(bgColor) ? '#111827' : '#ffffff';

  return {
    backgroundColor: bgColor,
    color: textColor,
    borderColor: bgColor,
  };
}
