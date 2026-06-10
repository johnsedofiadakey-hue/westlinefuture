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
 * PAYMENT METHOD COMPONENTS - Lazy load per method
 * Each component receives: { brand, onSuccess, onError }
 */
export const getPaymentComponent = async (methodId) => {
  const method = getPaymentMethod(methodId);
  if (!method) throw new Error(`Unknown payment method: ${methodId}`);

  if (methodId === PAYMENT_METHODS.PAYSTACK) {
    const { UnifiedPaymentGateway } = await import('../components/UnifiedPaymentGateway');
    return UnifiedPaymentGateway;
  }

  if (methodId === PAYMENT_METHODS.HUBTEL) {
    const { HubtelPaymentGateway } = await import('../components/HubtelPaymentGateway');
    return HubtelPaymentGateway;
  }

  if (methodId === PAYMENT_METHODS.BANK_TRANSFER) {
    const { BankTransferForm } = await import('../components/BankTransferForm');
    return BankTransferForm;
  }

  if (methodId === PAYMENT_METHODS.CASH_IN_PERSON) {
    const { CashPaymentForm } = await import('../components/CashPaymentForm');
    return CashPaymentForm;
  }
};
