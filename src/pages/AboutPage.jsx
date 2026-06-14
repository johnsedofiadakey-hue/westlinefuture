import React, { useContext } from 'react';
import { useWindowWidth, isMob, DARK_TEXT, AC } from './sharedHelpers';
import { ABOUT_DATA } from '../data';
import { AppContext } from '../context/AppContext';
import { MapPin, Globe2, ArrowRight, CheckCircle, Star, Clock, Users } from 'lucide-react';
import { usePublicTranslation } from '../components/PubLayout';

const STATS = [
  { value: '20+', label: 'Years Combined Experience', icon: <Clock size={20} /> },
  { value: '100%', label: 'Full-Home Projects', icon: <CheckCircle size={20} /> },
  { value: '2', label: 'Office Locations', icon: <Globe2 size={20} /> },
  { value: '5★', label: 'Client Satisfaction', icon: <Star size={20} /> },
];

export default function AboutPage({ brand, content, navigate }) {
  usePublicTranslation();
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand.color || AC;
  const data = content?.about || ABOUT_DATA;
  const { teamMembers = [] } = useContext(AppContext);
  const visibleTeam = teamMembers.filter(m => m.role !== 'client' && m.name);

  return (
    <div style={{ paddingTop: mob ? 80 : 120, fontFamily: 'Inter, Satoshi, sans-serif' }}>

      {/* ── HERO ── */}
      <section style={{ padding: mob ? '60px 24px 40px' : '80px 5vw 60px', background: `var(--bg-secondary)` }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            About Westline Future
          </span>
          <h1 style={{ fontSize: mob ? 40 : 72, fontWeight: 800, letterSpacing: '-0.04em', margin: '20px 0 24px', lineHeight: 1.1, color: DARK_TEXT }}>
            One company.<br />
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>Your complete home.</em>
          </h1>
          <p style={{ fontSize: mob ? 16 : 20, color: 'rgba(92, 58, 33,0.6)', maxWidth: 820, lineHeight: 1.8 }}>
            {data.story || "Founded by CEO Mrs Han alongside partner Andy, Westline Future is a newly established full interior decoration firm, standing as Ghana's leading destination for comprehensive interior finishing. Our mission unites industrial engineering precision with luxury custom interior design."}
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background: DARK_TEXT, padding: mob ? '40px 24px' : '56px 5vw' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4, 1fr)', gap: mob ? 24 : 0 }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ textAlign: 'center', padding: '0 32px', color: '#fff', borderRight: !mob && i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              <div style={{ color: ac, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: mob ? 36 : 52, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LEADERSHIP — both founders ── */}
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: '#fff' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ marginBottom: mob ? 40 : 64 }}>
            <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Leadership</span>
            <h2 style={{ fontSize: mob ? 32 : 52, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 16, color: DARK_TEXT }}>
              The people behind the vision
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 32 }}>

            {/* Mrs Han */}
            <div style={{ padding: mob ? 28 : 40, borderRadius: 28, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                  H
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: DARK_TEXT }}>{data.founder || 'Mrs Hannah (Han)'}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ac, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 3 }}>
                    {data.role || 'CEO & Founding Partner'}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(92,58,33,0.65)', lineHeight: 1.85 }}>
                {data.bio || "As CEO and Founding Partner, Mrs Hannah brings over 20 years of elite interior design expertise forged working with top-tier interior brands across Qingdao and Yantai, China. A diligent, detail-driven industry veteran with relentless work ethic, she leverages her decades of refined craftsmanship and high-end design know-how to steer Westline Future's luxury interior operations across Ghana."}
              </p>
            </div>

            {/* Andy */}
            <div style={{ padding: mob ? 28 : 40, borderRadius: 28, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: DARK_TEXT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                  A
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: DARK_TEXT }}>{data.coFounder || 'Andy'}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ac, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 3 }}>
                    {data.coFounderRole || 'Founding Partner'}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(92,58,33,0.65)', lineHeight: 1.85 }}>
                {data.coFounderBio || "As founding partner of Westline Future, Andy oversees the company's global marketing strategy and all social media operations while serving as the public brand face for the firm. Drawing on extensive cross-industry entrepreneurial experience, he also leads East Bridge Motors, a specialized Chinese electric vehicle dealership, holds an active partnership with MS Auto Africa, and independently operates his own e-commerce platform: AndyTrackShop.com."}
              </p>
            </div>

          </div>

          {/* Offices */}
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 16, marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 24, background: `var(--bg-secondary)`, borderRadius: 20, border: '1px solid var(--border-color)' }}>
              <MapPin size={20} color={ac} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: DARK_TEXT, marginBottom: 4 }}>Accra Office</div>
                <div style={{ fontSize: 13, color: 'rgba(92, 58, 33,0.5)' }}>{data.accraOffice || 'Lakeside Estates, Accra, Ghana'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 24, background: `var(--bg-secondary)`, borderRadius: 20, border: '1px solid var(--border-color)' }}>
              <Globe2 size={20} color={ac} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: DARK_TEXT, marginBottom: 4 }}>China Headquarters</div>
                <div style={{ fontSize: 13, color: 'rgba(92, 58, 33,0.5)' }}>{data.chinaHQ || 'Yantai, Shandong Province, China'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TEAM (from Firestore) ── */}
      {visibleTeam.length > 0 && (
        <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: `var(--bg-secondary)` }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ marginBottom: mob ? 40 : 64 }}>
              <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Our People</span>
              <h2 style={{ fontSize: mob ? 32 : 52, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 16, color: DARK_TEXT }}>
                The team behind the work
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 20 }}>
              {visibleTeam.slice(0, 8).map(m => (
                <div key={m.id || m.uid} style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <div style={{ height: 200, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* ── CTA ── */}
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: DARK_TEXT }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Get Started</span>
          <h2 style={{ fontSize: mob ? 32 : 56, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', marginTop: 20, marginBottom: 16, lineHeight: 1.1 }}>
            Ready to transform your home?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 40, lineHeight: 1.7 }}>
            From 3D design to full installation — we handle every detail so you don't have to.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {navigate && (
              <button
                onClick={() => navigate('/?page=contact')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 32px', borderRadius: 14, background: ac, border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Contact Us <ArrowRight size={16} />
              </button>
            )}
            {navigate && (
              <button
                onClick={() => navigate('/?page=services')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 32px', borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Our Services
              </button>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
