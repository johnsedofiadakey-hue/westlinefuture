import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Maximize2, ChevronLeft, ChevronRight, X, Info, 
  ArrowRight, Search, Layout, Droplet, Zap, Eye,
  Home, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { DEFAULT_SCENES as CATALOG_DEFAULTS } from '../catalog.jsx';

const LIGHT_BG = '#F8F8FD';
const DARK_TEXT = '#0D0B2E';
const AC = '#231F78';


const Hotspot = ({ h, ac, mob }) => {
  const [open, setOpen] = useState(false);
  return (
    <div 
      style={{ position: 'absolute', left: `${h.x}%`, top: `${h.y}%`, zIndex: 100 }}
      onMouseEnter={() => !mob && setOpen(true)}
      onMouseLeave={() => !mob && setOpen(false)}
      onClick={() => mob && setOpen(!open)}
    >
      <motion.div 
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ width: mob ? 28 : 24, height: mob ? 28 : 24, background: '#fff', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,0,0,0.4)' }}
      >
        <div style={{ width: mob ? 10 : 8, height: mob ? 10 : 8, background: ac, borderRadius: '50%' }} />
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            style={{ 
              position: 'absolute', bottom: mob ? 'auto' : 40, top: mob ? 40 : 'auto', left: '50%', transform: 'translateX(-50%)',
              width: mob ? 180 : 240, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
              padding: mob ? 12 : 20, borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              pointerEvents: 'none', border: '1px solid rgba(0,0,0,0.1)', zIndex: 1000
            }}
          >
            <h4 style={{ margin: '0 0 8px', fontSize: mob ? 11 : 13, fontWeight: 800, color: DARK_TEXT }}>{h.title}</h4>
            <p style={{ margin: '0 0 12px', fontSize: mob ? 9 : 11, color: 'rgba(0,0,0,0.6)', lineHeight: 1.4 }}>{h.desc}</p>
            {h.specs && (
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(h.specs).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 7, fontWeight: 800, color: ac, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: DARK_TEXT }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function LuxeShowcase({ brand }) {
  const [scenes, setScenes] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [winW, setWinW] = useState(window.innerWidth);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const def = CATALOG_DEFAULTS;
      
      if (!db) {
        setScenes(def);
        setLoading(false);
        return;
      }
      const q = query(collection(db, 'showcase')); 
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // AUTO-REPAIR HOOK: If document exists but is missing createdAt, we inject it for sorting
        data.forEach(d => {
          if (!d.createdAt && db) {
            updateDoc(doc(db, 'showcase', d.id), { createdAt: new Date().toISOString() });
          }
        });

        // 🚀 UNIFIED MERGE LOGIC: Default scenes are always available, Firestore overrides/supplements
        const merged = [...def];
        data.forEach(d => {
           const idx = merged.findIndex(m => m.id === d.id);
           if (idx > -1) merged[idx] = d;
           else merged.push(d);
        });

        setScenes(merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
        setLoading(false);
      }, (err) => {
        console.warn("Showcase Sync Failure:", err);
        setScenes(def);
        setLoading(false);
      });
      return unsub;
    };
    loadData();
  }, []);

  const scene = scenes[active];
  const ac = brand?.color || AC;
  const mob = winW <= 900;

  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const next = () => setActive((active + 1) % scenes.length);
  const prev = () => setActive((active - 1 + scenes.length) % scenes.length);

  return (
    <div style={{ height: '100vh', width: '100vw', background: '#000', overflow: 'hidden', position: 'relative', fontFamily: 'var(--font-p)' }}>
      {loading ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0B2E' }}>
           <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <Zap size={48} color={ac} />
           </motion.div>
        </div>
      ) : (
        <>
      {/* Cinematic Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
        >
          {/* Panoramic Pan-Scan for Mobile / Immersive Scale for Desktop */}
          <motion.div
            initial={mob ? { x: '-20%' } : { scale: 1.1 }}
            animate={mob ? { x: '0%' } : { scale: 1 }}
            transition={mob ? { 
              duration: 15, 
              repeat: Infinity, 
              repeatType: 'reverse', 
              ease: 'linear' 
            } : { duration: 1.5 }}
            style={{ 
              width: mob ? '150%' : '100%', 
              height: '100%', 
              position: 'absolute',
              left: 0,
              top: 0,
              overflow: 'hidden'
            }}
          >
            <img 
              src={scene.img} 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                opacity: mob ? 0.7 : 0.8,
              }} 
              alt={scene.title} 
            />

            {/* Hotspots Synced with Image */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              {(scene.hotspots || []).map((h, i) => (
                <Hotspot key={i} h={h} ac={ac} mob={mob} />
              ))}
            </div>
          </motion.div>

          {/* Dynamic Glass Reflection Overlay */}
          <motion.div 
            animate={{ 
              opacity: [0.1, 0.3, 0.1],
              x: ['-100%', '100%']
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
              pointerEvents: 'none',
              zIndex: 2
            }}
          />

          {/* Cinematic Gradient Vignette */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent, rgba(0,0,0,0.9))', zIndex: 3 }} />
        </motion.div>
      </AnimatePresence>

      {/* Floating Interface */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', padding: mob ? '20px' : '40px 5vw', zIndex: 100 }}>
        
        {/* Top Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto' }}>
           <button 
             onClick={() => navigate('/')} 
             style={{ 
               display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', 
               backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', 
               color: '#fff', padding: '10px 20px', borderRadius: 100, cursor: 'pointer',
               fontSize: mob ? 10 : 12, fontWeight: 700 
             }}
           >
              <ArrowLeft size={mob ? 16 : 20} /> Exit Immersive View
           </button>
           
           {!mob && (
             <div style={{ display: 'flex', gap: 8 }}>
               {scenes.map((s, i) => (
                 <motion.img 
                   key={s.id} 
                   src={s.img} 
                   onClick={() => setActive(i)}
                   whileHover={{ scale: 1.1 }}
                   style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: active === i ? `2px solid ${ac}` : '2px solid transparent', opacity: active === i ? 1 : 0.6 }}
                 />
               ))}
             </div>
           )}
        </div>

        {/* Center: Controls & Swipe Area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
           <button onClick={prev} style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: mob ? 12 : 20, borderRadius: '50%', cursor: 'pointer', backdropFilter: 'blur(10px)' }}><ChevronLeft size={mob ? 24 : 32} /></button>
           <div 
             style={{ flex: 1, height: '60vh', pointerEvents: 'none' }} 
             draggable="false"
             onMouseDown={(e) => {
               const startX = e.pageX;
               const onMouseUp = (upEvent) => {
                 const diff = upEvent.pageX - startX;
                 if (Math.abs(diff) > 50) {
                   if (diff > 0) prev();
                   else next();
                 }
                 window.removeEventListener('mouseup', onMouseUp);
               };
               window.addEventListener('mouseup', onMouseUp);
             }}
             onTouchStart={(e) => {
               const startX = e.touches[0].pageX;
               const onTouchEnd = (endEvent) => {
                 const diff = endEvent.changedTouches[0].pageX - startX;
                 if (Math.abs(diff) > 50) {
                   if (diff > 0) prev();
                   else next();
                 }
                 window.removeEventListener('touchend', onTouchEnd);
               };
               window.addEventListener('touchend', onTouchEnd);
             }}
           />
           <button onClick={next} style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: mob ? 12 : 20, borderRadius: '50%', cursor: 'pointer', backdropFilter: 'blur(10px)' }}><ChevronRight size={mob ? 24 : 32} /></button>
        </div>

        {/* Bottom Info Overlay */}
        <div style={{ pointerEvents: 'auto', maxWidth: mob ? '100%' : 600, marginTop: 'auto' }}>
          <motion.div
            key={scene.id + 'text'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span style={{ color: ac, fontSize: mob ? 8 : 10, fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 12, display: 'block' }}>{scene.location}</span>
            <h1 style={{ fontSize: mob ? 28 : 56, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.1 }}>{scene.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: mob ? 13 : 16, lineHeight: 1.6, marginBottom: mob ? 24 : 40 }}>{scene.description}</p>
            
            <div style={{ display: 'flex', gap: 12 }}>
               <button onClick={() => navigate('/#contact')} style={{ flex: mob ? 1 : 'none', padding: mob ? '14px 20px' : '20px 40px', background: ac, color: '#fff', border: 'none', borderRadius: 16, fontWeight: 800, fontSize: mob ? 11 : 14, cursor: 'pointer', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>Inquire Project</button>
               {!mob && (
                 <button onClick={() => navigate('/portfolio')} style={{ padding: '20px 40px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: 16, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>View Case Studies</button>
               )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div style={{ position: 'absolute', bottom: mob ? 20 : 40, right: mob ? '50%' : '5vw', transform: mob ? 'translateX(50%)' : 'none', display: 'flex', gap: 8 }}>
         {scenes.map((_, i) => (
           <div key={i} style={{ width: i === active ? (mob ? 24 : 40) : 8, height: 6, background: i === active ? ac : 'rgba(255,255,255,0.2)', borderRadius: 4, transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
         ))}
      </div>

      {/* Progress Bar */}
      <motion.div 
        key={active}
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ duration: 12, ease: 'linear' }}
        style={{ position: 'absolute', bottom: 0, left: 0, height: 3, background: ac }}
      />
        </>
      )}
    </div>
  );
}