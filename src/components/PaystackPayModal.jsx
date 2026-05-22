import React, { useState } from 'react';
import { Lock, ShieldCheck, CheckCircle, ArrowRight, X, AlertCircle } from 'lucide-react';
import { Spinner } from './Shared';
import { functions } from '../lib/firebase';
import { createPaystackPayment } from '../lib/paystack';
const _dev = import.meta.env.DEV;
const devLog = (...a) => { if (_dev) console.log(...a); };
import { httpsCallable } from 'firebase/functions';

export default function PaystackPayModal({ invoice, brand, onClose, onSuccess }) {
  const [status, setStatus] = useState('idle'); // idle, processing, verifying, success, error
  const [error, setError] = useState(null);
  const [verifyRef, setVerifyRef] = useState(null);

  const ac = brand.color || '#231F78';
  
  // Paystack expects amount in Kobo (lowest currency unit)
  const rawAmount = parseFloat(String(invoice.amount || 0).replace(/[$,]/g, '')) || 0;
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

  const initializePayment = createPaystackPayment(config);

  const handlePaystackSuccess = async (reference) => {
    const ref = reference?.reference || reference?.trxref || String(reference);
    setVerifyRef(ref);
    setStatus('verifying');
    // Server-side verification
    if (functions && invoice?.projectId) {
      try {
        const verify = httpsCallable(functions, 'verifyPaystackPayment');
        await verify({ reference: ref, projectId: invoice.projectId, invoiceId: invoice.id, type: 'invoice' });
      } catch (err) {
        setError('Payment received but verification failed. Reference: ' + ref + '. Contact support.');
        setStatus('error');
        return;
      }
    }
    setStatus('success');
    onSuccess(invoice.id);
  };

  const handlePaystackClose = () => {
    devLog("[PAYSTACK] Payment Dashboard Closed");
  };

  if (status === 'error') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,11,46,.9)', backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="p-card fade-in" style={{ width: '100%', maxWidth: 440, padding: 48, textAlign: 'center', background: '#fff', borderRadius: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <AlertCircle size={40} />
          </div>
          <h2 className="lxfh" style={{ fontSize: 24, color: '#0D0B2E', marginBottom: 12 }}>Verification Failed</h2>
          <p className="lxf" style={{ color: '#5B5894', marginBottom: 32, lineHeight: 1.6, fontSize: 14 }}>{error}</p>
          <button onClick={onClose} className="p-btn-dark lxf" style={{ width: '100%', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (status === 'verifying') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,11,46,.9)', backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="p-card fade-in" style={{ width: '100%', maxWidth: 440, padding: 48, textAlign: 'center', background: '#fff', borderRadius: 32 }}>
          <Spinner />
          <h2 className="lxfh" style={{ fontSize: 22, color: '#0D0B2E', marginTop: 24, marginBottom: 12 }}>Verifying with Paystack...</h2>
          <p className="lxf" style={{ color: '#5B5894', fontSize: 14 }}>Please wait while we confirm your payment on our servers.</p>
          {verifyRef && <p style={{ fontSize: 11, color: '#9B99C8', marginTop: 12 }}>Ref: {verifyRef}</p>}
        </div>
      </div>
    );
  }

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
           <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, background: '#F8F8FD', border: 'none', width: 32, height: 32, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9B99C8' }}><X size={18} /></button>
           <div className="eyebrow" style={{ color: ac, marginBottom: 8 }}>Secure Checkout</div>
           <h2 className="lxfh" style={{ fontSize: 24, color: '#0D0B2E' }}>Paystack Gateway</h2>
        </div>

        <div style={{ padding: '0 32px 32px' }}>
           
           {/* INVOICE MINI */}
           <div style={{ padding: 20, background: '#F8F8FD', borderRadius: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                 <div className="lxf" style={{ fontSize: 13, color: '#5B5894' }}>{invoice.title}</div>
                 <div className="lxf" style={{ fontSize: 13, fontWeight: 700, color: '#0D0B2E' }}>{invoice.amount}</div>
              </div>
              <div className="lxf" style={{ fontSize: 11, color: '#9B99C8' }}>Invoice ID: {invoice.id}</div>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button
                onClick={() => {
                  if (status !== 'idle') return;
                  initializePayment(handlePaystackSuccess, handlePaystackClose).catch((err) => {
                    setError(err.message || 'Unable to open Paystack checkout.');
                    setStatus('error');
                  });
                }}
                disabled={status !== 'idle'}
                className="p-btn-dark lxf"
                style={{ width: '100%', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 16, background: status !== 'idle' ? '#E8E6F5' : '#231F78', color: status !== 'idle' ? '#9B99C8' : '#fff', border: 'none', cursor: status !== 'idle' ? 'default' : 'pointer' }}
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
