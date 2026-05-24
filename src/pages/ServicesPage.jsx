import React, { useState } from 'react';
import { ChevronRight, ArrowRight, Layers, AppWindow, ShowerHead, ChefHat, Shirt, LayoutGrid, DoorOpen, Zap, Droplets } from 'lucide-react';
import { useWindowWidth } from './PublicSite';

const DARK_TEXT = '#111827';
const LIGHT_BG = '#FDFCFB';

const ALL_SERVICES = [
  {
    id: 'glass',
    Icon: Layers,
    name: 'Glass Installation & Glazing',
    tagline: 'Frameless glass, structural glazing, curtain walls & balustrades',
    keywords: ['glass installation accra', 'frameless glass ghana', 'glass balustrade', 'curtain wall', 'glass partition', 'tempered glass', 'laminated glass', 'structural glazing'],
    desc: 'We supply and install all types of glass systems worldwide — from frameless shower enclosures and glass balustrades to full curtain wall systems for commercial buildings. Our glass is sourced directly from certified factories, giving you tempered, laminated, and frosted options at the best prices in Ghana.',
    items: ['Frameless Glass Shower Cubicles', 'Glass Balustrades & Staircases', 'Office & Room Glass Partitions', 'Curtain Wall Systems', 'Glass Doors & Shopfronts', 'Skylight & Canopy Glass', 'Frosted & Decorative Glass', 'Glass Balcony Railings'],
    whatsapp: 'Hi Westline Future, I need a quote for glass installation / glazing work.',
    img: '🏢',
  },
  {
    id: 'aluminium',
    Icon: AppWindow,
    name: 'Aluminium Windows & Doors',
    tagline: 'Casement, sliding, louvre & burglar-proof aluminium systems',
    keywords: ['aluminium windows accra', 'aluminium doors ghana', 'sliding windows ghana', 'louvre windows', 'casement windows accra', 'burglar proof ghana'],
    desc: 'Premium aluminium window and door systems engineered for Ghana\'s tropical climate. We fabricate and install casement windows, sliding windows, louvre systems, tilt-and-turn, and aluminium security doors for residential and commercial projects across Accra, Kumasi, and Takoradi.',
    items: ['Casement Windows', 'Sliding Windows & Doors', 'Louvre Windows', 'Tilt-and-Turn Windows', 'Aluminium Burglar Proof', 'Aluminium Shopfronts', 'Folding Glass Doors', 'Aluminium Cladding Systems'],
    whatsapp: 'Hi Westline Future, I need aluminium windows / doors for my project.',
    img: '🪟',
  },
  {
    id: 'washroom',
    Icon: ShowerHead,
    name: 'Bathroom & Washroom Installation',
    tagline: 'Full bathroom fit-out — vanities, shower trays, WCs, tiles & accessories',
    keywords: ['bathroom renovation accra', 'washroom installation ghana', 'shower cubicle ghana', 'vanity unit accra', 'bathroom fitting ghana', 'bathroom tiles accra', 'bathroom renovation ghana'],
    desc: 'We handle complete bathroom renovations and washroom installations from scratch. Our team sources premium bathroom fittings directly from China — vanity units, shower trays, WC sets, freestanding bathtubs, and all accessories — then installs everything professionally. One contractor, one price, one beautiful bathroom.',
    items: ['Shower Cubicle & Enclosure', 'Vanity Unit Installation', 'WC & Cistern Installation', 'Bathtub & Shower Tray', 'Bathroom Wall & Floor Tiles', 'Bathroom Mirror & Accessories', 'Bathroom Plumbing Fit-out', 'Bathroom Lighting'],
    whatsapp: 'Hi Westline Future, I want a quote for bathroom installation / renovation.',
    img: '🛁',
  },
  {
    id: 'kitchen',
    Icon: ChefHat,
    name: 'Kitchen Installation & Renovation',
    tagline: 'Modular kitchens, kitchen cabinets, worktops & full kitchen fit-out',
    keywords: ['kitchen cabinet ghana', 'kitchen renovation accra', 'modular kitchen ghana', 'kitchen installation ghana', 'kitchen worktop accra', 'kitchen fitting ghana', 'kitchen design accra'],
    desc: 'From custom-designed kitchen cabinets to full modular kitchen installations, we turn ordinary kitchens into premium culinary spaces. We source high-quality kitchen units, worktops, sinks, and appliances from China and Europe, then install everything to perfection. Available across all regions of Ghana.',
    items: ['Custom Kitchen Cabinets', 'Modular Kitchen Systems', 'Granite & Quartz Worktops', 'Kitchen Sink Installation', 'Kitchen Backsplash Tiles', 'Kitchen Hood & Hob Setup', 'Kitchen Lighting', 'Pull-out Storage Systems'],
    whatsapp: 'Hi Westline Future, I need a quote for kitchen renovation / installation.',
    img: '🍽️',
  },
  {
    id: 'wardrobe',
    Icon: Shirt,
    name: 'Wardrobes & Storage Systems',
    tagline: 'Fitted wardrobes, sliding wardrobes, walk-in closets & storage solutions',
    keywords: ['fitted wardrobe ghana', 'sliding wardrobe accra', 'wardrobe installation ghana', 'custom wardrobe accra', 'walk-in closet ghana', 'bedroom wardrobe ghana'],
    desc: 'We design and install custom wardrobes and storage systems for bedrooms, dressing rooms, and living spaces. Whether you want a mirror-fronted sliding wardrobe, a walk-in closet, or built-in storage, we fabricate to your exact measurements using premium materials sourced from China.',
    items: ['Sliding Door Wardrobes', 'Fitted Walk-in Wardrobes', 'Swing Door Wardrobes', 'Walk-in Closet Design', 'Shoe Rack & Accessory Systems', 'Mirror-Fronted Wardrobe Doors', 'TV Unit & Display Cabinetry', 'Study & Office Storage'],
    whatsapp: 'Hi Westline Future, I need a quote for wardrobe installation.',
    img: '👗',
  },
  {
    id: 'tiles',
    Icon: LayoutGrid,
    name: 'Tiles Supply & Installation',
    tagline: 'Floor tiles, wall tiles, porcelain, ceramic & outdoor paving — supply and fix',
    keywords: ['floor tiles accra', 'tiles supplier ghana', 'porcelain tiles ghana', 'wall tiles accra', 'tiles installation ghana', 'ceramic tiles ghana', 'outdoor tiles accra', 'swimming pool tiles ghana'],
    desc: 'We supply and install premium tiles for every surface — living room floors, bathroom walls, kitchen backsplashes, outdoor terraces, and swimming pools. Our tiles are imported directly from China and Italy, giving you the latest designs at the most competitive prices in Ghana. We do supply only or full supply-and-fix.',
    items: ['Porcelain Floor Tiles', 'Ceramic Wall Tiles', 'Outdoor & Terrace Paving', 'Swimming Pool Tiles', 'Bathroom Floor & Wall Tiles', 'Kitchen Backsplash Tiles', 'Large Format Tiles (120x120)', 'Mosaic & Feature Tiles'],
    whatsapp: 'Hi Westline Future, I need tiles — supply and/or installation.',
    img: '🟦',
  },
  {
    id: 'doors',
    Icon: DoorOpen,
    name: 'Doors Supply & Installation',
    tagline: 'Interior doors, security doors, WPC doors, wooden doors & door frames',
    keywords: ['doors supplier ghana', 'interior doors accra', 'security doors ghana', 'wooden doors accra', 'WPC doors ghana', 'door installation accra', 'fire doors ghana'],
    desc: 'From high-quality interior timber doors to heavy-duty security steel doors, we supply and install all types of doors for residential and commercial properties. Our WPC (Wood Plastic Composite) bathroom doors are waterproof and ideal for Ghana\'s humid conditions. We also supply and install door frames, handles, and locks.',
    items: ['Interior Timber Doors', 'Security Steel Doors', 'WPC Bathroom Doors', 'Sliding & Pocket Doors', 'Frosted Glass Interior Doors', 'Door Frames & Linings', 'Door Handles & Lock Sets', 'Fire-Rated Doors'],
    whatsapp: 'Hi Westline Future, I need doors — supply and/or installation.',
    img: '🚪',
  },
  {
    id: 'electrical',
    Icon: Zap,
    name: 'Electrical Installation',
    tagline: 'Wiring, lighting, sockets, DB boards & smart home electrical works',
    keywords: ['electrician accra', 'electrical installation ghana', 'electrical wiring accra', 'lighting installation ghana', 'smart home ghana', 'DB board accra', 'electrical contractor ghana'],
    desc: 'Our certified electricians handle all electrical installation and upgrade works worldwide. From rewiring a home to installing smart lighting systems, installing distribution boards, and fitting sockets and switches — we do it all to ECG and industry standards. We also supply and install LED lighting, chandeliers, and smart switches.',
    items: ['Full Electrical Wiring', 'Distribution Board (DB) Installation', 'LED Lighting & Chandelier Fitting', 'Smart Home Switches & Sockets', 'Security Camera Wiring', 'Power Outlet & USB Socket Installation', 'Outdoor & Landscape Lighting', 'Solar System Wiring'],
    whatsapp: 'Hi Westline Future, I need electrical work done — wiring / lighting / sockets.',
    img: '💡',
  },
  {
    id: 'plumbing',
    Icon: Droplets,
    name: 'Plumbing & Sanitary Works',
    tagline: 'Plumbing installation, pipe works, sanitary fittings & water systems',
    keywords: ['plumber accra', 'plumbing services ghana', 'plumbing installation accra', 'sanitary fittings ghana', 'water heater installation ghana', 'pipe works accra', 'plumbing contractor ghana'],
    desc: 'Our experienced plumbers handle everything from new plumbing installations to repairs and upgrades. We install sanitary ware, water heaters, booster pumps, overhead tanks, and complete pipe systems for homes and commercial buildings. We use quality materials and comply with all building codes and standards.',
    items: ['Plumbing & Pipe Installation', 'Sanitary Ware Installation', 'Water Heater (Geyser) Setup', 'Booster Pump Installation', 'Overhead Tank & Plumbing', 'Kitchen Sink & Dishwasher Plumbing', 'Drain & Waste Systems', 'Outdoor Tap & Garden Plumbing'],
    whatsapp: 'Hi Westline Future, I need plumbing work — installation / repairs.',
    img: '🚰',
  },
];

export default function ServicesPage({ brand, navigate }) {
  const ac = brand?.color || '#0F766E';
  const winW = useWindowWidth();
  const mob = winW <= 900;
  const [activeId, setActiveId] = useState(null);

  const whatsappBase = brand?.whatsapp || '233598455012';

  return (
    <div style={{ background: LIGHT_BG }}>
      {/* Hero */}
      <section style={{ padding: mob ? '120px 24px 80px' : '180px 5vw 100px', background: '#111827', color: '#fff' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>WHAT WE DO</span>
          <h1 style={{ fontSize: mob ? 40 : 72, fontWeight: 800, letterSpacing: '-0.04em', margin: '16px 0', color: '#fff', lineHeight: 1.05 }}>
            Every service your<br />
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>home or office needs.</em>
          </h1>
          <p style={{ fontSize: mob ? 15 : 18, color: 'rgba(255,255,255,0.55)', maxWidth: 600, lineHeight: 1.7, marginBottom: 40 }}>
            Glass, aluminium, bathrooms, kitchens, wardrobes, tiles, doors, electrical, and plumbing — we handle it all under one roof worldwide.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {ALL_SERVICES.map(s => (
              <button
                key={s.id}
                onClick={() => { const el = document.getElementById(`svc-${s.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                style={{ padding: '8px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {s.Icon && <s.Icon size={12} strokeWidth={2} />}
                {s.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Service Sections */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: mob ? '60px 24px' : '80px 5vw' }}>
        {ALL_SERVICES.map((svc, idx) => {
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
                    <p style={{ fontSize: 13, color: '#6B7280', margin: 0, fontWeight: 500 }}>{svc.tagline}</p>
                  </div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: isOpen ? ac : '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.25s' }}>
                  <ChevronRight size={18} color={isOpen ? '#fff' : '#6B7280'} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.25s' }} />
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: mob ? '0 28px 32px' : '0 48px 48px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr', gap: 48, paddingTop: 32 }}>
                    <div>
                      <p style={{ fontSize: 15, color: 'rgba(17,24,39,0.65)', lineHeight: 1.8, marginBottom: 32 }}>{svc.desc}</p>
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
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>What we cover</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {svc.items.map(item => (
                          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#F9FAFB', borderRadius: 12 }}>
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
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: '#111827', color: '#fff' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ color: ac, fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase' }}>OUR REACH</span>
          <h2 style={{ fontSize: mob ? 32 : 52, fontWeight: 800, letterSpacing: '-0.03em', margin: '16px 0 12px' }}>Serving all of Ghana</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 48, maxWidth: 500, margin: '0 auto 48px' }}>
            Our installation teams operate across the country — wherever you are, we come to you.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            {['Accra', 'Kumasi', 'Takoradi', 'Cape Coast', 'Koforidua', 'Tarkwa', 'Ho', 'Sunyani', 'Tamale', 'Bolgatanga', 'Wa', 'Tema', 'Kasoa', 'Madina', 'Adenta'].map(city => (
              <div key={city} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', borderRadius: 100, fontSize: 13, fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                📍 {city}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section style={{ padding: mob ? '60px 24px' : '100px 5vw', background: '#FDFCFB' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: mob ? 32 : 52, fontWeight: 800, color: DARK_TEXT, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Not sure what you need? <em style={{ fontStyle: 'italic', fontWeight: 400, color: ac }}>Just ask.</em>
          </h2>
          <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 40, lineHeight: 1.7 }}>
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
