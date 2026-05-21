import React, { useState, useEffect } from 'react';
import { Spinner } from '../components/Shared';
import {
  Smartphone, Send, ArrowRight, MessageSquare,
  ShieldCheck, Lock, ChevronLeft, Globe, Shield,
  Mail, KeyRound, Fingerprint, Command, Eye, EyeOff
} from 'lucide-react';
import Button from '../components/ui/Button';

const COUNTRIES = [
  { name: 'Ghana', code: '+233', flag: '🇬🇭' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'China', code: '+86', flag: '🇨🇳' },
];

export default function LoginPage({ onLogin, onBack, brand, type = 'client', ...props }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(type === 'admin');

  const ac = brand.color || '#231F78';

  useEffect(() => {
    setIsAdminLogin(type === 'admin');
  }, [type]);

  const handleLoginSubmit = async () => {
    const loginPath = isAdminLogin ? 'admin' : 'client';
    const identifier = isAdminLogin ? email : username;
    const cred = isAdminLogin ? pw : password;

    if (!identifier || !cred) return setErr('Identification and access password required.');
    
    setLoading(true);
    setErr('');
    try {
      const user = await onLogin(identifier.trim(), cred.trim(), loginPath);
      if (user?.requiresPasswordChange) {
         setShowOnboarding(true);
         setLoading(false);
      }
    } catch (e) {
      setErr(e.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="lxf" style={{ 
      minHeight: '100vh', 
      background: isAdminLogin ? '#0D0B2E' : '#F4F4FA', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 24, 
      transition: 'background 0.8s'
    }}>
      {showOnboarding && (
        <div className="overlay-modal" style={{ zIndex: 10000, background: 'rgba(13, 11, 46, 0.95)', backdropFilter: 'blur(20px)', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
           <div className="p-card" style={{ maxWidth: 400, width: '100%', padding: 40, textAlign: 'center', background: '#fff', borderRadius: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${ac}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: ac }}>
                 <KeyRound size={32} />
              </div>
              <h2 className="lxfh" style={{ fontSize: 24, marginBottom: 12 }}>Secure Your Portal</h2>
              <p style={{ color: '#9B99C8', fontSize: 14, marginBottom: 32 }}>Welcome! For your security, please create a new private password to replace your temporary one.</p>
              <input 
                type="password" 
                placeholder="New Secure Password" 
                className="p-inp" 
                style={{ marginBottom: 16, width: '100%', height: 50, padding: '0 16px', borderRadius: 12, border: '1px solid #eee' }}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
              />
              {newPass.length > 0 && newPass.length < 8 && (
                <p style={{ color: '#DC2626', fontSize: 12, marginBottom: 8, textAlign: 'left' }}>Password must be at least 8 characters.</p>
              )}
              <Button
                onClick={async () => {
                   if (newPass.length < 8) { return; }
                   if (props.updateClientProfile) {
                     await props.updateClientProfile(props.user.id, { requiresPasswordChange: false });
                   }
                   setShowOnboarding(false);
                }}
                disabled={newPass.length < 8}
                variant="dark"
                size="lg"
                style={{ width: '100%', opacity: newPass.length < 8 ? 0.5 : 1 }}
              >Update & Continue</Button>
           </div>
        </div>
      )}
      
      {/* Navigation Top */}
      <div style={{ width: '100%', maxWidth: 440, marginBottom: 24 }}>
        <Button 
          onClick={onBack} 
          variant="ghost"
          size="sm"
          style={{ color: isAdminLogin ? '#9B99C8' : '#9B99C8', fontSize: 13, gap: 6, fontWeight: 500 }}
        >
          <ChevronLeft size={16} /> Return to Public Site
        </Button>
      </div>

      <div className={`p-card ${isAdminLogin ? 'dark-theme' : ''}`} style={{ 
        width: '100%', 
        maxWidth: 440, 
        padding: '56px 48px', 
        borderRadius: 24, 
        boxShadow: isAdminLogin ? '0 32px 64px rgba(0,0,0,0.5)' : '0 24px 48px -12px rgba(13,11,46,0.08)',
        background: isAdminLogin ? '#0D0B2E' : '#ffffff',
        border: `1px solid ${isAdminLogin ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Visual Decoration */}
        <div style={{ 
          position: 'absolute', top: -20, right: -20, width: 120, height: 120, 
          background: isAdminLogin ? `${ac}15` : `${ac}10`, 
          borderRadius: '50%', filter: 'blur(30px)' 
        }}></div>

        <div style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1 }}>
           {brand.logo ? <img src={brand.logo} alt="logo" style={{ height: 60, marginBottom: 24 }} />
             : <div className="lxfh" style={{ fontSize: 24, fontWeight: 700, color: isAdminLogin ? '#fff' : '#0D0B2E', marginBottom: 24 }}>{brand.name}</div>}
           
          <h1 className="lxfh" style={{ fontSize: isAdminLogin ? 28 : 32, fontWeight: 300, color: isAdminLogin ? '#fff' : '#0D0B2E', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {isAdminLogin ? 'Staff Entry' : 'Client Portal'} {isAdminLogin ? <Lock size={20} color={ac} /> : <ShieldCheck size={24} color={ac} />}
          </h1>
          <p style={{ fontSize: 13, color: isAdminLogin ? '#9B99C8' : '#5B5894', textTransform: isAdminLogin ? 'uppercase' : 'none', letterSpacing: isAdminLogin ? '.1em' : 'normal' }}>
            {isAdminLogin ? 'Secured Terminal Environment' : 'Enter your designated credentials to access your dashboard.'}
          </p>
        </div>

        {/* ERROR DISPLAY */}
        {err && (
          <div className="fade-in" style={{ 
            padding: '14px 18px', background: isAdminLogin ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', border: `1px solid ${isAdminLogin ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'}`, 
            borderRadius: 12, color: '#DC2626', fontSize: 13, marginBottom: 32, 
            display: 'flex', gap: 10, alignItems: 'center' 
          }}>
            <Fingerprint size={16} /> {err}
          </div>
        )}

        {/* CORE FORM LOGIC */}
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            {isAdminLogin ? <Mail size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: ac }} /> : <Command size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: ac }} />}
            <input 
              placeholder={isAdminLogin ? "Staff ID (Email)" : "Username"} 
              aria-label={isAdminLogin ? "Staff ID (Email)" : "Username"}
              style={{ width: '100%', height: 56, paddingLeft: 48, background: isAdminLogin ? 'rgba(255,255,255,0.03)' : '#F4F4FA', border: isAdminLogin ? '1px solid rgba(255,255,255,0.1)' : '1px solid #F0EBE5', color: isAdminLogin ? '#fff' : '#121212', borderRadius: 12, outline: 'none' }}
              value={isAdminLogin ? email : username} 
              onChange={e => isAdminLogin ? setEmail(e.target.value) : setUsername(e.target.value)} 
            />
          </div>
          <div style={{ position: 'relative' }}>
            <KeyRound size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: ac }} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Access Password"
              aria-label="Access Password"
              style={{ width: '100%', height: 56, paddingLeft: 48, paddingRight: 48, background: isAdminLogin ? 'rgba(255,255,255,0.03)' : '#F4F4FA', border: isAdminLogin ? '1px solid rgba(255,255,255,0.1)' : '1px solid #F0EBE5', color: isAdminLogin ? '#fff' : '#121212', borderRadius: 12, outline: 'none' }}
              value={isAdminLogin ? pw : password}
              onChange={e => isAdminLogin ? setPw(e.target.value) : setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: isAdminLogin ? 'rgba(255,255,255,0.3)' : '#9B99C8', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Button onClick={handleLoginSubmit} disabled={loading} variant={isAdminLogin ? 'primary' : 'dark'} size="lg" style={{ height: 60, marginTop: 12, width: '100%', gap: 12 }}>
            {loading ? <Spinner /> : isAdminLogin ? <><Shield size={18} /> Authorize Terminal</> : <><ArrowRight size={18} /> Enter Portal</>}
          </Button>
        </div>

        {/* SECURITY INFO FOOTER */}
        <div style={{ marginTop: 48, borderTop: `1px solid ${isAdminLogin ? 'rgba(255,255,255,0.05)' : '#F0EBE5'}`, paddingTop: 32, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9B99C8', fontSize: 11 }}>
                <Shield size={14} /> End-to-End Encrypted
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9B99C8', fontSize: 11 }}>
                <Globe size={14} /> Global Availability
             </div>
          </div>
          {!isAdminLogin && (
            <p style={{ fontSize: 12, color: '#9B99C8', lineHeight: 1.6 }}>
              Lost your credentials? Your project manager can reset your access password anytime.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

