import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, Shield, Globe, Lock,
  Mail, KeyRound, Eye, EyeOff, Smartphone,
  Loader2, AlertCircle, RefreshCw, Search, X
} from 'lucide-react';
import { mapFirebaseError } from '../lib/firebaseErrors';
const _dev = import.meta.env.DEV;
const devLog = (...a) => { if (_dev) console.log(...a); };
const devErr = (...a) => { if (_dev) console.error(...a); };

const COUNTRIES = [
  { name: 'Ghana',                   code: '+233', flag: '🇬🇭' },
  { name: 'Nigeria',                 code: '+234', flag: '🇳🇬' },
  { name: 'United States',           code: '+1',   flag: '🇺🇸' },
  { name: 'United Kingdom',          code: '+44',  flag: '🇬🇧' },
  { name: 'China',                   code: '+86',  flag: '🇨🇳' },
  { name: 'Canada',                  code: '+1',   flag: '🇨🇦' },
  { name: 'South Africa',            code: '+27',  flag: '🇿🇦' },
  { name: 'Kenya',                   code: '+254', flag: '🇰🇪' },
  { name: 'Germany',                 code: '+49',  flag: '🇩🇪' },
  { name: 'France',                  code: '+33',  flag: '🇫🇷' },
  { name: 'India',                   code: '+91',  flag: '🇮🇳' },
  { name: 'United Arab Emirates',    code: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia',            code: '+966', flag: '🇸🇦' },
  { name: 'Qatar',                   code: '+974', flag: '🇶🇦' },
  { name: 'Australia',               code: '+61',  flag: '🇦🇺' },
  { name: 'Singapore',               code: '+65',  flag: '🇸🇬' },
  { name: 'Japan',                   code: '+81',  flag: '🇯🇵' },
  { name: 'South Korea',             code: '+82',  flag: '🇰🇷' },
  { name: 'Brazil',                  code: '+55',  flag: '🇧🇷' },
  { name: 'Mexico',                  code: '+52',  flag: '🇲🇽' },
  { name: 'Netherlands',             code: '+31',  flag: '🇳🇱' },
  { name: 'Spain',                   code: '+34',  flag: '🇪🇸' },
  { name: 'Italy',                   code: '+39',  flag: '🇮🇹' },
  { name: 'Portugal',                code: '+351', flag: '🇵🇹' },
  { name: 'Sweden',                  code: '+46',  flag: '🇸🇪' },
  { name: 'Norway',                  code: '+47',  flag: '🇳🇴' },
  { name: 'Denmark',                 code: '+45',  flag: '🇩🇰' },
  { name: 'Switzerland',             code: '+41',  flag: '🇨🇭' },
  { name: 'Belgium',                 code: '+32',  flag: '🇧🇪' },
  { name: 'Turkey',                  code: '+90',  flag: '🇹🇷' },
  { name: 'Russia',                  code: '+7',   flag: '🇷🇺' },
  { name: 'Poland',                  code: '+48',  flag: '🇵🇱' },
  { name: 'Egypt',                   code: '+20',  flag: '🇪🇬' },
  { name: 'Morocco',                 code: '+212', flag: '🇲🇦' },
  { name: 'Ethiopia',                code: '+251', flag: '🇪🇹' },
  { name: 'Tanzania',                code: '+255', flag: '🇹🇿' },
  { name: 'Uganda',                  code: '+256', flag: '🇺🇬' },
  { name: 'Ivory Coast',             code: '+225', flag: '🇨🇮' },
  { name: 'Senegal',                 code: '+221', flag: '🇸🇳' },
  { name: 'Cameroon',                code: '+237', flag: '🇨🇲' },
  { name: 'Angola',                  code: '+244', flag: '🇦🇴' },
  { name: 'Mozambique',              code: '+258', flag: '🇲🇿' },
  { name: 'Zambia',                  code: '+260', flag: '🇿🇲' },
  { name: 'Zimbabwe',                code: '+263', flag: '🇿🇼' },
  { name: 'Rwanda',                  code: '+250', flag: '🇷🇼' },
  { name: 'Botswana',                code: '+267', flag: '🇧🇼' },
  { name: 'Namibia',                 code: '+264', flag: '🇳🇦' },
  { name: 'Togo',                    code: '+228', flag: '🇹🇬' },
  { name: 'Benin',                   code: '+229', flag: '🇧🇯' },
  { name: 'Burkina Faso',            code: '+226', flag: '🇧🇫' },
  { name: 'Mali',                    code: '+223', flag: '🇲🇱' },
  { name: 'Guinea',                  code: '+224', flag: '🇬🇳' },
  { name: 'Sierra Leone',            code: '+232', flag: '🇸🇱' },
  { name: 'Liberia',                 code: '+231', flag: '🇱🇷' },
  { name: 'Gabon',                   code: '+241', flag: '🇬🇦' },
  { name: 'Congo',                   code: '+242', flag: '🇨🇬' },
  { name: 'DR Congo',                code: '+243', flag: '🇨🇩' },
  { name: 'Sudan',                   code: '+249', flag: '🇸🇩' },
  { name: 'Libya',                   code: '+218', flag: '🇱🇾' },
  { name: 'Tunisia',                 code: '+216', flag: '🇹🇳' },
  { name: 'Algeria',                 code: '+213', flag: '🇩🇿' },
  { name: 'Kuwait',                  code: '+965', flag: '🇰🇼' },
  { name: 'Bahrain',                 code: '+973', flag: '🇧🇭' },
  { name: 'Oman',                    code: '+968', flag: '🇴🇲' },
  { name: 'Jordan',                  code: '+962', flag: '🇯🇴' },
  { name: 'Lebanon',                 code: '+961', flag: '🇱🇧' },
  { name: 'Pakistan',                code: '+92',  flag: '🇵🇰' },
  { name: 'Bangladesh',              code: '+880', flag: '🇧🇩' },
  { name: 'Sri Lanka',               code: '+94',  flag: '🇱🇰' },
  { name: 'Malaysia',                code: '+60',  flag: '🇲🇾' },
  { name: 'Indonesia',               code: '+62',  flag: '🇮🇩' },
  { name: 'Philippines',             code: '+63',  flag: '🇵🇭' },
  { name: 'Thailand',                code: '+66',  flag: '🇹🇭' },
  { name: 'Vietnam',                 code: '+84',  flag: '🇻🇳' },
  { name: 'Hong Kong',               code: '+852', flag: '🇭🇰' },
  { name: 'Taiwan',                  code: '+886', flag: '🇹🇼' },
  { name: 'New Zealand',             code: '+64',  flag: '🇳🇿' },
  { name: 'Argentina',               code: '+54',  flag: '🇦🇷' },
  { name: 'Colombia',                code: '+57',  flag: '🇨🇴' },
  { name: 'Chile',                   code: '+56',  flag: '🇨🇱' },
  { name: 'Peru',                    code: '+51',  flag: '🇵🇪' },
  { name: 'Venezuela',               code: '+58',  flag: '🇻🇪' },
  { name: 'Ecuador',                 code: '+593', flag: '🇪🇨' },
  { name: 'Greece',                  code: '+30',  flag: '🇬🇷' },
  { name: 'Czech Republic',          code: '+420', flag: '🇨🇿' },
  { name: 'Hungary',                 code: '+36',  flag: '🇭🇺' },
  { name: 'Romania',                 code: '+40',  flag: '🇷🇴' },
  { name: 'Ukraine',                 code: '+380', flag: '🇺🇦' },
  { name: 'Israel',                  code: '+972', flag: '🇮🇱' },
  { name: 'Iran',                    code: '+98',  flag: '🇮🇷' },
  { name: 'Iraq',                    code: '+964', flag: '🇮🇶' },
  { name: 'Afghanistan',             code: '+93',  flag: '🇦🇫' },
  { name: 'Nepal',                   code: '+977', flag: '🇳🇵' },
  { name: 'Myanmar',                 code: '+95',  flag: '🇲🇲' },
  { name: 'Cambodia',                code: '+855', flag: '🇰🇭' },
  { name: 'Finland',                 code: '+358', flag: '🇫🇮' },
  { name: 'Austria',                 code: '+43',  flag: '🇦🇹' },
  { name: 'Ireland',                 code: '+353', flag: '🇮🇪' },
  { name: 'Cuba',                    code: '+53',  flag: '🇨🇺' },
  { name: 'Jamaica',                 code: '+1876',flag: '🇯🇲' },
];

// ─── Country Picker ───────────────────────────────────────────────────────────
function CountryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isMob, setIsMob] = useState(window.innerWidth < 600);
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const h = () => setIsMob(window.innerWidth < 600);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const filtered = search.trim()
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search))
    : COUNTRIES;

  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 80); }, [open]);

  useEffect(() => {
    if (isMob) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isMob]);

  const close = () => { setOpen(false); setSearch(''); };

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          height: 52, padding: '0 12px', borderRadius: 14,
          border: '1.5px solid #E8E6F5', background: '#F8F8FD',
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', fontSize: 15, fontFamily: 'inherit',
          whiteSpace: 'nowrap', minWidth: 88, touchAction: 'manipulation',
        }}
      >
        <span style={{ fontSize: 20 }}>{value.flag}</span>
        <span style={{ fontWeight: 700, color: '#0D0B2E' }}>{value.code}</span>
        <span style={{ fontSize: 10, color: '#9B99C8' }}>▾</span>
      </button>

      {/* Desktop dropdown */}
      {open && !isMob && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
          background: '#fff', borderRadius: 16, border: '1.5px solid #E8E6F5',
          boxShadow: '0 16px 40px rgba(13,11,46,.12)', width: 280, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #E8E6F5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} color="#9B99C8" />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search country or code..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#0D0B2E', fontFamily: 'inherit', background: 'transparent' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={13} color="#9B99C8" /></button>}
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9B99C8', fontSize: 13 }}>No results</div>
              : filtered.map(c => (
                <button key={c.code + c.name} type="button" onClick={() => { onChange(c); close(); }}
                  style={{ width: '100%', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, background: c.code === value.code && c.name === value.name ? '#F8F8FD' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{c.flag}</span>
                  <span style={{ flex: 1, fontSize: 13, color: '#0D0B2E', fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: '#9B99C8', fontWeight: 700 }}>{c.code}</span>
                </button>
              ))
            }
          </div>
        </div>
      )}

      {/* Mobile bottom sheet */}
      {open && isMob && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(13,11,46,.55)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001,
            background: '#fff', borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,.2)',
            display: 'flex', flexDirection: 'column', maxHeight: '72vh',
            paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E8E6F5' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 12px' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0D0B2E' }}>Select Country</div>
              <button onClick={close} style={{ width: 36, height: 36, borderRadius: 10, background: '#E8E6F5', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
                <X size={16} color="#5B5894" />
              </button>
            </div>
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8F8FD', borderRadius: 14, padding: '12px 16px', border: '1.5px solid #E8E6F5' }}>
                <Search size={16} color="#9B99C8" />
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search country or code..."
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: '#0D0B2E', fontFamily: 'inherit', background: 'transparent' }} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', touchAction: 'manipulation' }}><X size={14} color="#9B99C8" /></button>}
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0
                ? <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9B99C8', fontSize: 14 }}>No results</div>
                : filtered.map(c => (
                  <button key={c.code + c.name} type="button" onClick={() => { onChange(c); close(); }}
                    style={{ width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, background: c.code === value.code && c.name === value.name ? '#F8F8FD' : 'none', border: 'none', borderBottom: '1px solid #F8F8FD', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', touchAction: 'manipulation' }}>
                    <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{c.flag}</span>
                    <span style={{ flex: 1, fontSize: 15, color: '#0D0B2E', fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 13, color: '#9B99C8', fontWeight: 700 }}>{c.code}</span>
                  </button>
                ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
            border: `2px solid ${d ? '#0D0B2E' : '#E8E6F5'}`,
            background: d ? '#F8F8FD' : '#fff',
            color: '#0D0B2E',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color .15s, background .15s',
            caretColor: '#231F78',
            touchAction: 'manipulation',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main LoginPage ───────────────────────────────────────────────────────────
export default function LoginPage({ onLogin, onBack, brand, type = 'client', ...props }) {
  const ac = brand?.color || '#231F78';
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

  const adminLogin = async () => {
    if (!email || !pw) return setAdminErr('Email and password are required.');
    setAdminErr('');
    setAdminLoading(true);
    try {
      await onLogin(email.trim(), pw.trim(), 'admin');
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
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: isAdmin ? '#625C54' : '#9B99C8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
            <ChevronLeft size={16} /> Back to site
          </button>
        </div>
      )}

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 440,
        background: isAdmin ? '#0D0B2E' : '#fff',
        border: isMobile ? 'none' : `1px solid ${isAdmin ? 'rgba(255,255,255,.06)' : '#E8E6F5'}`,
        borderRadius: isMobile ? '28px 28px 0 0' : 24,
        padding: isMobile ? '32px 20px' : '48px 40px',
        paddingBottom: isMobile ? 'max(36px, env(safe-area-inset-bottom, 36px))' : undefined,
        boxShadow: isAdmin
          ? '0 40px 80px rgba(0,0,0,.6)'
          : isMobile
            ? '0 -12px 48px rgba(13,11,46,.12)'
            : '0 24px 60px rgba(13,11,46,.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: `${ac}18`, borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

        {/* Mobile top row */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, position: 'relative', zIndex: 1 }}>
            <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 15, color: isAdmin ? '#625C54' : '#9B99C8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '8px 0', touchAction: 'manipulation', minHeight: 44 }}>
              <ChevronLeft size={18} /> Back
            </button>
            {brand?.logo
              ? <img src={brand.logo} alt="Logo" style={{ height: 34, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
              : <div style={{ fontSize: 16, fontWeight: 900, color: isAdmin ? ac : '#0D0B2E' }}>{brand?.name || 'Westline Future'}</div>
            }
            <div style={{ width: 60 }} />
          </div>
        )}

        {/* Desktop logo */}
        {!isMobile && (
          <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative', zIndex: 1 }}>
            {brand?.logo
              ? <img src={brand.logo} alt="Logo" style={{ height: 48, marginBottom: 20, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
              : <div style={{ fontSize: 17, fontWeight: 900, color: isAdmin ? '#fff' : '#0D0B2E', marginBottom: 20 }}>{brand?.name || 'Westline Future'}</div>
            }
          </div>
        )}

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
          {!isAdmin && step === 'phone' && (
            <>
              <div style={{ fontSize: isMobile ? 26 : 28, fontWeight: 900, color: '#0D0B2E', marginBottom: 10, lineHeight: 1.2 }}>Welcome back</div>
              <div style={{ fontSize: isMobile ? 15 : 14, color: '#5B5894', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
                Enter your number. We'll send a one-time SMS code to sign you in.
              </div>
            </>
          )}
          {!isAdmin && step === 'otp' && (
            <>
              <div style={{ fontSize: isMobile ? 26 : 28, fontWeight: 900, color: '#0D0B2E', marginBottom: 10, lineHeight: 1.2 }}>Check your SMS</div>
              <div style={{ fontSize: isMobile ? 15 : 14, color: '#5B5894', lineHeight: 1.6 }}>
                Code sent to&nbsp;<span style={{ fontWeight: 800, color: '#0D0B2E' }}>{country.flag} {country.code} {phone}</span>
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
                  borderRadius: 14, border: '1.5px solid #E8E6F5',
                  background: '#F8F8FD', fontSize: 16,
                  outline: 'none', color: '#0D0B2E', fontFamily: 'inherit',
                  touchAction: 'manipulation',
                }}
              />
            </div>
            <button
              onClick={sendOtp}
              disabled={otpLoading || sanitizePhone(phone).length < 6}
              style={{
                height: 56, borderRadius: 16,
                background: sanitizePhone(phone).length >= 6 ? '#0D0B2E' : '#E8E6F5',
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
                <div style={{ fontSize: 15, color: '#5B5894', fontWeight: 600 }}>Verifying your code…</div>
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
                    style={{ fontSize: 14, fontWeight: 600, color: '#9B99C8', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', touchAction: 'manipulation', minHeight: 44 }}>
                    ← Change number
                  </button>
                  <button onClick={sendOtp} disabled={resendTimer > 0 || otpLoading}
                    style={{ fontSize: 14, fontWeight: 700, color: resendTimer > 0 ? '#9B99C8' : ac, background: 'none', border: 'none', cursor: resendTimer > 0 ? 'default' : 'pointer', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 5, touchAction: 'manipulation', minHeight: 44 }}>
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
            <div style={{ position: 'relative' }}>
              <Mail size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: ac }} />
              <input type="email" placeholder="Staff Email" value={email}
                onChange={e => { setEmail(e.target.value); setAdminErr(''); }}
                style={{ width: '100%', height: 52, paddingLeft: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <KeyRound size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: ac }} />
              <input type={showPw ? 'text' : 'password'} placeholder="Password" value={pw}
                onChange={e => { setPw(e.target.value); setAdminErr(''); }}
                onKeyDown={e => e.key === 'Enter' && adminLogin()}
                style={{ width: '100%', height: 52, paddingLeft: 48, paddingRight: 48, borderRadius: 14, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              <button onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 8, touchAction: 'manipulation' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button onClick={adminLogin} disabled={adminLoading}
              style={{ height: 56, borderRadius: 16, background: ac, color: '#0D0B2E', border: 'none', fontSize: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, touchAction: 'manipulation' }}>
              {adminLoading ? <><Loader2 size={18} className="lp-spin" /> Authenticating…</> : <><Shield size={18} /> Authorize</>}
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${isAdmin ? 'rgba(255,255,255,.06)' : '#E8E6F5'}`, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9B99C8' }}><Shield size={11} /> Encrypted</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9B99C8' }}><Globe size={11} /> Global</div>
            {!isAdmin && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9B99C8' }}><Smartphone size={11} /> SMS Code</div>}
          </div>
          {mode === 'client'
            ? <button onClick={() => { setMode('admin'); setClientErr(''); setAdminErr(''); setStep('phone'); }}
                style={{ fontSize: 13, color: '#9B99C8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '10px 0', touchAction: 'manipulation', minHeight: 44 }}>
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
