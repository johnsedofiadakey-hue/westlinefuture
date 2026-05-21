/**
 * Unified Messenger Service Hub
 * Routes all messaging through the server-side Cloud Function proxy.
 * API tokens are never exposed in the browser bundle.
 */

const PROVIDER = import.meta.env.VITE_WHATSAPP_PROVIDER || 'mock';
const CLOUD_FN_URL = import.meta.env.VITE_WHATSAPP_CLOUD_FN_URL; // e.g. https://us-central1-<project>.cloudfunctions.net/sendWhatsApp

async function callProxy(phone, message) {
  if (!CLOUD_FN_URL) throw new Error('VITE_WHATSAPP_CLOUD_FN_URL is not configured');
  const res = await fetch(CLOUD_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message, provider: PROVIDER })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const MessengerService = {
  sendOTP: async (phone, code) => {
    if (import.meta.env.DEV) console.log(`[MessengerService] OTP via provider: ${PROVIDER}`);

    if (PROVIDER === 'mock') {
      return new Promise((resolve) => setTimeout(() => {
        if (import.meta.env.DEV) console.log(`[MOCK OTP] To: ${phone} | Code: ${code}`);
        resolve({ success: true, sid: crypto.randomUUID() });
      }, 800));
    }

    return callProxy(phone, `Your Westline Future Fab verification code is: ${code}`);
  },

  sendMessage: async (phone, message) => {
    if (import.meta.env.DEV) console.log(`[MessengerService] Message via provider: ${PROVIDER}`);

    if (PROVIDER === 'mock') {
      return new Promise((resolve) => setTimeout(() => {
        if (import.meta.env.DEV) console.log(`[MOCK MSG] To: ${phone} | ${message}`);
        resolve({ success: true, sid: crypto.randomUUID() });
      }, 600));
    }

    return callProxy(phone, message);
  }
};
