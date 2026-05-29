/**
 * Timezone utilities for Evalix
 * All times displayed in Asia/Kolkata (IST, GMT+5:30)
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a date/ISO string to IST display string.
 * @param {string|Date} date
 * @param {object} options - Intl.DateTimeFormat options override
 * @returns {string} Formatted IST string
 */
export function formatIST(date, options = {}) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  const defaults = {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  return d.toLocaleString('en-IN', { ...defaults, ...options });
}

/**
 * Formats a date to show only the date portion in IST.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatISTDate(date) {
  return formatIST(date, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: undefined,
    minute: undefined,
    hour12: undefined,
  });
}

/**
 * Converts a datetime-local input value (no timezone) to a proper ISO string.
 * The datetime-local input gives us "2026-04-27T22:30" which is local time.
 * new Date() treats this as local time, so .toISOString() converts it correctly to UTC.
 * @param {string} localDateTimeStr - Value from datetime-local input
 * @returns {string|null} ISO 8601 string in UTC, or null if empty
 */
export function localInputToISO(localDateTimeStr) {
  if (!localDateTimeStr) return null;
  try {
    // "YYYY-MM-DDTHH:mm" format
    const [datePart, timePart] = localDateTimeStr.split('T');
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split(':');
    
    // new Date(year, monthIndex, day, hours, minutes) explicitly uses the local timezone
    const d = new Date(year, month - 1, day, hour, minute);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch (err) {
    return null;
  }
}

/**
 * Converts an ISO/UTC date string to a value suitable for datetime-local input.
 * This is the reverse of localInputToISO — takes UTC and shows local time.
 * @param {string} isoStr - ISO 8601 date string
 * @returns {string} Format: "YYYY-MM-DDTHH:MM" in local time
 */
export function isoToLocalInput(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  // Format as local datetime for the input
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
