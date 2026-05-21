/**
 * Unified Messenger Service Hub
 * Routes all SMS through the sendSMS Cloud Function (onCall, provider=arkesel)
 * so the API key never touches the browser and CORS is never an issue.
 */

import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

const PROVIDER = import.meta.env.VITE_SMS_PROVIDER || 'mock';

async function callSendSMS(phone, message) {
  if (!functions) throw new Error('Firebase Functions not initialized');
  const fn = httpsCallable(functions, 'sendSMS');
  return fn({ phone, message });
}

export const MessengerService = {
  sendOTP: async (phone, code) => {
    if (import.meta.env.DEV) console.log(`[MessengerService] OTP via ${PROVIDER} to ${phone}`);

    if (PROVIDER === 'arkesel') {
      const message = `Westline Future\n\nYour login code is: ${code}\n\nExpires in 10 minutes.`;
      return callSendSMS(phone, message);
    }

    return new Promise((resolve) => setTimeout(() => {
      if (import.meta.env.DEV) console.log(`[MOCK OTP] To: ${phone} | Code: ${code}`);
      resolve({ success: true });
    }, 800));
  },

  sendMessage: async (phone, message) => {
    if (import.meta.env.DEV) console.log(`[MessengerService] SMS via ${PROVIDER} to ${phone}`);

    if (PROVIDER === 'arkesel') {
      return callSendSMS(phone, message);
    }

    return new Promise((resolve) => setTimeout(() => {
      if (import.meta.env.DEV) console.log(`[MOCK SMS] To: ${phone} | ${message}`);
      resolve({ success: true });
    }, 600));
  }
};
