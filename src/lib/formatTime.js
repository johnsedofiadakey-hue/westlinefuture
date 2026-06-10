/**
 * TIMESTAMP FORMATTING - Fixes: Issue #14 (Inconsistent date formats)
 *
 * Replaces scattered `.toLocaleDateString()` calls with consistent formatters.
 * Ensures all dates display the same way across the app.
 *
 * Usage:
 *   import { formatDate, formatTime, formatDateTime, formatRelative } from './lib/formatTime';
 *
 *   formatDate(new Date())              // "10 Jun 2026"
 *   formatTime(new Date())              // "14:30"
 *   formatDateTime(new Date())          // "10 Jun 2026, 14:30"
 *   formatRelative(new Date())          // "2 hours ago"
 *   formatDuration(3661)                // "1h 1m"
 */

/**
 * Format date as "10 Jun 2026" or "10/06/2026"
 * @param {Date|string|number} date - Date to format
 * @param {string} format - 'long' | 'short' | 'numeric'
 * @param {string} locale - Language code (default: 'en-GB')
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = 'long', locale = 'en-GB') => {
  if (!date) return '—';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';

    if (format === 'numeric') {
      return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    if (format === 'short') {
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    // 'long'
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return '—';
  }
};

/**
 * Format time as "14:30" or "2:30 PM"
 * @param {Date|string|number} date - Date to format
 * @param {string} format - '24h' | '12h'
 * @param {string} locale - Language code
 * @returns {string} Formatted time
 */
export const formatTime = (date, format = '24h', locale = 'en-GB') => {
  if (!date) return '—';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';

    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: format === '12h',
    };

    return d.toLocaleTimeString(locale, options);
  } catch (e) {
    return '—';
  }
};

/**
 * Format date and time as "10 Jun 2026, 14:30"
 * @param {Date|string|number} date - Date to format
 * @param {string} dateFormat - 'long' | 'short' | 'numeric'
 * @param {string} timeFormat - '24h' | '12h'
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (date, dateFormat = 'short', timeFormat = '24h') => {
  if (!date) return '—';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';

    const datePart = formatDate(d, dateFormat);
    const timePart = formatTime(d, timeFormat);

    return `${datePart}, ${timePart}`;
  } catch (e) {
    return '—';
  }
};

/**
 * Format relative time as "2 hours ago", "in 3 days", etc.
 * @param {Date|string|number} date - Date to format
 * @param {Date|string|number} from - Reference date (default: now)
 * @returns {string} Relative time string
 */
export const formatRelative = (date, from = new Date()) => {
  if (!date) return '—';

  try {
    const d = new Date(date);
    const f = new Date(from);
    if (isNaN(d.getTime()) || isNaN(f.getTime())) return '—';

    const seconds = Math.floor((f - d) / 1000);
    const isFuture = seconds < 0;
    const absSeconds = Math.abs(seconds);

    // Format: "X [unit] ago" or "in X [unit]"
    const format = (n, unit) => {
      const suffix = isFuture ? `in ${n} ${unit}` : `${n} ${unit} ago`;
      return n > 1 ? suffix : suffix.replace(unit, unit.slice(0, -1)); // Singularize
    };

    if (absSeconds < 60) return 'just now';
    if (absSeconds < 3600) return format(Math.floor(absSeconds / 60), 'minutes');
    if (absSeconds < 86400) return format(Math.floor(absSeconds / 3600), 'hours');
    if (absSeconds < 604800) return format(Math.floor(absSeconds / 86400), 'days');
    if (absSeconds < 2592000) return format(Math.floor(absSeconds / 604800), 'weeks');
    if (absSeconds < 31536000) return format(Math.floor(absSeconds / 2592000), 'months');

    return format(Math.floor(absSeconds / 31536000), 'years');
  } catch (e) {
    return '—';
  }
};

/**
 * Format duration in seconds as "1h 2m 3s" or "2h 3m"
 * @param {number} seconds - Duration in seconds
 * @param {string} precision - 'full' | 'hours' | 'minutes'
 * @returns {string} Formatted duration
 */
export const formatDuration = (seconds = 0, precision = 'full') => {
  if (!seconds || seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && precision === 'full') parts.push(`${secs}s`);

  return parts.length ? parts.join(' ') : '0s';
};

/**
 * Format Firestore timestamp or Unix timestamp
 * Handles both Firestore timestamps and native JS timestamps
 * @param {object|number|string} timestamp - Firestore timestamp or Date
 * @returns {string} Formatted date
 */
export const formatFirestoreDate = (timestamp) => {
  if (!timestamp) return '—';

  try {
    let date;

    // Firestore Timestamp object
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    }
    // Firestore object with seconds field
    else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    }
    // Unix timestamp (milliseconds)
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    // Date string or Date object
    else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return '—';
    return formatDate(date, 'short');
  } catch (e) {
    return '—';
  }
};

/**
 * Check if date is today
 */
export const isToday = (date) => {
  const d = new Date(date);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date) => {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
};

/**
 * Format with smart logic: "Today, 14:30" or "Yesterday" or "10 Jun"
 */
export const formatSmart = (date) => {
  if (!date) return '—';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';

    if (isToday(d)) {
      return `Today, ${formatTime(d, '24h')}`;
    }
    if (isYesterday(d)) {
      return 'Yesterday';
    }

    return formatDate(d, 'short');
  } catch (e) {
    return '—';
  }
};

/**
 * MIGRATION GUIDE
 *
 * Replace scattered date formatting:
 *
 *   // Before
 *   new Date(invoice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
 *
 *   // After
 *   formatDate(invoice.date, 'short')
 *
 * ───────────────────────────────────
 *
 *   // Before
 *   new Date(timestamp.seconds * 1000).toLocaleDateString(...)
 *
 *   // After
 *   formatFirestoreDate(timestamp)
 *
 * ───────────────────────────────────
 *
 *   // Before (relative time)
 *   const days = Math.floor((Date.now() - d) / 86400000);
 *   return `${days} days ago`;
 *
 *   // After
 *   formatRelative(d)
 */

export default {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelative,
  formatDuration,
  formatFirestoreDate,
  formatSmart,
  isToday,
  isYesterday,
};
