import React, { useState, useEffect, lazy, Suspense, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import {
  ChevronRight, ChevronLeft, Award, Check, Play, X, ArrowLeft, Star,
  SplitSquareHorizontal, Layout, Home, Layers, Droplet, Zap, Settings,
  Hammer, Palette, Package, Mail, Truck, CreditCard, Building,
  CheckCircle, Send, Sparkles, MapPin, Calendar, Menu, Bell,
  ShieldCheck, Clock, Globe2, Wrench, Quote,
  AppWindow, ShowerHead, ChefHat, Shirt, LayoutGrid, DoorOpen, Droplets, PlugZap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { HERO_SLIDES, ABOUT_DATA } from '../data';

const ContactPage = lazy(() => import('./ContactPage'));
const AboutPage = lazy(() => import('./AboutPage'));
const ServicesPage = lazy(() => import('./ServicesPage'));

// --- HELPERS ---
export function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}
export const isMob = (w) => w <= 1024;
export const LIGHT_BG = '#F8F8FD';
export const DARK_TEXT = '#0D0B2E';
export const AC = '#231F78';

// --- SHARED COMPONENTS ---

export function PubNav({ brand, setPage, activePage, onPortal, user, menuOpen, setMenuOpen, navigate }) {
  const [scrolled, setScrolled] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand.color || AC;
  const { userNotifications } = useContext(AppContext);

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
  const mobileIconButton = {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: '#ffffff',
    border: '1px solid rgba(13,11,46,0.10)',
    color: DARK_TEXT,
    zIndex: 1001,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(13,11,46,0.10)',
    position: 'relative'
  };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: mob ? '#ffffff' : (isScrolled ? 'rgba(35,31,120,0.97)' : 'rgba(35,31,120,0.15)'),
      backdropFilter: mob ? 'none' : 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: mob ? 'none' : 'blur(24px) saturate(180%)',
      borderBottom: mob ? '1px solid rgba(13,11,46,0.08)' : (isScrolled ? '1px solid rgba(255,255,255,0.08)' : 'none'),
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      height: mob ? 72 : (scrolled ? 80 : 120),
      display: 'flex', alignItems: 'center', padding: mob ? '0 20px' : '0 5vw',
      boxShadow: mob ? '0 10px 32px rgba(13,11,46,0.08)' : 'none'
    }}>
      <div style={{ maxWidth: 1800, width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* LOGO */}
        <div onClick={() => { navigate('/'); if (setPage) setPage('home'); setMenuOpen(false); }} style={{ cursor: 'pointer', zIndex: 1001 }}>
            {brand.logo ? (
              <img
                src={brand.logo}
                alt={brand.name}
                style={{
                  height: mob ? (scrolled ? 36 : 44) : (scrolled ? 52 : 68),
                  width: 'auto', maxWidth: mob ? 160 : 240,
                  objectFit: 'contain', display: 'block',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
                <div style={{ fontSize: mob ? 18 : 24, fontWeight: 900, color: mob ? DARK_TEXT : '#ffffff', letterSpacing: '0.05em' }}>WESTLINE</div>
                <div style={{ fontSize: mob ? 8 : 10, fontWeight: 400, color: mob ? 'rgba(13,11,46,0.55)' : 'rgba(255,255,255,0.6)', letterSpacing: '0.45em' }}>FUTURE</div>
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
                  {l.badge && <span style={{ position: 'absolute', top: -6, right: -12, fontSize: 7, background: ac, color: '#fff', borderRadius: 100, padding: '1px 5px', fontWeight: 800 }}>{l.badge}</span>}
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
                  <div style={{ position: 'absolute', top: 40, right: 0, width: 300, background: '#fff', border: '1px solid #E8E6F5', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 1002, padding: '16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', color: DARK_TEXT }}>Notifications</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
                      {userNotifications.length > 0 ? userNotifications.map(n => (
                        <div key={n.id} style={{ fontSize: 12, color: n.read ? '#9B99C8' : '#0D0B2E', borderBottom: '1px solid #F8F8FD', paddingBottom: 8 }}>
                          {n.message}
                          <div style={{ fontSize: 10, color: '#9B99C8', marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString()}</div>
                        </div>
                      )) : (
                        <div style={{ fontSize: 12, color: '#9B99C8', textAlign: 'center' }}>No notifications</div>
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
              style={{ ...mobileIconButton, marginRight: 10 }}
              aria-label="Open notifications"
            >
            <Bell size={20} />
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
          style={{
            ...mobileIconButton,
            background: menuOpen ? DARK_TEXT : '#ffffff',
            borderColor: menuOpen ? DARK_TEXT : 'rgba(13,11,46,0.10)',
            color: menuOpen ? '#ffffff' : DARK_TEXT
          }}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

      </div>

      {/* MOBILE DRAWER */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
        background: '#ffffff',
        transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 1000,
        padding: '104px 28px 40px', display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(13,11,46,0.14)',
        borderLeft: '1px solid rgba(13,11,46,0.08)'
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
                color: activePage === l.id ? ac : DARK_TEXT,
                padding: mob ? '8px 0' : '12px 0', cursor: 'pointer'
              }}
            >
              {l.n}
            </button>
          ))}
          
          {user && userNotifications.length > 0 && (
            <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #E8E6F5' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', color: ac }}>Notifications</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 200, overflowY: 'auto' }}>
                {userNotifications.map(n => (
                  <div key={n.id} style={{ fontSize: 13, color: n.read ? '#9B99C8' : DARK_TEXT, borderBottom: '1px solid #F8F8FD', paddingBottom: 8 }}>
                    {n.message}
                    <div style={{ fontSize: 10, color: '#9B99C8', marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString()}</div>
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

// PubBottomNav removed for unified mobile navigation


export function Footer({ brand, setPage, onPortal, navigate }) {
  const ac = brand.color || AC;
  const winW = useWindowWidth();
  const mob = isMob(winW);

  return (
    <footer style={{ background: '#0D0B2E', color: '#ffffff', padding: mob ? '60px 24px' : '100px 5vw 60px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(4, 1fr)', gap: 48, marginBottom: 80 }}>
          <div>
            {brand.logo ? (
              <img src={brand.logo} alt={brand.name} style={{ height: 48, width: 'auto', objectFit: 'contain', display: 'block', marginBottom: 20 }} />
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
                { label: 'Instagram', href: brand.instagram, svg: <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
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

// --- HOME PAGE SECTIONS ---

export function Hero({ slides, brand, navigate, setPage }) {
  const [active, setActive] = useState(0);
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand.color || AC;

  useEffect(() => {
    const int = setInterval(() => setActive(s => (s + 1) % (slides.length || 1)), 8000);
    return () => clearInterval(int);
  }, [slides.length]);

  return (
    <section style={{ height: '100vh', position: 'relative', background: LIGHT_BG, overflow: 'hidden' }}>
      {slides.map((s, i) => (
        <div key={s.title || i} style={{
          position: 'absolute', inset: 0, transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: active === i ? 1 : 0, zIndex: active === i ? 1 : 0,
          background: '#0D0B2E' 
        }}>
          <img 
            src={s.img} 
            alt="" 
            onLoad={(e) => {
              e.target.style.opacity = 1;
              e.target.style.filter = 'blur(0)';
            }}
            style={{ 
              width: '100%', height: '100%', objectFit: 'cover', opacity: 0,
              filter: 'blur(20px)',
              transform: active === i ? 'scale(1.02)' : 'scale(1.1)', 
              transition: 'opacity 0.6s ease-out, filter 1s ease-out, transform 12s ease-out' 
            }} 
          />
          <div style={{
            position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(253,252,251,0.05), rgba(253,252,251,0.5))',
            display: 'flex', alignItems: 'center', padding: '0 5vw'
          }}>
            <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: ac, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 24, display: 'block' }}>ESTABLISHED PRECISION</span>
                <h1 style={{ 
                  fontSize: mob ? 'clamp(28px, 8vw, 40px)' : 'clamp(64px, 8vw, 120px)', 
                  fontWeight: 800, color: DARK_TEXT, lineHeight: 1, marginBottom: mob ? 12 : 40, letterSpacing: '-0.04em', maxWidth: 1000,
                  whiteSpace: 'pre-line'
                }}>
                  {s.title}
                </h1>
                {s.sub && (
                  <p style={{ 
                    fontSize: mob ? 12 : 20, 
                    color: 'rgba(13,11,46,0.65)', 
                    maxWidth: 600, 
                    lineHeight: 1.5, 
                    marginBottom: mob ? 20 : 48,
                    fontWeight: 400
                  }}>
                    {s.sub}
                  </p>
                )}
                <div style={{ display: 'flex', gap: mob ? 10 : 16, flexWrap: 'nowrap', marginTop: 8 }}>
                  <button onClick={() => navigate('/products')} style={{ flex: mob ? 1 : 'initial', padding: mob ? '14px 12px' : '18px 36px', background: DARK_TEXT, color: '#fff', borderRadius: 12, border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: mob ? 10 : 14, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.3s', whiteSpace: 'nowrap' }} className="hover-lift">Browse Catalog</button>
                  <button onClick={() => navigate('/showcase')} style={{ flex: mob ? 1 : 'initial', padding: mob ? '14px 12px' : '18px 36px', background: 'rgba(255,255,255,0.95)', color: DARK_TEXT, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)', fontWeight: 700, cursor: 'pointer', fontSize: mob ? 10 : 14, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.3s', whiteSpace: 'nowrap' }} className="hover-lift">Luxe Showroom</button>
                </div>



              </motion.div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

export function ServicesPreview({ brand, navigate, services }) {
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand.color || AC;

  const DEFAULT_SVCS = [
    { Icon: Layers,     name: 'Glass & Glazing',       short: 'Frameless glass, balustrades, curtain walls, glass partitions & shopfronts.', id: 'glass' },
    { Icon: AppWindow,  name: 'Aluminium Windows',      short: 'Casement, sliding & louvre aluminium windows and doors — fabricated to spec.', id: 'aluminium' },
    { Icon: ShowerHead, name: 'Bathroom Installation',  short: 'Full bathroom fit-out — shower cubicles, vanities, WC, tiles & plumbing.', id: 'washroom' },
    { Icon: ChefHat,    name: 'Kitchen Renovation',     short: 'Custom kitchen cabinets, worktops, sinks — modular kitchen supply & install.', id: 'kitchen' },
    { Icon: Shirt,      name: 'Wardrobes & Storage',    short: 'Sliding wardrobes, walk-in closets & fitted storage systems for every room.', id: 'wardrobe' },
    { Icon: LayoutGrid, name: 'Tiles Supply & Fixing',  short: 'Porcelain, ceramic & outdoor tiles — supply only or full supply-and-fix.', id: 'tiles' },
    { Icon: DoorOpen,   name: 'Doors Installation',     short: 'Timber, WPC & security doors — frames, handles & complete door systems.', id: 'doors' },
    { Icon: Zap,        name: 'Electrical Works',        short: 'Full wiring, LED lighting, smart switches, DB boards & socket installations.', id: 'electrical' },
    { Icon: Droplets,   name: 'Plumbing Works',          short: 'Plumbing installations, sanitary fittings, water heaters & pipe systems.', id: 'plumbing' },
  ];
  const items = (services && services.length >= 6) ? services : DEFAULT_SVCS;

  return (
    <section style={{ padding: mob ? '80px 24px' : '120px 5vw', background: '#FDFCFB' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: mob ? 48 : 64, display: 'flex', flexDirection: mob ? 'column' : 'row', justifyContent: 'space-between', alignItems: mob ? 'flex-start' : 'flex-end', gap: 24 }}>
          <div>
            <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>EVERYTHING INTERIOR</span>
            <h2 style={{ fontSize: mob ? 36 : 64, fontWeight: 800, letterSpacing: '-0.04em', margin: '16px 0 0', color: DARK_TEXT, lineHeight: 1.05 }}>
              One company,<br />
              <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>every service.</em>
            </h2>
          </div>
          <button
            onClick={() => navigate('/?page=services')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: DARK_TEXT, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            All Services <ChevronRight size={15} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(3, 1fr)', gap: mob ? 12 : 20 }}>
          {items.slice(0, 9).map((s, i) => (
            <div
              key={s.id || s.name || i}
              onClick={() => navigate('/?page=services')}
              style={{ padding: mob ? '20px 16px' : '36px 32px', background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.02)', transition: 'transform 0.25s ease, box-shadow 0.25s ease', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.02)'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: mob ? 16 : 24, color: ac }}>
                {s.Icon ? <s.Icon size={20} strokeWidth={1.75} /> : <Layers size={20} strokeWidth={1.75} />}
              </div>
              <h3 style={{ fontSize: mob ? 14 : 18, fontWeight: 800, marginBottom: 10, color: DARK_TEXT, lineHeight: 1.2 }}>{s.name || s.title}</h3>
              {!mob && <p style={{ color: 'rgba(13,11,46,0.55)', lineHeight: 1.7, marginBottom: 20, fontSize: 13 }}>{s.short || s.desc}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ac, fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>
                Learn more <ChevronRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- STATS BAR ---
const DEFAULT_STATS = [
  { value: '200+', label: 'Projects Delivered', labelMob: 'Projects' },
  { value: '12+',  label: 'Years Experience',   labelMob: 'Years' },
  { value: '98%',  label: 'Client Satisfaction', labelMob: 'Satisfaction' },
  { value: '8',    label: 'Countries Served',    labelMob: 'Countries' },
];

function StatsBar({ brand, stats }) {
  const ac = brand.color || AC;
  const items = (stats && stats.length) ? stats : DEFAULT_STATS;
  return (
    <section style={{ background: '#0D0B2E', padding: '48px 5vw' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 32 }}>
        {items.map((s, i) => (
          <div key={s.label || i} style={{ textAlign: 'center', borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', padding: '8px 16px' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: ac, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsBarMobile({ brand, stats }) {
  const ac = brand.color || AC;
  const items = (stats && stats.length) ? stats : DEFAULT_STATS;
  return (
    <section style={{ background: '#0D0B2E', padding: '40px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 16px' }}>
        {items.map((s, i) => (
          <div key={s.label || i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: ac, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.labelMob || s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- WHY WESTLINE FUTURE ---
const DEFAULT_WHY_US = [
  { Icon: ShieldCheck, title: 'Guaranteed Quality',    desc: 'Every installation backed by a 2-year workmanship warranty and certified materials from vetted manufacturers.' },
  { Icon: Clock,       title: 'On-Time Delivery',      desc: 'Our dedicated logistics team tracks every shipment. 94% of projects completed on or ahead of schedule.' },
  { Icon: Globe2,      title: 'Direct China Sourcing', desc: 'We cut out middlemen. Factory-direct procurement means premium glass at 20–35% below market rates.' },
  { Icon: Wrench,      title: 'Technical Expertise',   desc: 'CNC precision, sub-millimeter tolerances. Our engineers have handled façades, curtain walls, and interior systems for 12+ years.' },
];

function WhyWestline({ brand, navigate, reasons }) {
  const ac = brand.color || AC;
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const items = (reasons && reasons.length) ? reasons : DEFAULT_WHY_US;

  return (
    <section style={{ padding: mob ? '80px 24px' : '140px 5vw', background: '#fff' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: mob ? 48 : 80 }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>WHY WESTLINE FUTURE</span>
          <h2 style={{ fontSize: mob ? 36 : 64, fontWeight: 800, letterSpacing: '-0.04em', margin: '16px 0 0', color: DARK_TEXT, lineHeight: 1.1 }}>
            Built to a{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>higher standard.</em>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: mob ? 20 : 32 }}>
          {items.map((r, i) => (
            <div key={r.title || i} style={{
              display: 'flex', gap: 24, padding: mob ? '28px 24px' : '40px',
              background: '#F8F8FD', borderRadius: 24,
              border: '1px solid rgba(0,0,0,0.04)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: ac }}>
                {r.Icon ? <r.Icon size={22} strokeWidth={1.75} /> : <ShieldCheck size={22} strokeWidth={1.75} />}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: DARK_TEXT, marginBottom: 10 }}>{r.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(13,11,46,0.6)', lineHeight: 1.7, margin: 0 }}>{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: mob ? 40 : 64, textAlign: 'center' }}>
          <button
            onClick={() => navigate('/?page=contact')}
            style={{ padding: '18px 48px', background: '#0D0B2E', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}
            onMouseEnter={e => e.currentTarget.style.background = ac}
            onMouseLeave={e => e.currentTarget.style.background = '#0D0B2E'}
          >
            Start Your Project <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

// --- TESTIMONIALS ---
const DEFAULT_TESTIMONIALS = [
  { author: 'Kwame Asante',      text: 'Westline Future transformed our office with exceptional precision. The structural glazing exceeded every expectation — on time and on budget.',  projectTitle: 'Airport Hills Commercial Tower',  rating: 5 },
  { author: 'Adwoa Mensah',      text: 'From site survey to final polish, the team was professional throughout. Sourcing directly from China kept costs reasonable without compromising on quality.', projectTitle: 'East Legon Residence',           rating: 5 },
  { author: 'Richard Osei-Bonsu', text: 'The bespoke kitchen installation is flawless. Their CAD team got every measurement right, and installation was completed in under a week.', projectTitle: 'Cantonments Luxury Kitchen',       rating: 5 },
];

function TestimonialsSection({ brand, testimonials: propTestimonials, cmsTestimonials }) {
  const ac = brand.color || AC;
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const [active, setActive] = useState(0);

  // CMS-authored testimonials (admin-curated) take priority over client-submitted ones
  const pool = (cmsTestimonials && cmsTestimonials.length >= 2)
    ? cmsTestimonials
    : (propTestimonials || []).filter(t => t.approved !== false);
  const items = pool.length >= 2 ? pool : DEFAULT_TESTIMONIALS;

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setActive(a => (a + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  const item = items[active];

  return (
    <section style={{ padding: mob ? '80px 24px' : '140px 5vw', background: '#F8F8FD' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: mob ? 40 : 64 }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>CLIENT STORIES</span>
          <h2 style={{ fontSize: mob ? 36 : 56, fontWeight: 800, letterSpacing: '-0.04em', margin: '16px 0 0', color: DARK_TEXT }}>
            Trusted by{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>decision-makers.</em>
          </h2>
        </div>

        <div style={{ background: '#fff', borderRadius: 28, padding: mob ? '40px 28px' : '64px 80px', boxShadow: '0 24px 60px rgba(0,0,0,0.06)', position: 'relative', minHeight: 240 }}>
          <div style={{ color: ac, marginBottom: 24, opacity: 0.4 }}>
            <Quote size={40} />
          </div>

          <p style={{ fontSize: mob ? 18 : 24, fontWeight: 500, color: DARK_TEXT, lineHeight: 1.65, margin: '0 0 40px', fontStyle: 'italic' }}>
            "{item.text}"
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: DARK_TEXT }}>{item.author || item.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(13,11,46,0.45)', marginTop: 4 }}>{item.projectTitle || item.role}</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: item.rating || 5 }).map((_, i) => (
                <Star key={i} size={16} fill={ac} color={ac} />
              ))}
            </div>
          </div>
        </div>

        {items.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{ width: i === active ? 28 : 8, height: 8, borderRadius: 4, background: i === active ? ac : '#E8E6F5', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// --- FULL PAGES ---





export default function PublicSite({ brand, setPage, page, onPortal, user, content, navigate, submitContact, testimonials = [] }) {
  const [searchParams] = useSearchParams();
  const urlPage = searchParams.get('page');
  const p = urlPage || page || 'home';
  const [menuOpen, setMenuOpen] = useState(false);
  const winW = useWindowWidth();
  const mob = isMob(winW);

  useEffect(() => {
    if (urlPage) {
      if (['products', 'showcase', 'portfolio'].includes(urlPage)) {
        navigate('/' + urlPage);
      } else if (setPage) {
        setPage(urlPage);
      }
    }
  }, [urlPage, navigate, setPage]);

  useEffect(() => { window.scrollTo(0, 0); }, [p]);

  const render = () => {
    const cta = content?.hero?.cta || {};
    const ctaHeading = cta.heading || "Ready to build something remarkable?";
    const ctaSub     = cta.sub     || "From concept to installation — our team handles every detail.";
    const ctaBtn1    = cta.btn1    || "Request a Quote";
    const ctaBtn2    = cta.btn2    || "View Portfolio";

    if (p === 'home') return (
      <>
        <Hero slides={content?.hero?.slides || HERO_SLIDES} brand={brand} navigate={navigate} />
        {mob
          ? <StatsBarMobile brand={brand} stats={content?.stats} />
          : <StatsBar brand={brand} stats={content?.stats} />}
        <ServicesPreview brand={brand} navigate={navigate} services={content?.homeServices || content?.services} />
        <WhyWestline brand={brand} navigate={navigate} reasons={content?.whyUs} />
        <TestimonialsSection brand={brand} testimonials={testimonials} cmsTestimonials={content?.testimonials} />
        <section style={{ padding: mob ? '80px 24px' : '120px 5vw', background: '#0D0B2E', color: '#fff', textAlign: 'center' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <span style={{ color: brand.color || AC, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>GET STARTED</span>
            <h2 style={{ fontSize: mob ? 36 : 60, fontWeight: 800, marginBottom: 16, marginTop: 16, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              {ctaHeading.split('something remarkable?')[0]}
              {ctaHeading.includes('something remarkable?')
                ? <><em style={{ fontStyle: 'italic', fontWeight: 400, color: brand.color || AC }}>something remarkable?</em></>
                : null}
              {!ctaHeading.includes('something remarkable?') && ctaHeading}
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 40, lineHeight: 1.7 }}>{ctaSub}</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/?page=contact')} style={{ padding: '18px 48px', background: brand.color || AC, color: '#0D0B2E', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {ctaBtn1} <ChevronRight size={16} />
              </button>
              <button onClick={() => navigate('/portfolio')} style={{ padding: '18px 48px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                {ctaBtn2}
              </button>
            </div>
          </div>
        </section>
      </>
    );
    if (p === 'services') return (
      <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}>Loading...</div>}>
        <ServicesPage brand={brand} navigate={navigate} />
      </Suspense>
    );
    if (p === 'about') return (
      <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}>Loading About Page...</div>}>
        <AboutPage brand={brand} content={content} navigate={navigate} />
      </Suspense>
    );
    if (p === 'contact') return (
      <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}>Loading Contact Page...</div>}>
        <ContactPage brand={brand} submitContact={submitContact} />
      </Suspense>
    );

    return <div style={{ paddingTop: 200, textAlign: 'center' }}>{p.toUpperCase()} Page Under Construction</div>;


  };

  return (
    <div style={{ background: LIGHT_BG }}>
      <PubNav brand={brand} setPage={setPage} activePage={p} onPortal={onPortal} user={user} menuOpen={menuOpen} setMenuOpen={setMenuOpen} navigate={navigate} />
      {render()}
      
      {/* FLOATING WHATSAPP SUPPORT */}
      <a 
        href={`https://wa.me/${brand.whatsapp || '233598455012'}?text=${encodeURIComponent("Hi, I'm interested in a glass installation quote from Westline Future.")}`}
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          position: 'fixed', bottom: mob ? 24 : 40, right: mob ? 24 : 40, 
          width: mob ? 56 : 64, height: mob ? 56 : 64, 
          background: '#25D366', color: '#fff', borderRadius: '50%', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          boxShadow: '0 20px 40px rgba(37, 211, 102, 0.3)', zIndex: 9999,
          transition: 'transform 0.3s', cursor: 'pointer'
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg viewBox="0 0 24 24" width={mob ? 28 : 32} height={mob ? 28 : 32} fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

      <Footer brand={brand} setPage={setPage} onPortal={onPortal} navigate={navigate} />

    </div>
  );
}
