import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import {
  Bell, Menu, X, Layers, AppWindow, ShowerHead, ChefHat, Shirt, LayoutGrid, DoorOpen, Zap, Droplets
} from 'lucide-react';
import { useWindowWidth, isMob, DARK_TEXT, AC } from '../pages/sharedHelpers';

export function PubNav({ brand, setPage, activePage, onPortal, user: propUser, menuOpen, setMenuOpen, navigate }) {
  const [scrolled, setScrolled] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand.color || AC;
  const { userNotifications, user: contextUser } = useContext(AppContext);
  const user = propUser || contextUser;

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const links = [
    { n: 'Home', id: 'home' },
    { n: 'Services', id: 'services' },
    { n: 'Products', id: 'products' },
    { n: 'Showroom', id: 'showcase', badge: 'LUXE' },
    { n: 'Portfolio', id: 'portfolio' },
    { n: 'About', id: 'about' },
    { n: 'Contact', id: 'contact' }
  ];

  const forceSolid = activePage !== 'home';
  const isScrolled = scrolled || forceSolid;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: isScrolled ? 'rgba(24, 14, 6, 0.97)' : 'rgba(24, 14, 6, 0.15)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: isScrolled ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      height: mob ? (isScrolled ? 64 : 80) : (isScrolled ? 80 : 120), 
      display: 'flex', alignItems: 'center', padding: '0 5vw'
    }}>
      <div style={{ maxWidth: 1800, width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* LOGO */}
        <div 
          onClick={() => { navigate('/'); if (setPage) setPage('home'); setMenuOpen(false); }} 
          style={{ 
            cursor: 'pointer', 
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            background: 'transparent',
            border: 'none',
            padding: mob ? '4px 0' : '6px 0',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.filter = 'drop-shadow(0 0 15px rgba(197, 168, 128, 0.35))';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.filter = 'none';
          }}
        >
            {brand.logo ? (
              <img
                src={brand.logo}
                alt={brand.name}
                style={{
                  height: mob ? (isScrolled ? 48 : 58) : (isScrolled ? 76 : 96),
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  filter: 'brightness(0) invert(1)',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
                <div style={{ fontSize: mob ? 20 : 28, fontWeight: 900, color: '#ffffff', letterSpacing: '0.05em' }}>WESTLINE</div>
                <div style={{ fontSize: mob ? 9 : 12, fontWeight: 400, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.45em' }}>FUTURE</div>
              </div>
            )}
        </div>


        {/* DESKTOP NAV */}
        {!mob && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
            <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
              {links.map(l => (
                <button key={l.id} onClick={() => {
                  if (l.id === 'home') { navigate('/'); if (setPage) setPage('home'); }
                  else if (l.id === 'products') navigate('/products');
                  else if (l.id === 'showcase') navigate('/showcase');
                  else if (l.id === 'portfolio') navigate('/portfolio');
                  else if (setPage) {
                    if (window.location.pathname !== '/') navigate('/?page=' + l.id);
                    else setPage(l.id);
                  }
                }} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  color: activePage === l.id ? '#ffffff' : 'rgba(255,255,255,0.65)',
                  textTransform: 'uppercase', letterSpacing: '0.22em', transition: 'all 0.3s',
                  opacity: activePage === l.id ? 1 : 0.8, whiteSpace: 'nowrap', padding: '4px 0',
                  borderBottom: activePage === l.id ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
                  position: 'relative'
                }}>
                  {l.n}
                  {l.badge && <span style={{ position: 'absolute', top: -6, right: -12, fontSize: 7, background: `var(--accent-primary)`, color: `var(--accent-secondary)`, borderRadius: 100, padding: '1px 5px', fontWeight: 800 }}>{l.badge}</span>}
                </button>
              ))}
            </div>
            {user && (
              <div style={{ position: 'relative', marginRight: 16 }}>
                <button 
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}
                >
                  <Bell size={20} />
                  {userNotifications.filter(n => !n.read).length > 0 && (
                    <span style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {userNotifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                {showNotifDropdown && (
                  <div style={{ position: 'absolute', top: 40, right: 0, width: 300, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 1002, padding: '16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', color: DARK_TEXT }}>Notifications</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
                      {userNotifications.length > 0 ? userNotifications.map(n => (
                        <div key={n.id} style={{ fontSize: 12, color: n.read ? 'rgba(24, 14, 6, 0.4)' : `var(--accent-secondary)`, borderBottom: '1px solid var(--bg-primary)', paddingBottom: 8 }}>
                          {n.message}
                          <div style={{ fontSize: 10, color: 'rgba(24, 14, 6, 0.5)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString()}</div>
                        </div>
                      )) : (
                        <div style={{ fontSize: 12, color: 'rgba(24, 14, 6, 0.5)', textAlign: 'center' }}>No notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {onPortal && (
              <button onClick={() => onPortal && onPortal('client')} style={{
                padding: '12px 28px', fontSize: 10, fontWeight: 800,
                background: 'rgba(255,255,255,0.15)', color: '#ffffff',
                borderRadius: 12, border: '1px solid rgba(255,255,255,0.25)',
                textTransform: 'uppercase', letterSpacing: '0.12em', cursor: 'pointer',
                backdropFilter: 'blur(8px)', transition: 'all 0.3s'
              }}>Client Portal</button>
            )}
          </div>
        )}
        {user && (
          <button 
            className="mob-only" 
            onClick={() => setMenuOpen(true)} 
            style={{ background: 'none', border: 'none', color: `var(--accent-primary)`, zIndex: 1001, padding: 8, position: 'relative', marginRight: 8 }}
          >
            <Bell size={28} />
            {userNotifications.filter(n => !n.read).length > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, background: 'red', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {userNotifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        )}
        {/* MOBILE TOGGLE */}
        <button 
          className="mob-only" 
          onClick={() => setMenuOpen(!menuOpen)} 
          style={{ background: 'none', border: 'none', color: `var(--accent-primary)`, zIndex: 1001, padding: 8 }}
        >
          {menuOpen ? <X size={32} /> : <Menu size={32} />}
        </button>

      </div>

      {/* MOBILE DRAWER - Translucent Glass Effect */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
        background: '#ffffff', 
        transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 1000,
        padding: '120px 32px 48px', display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.1)',
        borderLeft: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: mob ? 0 : 8 }}>
          {links.map((l, i) => (
            <button 
              key={l.id} 
              onClick={() => {
                setMenuOpen(false);
                if (l.id === 'home') { navigate('/'); if (setPage) setPage('home'); }
                else if (l.id === 'products') navigate('/products');
                else if (l.id === 'showcase') navigate('/showcase');
                else if (l.id === 'portfolio') navigate('/portfolio');
                else if (setPage) {
                  if (window.location.pathname !== '/') navigate('/?page=' + l.id);
                  else setPage(l.id);
                }
              }} 
              style={{
                background: 'none', border: 'none', textAlign: 'left',
                fontSize: mob ? 24 : 32, fontWeight: activePage === l.id ? 800 : 300,
                color: activePage === l.id ? `var(--accent-primary)` : DARK_TEXT,
                padding: mob ? '8px 0' : '12px 0', cursor: 'pointer'
              }}
            >
              {l.n}
            </button>
          ))}
          
          {user && userNotifications.length > 0 && (
            <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(24, 14, 6, 0.08)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', color: `var(--accent-primary)` }}>Notifications</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 200, overflowY: 'auto' }}>
                {userNotifications.map(n => (
                  <div key={n.id} style={{ fontSize: 13, color: n.read ? 'rgba(24, 14, 6, 0.4)' : DARK_TEXT, borderBottom: '1px solid rgba(24, 14, 6, 0.04)', paddingBottom: 8 }}>
                    {n.message}
                    <div style={{ fontSize: 10, color: 'rgba(24, 14, 6, 0.5)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={() => { setMenuOpen(false); onPortal('client'); }} style={{
          padding: '20px', background: DARK_TEXT, color: '#fff', borderRadius: 16, border: 'none',
          fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em'
        }}>Client Portal Login</button>
      </div>
    </nav>
  );
}

export function Footer({ brand, setPage, onPortal, navigate }) {
  const ac = `var(--accent-primary)`;
  const winW = useWindowWidth();
  const mob = isMob(winW);

  return (
    <footer style={{ background: `var(--footer-bg)`, color: '#ffffff', padding: mob ? '60px 24px' : '100px 5vw 60px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(4, 1fr)', gap: 48, marginBottom: 80 }}>
          <div>
            {true ? (
              <img 
                src="/footer-logo.png" 
                alt={brand.name} 
                style={{ 
                  height: mob ? 60 : 84, 
                  width: 'auto', 
                  objectFit: 'contain', 
                  display: 'block', 
                  marginBottom: 24,
                  filter: 'invert(1)',
                  mixBlendMode: 'screen',
                  opacity: 0.95
                }} 
              />
            ) : (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>WESTLINE FUTURE</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', marginTop: 2 }}>GLOBAL TRADING CO., LTD</div>
              </div>
            )}
            <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, fontSize: 14 }}>Global precision meets local delivery. Premium structural glass, aluminum works, and interior finishing solutions for the world's most ambitious architectural projects.</p>
          </div>
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>Navigation</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Home', 'Services', 'Products', 'Showroom', 'Portfolio', 'About', 'Contact'].map(n => (
                <button key={n} onClick={() => {
                  const id = n.toLowerCase();
                  if (id === 'products') navigate('/products');
                  else if (id === 'showcase') navigate('/showcase');
                  else if (id === 'portfolio') navigate('/portfolio');
                  else if (setPage) {
                    if (window.location.pathname !== '/') navigate('/?page=' + id);
                    else setPage(id);
                  }
                }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', textAlign: 'left', fontSize: 14 }}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>Capabilities</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[
                { Icon: Layers,     label: 'Glass & Glazing'       },
                { Icon: AppWindow,  label: 'Aluminium Windows'      },
                { Icon: ShowerHead, label: 'Bathroom Installation'  },
                { Icon: ChefHat,    label: 'Kitchen Renovation'     },
                { Icon: Shirt,      label: 'Wardrobes & Storage'    },
                { Icon: LayoutGrid, label: 'Tiles & Flooring'       },
                { Icon: DoorOpen,   label: 'Doors'                  },
                { Icon: Zap,        label: 'Electrical Works'       },
                { Icon: Droplets,   label: 'Plumbing Works'         },
              ].map(({ Icon, label }) => (
                <button
                  key={label}
                  onClick={() => navigate('/?page=services')}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', textAlign: 'left', fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 10, transition: 'color 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.color = ac}
                  onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                >
                  <Icon size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>Contact</h4>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
              {brand.location}<br />
              {brand.phone}<br />
              {brand.email}
            </div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Follow Us</h4>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Instagram', href: brand.instagram, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.163 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
                { label: 'Facebook', href: brand.facebook, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                { label: 'LinkedIn', href: brand.linkedin, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                { label: 'TikTok', href: brand.tiktok, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
                { label: 'YouTube', href: brand.youtube, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
              ].filter(s => s.href).map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
                  style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s', textDecoration: 'none' }}
                  onMouseOver={e => { e.currentTarget.style.background = ac; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = ac; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >{s.svg}</a>
              ))}
            </div>
          </div>
        </div>
        <div style={{ paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <span>© 2026 Westline Future Ltd. All rights reserved.</span>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Management Portal</button>
        </div>

      </div>
    </footer>
  );
}
