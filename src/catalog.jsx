export const GLASS_CATALOG_CATEGORIES = [
  // --- ALUMINUM SYSTEMS ---
  { id: 'casement',     label: 'Casement Windows',  icon: '🪟', groupId: 'aluminum',  desc: 'Outward-opening thermalbreak aluminum windows.' },
  { id: 'inward',       label: 'Inward Opening',    icon: '🔀', groupId: 'aluminum',  desc: 'Versatile inward-opening and tilting windows.' },
  { id: 'sliding-win',  label: 'Sliding Windows',   icon: '↔️', groupId: 'aluminum',  desc: 'Space-saving horizontal sliding window systems.' },
  { id: 'specialty-win',label: 'Specialty Windows', icon: '✨', groupId: 'aluminum',  desc: 'Motorized lifts and unique architectural window openings.' },
  { id: 'sliding-door', label: 'Sliding Doors',     icon: '🚪', groupId: 'aluminum',  desc: 'Ultra-slim profile sliding door systems.' },
  { id: 'swing-door',   label: 'Swing & Pivot',     icon: '🔄', groupId: 'aluminum',  desc: 'Architect-grade swing and pivot entry systems.' },
  { id: 'folding-door', label: 'Folding Doors',     icon: '🪗', groupId: 'aluminum',  desc: 'Premium bi-fold and accordion door systems.' },
  { id: 'sunroom',      label: 'Sunroom & Skylight',icon: '☀️', groupId: 'aluminum',  desc: 'Enclosed aluminium sunroom structures.' },
  
  // --- KITCHEN SYSTEMS ---
  { id: 'kitchen-new',       label: 'New Arrivals',         icon: '✨', groupId: 'kitchen', desc: 'Latest kitchen designs.' },
  { id: 'kitchen-sintered',  label: 'Sintered Surface',     icon: '🪨', groupId: 'kitchen', desc: 'Ultra-hard sintered surfaces.' },
  { id: 'kitchen-wood',      label: 'Solid Wood',           icon: '🌳', groupId: 'kitchen', desc: 'Hardwood cabinetry.' },
  { id: 'kitchen-veneer',    label: 'Wood Veneer',          icon: '🪵', groupId: 'kitchen', desc: 'Real wood grain veneer.' },
  { id: 'kitchen-pet',       label: 'PET Panel',            icon: '🔲', groupId: 'kitchen', desc: 'High-gloss or matte PET.' },
  { id: 'kitchen-hpl',       label: 'HPL',                  icon: '⬛', groupId: 'kitchen', desc: 'High Pressure Laminate.' },
  { id: 'kitchen-lacquer',   label: 'Lacquer',              icon: '🎨', groupId: 'kitchen', desc: 'Eco-lacquer finish.' },
  { id: 'kitchen-spray',     label: 'Spray Lacquer',        icon: '💨', groupId: 'kitchen', desc: 'Premium spray finish.' },
  { id: 'kitchen-uv',        label: 'UV Lacquer',           icon: '💡', groupId: 'kitchen', desc: 'UV-cured panels.' },
  { id: 'kitchen-melamine',  label: 'Melamine',             icon: '🔳', groupId: 'kitchen', desc: 'Economical fine texture.' },
  { id: 'kitchen-pvc',       label: 'PVC Foil',             icon: '🌊', groupId: 'kitchen', desc: 'Beautiful wood-grain alternative.' },
  { id: 'kitchen-pp',        label: 'PP Foil',              icon: '🏠', groupId: 'kitchen', desc: 'Outstanding price-performance.' },

  // --- WASHROOM SYSTEMS ---
  { id: 'shower',       label: 'Shower Enclosures', icon: '🚿', groupId: 'washroom',  desc: 'Stainless steel and tempered glass.' },
  { id: 'washroom-acc', label: 'Bathroom Fixtures', icon: '🛁', groupId: 'washroom',  desc: 'Premium integrated solutions.' },
  { id: 'vanity',       label: 'Vanity Units',      icon: '🪞', groupId: 'washroom',  desc: 'Basin vanity units and mirror cabinets.' },

  // --- WARDROBE SYSTEMS ---
  { id: 'wardrobe-sliding',  label: 'Sliding Wardrobes',  icon: '👔', groupId: 'wardrobe', desc: 'Space-saving sliding door wardrobes.' },
  { id: 'wardrobe-fitted',   label: 'Fitted Wardrobes',   icon: '🗄️', groupId: 'wardrobe', desc: 'Floor-to-ceiling fitted wardrobe systems.' },
  { id: 'wardrobe-walkin',   label: 'Walk-in Closets',    icon: '🚶', groupId: 'wardrobe', desc: 'Custom walk-in closet and dressing room design.' },
  { id: 'wardrobe-swing',    label: 'Swing Door Wardrobes', icon: '🔄', groupId: 'wardrobe', desc: 'Traditional hinged wardrobe systems.' },

  // --- TILES & FLOORING ---
  { id: 'tiles-floor',       label: 'Floor Tiles',        icon: '🟫', groupId: 'tiles', desc: 'Porcelain and ceramic floor tiles.' },
  { id: 'tiles-wall',        label: 'Wall Tiles',         icon: '🟦', groupId: 'tiles', desc: 'Designer wall tiles for bathrooms and kitchens.' },
  { id: 'tiles-outdoor',     label: 'Outdoor / Decking',  icon: '🏡', groupId: 'tiles', desc: 'Anti-slip outdoor and pool deck tiles.' },
  { id: 'tiles-large',       label: 'Large Format Slabs', icon: '⬜', groupId: 'tiles', desc: '1200×2400mm and 900×1800mm large format slabs.' },

  // --- DOORS ---
  { id: 'door-timber',       label: 'Timber Doors',       icon: '🌲', groupId: 'doors', desc: 'Solid and engineered timber interior doors.' },
  { id: 'door-wpc',          label: 'WPC Doors',          icon: '💧', groupId: 'doors', desc: 'Waterproof WPC composite bathroom doors.' },
  { id: 'door-security',     label: 'Security Doors',     icon: '🔒', groupId: 'doors', desc: 'Steel-core armored entry security doors.' },
  { id: 'door-glass',        label: 'Glass Doors',        icon: '🪟', groupId: 'doors', desc: 'Frameless and framed glass interior doors.' },

  // --- ELECTRICAL ---
  { id: 'elec-lighting',     label: 'LED Lighting',       icon: '💡', groupId: 'electrical', desc: 'Recessed, strip, and pendant LED systems.' },
  { id: 'elec-switches',     label: 'Smart Switches',     icon: '🔌', groupId: 'electrical', desc: 'Touch, smart, and designer switch plates.' },
  { id: 'elec-db',           label: 'DB Boards & Wiring', icon: '⚡', groupId: 'electrical', desc: 'Consumer units, MCBs, and full wiring.' },
  { id: 'elec-fans',         label: 'Ceiling Fans',       icon: '🌀', groupId: 'electrical', desc: 'Energy-efficient ceiling fans with LED kits.' },

  // --- PLUMBING ---
  { id: 'plumb-taps',        label: 'Taps & Mixers',      icon: '🚰', groupId: 'plumbing', desc: 'Basin, sink, and bath taps and mixer sets.' },
  { id: 'plumb-sanitary',    label: 'Sanitary Ware',      icon: '🚽', groupId: 'plumbing', desc: 'WC pans, cisterns, and bathroom suites.' },
  { id: 'plumb-heater',      label: 'Water Heaters',      icon: '🔥', groupId: 'plumbing', desc: 'Electric and solar water heaters.' },
  { id: 'plumb-pipes',       label: 'Pipes & Fittings',   icon: '🔧', groupId: 'plumbing', desc: 'PPR, PVC, and CPVC pipe systems.' },

  // --- INTERIOR FINISHING ---
  { id: 'interior-partition', label: 'Glass Partitions',  icon: '🪟', groupId: 'interior', desc: 'Office and residential glass partition systems.' },
  { id: 'interior-ceiling',   label: 'Ceilings & Cornices', icon: '🏛️', groupId: 'interior', desc: 'Gypsum board ceilings, cornices, and suspended systems.' },
  { id: 'interior-balustrade', label: 'Balustrades',      icon: '🔗', groupId: 'interior', desc: 'Glass and stainless steel staircase balustrades.' },
  { id: 'interior-curtain',   label: 'Curtain Walls',     icon: '🏢', groupId: 'interior', desc: 'Structural curtain wall facade systems.' },
];

export const GLASS_CATALOG_DATA = [];

export const DEFAULT_SCENES = [
  {
    id: 'def-1',
    title: 'The Panoramic Penthouse',
    location: 'Airport Residential, Accra',
    img: 'https://images.unsplash.com/photo-1519302959554-a75be0afc82a?q=80&w=2084&auto=format&fit=crop',
    description: 'A study in transparency and structural integrity. Our ultra-narrow sliding systems dissolve the boundary between interior luxury and the city skyline.',
    hotspots: [
      { x: 40, y: 50, title: '103 Extremely Narrow Sliding', desc: '1.3mm visible stile for maximum glass area.', specs: { thickness: '24mm DGU', rating: 'SLA Level 5', finish: 'Anodized Black' } },
      { x: 75, y: 30, title: 'Tempered Low-E Glazing', desc: 'Thermal break technology for heat reduction.', specs: { u_value: '1.1 W/m²K', solar_gain: '0.28', clarity: '92%' } }
    ]
  },
  {
    id: 'def-2',
    title: 'The Innovation Facility',
    location: 'Spintex Industrial Area',
    img: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop',
    description: 'Where precision meets scale. Our fabrication facility utilizes high-tech CNC processing to ensure sub-millimeter accuracy for every component.',
    hotspots: [
      { x: 50, y: 60, title: 'CNC Glass Processing', desc: 'Automated edge grinding and drilling for structural safety.', specs: { precision: '±0.2mm', speed: '45m/min', max_size: '3000x6000mm' } },
      { x: 20, y: 40, title: 'Toughening Line', desc: 'High-speed tempering for maximum mechanical strength.', specs: { temp: '700°C', stress: '>95 MPa', standard: 'EN 12150' } }
    ]
  },
  {
    id: 'def-3',
    title: 'Structural Luxe Interior',
    location: 'East Legon',
    img: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop',
    description: 'Bespoke interior finishing where architectural glass partitions define luxury living and working spaces.',
    hotspots: [
      { x: 30, y: 50, title: 'Frameless Glass Wall', desc: 'Floor-to-ceiling glass systems with recessed aluminum tracks.', specs: { height: '3.2m', glass: '12mm Monolithic', finish: 'Satin Bronze' } },
      { x: 60, y: 40, title: 'Acoustic Laminated Glass', desc: 'High-performance sound reduction for private suites.', specs: { stc_rating: '42 dB', interlayer: '0.76mm PVB', thickness: '13.52mm' } }
    ]
  },
  {
    id: 'def-4',
    title: 'Reflective Facade Detail',
    location: 'Tema Waterfront',
    img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop',
    description: 'High-performance curtain wall systems engineered for the harsh the worldn climate.',
    hotspots: [
      { x: 45, y: 55, title: 'Structural Silicone Glazing', desc: 'Frameless exterior appearance with mechanical fixings.', specs: { wind_load: '3.5 kPa', sealant: 'Dow Corning 993', movement: '±25%' } },
      { x: 70, y: 40, title: 'Solar Control Coating', desc: 'Reflective coating for energy efficiency and privacy.', specs: { shgc: '0.22', vlt: '18%', reflectance: '34%' } }
    ]
  }
];
