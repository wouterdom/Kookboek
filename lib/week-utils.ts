/**
 * Week Utility Functions
 *
 * Week always starts on Monday (day 0)
 * Provides functions for week calculations, navigation, and formatting
 */

/**
 * Get the Monday of the week for a given date
 * @param date - Any date in the week
 * @returns The Monday of that week
 */
export function getWeekMonday(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sunday) to 6 (Saturday)

  // Convert Sunday (0) to 7 for easier calculation
  const dayOfWeek = day === 0 ? 7 : day;

  // Calculate difference to Monday (1)
  const diff = dayOfWeek - 1;

  // Set to Monday of the current week
  d.setDate(d.getDate() - diff);

  // Reset time to midnight
  d.setHours(0, 0, 0, 0);

  return d;
}

/**
 * Get the current week's Monday
 * @returns The Monday of the current week
 */
export function getCurrentWeekMonday(): Date {
  return getWeekMonday(new Date());
}

/**
 * Add or subtract weeks from a date
 * @param date - Starting date (should be a Monday)
 * @param weeks - Number of weeks to add (positive) or subtract (negative)
 * @returns The new date
 */
export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + (weeks * 7));
  return d;
}

/**
 * Get week number (ISO 8601 week numbering)
 * @param date - The date to get week number for
 * @returns The week number (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // Thursday in current week decides the year
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);

  // January 4 is always in week 1
  const week1 = new Date(d.getFullYear(), 0, 4);

  // Calculate full weeks to nearest Thursday
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

/**
 * Format date range for week display
 * Format: "Week X - DD-DD maand YYYY"
 * Example: "Week 4 - 20-26 januari 2025"
 *
 * @param monday - The Monday of the week
 * @returns Formatted week string
 */
export function formatWeekRange(monday: Date): string {
  const weekNum = getWeekNumber(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const monthNames = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];

  const mondayDay = monday.getDate();
  const sundayDay = sunday.getDate();
  const month = monthNames[sunday.getMonth()];
  const year = sunday.getFullYear();

  // If week spans two months, show both
  if (monday.getMonth() !== sunday.getMonth()) {
    const mondayMonth = monthNames[monday.getMonth()];
    return `Week ${weekNum} - ${mondayDay} ${mondayMonth} - ${sundayDay} ${month} ${year}`;
  }

  return `Week ${weekNum} - ${mondayDay}-${sundayDay} ${month} ${year}`;
}

/**
 * Get day name in Dutch
 * @param dayIndex - Day index (0 = Monday, 6 = Sunday)
 * @returns Dutch day name
 */
export function getDayName(dayIndex: number): string {
  const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
  return days[dayIndex] || 'Onbekend';
}

/**
 * Get short day name in Dutch
 * @param dayIndex - Day index (0 = Monday, 6 = Sunday)
 * @returns Short Dutch day name
 */
export function getShortDayName(dayIndex: number): string {
  const days = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
  return days[dayIndex] || '?';
}

/**
 * Format date as YYYY-MM-DD for database storage
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are in the same week
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are in the same week
 */
export function isSameWeek(date1: Date, date2: Date): boolean {
  const monday1 = getWeekMonday(date1);
  const monday2 = getWeekMonday(date2);
  return formatDateForDB(monday1) === formatDateForDB(monday2);
}

/**
 * Get date for a specific day in a week
 * @param weekMonday - The Monday of the week
 * @param dayIndex - Day index (0 = Monday, 6 = Sunday)
 * @returns The date for that day
 */
export function getDateForDay(weekMonday: Date, dayIndex: number): Date {
  const date = new Date(weekMonday);
  date.setDate(date.getDate() + dayIndex);
  return date;
}

/**
 * Check if a date is today
 * @param date - The date to check
 * @returns True if the date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a week is the current week
 * @param weekMonday - The Monday of the week to check
 * @returns True if it's the current week
 */
export function isCurrentWeek(weekMonday: Date): boolean {
  return isSameWeek(weekMonday, new Date());
}
