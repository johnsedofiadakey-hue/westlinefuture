import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PubNav, usePublicTranslation } from '../components/PubLayout';
import { AppContext } from '../context/AppContext';
import { useWindowWidth, isMob } from './sharedHelpers';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Showcase({ brand, user, onPortal, setPage, navigate: propNavigate, showcase }) {
  usePublicTranslation();
  const navigate = propNavigate || useNavigate();
  const context = useContext(AppContext) || {};
  const actualBrand = brand || context.brand || {};
  const actualUser = user || context.user;

  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scenes, setScenes] = useState([]);
  const [activeScene, setActiveScene] = useState(null);

  const winW = useWindowWidth();
  const mob = isMob(winW);

  useEffect(() => {
    if (setPage) setPage('showcase');
  }, [setPage]);

  // Load scenes with videoUrl from Firestore
  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, 'showcase'),
      where('clientVisible', '==', true)
    );
    return onSnapshot(q, snap => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.videoUrl)
        .sort((a, b) => {
          // Sort by explicit sortOrder first (1 = first), then by createdAt ascending
          const oa = a.sortOrder ?? 99;
          const ob = b.sortOrder ?? 99;
          if (oa !== ob) return oa - ob;
          const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
          const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
          return ta - tb;
        });
      setScenes(all);
      if (all.length > 0 && !activeScene) {
        setActiveScene(all[0]);
      }
    }, () => {});
  }, []);

  // Determine the embed URL to show
  const currentUrl = activeScene?.videoUrl || showcase?.videoUrl || 'https://yun.kujiale.com/design/3FO3I392SC87/show';
  const isYtId = /^[A-Za-z0-9_-]{11}$/.test(currentUrl.trim());
  const embedSrc = isYtId
    ? `https://www.youtube.com/embed/${currentUrl.trim()}?autoplay=1&mute=1&loop=1&playlist=${currentUrl.trim()}`
    : currentUrl;

  const hasMultipleScenes = scenes.length > 1;

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

      {/* SCENE SELECTOR DOCK — bottom bar, always visible when multiple scenes exist */}
      {hasMultipleScenes && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          background: 'linear-gradient(to top, rgba(15,10,5,0.96) 0%, rgba(15,10,5,0.80) 70%, transparent 100%)',
          padding: mob ? '28px 16px 20px' : '40px 32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* Label */}
          <div style={{
            fontSize: 10, fontWeight: 900, color: 'rgba(200,169,110,0.6)',
            textTransform: 'uppercase', letterSpacing: '.18em', marginBottom: 2,
            textAlign: 'center',
          }}>
            Select a Tour
          </div>

          {/* Cards row */}
          <div style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            justifyContent: scenes.length <= 3 ? 'center' : 'flex-start',
            paddingBottom: 2,
          }}>
            {scenes.map((s, idx) => {
              const isActive = activeScene?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveScene(s); setLoading(true); }}
                  style={{
                    flexShrink: 0,
                    width: mob ? 140 : 200,
                    background: isActive
                      ? 'rgba(200,169,110,0.15)'
                      : 'rgba(255,255,255,0.04)',
                    border: isActive
                      ? '1.5px solid var(--accent-primary)'
                      : '1.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    padding: mob ? '10px 12px' : '12px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .2s',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Thumbnail if available */}
                  {s.img ? (
                    <div style={{ width: '100%', height: 64, borderRadius: 8, overflow: 'hidden', marginBottom: 10, position: 'relative' }}>
                      <img src={s.img} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {isActive && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(200,169,110,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={16} color="var(--accent-primary)" fill="var(--accent-primary)" />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* No thumbnail — show numbered icon */
                    <div style={{ width: '100%', height: 40, borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: isActive ? 'var(--accent-primary)' : 'rgba(200,169,110,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isActive
                          ? <Play size={14} color="#1A1410" fill="#1A1410" />
                          : <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(200,169,110,0.7)' }}>{idx + 1}</span>
                        }
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(200,169,110,0.5)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        {s.category || '3D Tour'}
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <div style={{
                    fontSize: mob ? 11 : 12,
                    fontWeight: 900,
                    color: isActive ? 'var(--accent-primary)' : 'rgba(253,252,251,0.85)',
                    lineHeight: 1.3,
                    marginBottom: s.description ? 4 : 0,
                  }}>
                    {s.title}
                  </div>

                  {/* Description (desktop only) */}
                  {!mob && s.description && (
                    <div style={{
                      fontSize: 10, color: 'rgba(253,252,251,0.4)', lineHeight: 1.5,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {s.description}
                    </div>
                  )}

                  {/* Active indicator dot */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--accent-primary)',
                      boxShadow: '0 0 6px var(--accent-primary)',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
        <iframe
          key={embedSrc}
          src={embedSrc}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            background: `var(--accent-secondary)`
          }}
          title={activeScene?.title || 'Westline Future Immersive 3D Walkthrough'}
          onLoad={() => setLoading(false)}
          allowFullScreen
        />

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
                  {activeScene?.title ? `Loading ${activeScene.title}…` : 'Sourcing Immersive Architecture'}
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
            bottom: hasMultipleScenes ? (mob ? '120px' : '140px') : (mob ? '20px' : '30px'),
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
