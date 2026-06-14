/**
 * MessengerService — stub
 * All client notifications are sent server-side via Meta WhatsApp Cloud API
 * (Cloud Functions: sendWhatsApp / sendOverdueReminders).
 * This stub keeps any legacy call sites from crashing.
 */

export const MessengerService = {
  sendOTP: async (phone, code) => {
    if (import.meta.env.DEV) console.log(`[MessengerService] OTP not sent — handled server-side via Meta WA. To: ${phone}, Code: ${code}`);
    return { success: true, mock: true };
  },

  sendMessage: async (phone, message) => {
    if (import.meta.env.DEV) console.log(`[MessengerService] Message not sent — handled server-side via Meta WA. To: ${phone}`);
    return { success: true, mock: true };
  },
};
