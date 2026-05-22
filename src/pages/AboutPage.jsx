import React, { useContext } from 'react';
import { useWindowWidth, isMob, DARK_TEXT, AC } from './PublicSite';
import { ABOUT_DATA } from '../data';
import { AppContext } from '../context/AppContext';
import { MapPin, Award, Users, Globe2, ArrowRight, CheckCircle, Zap, ShieldCheck, Clock, Star } from 'lucide-react';

const WA_SVG = (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const STATS = [
  { value: '12+', label: 'Years in Operation', icon: <Clock size={20} /> },
  { value: '500+', label: 'Projects Delivered', icon: <CheckCircle size={20} /> },
  { value: '15', label: 'Ghana Regions Served', icon: <Globe2 size={20} /> },
  { value: '98%', label: 'Client Satisfaction', icon: <Star size={20} /> },
];

const VALUES = [
  {
    icon: <ShieldCheck size={24} />,
    title: 'Precision Engineering',
    body: 'Sub-millimeter tolerances on every cut, every joint, every installation. We treat structural glass like jewellery — because your building deserves nothing less.',
  },
  {
    icon: <Globe2 size={24} />,
    title: 'Global Sourcing',
    body: 'Our materials arrive from China, Europe, and the UAE — vetted factories, certified glass, and supply-chain transparency from manufacturing floor to your site.',
  },
  {
    icon: <Zap size={24} />,
    title: 'End-to-End Delivery',
    body: 'Design, fabrication, logistics, installation, and aftercare — one team, one contract, zero handoff headaches. We own the outcome start to finish.',
  },
  {
    icon: <Award size={24} />,
    title: 'Million-Dollar Finish',
    body: 'Every project targets the aesthetic benchmark of luxury global developments, regardless of budget tier. Premium outcomes are not a luxury — they are our standard.',
  },
];

const TIMELINE = [
  { year: '2012', event: 'Founded in Spintex Road, Accra — specialising in structural glass curtain walls.' },
  { year: '2015', event: 'Expanded into interior finishing: frameless shower enclosures, glass partitions, bespoke wardrobes.' },
  { year: '2018', event: 'Established direct sourcing partnerships with certified glass manufacturers in China and Europe.' },
  { year: '2021', event: 'Launched full turnkey service: design → fabrication → logistics → installation under one roof.' },
  { year: '2023', event: 'Completed landmark projects across Accra, Kumasi, and Takoradi — including high-rise facades and luxury residential estates.' },
  { year: '2025', event: 'Serving all 16 regions of Ghana with a fleet of field installation teams and a 5,000 sqm fabrication facility.' },
];

export default function AboutPage({ brand, content, navigate }) {
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand.color || AC;
  const data = content?.about || ABOUT_DATA;
  const { teamMembers = [] } = useContext(AppContext);
  const visibleTeam = teamMembers.filter(m => m.role !== 'client' && m.name);

  return (
    <div style={{ paddingTop: mob ? 80 : 120, fontFamily: 'Inter, Satoshi, sans-serif' }}>

      {/* ── HERO ── */}
      <section style={{ padding: mob ? '60px 24px 40px' : '80px 5vw 60px', background: '#F8F8FD' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            About Westline Future
          </span>
          <h1 style={{ fontSize: mob ? 48 : 88, fontWeight: 800, letterSpacing: '-0.04em', margin: '20px 0 24px', lineHeight: 1, color: DARK_TEXT }}>
            Built on glass.<br />
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>Finished with purpose.</em>
          </h1>
          <p style={{ fontSize: mob ? 16 : 22, color: 'rgba(13,11,46,0.55)', maxWidth: 760, lineHeight: 1.7 }}>
            {data.story || "Ghana's premier structural glass and interior finishing company — precision-engineered projects from a single source, delivered across all 16 regions."}
          </p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ background: DARK_TEXT, padding: mob ? '40px 24px' : '56px 5vw' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4, 1fr)', gap: mob ? 24 : 0 }}>
          {STATS.map((s, i) => (
            <div
              key={s.label}
              style={{
                textAlign: 'center', padding: '0 32px', color: '#fff',
                borderRight: !mob && i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              }}
            >
              <div style={{ color: ac, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: mob ? 36 : 52, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Leadership</span>
            <h2 style={{ fontSize: mob ? 36 : 52, fontWeight: 800, marginBottom: 8, color: DARK_TEXT, letterSpacing: '-0.03em', marginTop: 16 }}>
              {data.founder || 'John Dakey'}
            </h2>
            <div style={{ color: ac, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 28 }}>
              {data.role || 'Managing Director'}
            </div>
            <p style={{ color: 'rgba(13,11,46,0.6)', lineHeight: 1.85, fontSize: 16, marginBottom: 32 }}>
              {data.bio || 'The leadership of Westline Future brings deep expertise in structural glass, aluminum systems, and international procurement. Our mission: a world-class finish on every project.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 24, background: '#F8F8FD', borderRadius: 20, border: '1px solid #E8E6F5' }}>
                <MapPin size={20} color={ac} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: DARK_TEXT, marginBottom: 4 }}>Accra Headquarters</div>
                  <div style={{ fontSize: 13, color: 'rgba(13,11,46,0.5)' }}>{brand.location || 'Spintex Road Industrial Area, International'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 24, background: '#F8F8FD', borderRadius: 20, border: '1px solid #E8E6F5' }}>
                <Globe2 size={20} color={ac} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: DARK_TEXT, marginBottom: 4 }}>National Coverage</div>
                  <div style={{ fontSize: 13, color: 'rgba(13,11,46,0.5)' }}>All 16 regions of Ghana — field teams deployed nationwide</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <img
              src={data.image || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop'}
              style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', borderRadius: 32, boxShadow: '0 40px 80px rgba(0,0,0,0.1)' }}
              alt={data.founder || 'Managing Director'}
            />
            <div style={{
              position: 'absolute', bottom: 32, left: -24, background: '#fff', borderRadius: 20,
              padding: '20px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', gap: 16, maxWidth: 260
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Award size={22} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: DARK_TEXT }}>500+ Projects</div>
                <div style={{ fontSize: 11, color: '#9B99C8' }}>Delivered since 2012</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: '#F8F8FD' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ marginBottom: mob ? 40 : 64 }}>
            <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Our Principles</span>
            <h2 style={{ fontSize: mob ? 32 : 56, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 16, color: DARK_TEXT }}>
              What drives every decision
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(4, 1fr)', gap: 20 }}>
            {VALUES.map((v, i) => (
              <div
                key={v.title}
                style={{
                  padding: 32, borderRadius: 24,
                  background: i === 0 ? DARK_TEXT : '#fff',
                  color: i === 0 ? '#fff' : DARK_TEXT,
                  border: '1px solid',
                  borderColor: i === 0 ? DARK_TEXT : '#E8E6F5',
                  display: 'flex', flexDirection: 'column', gap: 20,
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: i === 0 ? `${ac}20` : `${ac}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: ac, flexShrink: 0
                }}>
                  {v.icon}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>{v.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.75, opacity: i === 0 ? 0.65 : 0.6 }}>{v.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: mob ? 40 : 64 }}>
            <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Our Journey</span>
            <h2 style={{ fontSize: mob ? 32 : 52, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 16, color: DARK_TEXT }}>
              A decade of milestones
            </h2>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: mob ? 20 : '50%', top: 0, bottom: 0, width: 2, background: '#E8E6F5', transform: mob ? 'none' : 'translateX(-50%)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {TIMELINE.map((item, i) => (
                <div
                  key={item.year}
                  style={{
                    display: 'flex',
                    flexDirection: mob ? 'row' : (i % 2 === 0 ? 'row-reverse' : 'row'),
                    alignItems: 'center',
                    gap: mob ? 20 : 48,
                  }}
                >
                  {!mob && <div style={{ flex: 1 }} />}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: mob ? 40 : 56, height: mob ? 40 : 56,
                      borderRadius: '50%', background: ac,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: mob ? 11 : 13, fontWeight: 900,
                      boxShadow: `0 0 0 6px #fff, 0 0 0 8px ${ac}30`,
                      zIndex: 1,
                    }}>
                      {item.year.slice(2)}
                    </div>
                  </div>
                  <div style={{
                    flex: 1,
                    background: '#F8F8FD', borderRadius: 20,
                    border: '1px solid #E8E6F5',
                    padding: mob ? '20px 24px' : 28,
                  }}>
                    <div style={{ fontSize: mob ? 12 : 13, fontWeight: 900, color: ac, marginBottom: 6 }}>{item.year}</div>
                    <div style={{ fontSize: mob ? 13 : 15, color: DARK_TEXT, lineHeight: 1.6 }}>{item.event}</div>
                  </div>
                  {!mob && <div style={{ flex: 1 }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      {visibleTeam.length > 0 && (
        <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: '#F8F8FD' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ marginBottom: mob ? 40 : 64 }}>
              <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Our People</span>
              <h2 style={{ fontSize: mob ? 32 : 52, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 16, color: DARK_TEXT }}>
                The team behind the work
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 20 }}>
              {visibleTeam.slice(0, 8).map(m => (
                <div key={m.id || m.uid} style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', border: '1px solid #E8E6F5' }}>
                  <div style={{ height: 200, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {m.photoURL ? (
                      <img src={m.photoURL} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: '#fff' }}>
                        {(m.name || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: DARK_TEXT }}>{m.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: ac, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                      {m.title || m.role || 'Team Member'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CERTIFICATIONS ── */}
      <section style={{ padding: mob ? '60px 24px' : '80px 5vw', background: '#fff', borderTop: '1px solid #E8E6F5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Standards & Compliance</span>
            <h2 style={{ fontSize: mob ? 28 : 40, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 16, color: DARK_TEXT }}>
              Built to international standards
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { icon: <ShieldCheck size={22} color={ac} />, label: 'Ghana Standards Authority', sub: 'Registered fabricator' },
              { icon: <Award size={22} color={ac} />, label: 'ISO 9001 Aligned', sub: 'Quality management systems' },
              { icon: <CheckCircle size={22} color={ac} />, label: 'Certified Installers', sub: 'Factory-trained technicians' },
              { icon: <Globe2 size={22} color={ac} />, label: 'Global Supply Chain', sub: 'EU & Asia certified glass' },
            ].map(c => (
              <div key={c.label} style={{ padding: 28, background: '#F8F8FD', borderRadius: 20, border: '1px solid #E8E6F5', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 48, height: 48, background: `${ac}15`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: DARK_TEXT }}>{c.label}</div>
                <div style={{ fontSize: 12, color: '#9B99C8', fontWeight: 600 }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: DARK_TEXT }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Start a Conversation</span>
          <h2 style={{ fontSize: mob ? 32 : 56, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', marginTop: 20, marginBottom: 16, lineHeight: 1.1 }}>
            Let's build something remarkable together.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 40, lineHeight: 1.7 }}>
            Whether it's a curtain wall, a glass staircase, or a complete interior fit-out — we start with a free site visit and a no-obligation quote.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {navigate && (
              <button
                onClick={() => navigate('/?page=contact')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 40px', background: ac, color: '#0D0B2E', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: 15, cursor: 'pointer' }}
              >
                Get a Free Quote <ArrowRight size={16} />
              </button>
            )}
            <a
              href={`https://wa.me/${brand.whatsapp || '233598455012'}?text=${encodeURIComponent("Hi Westline Future, I saw your About page and I'd like to discuss a project.")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 40px', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 14, fontWeight: 800, fontSize: 15, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {WA_SVG} WhatsApp Us
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
