import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const AC = '#231F78';
const DARK = '#0D0B2E';

// ─── SHOWROOM DATA ────────────────────────────────────────────────────────────
const PROJECTS = [
  // GLASS PANEL FEATURE WALLS
  {
    id: 1, category: 'partition', label: 'Glass Feature Walls',
    title: 'Black Gloss Glass TV Feature Wall',
    location: 'East Legon, Accra',
    img: '/showroom/living-tv-gloss-black.jpg',
    aspect: 'landscape',
    service: 'Architectural Glass Panels & Feature Walls',
    specs: ['High-gloss black lacquered glass panels', 'Full-height floor-to-ceiling installation', 'Integrated open display shelving', 'Crystal chandelier-ready ceiling prep'],
    desc: 'Twin full-height black gloss glass towers flank a centre fluted wall panel, creating a dramatic media focal point in this luxury living room. The high-lacquer finish reflects ambient light and doubles the perceived depth of the space.',
  },
  {
    id: 2, category: 'partition', label: 'Glass Feature Walls',
    title: 'Glass-Front Display Cabinet',
    location: 'Airport Residential, Accra',
    img: '/showroom/living-glass-display-cabinet.jpg',
    aspect: 'landscape',
    service: 'Architectural Glass Panels & Feature Walls',
    specs: ['Slim black aluminium framing', 'Clear glass display shelving', 'Integrated LED strip lighting', 'Floor-to-ceiling height'],
    desc: 'Bespoke full-height glass display cabinet with black aluminium frame, fitted against a feature wall to showcase art and curated objects. Paired with sheer floor-to-ceiling curtains for a bright, gallery-like reception room.',
  },
  {
    id: 3, category: 'partition', label: 'Glass Partitions',
    title: 'Open-Plan Living to Dining Partition',
    location: 'East Airport, Accra',
    img: '/showroom/open-plan-living-dining.jpg',
    aspect: 'landscape',
    service: 'Frameless Glass Partitions',
    specs: ['Glass-framed dining room enclosure', 'Pendant-lit open ceiling void', 'Full-height glass panelling', 'Sight-line preserving design'],
    desc: 'Seamless open-plan living and dining space connected by a glass-panelled partition wall that frames the dining zone without blocking light. Large-format porcelain flooring runs uninterrupted through both spaces for visual continuity.',
  },
  {
    id: 4, category: 'partition', label: 'Glass Feature Walls',
    title: 'Charcoal Panel Headboard Feature Wall',
    location: 'Cantonments, Accra',
    img: '/showroom/bedroom-charcoal-led-wall.jpg',
    aspect: 'landscape',
    service: 'Architectural Glass Panels & Feature Walls',
    specs: ['Matte charcoal panel cladding', 'Recessed vertical LED strip lighting', 'Flush floating bedside niches', 'Concealed door integration'],
    desc: 'Full-width charcoal feature wall with four recessed vertical LED light channels that wash the room in warm ambient light. The floating bed platform and integrated side niches are built into the same panel system for a seamless monolithic look.',
  },

  // WARDROBES & JOINERY
  {
    id: 5, category: 'wardrobe', label: 'Bedroom Joinery',
    title: 'Luxury Master Bedroom Suite',
    location: 'Trasacco Valley, Accra',
    img: '/showroom/bedroom-luxury-suite.jpg',
    aspect: 'landscape',
    service: 'Bespoke Interior Joinery',
    specs: ['Tufted upholstered headboard wall panels', 'Dark fluted timber pilaster columns', 'Cove-lit ceiling cornice', 'Floor-to-ceiling sheer drapery'],
    desc: 'A hotel-grade master suite featuring bespoke cream tufted wall panels flanked by dark fluted timber pilasters — a signature a signature Westline Future architectural detail. The crystal chandelier, plush bench and sheer curtains create a refined retreat that balances warmth with grandeur.',
  },
  {
    id: 6, category: 'wardrobe', label: 'Bedroom Joinery',
    title: 'Master Suite — Second Angle',
    location: 'Trasacco Valley, Accra',
    img: '/showroom/bedroom-alt-angle.jpg',
    aspect: 'landscape',
    service: 'Bespoke Interior Joinery',
    specs: ['Dark ebony chest and bedside units', 'Gilded brass chandelier', 'Layered sheer + blackout drapery', 'Art-lit feature wall'],
    desc: 'The same luxury master suite from a wider perspective, showing the full scale of the joinery installation. Dark ebony chest of drawers and matching bedside units contrast with the cream wall panels, while a gilded chandelier ties the palette together.',
  },
  {
    id: 7, category: 'wardrobe', label: 'Bedroom Joinery',
    title: 'Timber & Glass Media Wall',
    location: 'East Legon, Accra',
    img: '/showroom/living-tv-timber-led.jpg',
    aspect: 'portrait',
    service: 'Bespoke Interior Joinery',
    specs: ['Warm walnut slatted panel cladding', 'LED-backlit cove perimeter', 'Integrated open-shelf bookcases', 'Floating timber media console'],
    desc: 'Rich walnut slatted panels create a warm architectural backdrop for this entertainment wall. Amber LED cove lighting glows from behind the full-height shelving towers, casting a cinema-warm ambience across the room at night.',
  },

  // KITCHEN
  {
    id: 8, category: 'kitchen', label: 'Kitchen Glass',
    title: 'Black Glass Kitchen Cabinet Fronts',
    location: 'Airport Hills, Accra',
    img: '/showroom/kitchen-black-glass-marble.jpg',
    aspect: 'landscape',
    service: 'Kitchen Glass & Cabinet Fronts',
    specs: ['Full-height black gloss glass cabinet doors', 'Calacatta marble island with waterfall edge', 'Undermount black sink + gooseneck tap', 'Stone-effect concrete column detail'],
    desc: 'A striking chef\'s kitchen where full-height black gloss glass cabinet doors are paired with a Calacatta marble island and matching backsplash. The contrast between the dark glass towers and white marble surfaces delivers a high-drama, hotel-quality finish throughout.',
  },

  // FACADES
  {
    id: 9, category: 'facade', label: 'Glass Facades',
    title: 'Grand Reception Glass Windows',
    location: 'Labone, Accra',
    img: '/showroom/reception-drapes-formal.jpg',
    aspect: 'landscape',
    service: 'Structural Glass Facades & Windows',
    specs: ['Full-height architectural glass windows', 'Floor-to-ceiling frameless glazing', 'Crystal tiered chandelier over reception', 'Travertine marble floor finish'],
    desc: 'A formal reception room transformed by full-height glass window installations that flood the space with natural light. Dramatic floor-to-ceiling silk drapes frame the glass on both sides, and a gilded tiered chandelier reflects off the polished travertine floor below.',
  },
];

const FILTERS = [
  { id: 'all',       label: 'All Work' },
  { id: 'partition', label: 'Feature Walls' },
  { id: 'wardrobe',  label: 'Joinery' },
  { id: 'kitchen',   label: 'Kitchen Glass' },
  { id: 'facade',    label: 'Glass Facades' },
];

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function Lightbox({ project, onClose, onPrev, onNext, brand }) {
  const ac = brand?.color || AC;
  const waText = `Hi Westline Future! I saw your "${project.title}" in the showroom and I'd like to get something similar. Can we discuss?`;

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,8,6,0.96)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'stretch',
        animation: 'lbIn 0.25s ease',
      }}
    >
      {/* photo side */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}
      >
        <img
          src={project.img}
          alt={project.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* prev / next */}
        <button
          onClick={e => { e.stopPropagation(); onPrev(); }}
          style={navBtnStyle('left')}
        ><ChevronLeft size={22} /></button>
        <button
          onClick={e => { e.stopPropagation(); onNext(); }}
          style={navBtnStyle('right')}
        ><ChevronRight size={22} /></button>
        {/* category badge */}
        <div style={{ position: 'absolute', top: 24, left: 24, background: ac, color: DARK, fontSize: 10, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 100 }}>
          {project.label}
        </div>
      </div>

      {/* info side */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 420, flexShrink: 0, background: '#0D0B09',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
          padding: '40px 36px', gap: 28, borderLeft: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button onClick={onClose} style={{ alignSelf: 'flex-end', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} />
        </button>

        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: ac, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>{project.service}</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 6 }}>{project.title}</h2>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{project.location}</div>
        </div>

        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>{project.desc}</p>

        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>Specifications</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {project.specs.map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: ac, flexShrink: 0 }} />
                {s}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href={`https://wa.me/${(brand?.whatsapp || '233598455012').replace(/\D/g,'')}?text=${encodeURIComponent(waText)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 24px', background: ac, color: DARK, borderRadius: 12, fontWeight: 900, fontSize: 14, textDecoration: 'none' }}
          >
            Get This Look <ArrowRight size={16} />
          </a>
          <a
            href={`https://wa.me/${(brand?.whatsapp || '233598455012').replace(/\D/g,'')}?text=${encodeURIComponent(waText)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 24px', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 13, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function navBtnStyle(side) {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    [side]: 20,
    width: 48, height: 48, borderRadius: '50%',
    background: 'rgba(10,8,6,0.7)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  };
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ project, onClick, ac }) {
  const [hovered, setHovered] = useState(false);
  const tall = project.aspect === 'portrait';

  return (
    <div
      onClick={() => onClick(project)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 16, cursor: 'pointer',
        gridRow: tall ? 'span 2' : 'span 1',
        background: '#111',
        transform: hovered ? 'scale(1.015)' : 'scale(1)',
        transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: hovered ? '0 24px 60px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      <img
        src={project.img}
        alt={project.title}
        loading="lazy"
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
          minHeight: tall ? 480 : 260,
        }}
      />
      {/* gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(10,8,6,0.85) 0%, rgba(10,8,6,0.1) 50%, transparent 100%)',
        opacity: hovered ? 1 : 0.7,
        transition: 'opacity 0.3s',
      }} />

      {/* category badge */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        background: 'rgba(10,8,6,0.6)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#fff', fontSize: 9, fontWeight: 800, letterSpacing: '0.15em',
        textTransform: 'uppercase', padding: '5px 12px', borderRadius: 100,
      }}>
        {project.label}
      </div>

      {/* bottom info */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 22px' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>{project.title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: hovered ? 14 : 0, transition: 'margin 0.3s' }}>{project.location}</div>
        <div style={{
          overflow: 'hidden', maxHeight: hovered ? 40 : 0,
          transition: 'max-height 0.3s ease',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: ac, color: DARK, borderRadius: 8, fontSize: 12, fontWeight: 900 }}>
            Get This Look <ArrowRight size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Showcase({ brand }) {
  const navigate = useNavigate();
  const ac = brand?.color || AC;
  const [filter, setFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const filterRef = useRef(null);

  const visible = filter === 'all' ? PROJECTS : PROJECTS.filter(p => p.category === filter);

  const openLightbox = (project) => {
    setLightbox(project);
    document.body.style.overflow = 'hidden';
  };
  const closeLightbox = () => {
    setLightbox(null);
    document.body.style.overflow = '';
  };
  const goPrev = () => {
    const idx = visible.findIndex(p => p.id === lightbox.id);
    setLightbox(visible[(idx - 1 + visible.length) % visible.length]);
  };
  const goNext = () => {
    const idx = visible.findIndex(p => p.id === lightbox.id);
    setLightbox(visible[(idx + 1) % visible.length]);
  };

  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  return (
    <div style={{ background: '#0A0806', minHeight: '100vh', fontFamily: 'Inter, Satoshi, sans-serif' }}>

      {/* ── NAV ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,8,6,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 5vw', height: 68,
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {brand?.logo
            ? <img src={brand.logo} style={{ height: 28, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} alt="logo" />
            : <span style={{ fontWeight: 900, fontSize: 15, color: '#fff', letterSpacing: '-0.02em' }}>{brand?.name || 'Westline Future'}</span>
          }
          <span style={{ fontSize: 10, fontWeight: 800, color: ac, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Showroom</span>
        </div>
        <button
          onClick={() => navigate('/?page=contact')}
          style={{ background: ac, color: DARK, border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}
        >
          Get a Quote
        </button>
      </div>

      {/* ── HERO ── */}
      <div style={{ padding: '64px 5vw 40px', maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 800, color: ac, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Our Work</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 72px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.05, margin: 0 }}>
            Every finish.<br />
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>Delivered in Accra.</em>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', maxWidth: 400, lineHeight: 1.7, margin: 0 }}>
            Real completed projects across Accra — feature walls, kitchen glass, facades, and bespoke joinery. Click any project to see specs and enquire.
          </p>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div style={{ padding: '0 5vw 32px', maxWidth: 1600, margin: '0 auto' }}>
        <div
          ref={filterRef}
          style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
          className="gt-noscroll"
        >
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flexShrink: 0, padding: '10px 22px', borderRadius: 100,
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                background: filter === f.id ? ac : 'rgba(255,255,255,0.06)',
                color: filter === f.id ? DARK : 'rgba(255,255,255,0.5)',
                border: `1px solid ${filter === f.id ? ac : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
              {filter === f.id && f.id !== 'all' && (
                <span style={{ marginLeft: 6, opacity: 0.6 }}>{visible.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── GRID ── */}
      <div style={{ padding: '0 5vw 80px', maxWidth: 1600, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gridAutoRows: '240px',
          gap: 14,
        }}>
          {visible.map(p => (
            <Card key={p.id} project={p} onClick={openLightbox} ac={ac} />
          ))}
        </div>

        {visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>
            No projects in this category yet.
          </div>
        )}
      </div>

      {/* ── STICKY BOTTOM CTA ── */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 40, display: 'flex', gap: 10, alignItems: 'center',
        background: 'rgba(10,8,6,0.85)', backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 100, padding: '10px 10px 10px 24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
          Like what you see?
        </span>
        <button
          onClick={() => navigate('/?page=contact')}
          style={{ background: ac, color: DARK, border: 'none', borderRadius: 100, padding: '10px 22px', fontWeight: 900, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Book a Free Site Visit →
        </button>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <Lightbox
          project={lightbox}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
          brand={brand}
        />
      )}

      <style>{`
        .gt-noscroll::-webkit-scrollbar { display: none; }
        .gt-noscroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes lbIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}
