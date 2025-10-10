/**
 * Utility functions for handling local dates in the application
 */

/**
 * Converts a date string (YYYY-MM-DD) to a local date string
 * This ensures dates are treated as local dates rather than UTC
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Local date string in YYYY-MM-DD format
 */
export function toLocalDateString(dateString: string): string {
  if (!dateString) return dateString;
  
  // Create a date object treating the input as local time
  const [year, month, day] = dateString.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  
  // Return in YYYY-MM-DD format without timezone conversion
  const yearStr = localDate.getFullYear();
  const monthStr = String(localDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(localDate.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

/**
 * Gets the current local date in YYYY-MM-DD format
 * @returns Current local date string
 */
export function getCurrentLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates that a date string is in the correct format and is a valid date
 * @param dateString - Date string to validate
 * @returns True if valid, false otherwise
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}

/**
 * Compares two date strings (YYYY-MM-DD format) as local dates
 * @param date1 - First date string
 * @param date2 - Second date string
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareLocalDates(date1: string, date2: string): number {
  const [year1, month1, day1] = date1.split('-').map(Number);
  const [year2, month2, day2] = date2.split('-').map(Number);
  
  const dateObj1 = new Date(year1, month1 - 1, day1);
  const dateObj2 = new Date(year2, month2 - 1, day2);
  
  if (dateObj1 < dateObj2) return -1;
  if (dateObj1 > dateObj2) return 1;
  return 0;
}

/**
 * Formats a date string for display in the user's locale
 * @param dateString - Date string in YYYY-MM-DD format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatLocalDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return '';
  
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  });
}
