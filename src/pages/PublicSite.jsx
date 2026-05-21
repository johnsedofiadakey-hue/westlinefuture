import React, { useState, useEffect, lazy, Suspense, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { 
  ChevronRight, ChevronLeft, Award, Check, Play, X, ArrowLeft, Star, 
  SplitSquareHorizontal, Layout, Home, Layers, Droplet, Zap, Settings, 
  Hammer, Palette, Package, Mail, Truck, CreditCard, Building, 
  CheckCircle, Send, Sparkles, MapPin, Calendar, Menu, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { HERO_SLIDES, ABOUT_DATA } from '../data';

const ContactPage = lazy(() => import('./ContactPage'));
const AboutPage = lazy(() => import('./AboutPage'));

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
      background: isScrolled ? 'rgba(35,31,120,0.97)' : 'rgba(35,31,120,0.15)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: isScrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      height: mob ? (scrolled ? 64 : 80) : (scrolled ? 80 : 120), 
      display: 'flex', alignItems: 'center', padding: '0 5vw'
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
                  width: 'auto',
                  maxWidth: mob ? 160 : 240,
                  objectFit: 'contain',
                  display: 'block',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
                <div style={{ fontSize: mob ? 18 : 24, fontWeight: 900, color: '#ffffff', letterSpacing: '0.05em' }}>WESTLINE</div>
                <div style={{ fontSize: mob ? 8 : 10, fontWeight: 400, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.45em' }}>FUTURE</div>
              </div>
            )}
        </div>


        {/* DESKTOP NAV */}
        {!mob && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
            <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
              {links.map(l => (
                <button key={l.id} onClick={() => {
                  if (l.id === 'products') navigate('/products');
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
                  style={{ background: 'none', border: 'none', color: isScrolled ? DARK_TEXT : '#fff', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}
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
                        <div key={n.id} style={{ fontSize: 12, color: n.read ? '#9B99C8' : '#0D0B2E', borderBottom: '1px solid #F4F4FA', paddingBottom: 8 }}>
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
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
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
            style={{ background: 'none', border: 'none', color: ac, zIndex: 1001, padding: 8, position: 'relative', marginRight: 8 }}
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
          style={{ background: 'none', border: 'none', color: ac, zIndex: 1001, padding: 8 }}
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
                if (l.id === 'products') navigate('/products');
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
                  <div key={n.id} style={{ fontSize: 13, color: n.read ? '#9B99C8' : DARK_TEXT, borderBottom: '1px solid #F4F4FA', paddingBottom: 8 }}>
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
                <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em' }}>WESTLINE FUTURE</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', marginTop: 2 }}>GLOBAL TRADING CO., LTD</div>
              </div>
            )}
            <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, fontSize: 14 }}>Global precision meets local delivery. Premium structural glass, aluminum works, and interior finishing solutions for ambitious architectural projects worldwide.</p>
          </div>
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>Navigation</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Home', 'Products', 'Showroom', 'Portfolio', 'About', 'Contact'].map(n => (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
              <span>Glass Engineering</span>
              <span>Interior Fit-out</span>
              <span>China Procurement</span>
              <span>Technical Systems</span>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>Contact</h4>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.8 }}>
              {brand.location}<br />
              {brand.phone}<br />
              {brand.email}
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
        <div key={i} style={{
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

export function ServicesPreview({ brand, navigate }) {
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand.color || AC;

  const services = [
    { title: 'Glass Engineering', desc: 'Custom structural glazing, balustrades, and washroom systems.', icon: <Droplet /> },
    { title: 'Interior Fit-out', desc: 'Luxury finishing, kitchen systems, and custom cabinetry.', icon: <Layout /> },
    { title: 'China Sourcing', desc: 'Direct procurement and logistics for premium materials.', icon: <Package /> }
  ];

  return (
    <section style={{ padding: mob ? '80px 24px' : '140px 5vw', background: '#F8F8FD' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 80, textAlign: mob ? 'center' : 'left' }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>CAPABILITIES</span>
          <h2 style={{ fontSize: mob ? 40 : 72, fontWeight: 800, letterSpacing: '-0.04em', margin: '16px 0 0', color: DARK_TEXT }}>Structural <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>Precision</em>.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(3, 1fr)', gap: mob ? 16 : 32 }}>
          {services.map((s, i) => (
            <div key={i} style={{ padding: mob ? '32px 24px' : '48px', background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>

              <div style={{ color: ac, marginBottom: 32 }}>{s.icon}</div>
              <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, color: DARK_TEXT }}>{s.title}</h3>
              <p style={{ color: 'rgba(13,11,46,0.6)', lineHeight: 1.8, marginBottom: 32 }}>{s.desc}</p>
              <button onClick={() => navigate('/portfolio')} style={{ background: 'none', border: 'none', color: ac, fontWeight: 800, fontSize: 11, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                View Portfolio <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- FULL PAGES ---





export default function PublicSite({ brand, setPage, page, onPortal, user, content, navigate, submitContact }) {
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
    if (p === 'home') return (
      <>
        <Hero slides={content?.hero?.slides || HERO_SLIDES} brand={brand} navigate={navigate} />
        <ServicesPreview brand={brand} navigate={navigate} />
        <section style={{ padding: '100px 5vw', background: '#F4F4FA', color: DARK_TEXT, textAlign: 'center' }}>
           <h2 style={{ fontSize: mob ? 32 : 64, fontWeight: 800, marginBottom: 40 }}>Ready to transform your space?</h2>
           <button onClick={() => navigate('/portfolio')} style={{ padding: '24px 64px', background: brand.color || AC, color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>Explore Portfolio</button>
        </section>
      </>
    );
    if (p === 'about') return (
      <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}>Loading About Page...</div>}>
        <AboutPage brand={brand} content={content} />
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
        href={`https://wa.me/${brand.whatsapp || '233598455012'}`} 
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
