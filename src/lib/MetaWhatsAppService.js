/**
 * Meta WhatsApp Cloud API Service
 * Direct integration with Meta Graph API for direct WhatsApp messaging.
 */

const TOKEN = import.meta.env.VITE_META_WHATSAPP_TOKEN;
const PHONE_ID = import.meta.env.VITE_META_WHATSAPP_PHONE_ID;
const TEMPLATE_NAME = import.meta.env.VITE_META_WHATSAPP_TEMPLATE_NAME; // Optional: use if they have an approved OTP template

export const MetaWhatsAppService = {
  /**
   * Sends an OTP via Meta WhatsApp Cloud API.
   * @param {string} phone - Recipient phone number (clean digits).
   * @param {string} code - The 6-digit PIN.
   */
  sendWhatsAppOTP: async (phone, code) => {
    if (!TOKEN || !PHONE_ID) {
      throw new Error("Meta WhatsApp configuration is missing (Token or Phone ID).");
    }

    // Prepare phone (Meta expects digits without + prefix and NO leading zeros)
    // receiver phone number in E.164 format, but without the + prefix
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

    // Payload Construction:
    // If TEMPLATE_NAME is provided, we assume it is an 'Authentication' category template.
    // Standard 'Authentication' templates usually have a Body parameter AND a Button parameter.
    const payload = TEMPLATE_NAME ? {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: code }
            ]
          },
          {
            type: "button",
            sub_type: "url", // Standard for 'Copy Code' or 'One-tap'
            index: "0",
            parameters: [
              { type: "text", text: code }
            ]
          }
        ]
      }
    } : {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: {
        preview_url: false,
        body: `*Westline Future*\n\nYour security access code is: *${code}*\n\nThis code expires in 10 minutes.`
      }
    };

    try {
      console.log(`[MetaWhatsAppService] Dispatching OTP to ${cleanPhone} via ${TEMPLATE_NAME || 'Direct Text'}`);
      
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const errorDetail = result.error?.error_data?.details || result.error?.message || "Unknown Meta Error";
        const errorCode = result.error?.code || 'N/A';
        console.error(`[Meta API Error] Code ${errorCode}: ${errorDetail}`);
        throw new Error(`Meta (${errorCode}): ${errorDetail}`);
      }

      console.log(`[MetaWhatsAppService] Success:`, result.messages?.[0]?.id);
      return result;
    } catch (error) {
      console.error("[MetaWhatsAppService Error]:", error);
      throw error;
    }
  },

  /**
   * Sends a general text message.
   */
  sendMessage: async (phone, message) => {
    if (!TOKEN || !PHONE_ID) {
      throw new Error("Meta WhatsApp configuration is missing.");
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: { body: message }
    };

    try {
      const response = await fetch(
        `https://graph.facebook.com/v17.0/${PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
      return await response.json();
    } catch (error) {
      console.error("[MetaWhatsAppService Error]:", error);
      throw error;
    }
  }
};
