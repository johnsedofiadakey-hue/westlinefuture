/**
 * Arkesel Service for SMS and WhatsApp Delivery
 * Provides a streamlined integration for local carrier networks.
 */

const API_KEY = import.meta.env.VITE_ARKESEL_API_KEY;
const SENDER_ID = import.meta.env.VITE_ARKESEL_SENDER_ID || 'Westline Future';

export const ArkeselService = {
  /**
   * Internal dispatcher for Arkesel API
   */
  _dispatch: async (payload) => {
    if (!API_KEY) {
      throw new Error("Arkesel API Key is missing. Please add VITE_ARKESEL_API_KEY to your .env file.");
    }

    try {
      const response = await fetch('https://api.arkesel.com/v2/sms/send', {
        method: 'POST',
        headers: {
          'api-key': API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || result.status === 'error') {
        const errorDetail = result.message || "Arkesel Service Error";
        throw new Error(`Arkesel (${response.status}): ${errorDetail}`);
      }

      return result;
    } catch (error) {
      console.error("[ArkeselService Error]:", error);
      throw error;
    }
  },

  /**
   * Sends an OTP via Arkesel.
   * 
   * @param {string} phone - The phone number to send to.
   * @param {string} code - The OTP code to send.
   * @param {string} [channel='whatsapp'] - The channel to use ('sms' or 'whatsapp').
   * @returns {Promise<object>} Returns the API response.
   */
  sendOTP: async (phone, code, channel = 'whatsapp') => {
    const cleanPhone = phone.replace(/\D/g, '');
    const payload = {
      sender: SENDER_ID,
      message: `*Westline Future*\n\nYour security access code is: *${code}*\n\nThis code expires in 10 minutes.`,
      recipients: [cleanPhone],
      channel: channel
    };

    console.log(`[ArkeselService] Dispatching ${channel.toUpperCase()} OTP to ${cleanPhone}...`);
    return await ArkeselService._dispatch(payload);
  },

  /**
   * Sends a generic message via Arkesel.
   * 
   * @param {string} phone - The phone number to send to.
   * @param {string} message - The message text to send.
   * @param {string} [channel='whatsapp'] - The channel to use ('sms' or 'whatsapp').
   * @returns {Promise<object>} Returns the API response.
   */
  sendMessage: async (phone, message, channel = 'whatsapp') => {
    const cleanPhone = phone.replace(/\D/g, '');
    const payload = {
      sender: SENDER_ID,
      message: message,
      recipients: [cleanPhone],
      channel: channel
    };

    console.log(`[ArkeselService] Dispatching ${channel.toUpperCase()} message to ${cleanPhone}...`);
    return await ArkeselService._dispatch(payload);
  }
};
