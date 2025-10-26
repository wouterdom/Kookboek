/**
 * Utility functions for weekmenu functionality
 * Week starts on Monday (ISO 8601 standard)
 */

/**
 * Get the Monday of the week for a given date
 */
export function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the current week's Monday
 */
export function getCurrentWeekMonday(): Date {
  return getMonday(new Date())
}

/**
 * Add/subtract weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + weeks * 7)
  return getMonday(result)
}

/**
 * Format date as YYYY-MM-DD for database
 */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get week number (ISO 8601)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Get week date range as formatted string
 */
export function getWeekDateRange(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  const mondayStr = monday.toLocaleDateString('nl-NL', options)
  const sundayStr = sunday.toLocaleDateString('nl-NL', options)

  return `${mondayStr} - ${sundayStr}`
}

/**
 * Get short week date range (for mobile)
 */
export function getWeekDateRangeShort(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const mondayDay = monday.getDate()
  const sundayDay = sunday.getDate()
  const month = monday.toLocaleDateString('nl-NL', { month: 'long' })
  const year = monday.getFullYear()

  return `${mondayDay} - ${sundayDay} ${month} ${year}`
}

/**
 * Get day name in Dutch
 */
export function getDayName(dayOfWeek: number, short: boolean = false): string {
  const days = short
    ? ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
    : ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
  return days[dayOfWeek] || ''
}

/**
 * Get day date for a specific day of week
 */
export function getDayDate(monday: Date, dayOfWeek: number): Date {
  const result = new Date(monday)
  result.setDate(monday.getDate() + dayOfWeek)
  return result
}

/**
 * Format day header (e.g., "Maandag 20")
 */
export function formatDayHeader(monday: Date, dayOfWeek: number): string {
  const dayDate = getDayDate(monday, dayOfWeek)
  const dayName = getDayName(dayOfWeek)
  const day = dayDate.getDate()
  return `${dayName} ${day}`
}

/**
 * Format mobile day header (e.g., "Ma 20")
 */
export function formatDayHeaderShort(monday: Date, dayOfWeek: number): string {
  const dayDate = getDayDate(monday, dayOfWeek)
  const dayName = getDayName(dayOfWeek, true)
  const day = dayDate.getDate()
  return `${dayName} ${day}`
}

/**
 * Check if date is current week
 */
export function isCurrentWeek(monday: Date): boolean {
  const currentMonday = getCurrentWeekMonday()
  return formatDateForDB(monday) === formatDateForDB(currentMonday)
}

/**
 * Parse amount from ingredient string (e.g., "400g" -> 400)
 * Used for servings calculation
 */
export function parseAmount(amountStr: string): { value: number; unit: string } | null {
  const match = amountStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/)
  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[2].trim()
    }
  }
  return null
}

/**
 * Calculate new amount based on servings ratio
 */
export function calculateScaledAmount(
  originalAmount: string,
  originalServings: number,
  newServings: number
): string {
  const parsed = parseAmount(originalAmount)
  if (!parsed) return originalAmount

  const ratio = newServings / originalServings
  const newValue = Math.round(parsed.value * ratio * 10) / 10 // Round to 1 decimal

  return `${newValue}${parsed.unit ? ' ' + parsed.unit : ''}`
}

/**
 * Group weekmenu items by day
 */
export interface WeekMenuItemsByDay {
  [dayOfWeek: number]: any[] // dayOfWeek: 0-6 or null for unassigned
  unassigned: any[]
}

export function groupItemsByDay(items: any[]): WeekMenuItemsByDay {
  const grouped: WeekMenuItemsByDay = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    unassigned: []
  }

  items.forEach(item => {
    if (item.day_of_week === null) {
      grouped.unassigned.push(item)
    } else if (item.day_of_week >= 0 && item.day_of_week <= 6) {
      grouped[item.day_of_week].push(item)
    }
  })

  // Sort by order_index within each day
  Object.keys(grouped).forEach(key => {
    grouped[key as any].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
  })

  return grouped
}
