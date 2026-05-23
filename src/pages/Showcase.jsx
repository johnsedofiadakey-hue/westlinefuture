import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PubNav } from '../components/PubLayout';
import { AppContext } from '../context/AppContext';
import { useWindowWidth, isMob } from './sharedHelpers';

export default function Showcase({ brand, user, onPortal, setPage, navigate: propNavigate, showcase }) {
  const navigate = propNavigate || useNavigate();
  const context = useContext(AppContext) || {};
  const actualBrand = brand || context.brand || {};
  const actualUser = user || context.user;

  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const winW = useWindowWidth();
  const mob = isMob(winW);

  // Set active page to 'showcase' on mount
  useEffect(() => {
    if (setPage) {
      setPage('showcase');
    }
  }, [setPage]);

  return (
    <div style={{ 
      background: `var(--accent-secondary)`, 
      minHeight: '100vh', 
      fontFamily: 'Satoshi, Inter, sans-serif', 
      position: 'relative', 
      overflow: 'hidden' 
    }}>
      {/* BRAND NAVIGATION HEADER */}
      <PubNav 
        brand={actualBrand} 
        setPage={setPage} 
        activePage="showcase" 
        onPortal={onPortal} 
        user={actualUser} 
        menuOpen={menuOpen} 
        setMenuOpen={setMenuOpen} 
        navigate={navigate} 
      />

      {/* IMMERSIVE 3D WALKTHROUGH CANVAS CONTAINER */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        paddingTop: mob ? '64px' : '80px',
        background: `var(--accent-secondary)`,
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {(() => {
           const url = showcase?.videoUrl || "https://yun.kujiale.com/design/3FO3I392SC87/show";
           const isYtId = /^[A-Za-z0-9_-]{11}$/.test(url.trim());
           const embedSrc = isYtId ? `https://www.youtube.com/embed/${url.trim()}?autoplay=1&mute=1&loop=1&playlist=${url.trim()}` : url;
           return (
             <iframe
               src={embedSrc}
               style={{
                 width: '100%',
                 height: '100%',
                 border: 'none',
                 display: 'block',
                 background: `var(--accent-secondary)`
               }}
               title="Westline Future Immersive 3D Walkthrough"
               onLoad={() => setLoading(false)}
               allowFullScreen
             />
           );
        })()}

        {/* LUXURY CHAMPAGNE GOLD LOADING HUD */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="loader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: mob ? '64px' : '80px',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99,
                background: `var(--accent-secondary)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                boxSizing: 'border-box'
              }}
            >
              {/* Rotating Gold Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '3px solid rgba(200,143,67,0.15)',
                  borderTopColor: `var(--accent-primary)`,
                }}
              />
              
              {/* Pulsing Loading Message */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  style={{
                    color: `var(--accent-primary)`,
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    fontFamily: 'Satoshi, Inter, sans-serif'
                  }}
                >
                  Sourcing Immersive Architecture
                </motion.div>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  fontSize: '10px', 
                  letterSpacing: '0.1em', 
                  fontFamily: 'Inter, sans-serif', 
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}>
                  Westline Future Luxe Showcase
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FLOATING ACTION OVERLAYS */}
        {!loading && (
          <div style={{
            position: 'absolute',
            bottom: mob ? '20px' : '30px',
            left: mob ? '20px' : '30px',
            zIndex: 10,
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <button
              onClick={() => navigate('/?page=contact')}
              style={{
                background: 'rgba(24, 14, 6, 0.9)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1.5px solid var(--accent-primary)',
                borderRadius: '30px',
                padding: mob ? '10px 20px' : '14px 28px',
                color: `var(--accent-primary)`,
                fontSize: mob ? '11px' : '12px',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `var(--accent-primary)`;
                e.currentTarget.style.color = `var(--accent-secondary)`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(24, 14, 6, 0.9)';
                e.currentTarget.style.color = `var(--accent-primary)`;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Book Site Measurement <ArrowRight size={mob ? 12 : 14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
