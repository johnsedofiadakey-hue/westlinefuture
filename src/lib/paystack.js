const PAYSTACK_SCRIPT_URL = 'https://js.paystack.co/v1/inline.js';

let paystackScriptPromise = null;

function loadPaystackScript() {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop);

  if (!paystackScriptPromise) {
    paystackScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${PAYSTACK_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window.PaystackPop));
        existing.addEventListener('error', reject);
        return;
      }

      const script = document.createElement('script');
      script.src = PAYSTACK_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve(window.PaystackPop);
      script.onerror = () => reject(new Error('Unable to load Paystack checkout'));
      document.head.appendChild(script);
    });
  }

  return paystackScriptPromise;
}

export function createPaystackPayment(config) {
  return async (successOrHandlers, closeHandler) => {
    const handlers = typeof successOrHandlers === 'function'
      ? { onSuccess: successOrHandlers, onClose: closeHandler }
      : (successOrHandlers || {});

    const PaystackPop = await loadPaystackScript();
    const publicKey = config.publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

    if (!publicKey) {
      throw new Error('Paystack public key is not configured.');
    }

    const handler = PaystackPop.setup({
      key: publicKey,
      email: config.email,
      amount: config.amount,
      currency: config.currency || 'GHS',
      ref: config.reference,
      metadata: config.metadata,
      callback: (response) => handlers.onSuccess?.(response),
      onClose: () => handlers.onClose?.(),
    });

    handler.openIframe();
  };
}
