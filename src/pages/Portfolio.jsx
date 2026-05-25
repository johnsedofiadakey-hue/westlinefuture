import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, 
  Maximize2, X, Info, Calendar, MapPin, Layers, 
  SplitSquareHorizontal, CheckCircle, ArrowUpRight
} from 'lucide-react';
import { PubNav, Footer } from '../components/PubLayout';
import { PORTFOLIO_DATA } from '../data.jsx';

const LIGHT_BG = `var(--bg-primary)`;
const DARK_TEXT = `var(--accent-secondary)`;
const AC = `var(--accent-secondary)`;

// --- COMPONENTS ---

// --- HELPERS ---
function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}
const isMob = (w) => w <= 1024;

const MasonryCard = ({ project, onClick, ac, mob }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={mob ? {} : { y: -8 }}
    onClick={onClick}
    style={{ 
      width: '100%', cursor: 'pointer',
      position: 'relative', borderRadius: 24, overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.03)',
      border: '1px solid rgba(0,0,0,0.05)',
      background: '#fff'
    }}
  >
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <motion.img 
        src={project.after} 
        alt={project.title} 
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.8 }}
        style={{ width: '100%', display: 'block', height: mob ? 300 : 400, objectFit: 'cover' }} 
      />
      {project.before && (
        <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: 100, fontSize: 9, fontWeight: 900, color: ac, display: 'flex', alignItems: 'center', gap: 6 }}>
          <SplitSquareHorizontal size={12} /> B/A VIEW
        </div>
      )}
    </div>
    <div style={{ padding: 24 }}>
      <div style={{ color: ac, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>{project.cat}</div>
      <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: DARK_TEXT }}>{project.title}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(0,0,0,0.4)', fontSize: 11 }}>
        <MapPin size={12} /> {project.loc}
      </div>
    </div>
  </motion.div>
);

const ProjectDetail = ({ project, onClose, ac, navigate, mob }) => {
  const [activeImg, setActiveImg] = useState(project.after);
  const [compare, setCompare] = useState(false);
  const [p, setP] = useState(50);

  if (!project) return null;

  return (
    <motion.div 
      initial={mob ? { y: '100%' } : { opacity: 0 }}
      animate={mob ? { y: 0 } : { opacity: 1 }}
      exit={mob ? { y: '100%' } : { opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#fff', overflowY: 'auto', padding: mob ? 0 : '0 0 100px' }}
    >
      {/* Header */}
      <nav style={{ padding: mob ? '16px 20px' : '20px 5vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', zIndex: 100, borderBottom: '1px solid #f5f5f5' }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: DARK_TEXT, fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>
          <ArrowLeft size={18} /> BACK TO MASTERPIECES
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
           <button onClick={() => navigate('/?page=contact&subject=Case Study Consultation')} style={{ padding: '8px 20px', background: ac, color: '#fff', border: 'none', borderRadius: 100, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>PLAN SIMILAR PROJECT</button>
           <button onClick={onClose} style={{ padding: 8, background: '#F5F5F5', borderRadius: '50%', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
      </nav>

      {/* Hero Content */}
      <div style={{ padding: mob ? '0' : '40px 5vw', display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(12, 1fr)', gap: mob ? 32 : 64 }}>
        
        {/* Left: Media & Interaction */}
        <div style={{ gridColumn: mob ? 'auto' : 'span 8' }}>
           <div style={{ position: 'relative', height: mob ? 400 : 650, width: '100%', overflow: 'hidden', borderRadius: mob ? 0 : 32, background: `var(--bg-secondary)`, boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }}>
              {project.before && compare ? (
                <div style={{ position: 'absolute', inset: 0 }}>
                   <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${project.after})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                   <div style={{ position: 'absolute', inset: 0, width: `${p}%`, overflow: 'hidden', borderRight: '3px solid #fff', backgroundImage: `url(${project.before})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                   
                   {/* Labels */}
                   <div style={{ position: 'absolute', bottom: 24, left: 24, padding: '8px 16px', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 100, fontSize: 10, fontWeight: 900, backdropFilter: 'blur(10px)', zIndex: 4 }}>BEFORE</div>
                   <div style={{ position: 'absolute', bottom: 24, right: 24, padding: '8px 16px', background: ac, color: '#fff', borderRadius: 100, fontSize: 10, fontWeight: 900, backdropFilter: 'blur(10px)', zIndex: 4 }}>AFTER</div>

                   <input type="range" min="0" max="100" value={p} onChange={e => setP(e.target.value)}
                     style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '100%', opacity: 0, cursor: 'ew-resize', zIndex: 10, margin: 0 }} />
                   
                   {/* The Handle */}
                   <div style={{ position: 'absolute', top: '50%', left: `${p}%`, transform: 'translate(calc(-50% - 1px), -50%)', width: 48, height: 48, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', pointerEvents: 'none', zIndex: 5 }}>
                     <SplitSquareHorizontal size={24} color={ac} />
                   </div>
                </div>
              ) : (
                <motion.img 
                 key={activeImg}
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                 src={activeImg} 
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              )}
           </div>

           <div style={{ marginTop: 24, padding: mob ? '0 20px' : '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                 <div style={{ display: 'flex', gap: 12 }}>
                    {(project.imgs || [project.after]).map(img => (
                      <img key={img} onClick={() => { setActiveImg(img); setCompare(false); }} src={img} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', cursor: 'pointer', border: activeImg === img && !compare ? `2px solid ${ac}` : '2px solid #f5f5f5', transition: 'all 0.2s' }} />
                    ))}
                 </div>
                 {project.before && (
                    <button 
                      onClick={() => setCompare(!compare)}
                      style={{ padding: '14px 28px', background: compare ? DARK_TEXT : ac, color: '#fff', borderRadius: 16, border: 'none', fontWeight: 900, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                    >
                       <SplitSquareHorizontal size={18} /> {compare ? 'CLOSE TRANSFORMATION' : 'EXPERIENCE TRANSFORMATION'}
                    </button>
                 )}
              </div>
           </div>
        </div>

        {/* Right: Project Brief */}
        <div style={{ gridColumn: mob ? 'auto' : 'span 4', padding: mob ? '0 20px 100px' : '0' }}>
           <div style={{ position: 'sticky', top: 120 }}>
              <span style={{ color: ac, fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Case Study: {project.cat}</span>
              <h2 style={{ fontSize: mob ? 32 : 48, fontWeight: 800, margin: '12px 0 24px', letterSpacing: '-0.03em', color: DARK_TEXT, lineHeight: 1.1 }}>{project.title}</h2>
              <p style={{ fontSize: 16, color: 'rgba(92, 58, 33,0.6)', lineHeight: 1.6, marginBottom: 40 }}>{project.desc || 'A premium structural execution showcasing Westline Future’s precision in high-fidelity interior finishing and industrial-grade glass engineering.'}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 40, padding: '32px 0', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
                 <div>
                    <div style={{ color: 'rgba(0,0,0,0.3)', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>Primary Location</div>
                    <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} color={ac} /> {project.loc}</div>
                 </div>
                 <div>
                    <div style={{ color: 'rgba(0,0,0,0.3)', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>Project Timeline</div>
                    <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} color={ac} /> {project.year || '2024 Delivery'}</div>
                 </div>
              </div>

              <div style={{ padding: 32, background: `var(--bg-secondary)`, borderRadius: 32, border: '1px solid rgba(0,0,0,0.05)' }}>
                 <h4 style={{ margin: '0 0 20px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: ac, letterSpacing: '0.1em' }}>Engineering Scope</h4>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { label: 'System', val: project.style || 'Modern Industrial' },
                      { label: 'Area Coverage', val: project.area || 'TBD' },
                      { label: 'Technical Grade', val: 'Industrial Luxury' }
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 12 }}>
                         <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>{s.label}</span>
                         <span style={{ fontSize: 12, fontWeight: 800 }}>{s.val}</span>
                      </div>
                    ))}
                 </div>
                 <button 
                   onClick={() => navigate(`/?page=contact&subject=Similar Project: ${project.title}`)}
                   style={{ width: '100%', marginTop: 32, padding: '20px', background: DARK_TEXT, color: '#fff', border: 'none', borderRadius: 16, fontWeight: 800, cursor: 'pointer', fontSize: 13, transition: 'transform 0.2s' }}
                   onMouseEnter={e => e.target.style.transform = 'scale(1.02)'}
                   onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                 >
                    PLAN SIMILAR PROJECT
                 </button>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function Portfolio({ brand, user, onPortal, setPage, content }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const winW = useWindowWidth();
  const mob = isMob(winW);

  const ac = brand?.color || AC;

  const projects = useMemo(() => content?.portfolio || PORTFOLIO_DATA || [], [content?.portfolio]);

  const categories = useMemo(() => {
    return ['All', ...new Set(projects.map(p => p.cat))];
  }, [projects]);

  const filtered = useMemo(() => {
    if (filter === 'All') return projects;
    return projects.filter(p => p.cat === filter);
  }, [filter, projects]);


  return (
    <div style={{ minHeight: '100vh', background: LIGHT_BG, color: DARK_TEXT, fontFamily: 'var(--font-p)' }}>
      
      <PubNav 
        brand={brand} 
        setPage={setPage} 
        activePage="portfolio" 
        onPortal={onPortal} 
        user={user} 
        menuOpen={menuOpen} 
        setMenuOpen={setMenuOpen} 
        navigate={navigate} 
      />

      <main style={{ padding: mob ? '100px 20px 100px' : '160px 5vw 100px', maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Intro */}
        <div style={{ marginBottom: mob ? 40 : 80 }}>
           <h1 style={{ fontSize: mob ? 40 : 96, fontWeight: 800, letterSpacing: '-0.05em', margin: '0 0 24px', lineHeight: 1 }}>Selected <br/><span style={{ color: ac }}>Case Studies.</span></h1>
           <p style={{ fontSize: mob ? 16 : 20, color: 'rgba(92, 58, 33,0.5)', maxWidth: 660 }}>Review completed work, then start a structured brief so Westline can price the design, sourcing, logistics, and installation path properly.</p>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 40, flexWrap: 'wrap' }}>

           {categories.map(c => (
             <button 
              key={c} 
              onClick={() => setFilter(c)}
              style={{ 
                padding: '12px 24px', borderRadius: 100, border: 'none', fontSize: 11, fontWeight: 800,
                background: filter === c ? DARK_TEXT : 'rgba(0,0,0,0.04)',
                color: filter === c ? '#fff' : 'rgba(0,0,0,0.4)',
                cursor: 'pointer', transition: 'all 0.3s'
              }}
             >
                {c.toUpperCase()}
             </button>
           ))}
        </div>

        {/* Masonry Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : winW > 1024 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: mob ? 24 : 32 }}>
           {filtered.map(p => (
             <MasonryCard key={p.id} project={p} onClick={() => setSelected(p)} ac={ac} mob={mob} />
           ))}
        </div>

      </main>

      <Footer brand={brand} setPage={setPage} navigate={navigate} />


      <AnimatePresence>
        {selected && (
          <ProjectDetail 
            project={selected} 
            onClose={() => setSelected(null)} 
            ac={ac} 
            navigate={navigate} 
            mob={mob}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
