import React, { useState } from 'react';
import { CreditCard, Smartphone, Loader2, ArrowRight, X } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

export default function UnifiedPaymentGateway({ label, amountGHS, email, projectId, invoiceId, paymentType, onSuccess, onClose, disabled }) {
  const [processing, setProcessing] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  
  // Base configuration
  const baseConfig = {
    reference: 'WL-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    email: email || 'client@clients.westlinefuture.com',
    amount: Math.round((amountGHS || 0) * 100), // Paystack expects pesewas
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    currency: 'GHS',
  };

  const handleVerification = async (ref, channel) => {
    const reference = ref?.reference || ref?.trxref || String(ref);
    if (functions && projectId) {
      try {
        const verify = httpsCallable(functions, 'verifyPaystackPayment');
        await verify({ reference, projectId, invoiceId, type: paymentType || 'payment', channel });
      } catch (err) {
        if (import.meta.env.DEV) console.error('[PaymentGateway] Verify failed:', err.message);
        setVerifyError('Payment received but server verification failed. Contact support with ref: ' + reference);
      }
    }
  };

  const MobileMoneyGate = () => {
    const initializePayment = usePaystackPayment({ ...baseConfig, channels: ['mobile_money'] });
    return (
      <button
        disabled={processing}
        onClick={() => {
          setProcessing(true);
          initializePayment({
            onSuccess: async (ref) => {
              await handleVerification(ref, 'mobile_money');
              setProcessing(false);
              setShowOptions(false);
              if (onSuccess) onSuccess(ref);
            },
            onClose: () => {
              setProcessing(false);
            }
          });
        }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderRadius: 16, border: '1.5px solid var(--border-color)',
          background: '#fff', cursor: processing ? 'default' : 'pointer', width: '100%',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={22} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>Mobile Money</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>MTN, Vodafone, AirtelTigo</div>
          </div>
        </div>
        <ArrowRight size={18} color="var(--text-secondary)" />
      </button>
    );
  };

  const CardGate = () => {
    const initializePayment = usePaystackPayment({ ...baseConfig, channels: ['card'] });
    return (
      <button
        disabled={processing}
        onClick={() => {
          setProcessing(true);
          initializePayment({
            onSuccess: async (ref) => {
              await handleVerification(ref, 'card');
              setProcessing(false);
              setShowOptions(false);
              if (onSuccess) onSuccess(ref);
            },
            onClose: () => {
              setProcessing(false);
            }
          });
        }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderRadius: 16, border: '1.5px solid var(--border-color)',
          background: '#fff', cursor: processing ? 'default' : 'pointer', width: '100%',
          transition: 'all 0.2s', marginTop: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F4EFE6', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={22} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>Credit / Debit Card</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Visa, Mastercard</div>
          </div>
        </div>
        <ArrowRight size={18} color="var(--text-secondary)" />
      </button>
    );
  };

  return (
    <>
      <button
        onClick={() => setShowOptions(true)}
        disabled={disabled || processing}
        className="unified-pay-btn"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '14px 28px', borderRadius: 14, border: 'none',
          background: (disabled || processing) ? `var(--border-color)` : `#111`,
          color: (disabled || processing) ? `var(--text-secondary)` : '#fff',
          fontSize: 15, fontWeight: 800, cursor: (disabled || processing) ? 'default' : 'pointer',
          transition: 'all .2s', justifyContent: 'center', width: '100%'
        }}
      >
        {processing ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : <>{label} <ArrowRight size={18} /></>}
      </button>

      {verifyError && (
        <div style={{ padding: 12, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>
          {verifyError}
        </div>
      )}

      {showOptions && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>Select Payment Method</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Amount: {Number(amountGHS).toLocaleString()} — processed securely.</div>
              </div>
              <button onClick={() => { setShowOptions(false); if (onClose) onClose(); }} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: 24, background: '#F9FAFB' }}>
              <MobileMoneyGate />
              <CardGate />
              
              <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.5 }}>
                <CreditCard size={12} />
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Secured by Westline Future Gateway</span>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            .unified-pay-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
            .unified-pay-btn:active { transform: translateY(0); }
          `}</style>
        </div>
      )}
    </>
  );
}
