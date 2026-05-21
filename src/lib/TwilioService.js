/**
 * Twilio Service for Real-time WhatsApp OTP Delivery
 * Note: This implementation uses the Programmable Messaging API.
 * In production, these calls should be proxied through a secure backend (e.g. Firebase Cloud Functions).
 */

const SID = import.meta.env.VITE_TWILIO_SID;
const TOKEN = import.meta.env.VITE_TWILIO_TOKEN;
const SENDER = import.meta.env.VITE_TWILIO_SENDER;

export const TwilioService = {
  /**
   * Sends a custom WhatsApp message with the generated OTP PIN.
   * @param {string} phone - The recipient's phone number.
   * @param {string} code - The 6-digit PIN.
   */
  sendWhatsAppOTP: async (phone, code) => {
    if (!SID || !TOKEN || !SENDER) {
      throw new Error("Twilio configuration is missing. Please check your .env file.");
    }

    // Prepare credentials for Basic Auth
    const auth = btoa(`${SID}:${TOKEN}`);
    
    // Format the phone number (ensure it has the + prefix)
    const formattedTo = phone.startsWith('+') ? `whatsapp:${phone}` : `whatsapp:+${phone}`;
    const formattedFrom = SENDER.startsWith('whatsapp:') ? SENDER : `whatsapp:${SENDER}`;

    const body = new URLSearchParams();
    body.append('To', formattedTo);
    body.append('From', formattedFrom);
    body.append('Body', `*Westline Future*\n\nYour secure authentication code is: *${code}*\n\nThis code expires in 10 minutes. Please do not share it with anyone.`);

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.message || "Twilio Service Error";
        const errorCode = result.code ? ` (Code: ${result.code})` : "";
        throw new Error(`${errorMsg}${errorCode}`);
      }

      return result;
    } catch (error) {
      console.error("[TwilioService Error]:", error);
      // Detection of CORS issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error("Phone Sync blocked by Browser security. Please use the fallback code below.");
      }
      throw error;
    }
  }
};
