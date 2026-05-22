/**
 * Compatibility wrapper for the legacy Arkesel service.
 *
 * Arkesel API keys must stay server-side. This module preserves the old API
 * while delegating delivery to the authenticated Cloud Function path.
 */

import { MessengerService } from './MessengerService';

export const ArkeselService = {
  sendOTP: async (phone, code) => {
    return MessengerService.sendOTP(phone, code);
  },

  sendMessage: async (phone, message) => {
    return MessengerService.sendMessage(phone, message);
  }
};
