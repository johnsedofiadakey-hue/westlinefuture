/**
 * Compatibility wrapper for the legacy Twilio service.
 *
 * Twilio credentials are intentionally not read in the browser. Messaging is
 * delegated to MessengerService and handled server-side by Cloud Functions.
 */

import { MessengerService } from './MessengerService';

export const TwilioService = {
  sendWhatsAppOTP: async (phone, code) => {
    return MessengerService.sendOTP(phone, code);
  }
};
