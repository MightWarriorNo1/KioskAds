/**
 * Utility functions for handling California timezone dates in the application
 */

// California timezone identifier
const CALIFORNIA_TIMEZONE = 'America/Los_Angeles';

/**
 * Converts a date string (YYYY-MM-DD) to a California timezone date string
 * This ensures dates are treated as California time rather than UTC
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns California timezone date string in YYYY-MM-DD format
 */
export function toLocalDateString(dateString: string): string {
  if (!dateString) return dateString;
  
  // Create a date object treating the input as California time
  const [year, month, day] = dateString.split('-').map(Number);
  const californiaDate = new Date(year, month - 1, day);
  
  // Return in YYYY-MM-DD format without timezone conversion
  const yearStr = californiaDate.getFullYear();
  const monthStr = String(californiaDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(californiaDate.getDate()).padStart(2, '0');
  return `${yearStr}-${monthStr}-${dayStr}`;
}

/**
 * Gets the current California timezone date in YYYY-MM-DD format
 * @returns Current California timezone date string
 */
export function getCurrentLocalDate(): string {
  const now = new Date();
  // Convert to California timezone
  const californiaTime = new Date(now.toLocaleString("en-US", {timeZone: CALIFORNIA_TIMEZONE}));
  const year = californiaTime.getFullYear();
  const month = String(californiaTime.getMonth() + 1).padStart(2, '0');
  const day = String(californiaTime.getDate()).padStart(2, '0');
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
 * Compares two date strings (YYYY-MM-DD format) as California timezone dates
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
 * Formats a date string for display in California timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in California timezone
 */
export function formatLocalDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return '';
  
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('en-US', {
    timeZone: CALIFORNIA_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  });
}

/**
 * Gets the current California timezone date and time
 * @returns Current California timezone Date object
 */
export function getCurrentCaliforniaTime(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", {timeZone: CALIFORNIA_TIMEZONE}));
}

/**
 * Converts a UTC date to California timezone
 * @param utcDate - UTC Date object
 * @returns California timezone Date object
 */
export function toCaliforniaTime(utcDate: Date): Date {
  return new Date(utcDate.toLocaleString("en-US", {timeZone: CALIFORNIA_TIMEZONE}));
}

/**
 * Converts a California timezone date to UTC
 * @param californiaDate - California timezone Date object
 * @returns UTC Date object
 */
export function toUTC(californiaDate: Date): Date {
  // Create a new date in California timezone and convert to UTC
  const utcTime = new Date(californiaDate.getTime() + (californiaDate.getTimezoneOffset() * 60000));
  return utcTime;
}

/**
 * Formats a date for display with California timezone
 * @param date - Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in California timezone
 */
export function formatCaliforniaDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('en-US', {
    timeZone: CALIFORNIA_TIMEZONE,
    ...options
  });
}

/**
 * Formats a time for display with California timezone
 * @param date - Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted time string in California timezone
 */
export function formatCaliforniaTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString('en-US', {
    timeZone: CALIFORNIA_TIMEZONE,
    ...options
  });
}
