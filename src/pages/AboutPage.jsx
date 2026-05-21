import React from 'react';
import { useWindowWidth, isMob, DARK_TEXT, AC } from './PublicSite';
import { ABOUT_DATA } from '../data';

export default function AboutPage({ brand, content }) {
  const winW = useWindowWidth();
  const mob = isMob(winW);
  const ac = brand.color || AC;
  const data = content?.about || ABOUT_DATA;

  return (
    <div style={{ paddingTop: mob ? 80 : 120 }}>        <section style={{ padding: '80px 5vw', background: '#F4F4FA', color: DARK_TEXT }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{data.storyTitle || 'THE HUB'}</span>
            <h1 style={{ fontSize: mob ? 48 : 96, fontWeight: 800, letterSpacing: '-0.04em', margin: '20px 0' }}>Our Legacy.</h1>
            <p style={{ fontSize: mob ? 18 : 24, color: 'rgba(13,11,46,0.6)', maxWidth: 800, lineHeight: 1.6 }}>{data.story || 'Global precision meets local delivery. Premium structural glass, aluminum works, and interior finishing solutions for the world\'s most ambitious architectural projects.'}</p>
          </div>
       </section>
       <section style={{ padding: '100px 5vw', background: '#fff' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 64, alignItems: 'center' }}>
             <div>
                <h2 style={{ fontSize: 40, fontWeight: 800, marginBottom: 8, color: DARK_TEXT }}>{data.founder || 'Managing Director'}</h2>
                <div style={{ color: ac, fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 32 }}>{data.role || 'Managing Director'}</div>
                <p style={{ color: 'rgba(13,11,46,0.6)', lineHeight: 1.8, fontSize: 16, marginBottom: 24 }}>{data.bio || 'From structural glass to full interior finishing, our evolution has been driven by a commitment to technical mastery and aesthetic perfection.'}</p>
                <div style={{ padding: 32, background: '#F4F4FA', borderRadius: 24, border: '1px solid #E8E6F5' }}>
                   <h4 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: DARK_TEXT }}>Headquarters</h4>
                   <p style={{ color: 'rgba(13,11,46,0.5)', margin: 0 }}>{brand.location || 'Westline Future — Global Trading Co, Ltd'}</p>
                </div>
             </div>
             <img src={data.image || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"} style={{ width: '100%', borderRadius: 24, boxShadow: '0 30px 60px rgba(0,0,0,0.05)' }} />
          </div>
       </section>
    </div>
  );
}
