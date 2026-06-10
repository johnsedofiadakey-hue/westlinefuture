/**
 * PAYMENT METHODS REGISTRY - Fixes: Issues #12 (Hardcoded payment methods)
 *
 * Extensible registry for payment methods. To add M-Pesa:
 *   1. Add to this file
 *   2. Done (no other changes needed)
 *
 * To add custom gateway for partner:
 *   const customGateway = {
 *     id: 'custom-momo',
 *     name: 'Mobile Money',
 *     enabled: true,
 *     component: CustomPaymentForm,
 *   };
 *   registerPaymentMethod(customGateway);
 */

export const PAYMENT_METHODS = {
  PAYSTACK: 'paystack',
  HUBTEL: 'hubtel',
  BANK_TRANSFER: 'bank_transfer',
  CASH_IN_PERSON: 'cash_in_person',
};

const methodRegistry = {
  [PAYMENT_METHODS.PAYSTACK]: {
    id: PAYMENT_METHODS.PAYSTACK,
    name: 'Paystack',
    description: 'Card, Bank Transfer, Mobile Money',
    icon: '💳',
    enabled: false, // Set via gateway settings
    requiresSetup: true,
    configFields: ['paystackPublicKey', 'paystackSecretKey'],
  },
  [PAYMENT_METHODS.HUBTEL]: {
    id: PAYMENT_METHODS.HUBTEL,
    name: 'Hubtel',
    description: 'MTN, Vodafone, AirtelTigo MoMo',
    icon: '📱',
    enabled: false,
    requiresSetup: true,
    configFields: ['hubtelClientId', 'hubtelClientSecret', 'hubtelMerchantId'],
  },
  [PAYMENT_METHODS.BANK_TRANSFER]: {
    id: PAYMENT_METHODS.BANK_TRANSFER,
    name: 'Bank Transfer',
    description: 'Manual bank transfer',
    icon: '🏦',
    enabled: true,
    requiresSetup: false,
    configFields: ['bankDetails'],
  },
  [PAYMENT_METHODS.CASH_IN_PERSON]: {
    id: PAYMENT_METHODS.CASH_IN_PERSON,
    name: 'Cash / In-Person',
    description: 'Pay at office or via courier',
    icon: '💵',
    enabled: true,
    requiresSetup: false,
    configFields: ['officeAddress'],
  },
};

export const getPaymentMethod = (id) => methodRegistry[id];
export const getAllPaymentMethods = () => Object.values(methodRegistry);
export const getEnabledPaymentMethods = (brand) => {
  return getAllPaymentMethods().filter(method => {
    if (!method.requiresSetup) return method.enabled;
    // Check if all required config fields are present
    return method.configFields.every(field => brand?.gatewaySettings?.[field]);
  });
};

// Allow runtime registration of custom payment methods
export const registerPaymentMethod = (method) => {
  methodRegistry[method.id] = method;
};

/**
 * NOTE: Component imports are handled in their respective files
 * (UnifiedPaymentGateway.jsx, etc.) to avoid circular dependencies
 * and allow lazy loading where needed.
 */
