/**
 * UnifiedPaymentGateway — dual-gateway payment selector.
 * Shows Paystack and/or Hubtel options based on what's configured.
 * Each gateway only appears when its credentials are active.
 *
 * Props:
 *   label        {string}  — context label (e.g. "Pay Invoice")
 *   amountGHS    {number}  — amount in Ghana Cedis
 *   description  {string}  — payment description
 *   email        {string}  — client email
 *   projectId    {string}  — project ID for server-side verification
 *   invoiceId    {string}  — invoice ID to mark as paid
 *   paymentType  {string}  — 'invoice' | 'addon' | 'rendering' etc.
 *   disabled     {boolean}
 *   contactPhone {string}  — shown in error state
 *   onSuccess    {fn}      — called with invoiceId after verified payment
 */
import React, { useState, useContext } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { ArrowRight, Loader2, CheckCircle2, AlertCircle, PhoneCall, ShieldCheck, CreditCard, Smartphone } from 'lucide-react';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { AppContext } from '../context/AppContext';

// ── Paystack button (inner component so hook is always called) ─────────────
function PaystackOption({ amountGHS, email, invoiceId, projectId, paymentType, description, publicKey, onSuccess, onError }) {
  const [status, setStatus] = useState('idle');

  const amountPesewas = Math.round(parseFloat(amountGHS || 0) * 100);
  const reference     = `WL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const config = {
    reference,
    email:     email || 'client@westlinefuture.com',
    amount:    amountPesewas,
    currency:  'GHS',
    publicKey: publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    metadata:  { invoiceId, projectId, paymentType, description },
  };

  const initializePayment = usePaystackPayment(config);

  const handleSuccess = async (res) => {
    const ref = res?.reference || res?.trxref || String(res);
    setStatus('verifying');
    // Persist reference to localStorage so admin can manually reconcile if all retries fail
    try { localStorage.setItem(`wl_pending_ref_${invoiceId || Date.now()}`, JSON.stringify({ ref, invoiceId, projectId, paymentType, ts: Date.now() })); } catch {}
    const maxAttempts = 3;
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (functions && projectId) {
          const verify = httpsCallable(functions, 'verifyPaystackPayment');
          await verify({ reference: ref, projectId, invoiceId, type: paymentType });
        }
        try { localStorage.removeItem(`wl_pending_ref_${invoiceId || ''}`); } catch {}
        setStatus('success');
        onSuccess && onSuccess(invoiceId);
        return;
      } catch (err) {
        lastErr = err;
        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, attempt * 1500));
      }
    }
    setStatus('idle');
    onError && onError(`Payment received but verification failed after ${maxAttempts} attempts. Reference: ${ref} — contact us and we will reconcile manually.`);
  };

  const handleClose = () => {
    if (status === 'processing') setStatus('idle');
  };

  const handleClick = () => {
    setStatus('processing');
    initializePayment(handleSuccess, handleClose);
  };

  const busy = status === 'processing' || status === 'verifying';

  if (status === 'success') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: '#15803D', fontSize: 13, fontWeight: 700 }}>
        <CheckCircle2 size={16} /> Payment confirmed!
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '14px 18px', borderRadius: 14,
        border: '2px solid #111', background: busy ? 'var(--bg-secondary)' : '#111',
        color: busy ? 'var(--text-secondary)' : '#fff',
        cursor: busy ? 'default' : 'pointer', transition: 'all .2s', textAlign: 'left',
      }}
      onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: busy ? 'var(--border-color)' : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {busy ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={18} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>
          {busy ? (status === 'verifying' ? 'Verifying payment…' : 'Opening checkout…') : 'Pay with Paystack'}
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Card · MoMo · Bank Transfer</div>
      </div>
      {!busy && <ArrowRight size={16} style={{ opacity: 0.7 }} />}
    </button>
  );
}

// ── Hubtel button ───────────────────────────────────────────────────────────
function HubtelOption({ amountGHS, invoiceId, projectId, paymentType, description, onError }) {
  const [status, setStatus] = useState('idle');

  const handleClick = async () => {
    setStatus('processing');
    try {
      const init = httpsCallable(functions, 'initializeHubtelPayment');
      const ref  = `WL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const result = await init({
        amountGHS,
        description: description || `Payment ${invoiceId || ''}`,
        clientReference: ref,
        returnUrl:       `${window.location.origin}/portal?verifyHubtel=${ref}&projectId=${projectId}&invoiceId=${invoiceId || ''}&type=${paymentType || 'payment'}&amount=${amountGHS}`,
        cancellationUrl: window.location.href,
      });
      if (result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setStatus('idle');
      const msg = err?.code === 'functions/unauthenticated'
        ? 'Hubtel credentials are not yet configured. Please use Paystack or contact us.'
        : err?.code === 'functions/failed-precondition'
        ? 'Hubtel MoMo is not yet active. Please use Paystack or contact us.'
        : 'Hubtel checkout could not start. Please use Paystack or contact us.';
      onError && onError(msg);
    }
  };

  const busy = status === 'processing';

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '14px 18px', borderRadius: 14,
        border: '2px solid #00B67A', background: busy ? 'var(--bg-secondary)' : '#fff',
        color: busy ? 'var(--text-secondary)' : '#00B67A',
        cursor: busy ? 'default' : 'pointer', transition: 'all .2s', textAlign: 'left',
      }}
      onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = '#F0FDF8'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,182,122,0.15)'; }}}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: busy ? 'var(--border-color)' : '#E6FAF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {busy ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#00B67A' }} /> : <Smartphone size={18} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>
          {busy ? 'Opening Hubtel…' : 'Pay with Hubtel'}
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>MTN · Telecel · AirtelTigo MoMo</div>
      </div>
      {!busy && <ArrowRight size={16} style={{ opacity: 0.7 }} />}
    </button>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function UnifiedPaymentGateway({
  label        = 'Pay Now',
  amountGHS    = 0,
  description,
  email        = 'client@westlinefuture.com',
  projectId,
  invoiceId,
  paymentType  = 'payment',
  disabled     = false,
  contactPhone,
  onSuccess,
}) {
  const { brand } = useContext(AppContext);
  const [error, setError] = useState(null);

  const gw             = brand?.gatewaySettings || {};
  const paystackKey    = gw.paystackPublicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
  const paystackActive = !!(gw.enablePaystack !== false && paystackKey);
  const hubtelActive   = !!(gw.enableHubtel && gw.hubtelClientId && gw.hubtelClientSecret && gw.hubtelMerchantId);
  const neitherActive  = !paystackActive && !hubtelActive;

  if (disabled) {
    return (
      <button disabled style={{ width: '100%', padding: '14px 28px', borderRadius: 14, border: 'none', background: 'var(--border-color)', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 800, cursor: 'default' }}>
        {label}
      </button>
    );
  }

  return (
    <div style={{ width: '100%' }}>

      {/* Amount pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '10px 16px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>GH₵ {parseFloat(amountGHS || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>

      {/* Gateway options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {paystackActive && (
          <PaystackOption
            amountGHS={amountGHS}
            email={email}
            invoiceId={invoiceId}
            projectId={projectId}
            paymentType={paymentType}
            description={description}
            publicKey={paystackKey}
            onSuccess={onSuccess}
            onError={setError}
          />
        )}

        {hubtelActive && (
          <HubtelOption
            amountGHS={amountGHS}
            invoiceId={invoiceId}
            projectId={projectId}
            paymentType={paymentType}
            description={description}
            onError={setError}
          />
        )}

        {neitherActive && (
          <div style={{ padding: '14px 18px', borderRadius: 14, border: '1.5px dashed var(--border-color)', textAlign: 'center' }}>
            <ShieldCheck size={20} style={{ color: 'var(--text-secondary)', marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Payment gateway being configured</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Please contact us to arrange payment directly.</div>
            {contactPhone && (
              <a href={`tel:${contactPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '8px 14px', borderRadius: 8, background: 'var(--accent-secondary)', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                <PhoneCall size={13} /> {contactPhone}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '12px 14px', borderRadius: 10, background: '#FFF8F0', border: '1.5px solid #FED7AA', color: '#92400E', fontSize: 12, lineHeight: 1.6 }}>
          <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            {error}
            <button onClick={() => setError(null)} style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#92400E', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Dismiss</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
