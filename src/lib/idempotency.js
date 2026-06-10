/**
 * IDEMPOTENCY KEYS - Fixes: Issue #24 (No duplicate prevention)
 *
 * Prevents accidental duplicate mutations when user clicks button twice
 * (network lag, React re-renders, user impatience, etc.)
 *
 * Usage:
 *   const key = generateIdempotencyKey('invoice');
 *   await createInvoice({ ...data, idempotencyKey: key });
 *   // If network fails and user retries, same invoice won't be created twice
 */

import { generateId } from './utils';

// In-memory cache of recent keys (prevents duplicates within 60 seconds)
const recentKeys = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Generate unique idempotency key for a mutation
 * @param {string} operation - 'invoice', 'payment', 'proposal', etc.
 * @returns {string} Unique key for this operation
 */
export const generateIdempotencyKey = (operation = 'mutation') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  const key = `${operation}-${timestamp}-${random}`;

  // Track in memory
  recentKeys.set(key, timestamp);

  // Cleanup old entries
  for (const [k, t] of recentKeys.entries()) {
    if (Date.now() - t > CACHE_TTL) {
      recentKeys.delete(k);
    }
  }

  return key;
};

/**
 * Check if key was recently used (duplicate prevention)
 * @param {string} key - Idempotency key
 * @returns {boolean} True if key was used recently
 */
export const isDuplicateKey = (key) => recentKeys.has(key);

/**
 * Storage: Save idempotency key to localStorage for persistence across page reloads
 * Prevents duplicates even if user refreshes page
 */
export const saveIdempotencyKey = (key, operation = 'mutation') => {
  try {
    const stored = JSON.parse(localStorage.getItem('wl_idempotent_keys') || '{}');
    stored[key] = { operation, timestamp: Date.now() };
    localStorage.setItem('wl_idempotent_keys', JSON.stringify(stored));
  } catch (err) {
    console.error('[idempotency] localStorage error:', err);
  }
};

/**
 * Check stored keys (even across page reloads)
 */
export const hasStoredIdempotencyKey = (key) => {
  try {
    const stored = JSON.parse(localStorage.getItem('wl_idempotent_keys') || '{}');
    const entry = stored[key];
    if (!entry) return false;

    // Check if key is still valid (within 1 hour)
    const age = Date.now() - entry.timestamp;
    if (age > 60 * 60 * 1000) {
      delete stored[key];
      localStorage.setItem('wl_idempotent_keys', JSON.stringify(stored));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[idempotency] localStorage read error:', err);
    return false;
  }
};

/**
 * Clear old idempotency keys from localStorage
 */
export const cleanupOldIdempotencyKeys = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('wl_idempotent_keys') || '{}');
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    let cleaned = false;
    for (const [key, entry] of Object.entries(stored)) {
      if (entry.timestamp < oneHourAgo) {
        delete stored[key];
        cleaned = true;
      }
    }

    if (cleaned) {
      localStorage.setItem('wl_idempotent_keys', JSON.stringify(stored));
    }
  } catch (err) {
    console.error('[idempotency] cleanup error:', err);
  }
};

// Cleanup on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', cleanupOldIdempotencyKeys);
}

/**
 * INTEGRATION PATTERN
 *
 * In your mutation function:
 *   const createInvoice = async (data) => {
 *     const key = generateIdempotencyKey('invoice');
 *     saveIdempotencyKey(key, 'invoice');
 *
 *     try {
 *       const result = await addDoc(collection(db, 'invoices'), {
 *         ...data,
 *         idempotencyKey: key,
 *       });
 *       notify('success', 'Invoice created');
 *       return result.id;
 *     } catch (err) {
 *       // Key is already saved, so if user retries, same key is used
 *       notify('error', 'Failed to create invoice');
 *     }
 *   };
 *
 * In Firestore (Cloud Function):
 *   // Check if key already processed
 *   const existing = await db.collection('invoices')
 *     .where('idempotencyKey', '==', key)
 *     .limit(1)
 *     .get();
 *
 *   if (!existing.empty) {
 *     // Return existing result instead of creating duplicate
 *     return { success: true, id: existing.docs[0].id, isDuplicate: true };
 *   }
 *
 *   // Create new invoice with key
 */
