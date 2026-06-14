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
import React, { useState, useContext, useEffect } from 'react';
import { ArrowRight, Loader2, CheckCircle2, AlertCircle, PhoneCall, ShieldCheck, CreditCard, Smartphone, Building2, Banknote, X } from 'lucide-react';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { AppContext } from '../context/AppContext';
import { createPaystackPayment } from '../lib/paystack';

// ── Paystack button (inner component so hook is always called) ─────────────
function PaystackOption({ amountGHS, email, invoiceId, projectId, paymentType, description, publicKey, onSuccess, onError }) {
  const [status, setStatus] = useState('idle');
  const [lastClickTime, setLastClickTime] = React.useState(0);

  const amountPesewas = Math.round(parseFloat(amountGHS || 0) * 100);
  const reference     = `WL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const config = {
    reference,
    email:     email || 'client@westlinefuture.com',
    amount:    amountPesewas,
    currency:  'GHS',
    publicKey: publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    channels:  ['card', 'mobile_money', 'bank', 'bank_transfer'],
    metadata:  { invoiceId, projectId, paymentType, description },
  };

  const initializePayment = createPaystackPayment(config);

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
    // Debounce: prevent rapid clicks (1-second cooldown)
    const now = Date.now();
    if (now - lastClickTime < 1000) {
      return; // Ignore click if less than 1 second since last click
    }
    setLastClickTime(now);

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
  const [lastClickTime, setLastClickTime] = React.useState(0);

  const handleClick = async () => {
    // Debounce: prevent rapid clicks (1-second cooldown)
    const now = Date.now();
    if (now - lastClickTime < 1000) {
      return; // Ignore click if less than 1 second since last click
    }
    setLastClickTime(now);

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
  allowPartial = true, // NEW: Allow client to pay any amount up to the full
}) {
  const { brand, user } = useContext(AppContext);
  const [error, setError] = useState(null);
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [offlineMethod, setOfflineMethod] = useState(null);
  const [offlineReference, setOfflineReference] = useState('');
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [offlineSubmitted, setOfflineSubmitted] = useState(false);
  const [publicGatewaySettings, setPublicGatewaySettings] = useState(null);
  const fullAmount = parseFloat(amountGHS || 0);

  useEffect(() => {
    if (!functions) return;
    const loadSettings = httpsCallable(functions, 'getPublicPaymentSettings');
    loadSettings()
      .then(response => setPublicGatewaySettings(response.data || {}))
      .catch(() => setPublicGatewaySettings({}));
  }, []);

  const gw             = { ...(publicGatewaySettings || {}), ...(brand?.gatewaySettings || {}) };
  const paystackKey    = gw.paystackPublicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
  const paystackActive = !!(gw.enablePaystack !== false && paystackKey);
  const hubtelActive   = gw.enableHubtel === true;
  const neitherActive  = !paystackActive && !hubtelActive;

  // The actual amount that will be charged — partial if set, otherwise full
  const effectiveAmount = partialAmount && parseFloat(partialAmount) > 0
    ? Math.min(parseFloat(partialAmount), fullAmount)
    : fullAmount;
  const isPartialPayment = effectiveAmount > 0 && effectiveAmount < fullAmount;
  const bankDetails = brand?.finSettings?.bankDetails || brand?.bankDetails || '';
  const canSubmitOffline = !!(user && invoiceId && effectiveAmount > 0);

  const submitOfflinePayment = async () => {
    if (!canSubmitOffline || !offlineMethod || offlineBusy) return;
    setOfflineBusy(true);
    setError(null);
    try {
      const submit = httpsCallable(functions, 'submitOfflinePayment');
      await submit({
        invoiceId,
        projectId: projectId || '',
        method: offlineMethod,
        amount: effectiveAmount,
        reference: offlineReference.trim(),
        paymentType,
        description: description || label,
      });
      setOfflineSubmitted(true);
      setOfflineMethod(null);
    } catch (err) {
      setError(err?.message || 'The offline payment notice could not be submitted.');
    } finally {
      setOfflineBusy(false);
    }
  };

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
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
          {isPartialPayment ? 'Paying (partial)' : label}
        </span>
        <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>
          GH₵ {effectiveAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          {isPartialPayment && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 6 }}>
              of GH₵ {fullAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
        </span>
      </div>

      {/* Partial payment option */}
      {allowPartial && fullAmount > 0 && !isPartialPayment && (
        <button
          onClick={() => setShowPartialModal(true)}
          style={{
            width: '100%', marginBottom: 10, padding: '8px 14px', borderRadius: 10,
            border: '1px dashed var(--border-color)', background: 'transparent',
            color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          💵 Pay partial amount instead
        </button>
      )}
      {isPartialPayment && (
        <button
          onClick={() => { setPartialAmount(''); }}
          style={{
            width: '100%', marginBottom: 10, padding: '8px 14px', borderRadius: 10,
            border: '1px solid #FCD34D', background: '#FEF3C7',
            color: '#92400E', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ✕ Cancel partial — pay full GH₵ {fullAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </button>
      )}

      {/* Gateway options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {paystackActive && (
          <PaystackOption
            amountGHS={effectiveAmount}
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
            amountGHS={effectiveAmount}
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

        {canSubmitOffline && !offlineSubmitted && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
              <div style={{ height: 1, flex: 1, background: 'var(--border-color)' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Offline alternatives</span>
              <div style={{ height: 1, flex: 1, background: 'var(--border-color)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => setOfflineMethod(offlineMethod === 'bank' ? null : 'bank')}
                style={{ padding: '11px 12px', borderRadius: 12, border: `1.5px solid ${offlineMethod === 'bank' ? '#16A34A' : 'var(--border-color)'}`, background: offlineMethod === 'bank' ? '#F0FDF4' : '#fff', color: offlineMethod === 'bank' ? '#15803D' : 'var(--accent-secondary)', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <Building2 size={15} /> Bank Transfer
              </button>
              <button
                onClick={() => setOfflineMethod(offlineMethod === 'cash' ? null : 'cash')}
                style={{ padding: '11px 12px', borderRadius: 12, border: `1.5px solid ${offlineMethod === 'cash' ? '#7C3AED' : 'var(--border-color)'}`, background: offlineMethod === 'cash' ? '#FAF5FF' : '#fff', color: offlineMethod === 'cash' ? '#6D28D9' : 'var(--accent-secondary)', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <Banknote size={15} /> Cash / In-Person
              </button>
            </div>
          </>
        )}

        {canSubmitOffline && offlineMethod && !offlineSubmitted && (
          <div style={{ padding: '14px 16px', borderRadius: 14, background: offlineMethod === 'bank' ? '#F0FDF4' : '#FAF5FF', border: `1.5px solid ${offlineMethod === 'bank' ? '#BBF7D0' : '#E9D5FF'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: offlineMethod === 'bank' ? '#15803D' : '#6D28D9' }}>
                  {offlineMethod === 'bank' ? 'Bank transfer instructions' : 'Cash / in-person payment'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>
                  {offlineMethod === 'bank'
                    ? 'Transfer the amount, then submit your bank reference for finance verification.'
                    : 'Pay at the office or to an authorised representative, then notify the team for verification.'}
                </div>
              </div>
              <button onClick={() => setOfflineMethod(null)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2 }}><X size={15} /></button>
            </div>
            {offlineMethod === 'bank' && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,.75)', fontSize: 12, color: '#166534', whiteSpace: 'pre-wrap', lineHeight: 1.7, marginBottom: 10 }}>
                {bankDetails || 'Contact your account manager for the approved Westline Future bank account details.'}
              </div>
            )}
            <input
              value={offlineReference}
              onChange={event => setOfflineReference(event.target.value)}
              placeholder={offlineMethod === 'bank' ? 'Bank transaction reference (recommended)' : 'Receipt, collector, or payment note'}
              style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border-color)', padding: '0 12px', fontSize: 12, boxSizing: 'border-box', marginBottom: 9 }}
            />
            <button
              onClick={submitOfflinePayment}
              disabled={offlineBusy}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: 'none', background: offlineMethod === 'bank' ? '#16A34A' : '#7C3AED', color: '#fff', fontSize: 12, fontWeight: 900, cursor: offlineBusy ? 'default' : 'pointer', opacity: offlineBusy ? .65 : 1 }}
            >
              {offlineBusy ? 'Submitting for verification…' : 'Notify Team for Verification'}
            </button>
          </div>
        )}

        {offlineSubmitted && (
          <div style={{ padding: '13px 15px', borderRadius: 13, background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 12, lineHeight: 1.55 }}>
            <strong>Payment notice submitted.</strong> Finance and the assigned project team have been notified. The invoice will update after receipt is verified.
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

      {/* ── Partial Payment Modal ────────────────────────────────────────── */}
      {showPartialModal && (
        <div onClick={() => setShowPartialModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 20, maxWidth: 380, width: '100%', padding: 24
          }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 6 }}>
              Pay Partial Amount
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              Enter the amount you'd like to pay now. The remaining balance will stay on this invoice until cleared.
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 700 }}>
              Total invoice: GH₵ {fullAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <input
              type="number"
              value={partialAmount}
              onChange={e => setPartialAmount(e.target.value)}
              placeholder={`Up to ${fullAmount.toFixed(2)}`}
              max={fullAmount}
              min={1}
              step="0.01"
              autoFocus
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                border: '1.5px solid var(--border-color)', fontSize: 18, fontWeight: 800,
                color: 'var(--accent-secondary)', outline: 'none', marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[0.25, 0.5, 0.75].map(pct => (
                <button
                  key={pct}
                  onClick={() => setPartialAmount((fullAmount * pct).toFixed(2))}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 10,
                    border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                    fontSize: 11, fontWeight: 800, cursor: 'pointer', color: 'var(--text-secondary)',
                  }}
                >
                  {Math.round(pct * 100)}% (GH₵ {(fullAmount * pct).toFixed(0)})
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowPartialModal(false); setPartialAmount(''); }}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amt = parseFloat(partialAmount);
                  if (!amt || amt <= 0 || amt > fullAmount) {
                    alert(`Enter an amount between 1 and ${fullAmount.toFixed(2)}`);
                    return;
                  }
                  setShowPartialModal(false);
                }}
                disabled={!partialAmount || parseFloat(partialAmount) <= 0 || parseFloat(partialAmount) > fullAmount}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                  background: (!partialAmount || parseFloat(partialAmount) <= 0 || parseFloat(partialAmount) > fullAmount) ? 'var(--border-color)' : 'var(--accent-secondary)',
                  color: '#fff', fontSize: 13, fontWeight: 800,
                  cursor: (!partialAmount || parseFloat(partialAmount) <= 0 || parseFloat(partialAmount) > fullAmount) ? 'not-allowed' : 'pointer',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
