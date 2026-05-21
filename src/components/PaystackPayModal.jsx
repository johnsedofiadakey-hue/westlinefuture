import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Lock, ShieldCheck, CheckCircle, ArrowRight, X } from 'lucide-react';
import { Spinner } from './Shared';

export default function PaystackPayModal({ invoice, brand, onClose, onSuccess }) {
  const [status, setStatus] = useState('idle'); // idle, processing, success, error
  const [error, setError] = useState(null);

  const ac = brand.color || '#231F78';
  
  // Paystack expects amount in Kobo (lowest currency unit)
  const rawAmount = parseFloat(invoice.amount.replace(/[$,]/g, ''));
  const amountInKobo = Math.round(rawAmount * 100);

  const config = {
    reference: (new Date()).getTime().toString(),
    email: invoice.clientEmail || 'client@westlinefuture.com', // Fallback if missing
    amount: amountInKobo, 
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    currency: "GHS", // Defaulting to GHS as per common Paystack usage in Ghana, can be USD
    metadata: {
      invoiceId: invoice.id,
      projectTitle: invoice.title
    }
  };

  const initializePayment = usePaystackPayment(config);

  const handlePaystackSuccess = (reference) => {
    console.log("[PAYSTACK] Success Reference:", reference);
    setStatus('success');
    onSuccess(invoice.id);
  };

  const handlePaystackClose = () => {
    console.log("[PAYSTACK] Payment Dashboard Closed");
  };

  if (status === 'success') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,11,46,.9)', backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="p-card fade-in" style={{ width: '100%', maxWidth: 440, padding: 48, textAlign: 'center', background: '#fff', borderRadius: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: '#16A34A15', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
             <CheckCircle size={40} />
          </div>
          <h2 className="lxfh" style={{ fontSize: 28, color: '#0D0B2E', marginBottom: 12 }}>Payment Secured</h2>
          <p className="lxf" style={{ color: '#5B5894', marginBottom: 32, lineHeight: 1.6 }}>Transaction successfully authorized. Your invoice <b>{invoice.id}</b> is now cleared in the Westline Future ledger.</p>
          <button onClick={onClose} className="p-btn-dark lxf" style={{ width: '100%', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            Return to Portal <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,11,46,.7)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="p-card slide-up" style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 28, overflow: 'hidden', boxShadow: '0 32px 64px -16px rgba(0,0,0,.25)' }}>
        
        <div style={{ padding: '32px 32px 24px', position: 'relative' }}>
           <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, background: '#F4F4FA', border: 'none', width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9B99C8' }}><X size={18} /></button>
           <div className="eyebrow" style={{ color: ac, marginBottom: 8 }}>Secure Checkout</div>
           <h2 className="lxfh" style={{ fontSize: 24, color: '#0D0B2E' }}>Paystack Gateway</h2>
        </div>

        <div style={{ padding: '0 32px 32px' }}>
           
           {/* INVOICE MINI */}
           <div style={{ padding: 20, background: '#F4F4FA', borderRadius: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                 <div className="lxf" style={{ fontSize: 13, color: '#5B5894' }}>{invoice.title}</div>
                 <div className="lxf" style={{ fontSize: 13, fontWeight: 700, color: '#0D0B2E' }}>{invoice.amount}</div>
              </div>
              <div className="lxf" style={{ fontSize: 11, color: '#9B99C8' }}>Invoice ID: {invoice.id}</div>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button 
                onClick={() => {
                  initializePayment(handlePaystackSuccess, handlePaystackClose);
                }} 
                className="p-btn-dark lxf" 
                style={{ width: '100%', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 16, background: '#09A5DB', color: '#fff', border: 'none' }}
              >
                <Lock size={18} /> Authorize Secure Payment
              </button>
              
              <button onClick={onClose} className="p-btn-light lxf" style={{ height: 50, borderRadius: 12 }}>Cancel Transaction</button>
           </div>

           {error && (
              <div style={{ marginTop: 20, padding: 12, borderRadius: 10, background: '#FEF2F2', border: '1px solid #FEE2E2', color: '#DC2626', fontSize: 12 }}>
                 {error}
              </div>
           )}

           <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24, opacity: 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#0D0B2E', fontWeight: 600 }}>
                 <Lock size={12} /> SSL SECURED
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#0D0B2E', fontWeight: 600 }}>
                 <ShieldCheck size={12} /> VERIFIED IDENTITY
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
