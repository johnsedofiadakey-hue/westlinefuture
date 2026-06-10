/**
 * ERROR MESSAGE MAPPING - Centralized user-friendly error messages
 *
 * Converts technical Firebase errors into clear, actionable messages for users.
 *
 * Usage:
 *   import { getErrorMessage, getFirebaseErrorMessage } from './lib/errorMessages';
 *
 *   try {
 *     await updateDoc(...);
 *   } catch (err) {
 *     notify('error', getFirebaseErrorMessage(err));
 *   }
 */

/**
 * User-friendly error messages by error code/type
 */
const ERROR_MESSAGES = {
  // Firebase Auth Errors
  'auth/user-not-found': 'User account not found. Please check your email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-email': 'Invalid email address.',
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many login attempts. Please try again later.',
  'auth/operation-not-allowed': 'This operation is not allowed.',
  'auth/invalid-api-key': 'Invalid API configuration.',

  // Firestore Errors
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested resource was not found.',
  'already-exists': 'This item already exists.',
  'failed-precondition': 'Operation failed due to data inconsistency. Please refresh and try again.',
  'aborted': 'Operation was cancelled. Please try again.',
  'out-of-range': 'The value is out of range.',
  'unimplemented': 'This feature is not yet implemented.',
  'internal': 'An internal server error occurred. Please try again later.',
  'unavailable': 'The service is temporarily unavailable. Please try again later.',
  'data-loss': 'Data loss occurred. Please contact support.',
  'unauthenticated': 'Please log in to continue.',

  // Storage Errors
  'storage/object-not-found': 'File not found.',
  'storage/bucket-not-found': 'Storage bucket not found.',
  'storage/project-not-found': 'Project configuration error.',
  'storage/quota-exceeded': 'Storage quota exceeded. Please delete some files.',
  'storage/unauthenticated': 'Please log in to access files.',
  'storage/unauthorized': 'You do not have permission to access this file.',
  'storage/retry-limit-exceeded': 'Upload failed after multiple retries. Please try again.',
  'storage/invalid-checksum': 'File checksum mismatch. Please try uploading again.',
  'storage/canceled': 'Upload was cancelled.',
  'storage/invalid-event-name': 'Invalid event name.',
  'storage/invalid-url': 'Invalid file URL.',

  // Common Errors
  'invalid-argument': 'Invalid input. Please check your data and try again.',
  'network-error': 'Network error. Please check your connection.',
  'timeout': 'Request timed out. Please try again.',
  'validation-error': 'Validation failed. Please check your input.',
};

/**
 * Get user-friendly message for Firebase error
 * @param {Error|string} error - Firebase error object or code
 * @returns {string} User-friendly error message
 */
export const getFirebaseErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred.';

  // If it's already a string (error code), use directly
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || error;
  }

  // Extract error code from Firebase error object
  const code = error?.code || error?.message || '';

  // Check exact code match
  if (ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  // Check for partial matches
  for (const [errorCode, message] of Object.entries(ERROR_MESSAGES)) {
    if (code.includes(errorCode) || code.includes(errorCode.replace('/', '-'))) {
      return message;
    }
  }

  // Check message content for hints
  const message = (error?.message || '').toLowerCase();

  if (message.includes('permission')) return ERROR_MESSAGES['permission-denied'];
  if (message.includes('not found')) return ERROR_MESSAGES['not-found'];
  if (message.includes('already exists')) return ERROR_MESSAGES['already-exists'];
  if (message.includes('network')) return ERROR_MESSAGES['network-error'];
  if (message.includes('timeout')) return ERROR_MESSAGES['timeout'];
  if (message.includes('quota')) return ERROR_MESSAGES['storage/quota-exceeded'];

  // Default fallback
  return error?.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Get error message by code
 * @param {string} code - Error code
 * @returns {string} Error message
 */
export const getErrorMessage = (code) => {
  return ERROR_MESSAGES[code] || `Error: ${code}`;
};

/**
 * Extend error messages (for custom errors)
 * @param {Object} messages - Custom error messages
 */
export const extendErrorMessages = (messages) => {
  Object.assign(ERROR_MESSAGES, messages);
};

/**
 * Log error for debugging (with sanitization)
 * @param {Error} error - Error to log
 * @param {string} context - Where error occurred
 */
export const logError = (error, context = 'Unknown') => {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, {
      code: error?.code,
      message: error?.message,
      details: error,
    });
  }

  // In production, could send to error tracking service
  // sendToErrorTracker(error, context);
};

/**
 * Normalize error for consistent handling
 * @param {any} error - Error to normalize
 * @returns {Object} Normalized error object
 */
export const normalizeError = (error) => {
  return {
    code: error?.code || 'UNKNOWN',
    message: getFirebaseErrorMessage(error),
    originalMessage: error?.message,
    details: error,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Check if error is retryable
 * @param {Error|string} error - Error to check
 * @returns {boolean} True if error is temporary and can be retried
 */
export const isRetryableError = (error) => {
  const code = typeof error === 'string' ? error : error?.code || '';

  const retryableCodes = [
    'network-error',
    'timeout',
    'aborted',
    'unavailable',
    'internal',
  ];

  return retryableCodes.some((c) => code.includes(c));
};

/**
 * Get retry backoff delay (milliseconds)
 * Implements exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
 * @param {number} attemptNumber - Attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
export const getRetryDelay = (attemptNumber = 0) => {
  const maxDelay = 16000; // 16 seconds
  const delay = Math.min(1000 * Math.pow(2, attemptNumber), maxDelay);
  // Add jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return delay + jitter;
};

/**
 * Usage Examples
 *
 * ─────────────────────────────────────
 *
 * 1. In mutation functions:
 *    try {
 *      await updateDoc(ref, data);
 *    } catch (err) {
 *      logError(err, 'updateInvoice');
 *      notify('error', getFirebaseErrorMessage(err));
 *    }
 *
 * ─────────────────────────────────────
 *
 * 2. With retry logic:
 *    const MAX_RETRIES = 3;
 *    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
 *      try {
 *        return await operation();
 *      } catch (err) {
 *        if (!isRetryableError(err) || attempt === MAX_RETRIES - 1) {
 *          throw normalizeError(err);
 *        }
 *        await delay(getRetryDelay(attempt));
 *      }
 *    }
 *
 * ─────────────────────────────────────
 *
 * 3. Custom errors:
 *    extendErrorMessages({
 *      'custom/invoice-locked': 'Invoice is locked and cannot be edited.',
 *      'custom/quota-exceeded': 'You have reached your invoice limit.',
 *    });
 */

export default {
  getFirebaseErrorMessage,
  getErrorMessage,
  extendErrorMessages,
  logError,
  normalizeError,
  isRetryableError,
  getRetryDelay,
};
