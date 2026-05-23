import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, Shield, Globe, Lock,
  Mail, KeyRound, Eye, EyeOff, Smartphone,
  Loader2, AlertCircle, RefreshCw, Search, X
} from 'lucide-react';
import { mapFirebaseError } from '../lib/firebaseErrors';
import { CountryPicker, COUNTRIES } from '../components/Shared';
const _dev = import.meta.env.DEV;
const devLog = (...a) => { if (_dev) console.log(...a); };
const devErr = (...a) => { if (_dev) console.error(...a); };



// ─── 6-Digit OTP Input ────────────────────────────────────────────────────────
function OTPInput({ onComplete }) {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const refs = useRef([]);

  const update = (idx, val) => {
    const clean = val.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[idx] = clean;
    setDigits(next);
    if (clean && idx < 5) refs.current[idx + 1]?.focus();
    if (next.every(d => d !== '')) onComplete(next.join(''));
  };

  const handleKey = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
      const next = [...digits]; next[idx - 1] = ''; setDigits(next);
    }
    if (e.key === 'Enter') { const code = digits.join(''); if (code.length === 6) onComplete(code); }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!paste) return;
    e.preventDefault();
    const next = Array(6).fill('').map((_, i) => paste[i] || '');
    setDigits(next);
    refs.current[Math.min(paste.length, 5)]?.focus();
    if (paste.length === 6) onComplete(paste);
  };

  useEffect(() => { refs.current[0]?.focus(); }, []);

  return (
    <div style={{ display: 'flex', gap: 'clamp(6px, 2.5vw, 12px)', justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => update(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: 'clamp(40px, 13vw, 56px)',
            height: 'clamp(52px, 15vw, 64px)',
            textAlign: 'center',
            fontSize: 'clamp(20px, 6vw, 26px)',
            fontWeight: 900,
            borderRadius: 16,
            border: `2px solid ${d ? `var(--accent-secondary)` : `var(--border-color)`}`,
            background: d ? `var(--bg-secondary)` : '#fff',
            color: `var(--accent-secondary)`,
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color .15s, background .15s',
            caretColor: `var(--accent-secondary)`,
            touchAction: 'manipulation',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main LoginPage ───────────────────────────────────────────────────────────
export default function LoginPage({ onLogin, onBack, brand, type = 'client', ...props }) {
  const ac = brand?.color || `var(--accent-secondary)`;
  const [mode, setMode] = useState(type === 'admin' ? 'admin' : 'client');

  // Sync mode when parent resets type (e.g. after logout sets type back to 'client')
  useEffect(() => {
    setMode(type === 'admin' ? 'admin' : 'client');
  }, [type]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone');
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [clientErr, setClientErr] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminErr, setAdminErr] = useState('');

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const sanitizePhone = (raw) => raw.replace(/\D/g, '').replace(/^0/, '');
  const fullPhone = country.code + sanitizePhone(phone);

  const sendOtp = async () => {
    const num = sanitizePhone(phone);
    if (num.length < 6) return setClientErr('Enter a valid phone number.');
    setClientErr('');
    setOtpLoading(true);
    try {
      await props.sendOTP(fullPhone);
      setStep('otp');
      setResendTimer(60);
    } catch (e) {
      setClientErr(mapFirebaseError(e));
    }
    setOtpLoading(false);
  };

  const verifyOtp = async (code) => {
    setClientErr('');
    setVerifyLoading(true);
    try {
      await props.verifyOTP(fullPhone, code);
    } catch (e) {
      setClientErr(mapFirebaseError(e));
      setVerifyLoading(false);
    }
  };

  // Admin login identifier — could be email OR phone
  const [adminId, setAdminId] = useState('');

  const adminLogin = async () => {
    const trimmed = adminId.trim();
    if (!trimmed || !pw) return setAdminErr('Please enter your phone or email, and password.');
    setAdminErr('');
    setAdminLoading(true);
    try {
      let loginEmail;
      if (trimmed.includes('@')) {
        // Direct email (e.g. admin@westlinefuture.com)
        loginEmail = trimmed.toLowerCase();
      } else {
        // Strictly use the typed username (no country code forced)
        loginEmail = `${trimmed.toLowerCase().replace(/\s+/g, '')}@westlinefuture.com`;
      }
      await onLogin(loginEmail, pw.trim(), 'admin');
    } catch (e) {
      setAdminErr(mapFirebaseError(e));
      setAdminLoading(false);
    }
  };

  const isAdmin = mode === 'admin';

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'flex-end' : 'center',
      padding: isMobile ? 0 : 24,
      fontFamily: 'Inter, Satoshi, sans-serif',
      background: isAdmin
        ? '#0D0B09'
        : isMobile
          ? 'linear-gradient(160deg, #F5F2EE 0%, #EBE5DD 100%)'
          : '#F8F6F3',
      transition: 'background .5s',
    }}>
      <div id="recaptcha-container" />

      {/* Desktop back */}
      {!isMobile && (
        <div style={{ width: '100%', maxWidth: 440, marginBottom: 20 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: isAdmin ? '#625C54' : `var(--text-secondary)`, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
            <ChevronLeft size={16} /> Back to site
          </button>
        </div>
      )}

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 440,
        background: isAdmin ? `var(--accent-secondary)` : '#fff',
        border: isMobile ? 'none' : `1px solid ${isAdmin ? 'rgba(255,255,255,.06)' : `var(--border-color)`}`,
        borderRadius: isMobile ? '28px 28px 0 0' : 24,
        padding: isMobile ? '32px 20px' : '48px 40px',
        paddingBottom: isMobile ? 'max(36px, env(safe-area-inset-bottom, 36px))' : undefined,
        boxShadow: isAdmin
          ? '0 40px 80px rgba(0,0,0,.6)'
          : isMobile
            ? '0 -12px 48px rgba(92, 58, 33,.12)'
            : '0 24px 60px rgba(92, 58, 33,.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: `${ac}18`, borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

        {/* Mobile top row */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, position: 'relative', zIndex: 1 }}>
            <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, color: isAdmin ? '#625C54' : `var(--text-secondary)`, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '8px 0', touchAction: 'manipulation', minHeight: 44 }}>
              <ChevronLeft size={18} /> Back
            </button>
            {brand?.logo
              ? <img src={brand.logo} alt="Logo" style={{ height: 56, objectFit: 'contain', filter: isAdmin ? 'brightness(0) invert(1)' : 'brightness(0)' }} onError={e => { e.target.style.display = 'none'; }} />
              : <div style={{ fontSize: 16, fontWeight: 900, color: isAdmin ? ac : `var(--accent-secondary)` }}>{brand?.name || 'Westline Future'}</div>
            }
            <div style={{ width: 60 }} />
          </div>
        )}

        {/* Desktop logo */}
        {!isMobile && (
          <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative', zIndex: 1 }}>
            {brand?.logo
              ? <img src={brand.logo} alt="Logo" style={{ height: 80, marginBottom: 20, objectFit: 'contain', filter: isAdmin ? 'brightness(0) invert(1)' : 'brightness(0)' }} onError={e => { e.target.style.display = 'none'; }} />
              : <div style={{ fontSize: 17, fontWeight: 900, color: isAdmin ? '#fff' : `var(--accent-secondary)`, marginBottom: 20 }}>{brand?.name || 'Westline Future'}</div>
            }
          </div>
        )}

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
          {!isAdmin && step === 'phone' && (
            <>
              <div style={{ fontSize: isMobile ? 26 : 28, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 10, lineHeight: 1.2 }}>Welcome back</div>
              <div style={{ fontSize: isMobile ? 15 : 14, color: `var(--text-secondary)`, lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
                Enter your number. We'll send a one-time SMS code to sign you in.
              </div>
            </>
          )}
          {!isAdmin && step === 'otp' && (
            <>
              <div style={{ fontSize: isMobile ? 26 : 28, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 10, lineHeight: 1.2 }}>Check your SMS</div>
              <div style={{ fontSize: isMobile ? 15 : 14, color: `var(--text-secondary)`, lineHeight: 1.6 }}>
                Code sent to&nbsp;<span style={{ fontWeight: 800, color: `var(--accent-secondary)` }}>{country.flag} {country.code} {phone}</span>
              </div>
            </>
          )}
          {isAdmin && (
            <>
              <div style={{ fontSize: isMobile ? 24 : 26, fontWeight: 900, color: '#fff', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                Staff Login <Lock size={20} color={ac} />
              </div>
              <div style={{ fontSize: 12, color: '#625C54', textTransform: 'uppercase', letterSpacing: '.1em' }}>Secured Admin Terminal</div>
            </>
          )}
        </div>

        {/* ── CLIENT PHONE STEP ── */}
        {!isAdmin && step === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
            {clientErr && <ErrorBanner msg={clientErr} />}
            <div style={{ display: 'flex', gap: 10 }}>
              <CountryPicker value={country} onChange={setCountry} />
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Phone number"
                value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setClientErr(''); }}
                onKeyDown={e => e.key === 'Enter' && sendOtp()}
                autoFocus={!isMobile}
                style={{
                  flex: 1, height: 52, padding: '0 16px',
                  borderRadius: 14, border: '1.5px solid var(--border-color)',
                  background: `var(--bg-secondary)`, fontSize: 16,
                  outline: 'none', color: `var(--accent-secondary)`, fontFamily: 'inherit',
                  touchAction: 'manipulation',
                }}
              />
            </div>
            <button
              onClick={sendOtp}
              disabled={otpLoading || sanitizePhone(phone).length < 6}
              style={{
                height: 56, borderRadius: 16,
                background: sanitizePhone(phone).length >= 6 ? `var(--accent-secondary)` : `var(--border-color)`,
                color: '#fff', border: 'none', fontSize: 16, fontWeight: 800,
                cursor: sanitizePhone(phone).length >= 6 ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'background .2s', touchAction: 'manipulation',
              }}
            >
              {otpLoading
                ? <><Loader2 size={18} className="lp-spin" /> Sending code…</>
                : <><Smartphone size={18} /> Send Verification Code</>}
            </button>
            {props.activeMagicCode && import.meta.env.DEV && (
              <div style={{ padding: '10px 16px', background: '#FEF9EC', border: '1px solid #FDE68A', borderRadius: 12, fontSize: 12, color: '#92400E', textAlign: 'center', fontWeight: 700 }}>
                DEV — OTP: {props.activeMagicCode}
              </div>
            )}
          </div>
        )}

        {/* ── CLIENT OTP STEP ── */}
        {!isAdmin && step === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1 }}>
            {clientErr && <ErrorBanner msg={clientErr} />}
            {verifyLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <Loader2 size={32} className="lp-spin" color={ac} />
                <div style={{ fontSize: 15, color: `var(--text-secondary)`, fontWeight: 600 }}>Verifying your code…</div>
              </div>
            ) : (
              <>
                <OTPInput onComplete={verifyOtp} />
                {props.activeMagicCode && import.meta.env.DEV && (
                  <div style={{ padding: '10px 16px', background: '#FEF9EC', border: '1px solid #FDE68A', borderRadius: 12, fontSize: 12, color: '#92400E', textAlign: 'center', fontWeight: 700 }}>
                    DEV — OTP: {props.activeMagicCode}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => { setStep('phone'); setClientErr(''); }}
                    style={{ fontSize: 14, fontWeight: 600, color: `var(--text-secondary)`, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', touchAction: 'manipulation', minHeight: 44 }}>
                    ← Change number
                  </button>
                  <button onClick={sendOtp} disabled={resendTimer > 0 || otpLoading}
                    style={{ fontSize: 14, fontWeight: 700, color: resendTimer > 0 ? `var(--text-secondary)` : ac, background: 'none', border: 'none', cursor: resendTimer > 0 ? 'default' : 'pointer', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 5, touchAction: 'manipulation', minHeight: 44 }}>
                    <RefreshCw size={13} />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ADMIN LOGIN ── */}
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
            {adminErr && <ErrorBanner msg={adminErr} dark />}

            {/* Smart identifier field */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                inputMode="email"
                placeholder="Username or email address"
                value={adminId}
                onChange={e => { setAdminId(e.target.value); setAdminErr(''); }}
                autoComplete="username"
                style={{
                  width: '100%', height: 52, padding: '0 16px',
                  borderRadius: 14, border: '1px solid rgba(255,255,255,.1)',
                  background: 'rgba(255,255,255,.05)', color: '#fff',
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit', letterSpacing: adminId.includes('@') ? 'normal' : '0.02em'
                }}
              />
              <div style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.2)',
                textTransform: 'uppercase', letterSpacing: '.08em', pointerEvents: 'none'
              }}>
                {adminId.includes('@') ? 'email' : 'phone / email'}
              </div>
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <KeyRound size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: ac }} />
              <input type={showPw ? 'text' : 'password'} placeholder="Password" value={pw}
                onChange={e => { setPw(e.target.value); setAdminErr(''); }}
                onKeyDown={e => e.key === 'Enter' && adminLogin()}
                autoComplete="current-password"
                style={{ width: '100%', height: 52, paddingLeft: 48, paddingRight: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              <button onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 8, touchAction: 'manipulation' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button onClick={adminLogin} disabled={adminLoading}
              style={{ height: 56, borderRadius: 16, background: ac, color: `var(--bg-primary)`, border: 'none', fontSize: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, touchAction: 'manipulation' }}>
              {adminLoading ? <><Loader2 size={18} className="lp-spin" /> Authenticating…</> : <><Shield size={18} /> Authorize</>}
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${isAdmin ? 'rgba(255,255,255,.06)' : `var(--border-color)`}`, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: `var(--text-secondary)` }}><Shield size={11} /> Encrypted</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: `var(--text-secondary)` }}><Globe size={11} /> Global</div>
            {!isAdmin && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: `var(--text-secondary)` }}><Smartphone size={11} /> SMS Code</div>}
          </div>
          {mode === 'client'
            ? <button onClick={() => { setMode('admin'); setClientErr(''); setAdminErr(''); setStep('phone'); }}
                style={{ fontSize: 13, color: `var(--text-secondary)`, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '10px 0', touchAction: 'manipulation', minHeight: 44 }}>
                Staff / Admin Login →
              </button>
            : <button onClick={() => { setMode('client'); setClientErr(''); setAdminErr(''); }}
                style={{ fontSize: 13, color: '#625C54', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '10px 0', touchAction: 'manipulation', minHeight: 44 }}>
                ← Client Login
              </button>
          }
        </div>
      </div>

      <style>{`
        @keyframes lp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .lp-spin { animation: lp-spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

function ErrorBanner({ msg, dark }) {
  return (
    <div style={{ padding: '12px 16px', background: dark ? 'rgba(239,68,68,.12)' : '#FEF2F2', border: `1px solid ${dark ? 'rgba(239,68,68,.25)' : '#FECACA'}`, borderRadius: 12, color: '#DC2626', fontSize: 14, display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5 }}>
      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {msg}
    </div>
  );
}
