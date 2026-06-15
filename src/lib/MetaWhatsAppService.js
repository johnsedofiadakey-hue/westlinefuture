/**
 * Compatibility wrapper for the legacy Meta WhatsApp service.
 *
 * Provider credentials must never be exposed through VITE_* browser variables.
 * All outbound messaging now routes through MessengerService, which calls the
 * authenticated Firebase Cloud Function.
 */

import { MessengerService } from './MessengerService';

export const MetaWhatsAppService = {
  sendWhatsAppOTP: async (phone, code) => {
    return MessengerService.sendOTP(phone, code);
  },

  sendMessage: async (phone, message) => {
    return MessengerService.sendMessage(phone, message);
  }
};
