import React, { useState } from 'react';
import { ChevronRight, ArrowRight, Layers, AppWindow, ShowerHead, ChefHat, Shirt, LayoutGrid, DoorOpen, Zap, Droplets, Hammer, Sofa, Refrigerator, Sparkles } from 'lucide-react';
import { useWindowWidth } from './sharedHelpers';
import { usePublicTranslation } from '../components/PubLayout';

const DARK_TEXT = `var(--accent-secondary)`;
const LIGHT_BG = `var(--bg-primary)`;

import { ALL_SERVICES } from '../data';

export default function ServicesPage({ brand, navigate, content }) {
  usePublicTranslation();
  const ac = brand?.color || `var(--accent-secondary)`;
  const winW = useWindowWidth();
  const mob = winW <= 900;
  const [activeId, setActiveId] = useState(null);

  const servicesToRender = content?.services?.length > 0 ? content.services.map((s, i) => ({
    id: s.id || `dyn-${i}`,
    Icon: s.Icon || Layers, // Fallback icon
    name: s.name || 'Untitled Service',
    tagline: s.tagline || s.short || '',
    keywords: s.keywords || [],
    desc: s.desc || '',
    items: s.items || s.packages || [],
    whatsapp: s.whatsapp || `Hi Westline Future, I need a quote for ${s.name}.`,
    img: s.img || '🛠️'
  })) : ALL_SERVICES;

  const whatsappBase = brand?.whatsapp || '233247319778';

  return (
    <div style={{ background: LIGHT_BG }}>
      {/* Hero */}
      <section style={{ padding: mob ? '120px 24px 80px' : '180px 5vw 100px', background: `var(--accent-secondary)`, color: '#fff' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>WHAT WE DO</span>
          <h1 style={{ fontSize: mob ? 40 : 72, fontWeight: 800, letterSpacing: '-0.04em', margin: '16px 0', color: '#fff', lineHeight: 1.05 }}>
            Every service your<br />
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>home or office needs.</em>
          </h1>
          <p style={{ fontSize: mob ? 15 : 18, color: 'rgba(255,255,255,0.55)', maxWidth: 600, lineHeight: 1.7, marginBottom: 40 }}>
            Surface finishes, custom carpentry, furniture, appliances and décor — every single product your home interior needs, sourced from China and installed by our team.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {servicesToRender.map(s => (
              <button
                key={s.id}
                onClick={() => { const el = document.getElementById(`svc-${s.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                style={{ padding: '8px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {s.Icon && <s.Icon size={12} strokeWidth={2} />}
                {s.name?.split(' ')[0] || 'Service'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Service Sections */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: mob ? '60px 24px' : '80px 5vw' }}>
        {servicesToRender.map((svc, idx) => {
          const isOpen = activeId === svc.id;
          const isEven = idx % 2 === 0;
          return (
            <section
              key={svc.id}
              id={`svc-${svc.id}`}
              style={{
                marginBottom: mob ? 48 : 64,
                borderRadius: 24,
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.06)',
                background: '#fff',
                boxShadow: '0 4px 24px rgba(0,0,0,0.03)',
              }}
            >
              {/* Header */}
              <button
                onClick={() => setActiveId(isOpen ? null : svc.id)}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: mob ? '28px 28px 24px' : '40px 48px 32px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: ac }}>
                    {svc.Icon && <svc.Icon size={26} strokeWidth={1.5} />}
                  </div>
                  <div>
                    <h2 style={{ fontSize: mob ? 18 : 24, fontWeight: 800, color: DARK_TEXT, margin: '0 0 4px' }}>{svc.name}</h2>
                    <p style={{ fontSize: 13, color: `var(--text-secondary)`, margin: 0, fontWeight: 500 }}>{svc.tagline}</p>
                  </div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: isOpen ? ac : `var(--bg-secondary)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.25s' }}>
                  <ChevronRight size={18} color={isOpen ? '#fff' : `var(--text-secondary)`} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.25s' }} />
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: mob ? '0 28px 32px' : '0 48px 48px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 48, paddingTop: 32 }}>
                    <div>
                      <p style={{ fontSize: 15, color: 'rgba(92, 58, 33,0.65)', lineHeight: 1.8, marginBottom: 32 }}>{svc.desc}</p>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
                        {svc.keywords.map(kw => (
                          <span key={kw} style={{ padding: '4px 10px', background: `${ac}10`, color: ac, fontSize: 10, fontWeight: 700, borderRadius: 100, border: `1px solid ${ac}20` }}>{kw}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <a
                          href={`https://wa.me/${whatsappBase}?text=${encodeURIComponent(svc.whatsapp)}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: '#25D366', color: '#fff', borderRadius: 14, fontWeight: 800, fontSize: 13, textDecoration: 'none' }}
                        >
                          <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                          WhatsApp Quote
                        </a>
                        <button
                          onClick={() => navigate('/?page=contact')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: DARK_TEXT, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                        >
                          Get a Quote <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>What we cover</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {svc.items.map(item => (
                          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: `var(--bg-secondary)`, borderRadius: 12 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: ac, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: DARK_TEXT }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Areas we serve */}
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: `var(--accent-secondary)`, color: '#fff' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>OUR REACH</span>
          <h2 style={{ fontSize: mob ? 32 : 52, fontWeight: 800, letterSpacing: '-0.03em', margin: '16px 0 12px' }}>Serving all of Ghana</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 48, maxWidth: 500, margin: '0 auto 48px' }}>
            Our installation teams operate across the country — wherever you are, we come to you.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            {['Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta', 'Oti', 'Bono', 'Bono East', 'Ahafo', 'Northern', 'Savannah', 'North East', 'Upper East', 'Upper West', 'Western North'].map(region => (
              <div key={region} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', borderRadius: 100, fontSize: 13, fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                📍 {region}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: `var(--bg-primary)` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: mob ? 32 : 52, fontWeight: 800, color: DARK_TEXT, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Not sure what you need? <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>Just ask.</em>
          </h2>
          <p style={{ fontSize: 15, color: `var(--text-secondary)`, marginBottom: 40, lineHeight: 1.7 }}>
            Send us a WhatsApp message or call us. We will visit your site, assess the work, and give you a free detailed quote.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/${whatsappBase}?text=${encodeURIComponent("Hi Westline Future, I'd like to discuss a project and get a free quote.")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 40px', background: '#25D366', color: '#fff', borderRadius: 14, fontWeight: 900, fontSize: 15, textDecoration: 'none' }}
            >
              <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              Free WhatsApp Quote
            </a>
            <button
              onClick={() => navigate('/?page=contact')}
              style={{ padding: '18px 40px', background: DARK_TEXT, color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}
            >
              Get a Formal Quote
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
