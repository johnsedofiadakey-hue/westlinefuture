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

import { useWindowWidth, isMob, LIGHT_BG, DARK_TEXT, AC } from './sharedHelpers';

import { PubNav, Footer } from '../components/PubLayout';

// --- HOME PAGE SECTIONS ----

export function Hero({ slides, brand, navigate, setPage }) {
  const [active, setActive] = useState(0);
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand.color || AC;

  useEffect(() => {
    const int = setInterval(() => setActive(s => (s + 1) % (slides.length || 1)), 8000);
    return () => clearInterval(int);
  }, [slides.length]);

  const videoRef = React.useRef(null);
  
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5; // Slow down
    }
  }, []);

  return (
    <section style={{ height: '100vh', position: 'relative', background: LIGHT_BG, overflow: 'hidden' }}>
      
      {/* Background Video */}
      <video
        ref={videoRef}
        src="/hero_video.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0
        }}
      />

      {slides.map((s, i) => (
        <div key={s.title || i} style={{
          position: 'absolute', inset: 0, transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: active === i ? 1 : 0, zIndex: active === i ? 1 : 0
        }}>
          <div style={{
            position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(253,252,251,0.05), rgba(253,252,251,0.5))',
            display: 'flex', alignItems: 'center', padding: '0 5vw', zIndex: 2
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
                    color: 'rgba(24, 14, 6, 0.65)',
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
                  <button onClick={() => navigate('/workflow')} style={{ flex: mob ? 1 : 'initial', padding: mob ? '14px 12px' : '18px 36px', background: 'rgba(255,255,255,0.95)', color: DARK_TEXT, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)', fontWeight: 700, cursor: 'pointer', fontSize: mob ? 10 : 14, textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.3s', whiteSpace: 'nowrap' }} className="hover-lift">How We Work</button>
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
    <section style={{ padding: mob ? '80px 24px' : '120px 5vw', background: `var(--bg-primary)` }}>
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
              {!mob && <p style={{ color: 'rgba(92, 58, 33,0.55)', lineHeight: 1.7, marginBottom: 20, fontSize: 13 }}>{s.short || s.desc}</p>}
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
  const items = (stats && stats.length) ? stats : DEFAULT_STATS;
  return (
    <section style={{ background: `var(--accent-secondary)`, padding: '48px 5vw' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 32 }}>
        {items.map((s, i) => (
          <div key={s.label || i} style={{ textAlign: 'center', borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none', padding: '8px 16px' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: `var(--accent-primary)`, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsBarMobile({ brand, stats }) {
  const items = (stats && stats.length) ? stats : DEFAULT_STATS;
  return (
    <section style={{ background: `var(--accent-secondary)`, padding: '40px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 16px' }}>
        {items.map((s, i) => (
          <div key={s.label || i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: `var(--accent-primary)`, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
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
              background: `var(--bg-secondary)`, borderRadius: 24,
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
                <p style={{ fontSize: 14, color: 'rgba(24, 14, 6, 0.6)', lineHeight: 1.7, margin: 0 }}>{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: mob ? 40 : 64, textAlign: 'center' }}>
          <button
            onClick={() => navigate('/?page=contact')}
            style={{ padding: '18px 48px', background: `var(--accent-secondary)`, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}
            onMouseEnter={e => e.currentTarget.style.background = ac}
            onMouseLeave={e => e.currentTarget.style.background = `var(--accent-secondary)`}
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
    <section style={{ padding: mob ? '80px 24px' : '140px 5vw', background: `var(--bg-secondary)` }}>
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
              <div style={{ fontSize: 12, color: 'rgba(24, 14, 6, 0.45)', marginTop: 4 }}>{item.projectTitle || item.role}</div>
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
                style={{ width: i === active ? 28 : 8, height: 8, borderRadius: 4, background: i === active ? ac : `var(--border-color)`, border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }}
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
        <section style={{ padding: mob ? '80px 24px' : '120px 5vw', background: `var(--bg-secondary)`, color: `var(--text-primary)`, textAlign: 'center' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <span style={{ color: `var(--text-secondary)`, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>GET STARTED</span>
            <h2 style={{ fontSize: mob ? 36 : 60, fontWeight: 800, marginBottom: 16, marginTop: 16, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              {ctaHeading.split('something remarkable?')[0]}
              {ctaHeading.includes('something remarkable?')
                ? <><em style={{ fontStyle: 'italic', fontWeight: 400, color: `var(--accent-primary)` }}>something remarkable?</em></>
                : null}
              {!ctaHeading.includes('something remarkable?') && ctaHeading}
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(44,26,15,0.7)', marginBottom: 40, lineHeight: 1.7 }}>{ctaSub}</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => navigate('/?page=contact')} 
                style={{ 
                  padding: '18px 48px', 
                  background: `var(--accent-secondary)`, 
                  color: '#FFF',
                  border: 'none', 
                  borderRadius: 14, 
                  fontWeight: 900, 
                  fontSize: 15, 
                  cursor: 'pointer', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 8,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="hover-lift"
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(200, 143, 67, 0.3)';
                  e.currentTarget.style.filter = 'brightness(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.filter = 'none';
                }}
              >
                {ctaBtn1} <ChevronRight size={16} />
              </button>
              <button onClick={() => navigate('/portfolio')} style={{ padding: '18px 48px', background: 'rgba(44,26,15,0.06)', color: `var(--text-primary)`, border: '1px solid rgba(44,26,15,0.12)', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                {ctaBtn2}
              </button>
            </div>
          </div>
        </section>
      </>
    );
    if (p === 'services') return (
      <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}>Loading...</div>}>
        <ServicesPage brand={brand} navigate={navigate} content={content} />
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

    if (p === 'workflow') return (
      <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}>Loading Workflow...</div>}>
        <WorkflowManualPage brand={brand} setPage={setPage} onPortal={onPortal} user={user} navigate={navigate} context={{ content }} />
      </Suspense>
    );

    if (p === 'portfolio') return (
      <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}>Loading Gallery...</div>}>
        <Portfolio brand={brand} user={user} onPortal={onPortal} setPage={setPage} content={content} />
      </Suspense>
    );

    if (p === 'showcase') return (
      <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' }}>Loading Showcase...</div>}>
        <Showcase brand={brand} user={user} onPortal={onPortal} setPage={setPage} navigate={navigate} showcase={content?.showcase} />
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
