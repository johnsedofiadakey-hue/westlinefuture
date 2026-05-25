import React from 'react';
import { DollarSign, Eye, MessageSquare, CheckCircle, Users, Factory, Truck, Layers, AppWindow, ShowerHead, ChefHat, Shirt, LayoutGrid, DoorOpen, Zap, Droplets } from 'lucide-react';

export const PROJECT_STAGES = [
  {
    id: 1, name: 'Intake', statusLabel: 'Site survey', days: 7, color: `var(--text-secondary)`,
    icon: 'palette', description: 'Reviewing requirements and scheduling technical site survey.',
    tasks: ['Understand scope', 'Conduct site visits', 'Take measurements', 'Prepare initial quotation and drawings']
  },
  {
    id: 2, name: 'Quote Approval & Deposit', statusLabel: 'Funds confirmed', days: 5, color: '#F4D6A7', requiresApproval: true, requiresPayment: true, paymentPct: 50,
    icon: 'dollar-sign', description: 'Reviewing the quotation, signing off, and securing deposit.',
    tasks: ['Review detailed quotation', 'Sign off technical drawings', 'Submit initial deposit', 'Materials ordered from supplier']
  },
  {
    id: 3, name: 'Procurement & Production', statusLabel: 'Factory is working', days: 21, color: '#3E2414',
    icon: 'factory', description: 'Procuring materials and fabricating your custom components at our facility.',
    tasks: ['Procure materials', 'Cutting & processing complete', 'Quality control inspection passed', 'Components packed for dispatch']
  },
  {
    id: 4, name: 'Shipping & Delivery', statusLabel: 'In transit to site', days: 30, color: '#A69282',
    icon: 'ship', description: 'Cargo is in transit from the factory to your site via ocean freight.',
    tasks: ['Dispatched from factory', 'Ocean freight booking confirmed', 'Customs clearance processed', 'Local delivery to site completed']
  },
  {
    id: 5, name: 'Installation', statusLabel: 'Active installation', days: 5, color: '#3E2414',
    icon: 'wrench', description: 'Our technical crew is on-site fitting and finishing all components.',
    tasks: ['Site prepared and secured', 'Structural installation complete', 'Finishing and sealant applied', 'Upload daily photos']
  },
  {
    id: 6, name: 'Inspection & Sign-off', statusLabel: 'Quality Checks', days: 2, color: `var(--accent-primary)`, requiresApproval: true,
    icon: 'search', description: 'Conducting final quality checks. Please review the work and sign off.',
    tasks: ['Run through quality checklist', 'Resolve minor defects', 'Client sign-off on completion']
  },
  {
    id: 7, name: 'Handover & Final Settlement', statusLabel: 'Project Handover', days: 1, color: `var(--accent-secondary)`, requiresPayment: true, paymentPct: 50,
    icon: 'star', description: 'Project complete. Final balance cleared and handover documents issued.',
    tasks: ['Final payment received', 'Handover documents signed', 'Warranty activated', 'Client satisfaction confirmed']
  }
];

export const KANBAN_COLUMNS = [
  { id: 'intake',       label: 'Intake',       stages: [1], color: `var(--text-secondary)`, bg: 'rgba(139,115,85,0.07)' },
  { id: 'quote',        label: 'Quote & Deposit', stages: [2], color: '#F4D6A7', bg: 'rgba(244,214,167,0.07)' },
  { id: 'production',   label: 'Production',   stages: [3], color: '#3E2414', bg: 'rgba(62,36,20,0.06)' },
  { id: 'delivery',     label: 'Delivery',     stages: [4], color: '#A69282', bg: 'rgba(166,146,130,0.07)' },
  { id: 'installation', label: 'Installation', stages: [5], color: '#3E2414', bg: 'rgba(62,36,20,0.07)' },
  { id: 'inspection',   label: 'Inspection',   stages: [6], color: `var(--accent-primary)`, bg: 'rgba(200,143,67,0.07)' },
  { id: 'completion',   label: 'Completion',   stages: [7], color: `var(--accent-secondary)`, bg: 'rgba(24,14,6,0.08)' },
];

export const LIFE_RIBBON = [
  { id: 'onboard', label: 'Start', icon: <Users size={24} />, stages: [1], color: `var(--accent-secondary)`, text: 'We are setting up your project and checking all the details.' },
  { id: 'deposit', label: 'Approve', icon: <DollarSign size={24} />, stages: [2], color: '#F4D6A7', text: 'We are securing the high-quality materials for your build.' },
  { id: 'factory', label: 'Build', icon: <Factory size={24} />, stages: [3], color: `var(--accent-secondary)`, text: 'Your items are being carefully built in our factory.' },
  { id: 'shipping', label: 'Move', icon: <Truck size={24} />, stages: [4], color: '#A69282', text: 'Your order is packed and moving toward your location.' },
  { id: 'delivered', label: 'Finish', icon: <CheckCircle size={24} />, stages: [5,6,7], color: `var(--accent-primary)`, text: 'Everything is installed and ready for you to enjoy.' }
];

export const PROCUREMENT_STAGES = [
  { id: 'to-buy', name: 'To Buy', icon: '🛒', color: '#DFD9D1' },
  { id: 'ordered', name: 'Order Placed', icon: '📝', color: '#FF9800' },
  { id: 'production', name: 'In Production', icon: '🏭', color: `var(--accent-secondary)` },
  { id: 'warehouse', name: 'At Warehouse', icon: '📦', color: '#3E2414' },
  { id: 'transit', name: 'In Transit', icon: '🚢', color: `var(--accent-primary)` },
  { id: 'site', name: 'At Site', icon: '🏠', color: '#3E2414' }
];

export const ABOUT_DATA = {
  founder: 'John Dakey',
  role: 'Managing Director',
  storyTitle: 'Crafting the Future of Structural Glass & Interiors',
  story: "Under the leadership of John Dakey, Managing Director, Westline Future has evolved from a structural glass specialist into Ghana's premier hub for complete interior finishing. Our mission is to bridge the gap between industrial engineering and luxury design.",
  bio: 'The leadership of Westline Future brings together deep expertise in structural glass, aluminum systems, and international procurement. Our mission: deliver a world-class finish on every project through China-sourced precision materials and expert installation.',
  image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop'
};

export const BRAND0 = {
  name: 'Westline Future',
  tagline: 'Global Trading Co, Ltd',
  logo: '/logo.png?v=2',
  color: `var(--accent-secondary)`,
  phone: '',
  email: 'admin@westlinefuture.com',
  location: '',
  instagram: '@westlinefuture',
  facebook: 'WestlineFuture',
  twitter: '@westlinefuture',
  linkedin: 'westlinefuture',
  whatsapp: '',
  website: 'www.westlinefuture.com'
};

// Live team data comes from Firestore (users collection, role != 'client').
// This fallback is only used in offline/demo mode.
export const TEAM_MEMBERS = [];

export const PORTFOLIO_DATA = [
  {id:1,title:'The Volta Suite',cat:'Full Interior',after:'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80',before:'',year:'2024',loc:'Private Development',area:'4,200 sq ft',duration:'5 months',budget:'$195,000',style:'Modern Industrial',hasBA:false,desc:'Total interior finishing including kitchens, tiling, and lighting.',imgs:['https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80']},
  {id:2,title:'Airport Hills Kitchen',cat:'Kitchen Installation',after:'https://images.unsplash.com/photo-1556911223-e1534ff6f755?w=1600&q=80',before:'',year:'2024',loc:'Commercial Tower',area:'1,100 sq ft',duration:'2 months',budget:'$72,000',style:'Minimalist',hasBA:false,desc:'Bespoke smart kitchen installation with high-gloss finish.',imgs:['https://images.unsplash.com/photo-1556911223-e1534ff6f755?w=1600&q=80']},
];

export const HERO_SLIDES = [
  { img: '/hero_seo.png', title: 'Design. Source.\nInstall.', sub: 'A managed project system for premium interiors, CAD/3D rendering, global sourcing, logistics, installation, and handover.' },
  { img: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop', title: 'From concept\nto handover.', sub: 'Clients approve drawings, quotes, payments, timelines, and completion records through a controlled Westline workflow.' }
];

export const ALL_SERVICES = [
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

export const SERVICES_DATA = ALL_SERVICES.map(({ Icon, ...rest }) => rest);

export const PROCESS_STEPS = [
  {n:'01',title:'Technical Survey',body:'Measurements.',img:'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&q=80'}
];



export const ROOM_GALLERY = {
  'Living Room':['https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=700&q=80']
};

export const WHY_US = [
  {n:'01',title:'Precision',desc:'CNC cutting.'}
];

export const BOOKING_SLOTS = ['9:00 AM','10:00 AM','11:00 AM','2:00 PM','3:00 PM','4:00 PM'];
export const BOOKINGS_DATA = [];
export const EMAIL_QUEUE = [];
export const CLIENTS_DATA = [];
export const PROPOSALS_DATA = [];
export const INVOICES_DATA = [];
export const REV = [
  { month: 'Jan', revenue: 45000, target: 40000 },
  { month: 'Feb', revenue: 52000, target: 40000 },
  { month: 'Mar', revenue: 48000, target: 45000 },
  { month: 'Apr', revenue: 61000, target: 50000 },
  { month: 'May', revenue: 55000, target: 50000 },
  { month: 'Jun', revenue: 67000, target: 60000 }
];

export const PIE_D = [
  { name: 'Residential', value: 45, color: `var(--accent-secondary)` },
  { name: 'Commercial', value: 35, color: '#3E2414' },
  { name: 'Industrial', value: 20, color: `var(--accent-primary)` }
];

export const PIE_C = [
  { name: 'Ghana', value: 70, color: `var(--accent-secondary)` },
  { name: 'Togo', value: 15, color: '#3E2414' },
  { name: 'Nigeria', value: 15, color: `var(--accent-primary)` }
];

export const NOTIFS_DATA = [
  { id: 1, title: 'New Project Request', body: 'The Volta Suite requires technical survey.', time: '2h ago', type: 'project' },
  { id: 2, title: 'Payment Verified', body: 'Airport Hills Kitchen deposit confirmed.', time: '5h ago', type: 'payment' }
];

export const CLIENT_NAMES = ['Westline Future Client', 'AFCFTA Secretariat', 'Airport Hills Dev'];

// ─── Client Project Pipeline ─────────────────────────────────────────────────
export const CLIENT_PROJECT_STAGES = [
  {
    id: 1, name: 'Intake & Survey', short: 'Survey', emoji: '🔍', color: `var(--text-secondary)`, pct: 5, days: 5,
    whoActs: 'admin',
    clientMsg: 'Reviewing requirements and scheduling technical site survey.',
    adminPrompt: 'Reviewing requirements and scheduling technical site survey.',
  },
  {
    id: 2, name: 'Design & Rendering', short: 'Design', emoji: '🎨', color: '#9333EA', pct: 15, days: 7,
    whoActs: 'client',
    clientMsg: 'Reviewing the 3D rendering and design intent. Rendering fee must be paid before access.',
    adminPrompt: 'Waiting for client to pay rendering fee, and approve design.',
    requiresDesignApproval: true,
  },
  {
    id: 3, name: 'Quote Approval & Deposit', short: 'Quote', emoji: '💳', color: `var(--accent-primary)`, pct: 25, days: 7,
    whoActs: 'client',
    clientMsg: 'Reviewing the final quotation, signing off, and securing project deposit.',
    adminPrompt: 'Reviewing the quotation, signing off, and securing deposit.',
    needsClientApproval: true, requiresPayment: true, paymentPct: 50,
  },
  {
    id: 4, name: 'Procurement & Production', short: 'Production', emoji: '🏭', color: '#3E2414', pct: 45, days: 30,
    whoActs: 'admin',
    clientMsg: 'Procuring materials and fabricating your custom components at our facility.',
    adminPrompt: 'Procuring materials and fabricating your custom components at our facility.',
  },
  {
    id: 5, name: 'Shipping & Delivery', short: 'Shipping', emoji: '🚛', color: '#A69282', pct: 60, days: 35,
    whoActs: 'admin',
    clientMsg: 'Cargo is in transit from the factory to your site via ocean freight.',
    adminPrompt: 'Cargo is in transit from the factory to your site via ocean freight.',
  },
  {
    id: 6, name: 'Installation', short: 'Install', emoji: '🔧', color: '#3E2414', pct: 80, days: 7,
    whoActs: 'worker',
    clientMsg: 'Our technical crew is on-site fitting and finishing all components.',
    adminPrompt: 'Our technical crew is on-site fitting and finishing all components.',
    fullServiceOnly: true,
  },
  {
    id: 7, name: 'Inspection & Sign-off', short: 'Inspect', emoji: '🔎', color: `var(--accent-primary)`, pct: 90, days: 3,
    whoActs: 'both',
    clientMsg: 'Conducting final quality checks. Please review the work and sign off.',
    adminPrompt: 'Conducting final quality checks. Please review the work and sign off.',
    needsClientApproval: true,
  },
  {
    id: 8, name: 'Handover & Final Settlement', short: 'Completion', emoji: '🌟', color: `var(--accent-secondary)`, pct: 100, days: 1,
    whoActs: 'client',
    clientMsg: 'Project complete. Final balance cleared and handover documents issued.',
    adminPrompt: 'Project complete. Final balance cleared and handover documents issued.',
    requiresPayment: true, paymentPct: 50,
  },
];

// Maps legacy 12-stage records to the current client pipeline.
const LEGACY_STAGE_MAP = { 
  1:1, 2:1, 3:2, 4:2, 5:3, 6:3, 7:3, 8:4, 9:4, 10:5, 11:6, 12:7 
};
export function normalizeStageId(id) {
  const n = typeof id === 'number' ? id : parseInt(id, 10);
  if (!n || n < 1) return 1;
  if (n <= 7) return n;
  return LEGACY_STAGE_MAP[n] ?? Math.min(7, Math.ceil((n / 12) * 7));
}

export const PROJECT_TYPES = {
  'full-service': { label: 'Full Service',  desc: 'We source, ship, clear, deliver, install, inspect, and hand over.', stages: [1,2,3,4,5,6,7,8], color: `var(--accent-secondary)` },
  'buy-only':     { label: 'Buy & Deliver', desc: 'We design, quote, source, ship, deliver, inspect, and close out.',  stages: [1,2,3,4,5,7,8],   color: `var(--accent-primary)` },
};
export const AWARDS = [
  { id: 1, name: 'Excellence in Structural Glass', year: '2023', body: 'Ghana Property Awards' }
];

export const WORKSPACES_DATA = [
  { id: 'all', name: 'Global Hub', status: 'Active' }
];

export const PRODUCTS_DATA = [];
export const GLASS_CATALOG_DATA = [];
export const GLASS_CATALOG_CATEGORIES = [];
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

export const DEFAULT_STATS = [
  { value: '200+', label: 'Projects Delivered', labelMob: 'Projects' },
  { value: '12+',  label: 'Years Experience',   labelMob: 'Years' },
  { value: '98%',  label: 'Client Satisfaction', labelMob: 'Satisfaction' },
  { value: '8',    label: 'Countries Served',    labelMob: 'Countries' },
];

export const DEFAULT_WHY_US = [
  { emoji: '🛡️', title: 'Guaranteed Quality',     desc: 'Every installation backed by a 2-year workmanship warranty and certified materials from vetted manufacturers.' },
  { emoji: '⏱️', title: 'On-Time Delivery',       desc: 'Our dedicated logistics team tracks every shipment. 94% of projects completed on or ahead of schedule.' },
  { emoji: '🌍', title: 'Direct China Sourcing',  desc: 'We cut out middlemen. Factory-direct procurement means premium glass at 20–35% below market rates.' },
  { emoji: '🔧', title: 'Technical Expertise',    desc: 'CNC precision, sub-millimeter tolerances. Our engineers have handled façades, curtain walls, and interior systems for 12+ years.' },
];

export const DEFAULT_HOME_SERVICES = [
  { id: 'glass',    emoji: '🏗️', name: 'Glass Engineering',  short: 'Custom structural glazing, balustrades, and washroom systems.' },
  { id: 'interior', emoji: '🪑', name: 'Interior Fit-out',   short: 'Luxury finishing, kitchen systems, and custom cabinetry.' },
  { id: 'sourcing', emoji: '📦', name: 'China Sourcing',     short: 'Direct procurement and logistics for premium materials.' },
];

export const DEFAULT_CTA = {
  heading: "Ready to build something remarkable?",
  sub:     "From concept to installation — our team handles every detail.",
  btn1:    "Request a Quote",
  btn2:    "View Portfolio",
};

export const DEFAULT_WORKFLOW = [
  {
    step: 1,
    phase: "Sourcing Consultation & Intention",
    title: "Initial Consultation",
    desc: "Before finalizing the collaboration, communicate and clarify the client's design requirements, style preferences, and other relevant details.",
    pdfImg: "/workflow/step_1.png",
    renderImg: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    icon: "MessageSquare",
    deliverables: [
      "Understand and document client spatial wishlist",
      "Discuss functional preferences and design limits",
      "Outline broad timeline constraints and styles"
    ]
  },
  {
    step: 2,
    phase: "Sourcing Consultation & Intention",
    title: "Design Deposit",
    desc: "The two parties have confirmed their intention to cooperate and have paid an intention deposit.",
    pdfImg: "/workflow/step_2.png",
    renderImg: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    icon: "CreditCard",
    deliverables: [
      "Mutual confirmation of target parameters",
      "Design deposit secure transaction processing",
      "Assign project designer and account leads"
    ]
  },
  {
    step: 3,
    phase: "Sourcing Consultation & Intention",
    title: "Fill in the Requirements",
    desc: "Before starting the design, the client needs to complete a requirements and preferences list to facilitate clear and effective communication.",
    pdfImg: "/workflow/step_3.png",
    renderImg: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80",
    icon: "ClipboardList",
    deliverables: [
      "Submit completed family preferences checklist",
      "Confirm preferred finish materials and features",
      "Align expectations to avoid planning revisions"
    ]
  },
  {
    step: 4,
    phase: "Architectural Site Surveys",
    title: "Conduct on-Site Property Measurement & CAD Diagram",
    desc: "1. Prior to commencing the design phase, the account manager scheduled a viewing appointment with the property owner. The site surveyor conducted an on-site inspection of the property's structure, floor height, orientation, ventilation, and natural lighting conditions, while measuring and documenting specific dimensions using specialized instruments and marking the locations of pipelines.\n\n2. The surveyor uses the hand-drawn blueprint to generate a CAD file for the designer.",
    pdfImg: "/workflow/step_4.png",
    renderImg: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80",
    icon: "Ruler",
    deliverables: [
      "Physical site dimensional auditing",
      "Orientation, lighting, and height profile review",
      "Technical CAD structural layout generation"
    ]
  },
  {
    step: 5,
    phase: "Design, Layout & Renderings",
    title: "Plan View (Floor Plan)",
    desc: "The designer created the floor plan based on the original layout and in accordance with the client's requirements.",
    pdfImg: "/workflow/step_5.png",
    renderImg: "https://images.unsplash.com/photo-1503387873255-3a4a2345e650?auto=format&fit=crop&w=1200&q=80",
    icon: "Layout",
    deliverables: [
      "Detailed spatial floor plans matching specs",
      "Optimal circulation flow and layout planning",
      "Zoning options for furniture and fixtures"
    ]
  },
  {
    step: 6,
    phase: "Design, Layout & Renderings",
    title: "Conceptual Design",
    desc: "Provide an intent illustration along with the layout and prepare a PPT.",
    pdfImg: "/workflow/step_6.png",
    renderImg: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    icon: "Compass",
    deliverables: [
      "Spatial color and mood references selection",
      "Intent sketches mapping structural directions",
      "Compile comprehensive concept design deck"
    ]
  },
  {
    step: 7,
    phase: "Design, Layout & Renderings",
    title: "Effect Picture (3D Renderings)",
    desc: "1. Once the PPT is finalized, the designer will produce 3D renderings or Cooljiale renderings based on the project requirements.",
    pdfImg: "/workflow/step_7.png",
    renderImg: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    icon: "FileImage",
    deliverables: [
      "Photorealistic 3D interior design representations",
      "High-precision material lighting models",
      "Detailed visualization of structural spaces"
    ]
  },
  {
    step: 8,
    phase: "Design, Layout & Renderings",
    title: "Construction Drawing Preparation",
    desc: "1. If necessary, generate CAD construction drawings based on the renderings.\n\n2. This primarily includes the following contents: Original measurement drawing, plan dimension drawing, floor layout drawing, wall demolition drawing, wall construction drawing, ceiling layout & dimension drawing, floor plan, lighting switch & wiring diagram. Facade Index Node Diagram",
    pdfImg: "/workflow/step_8.png",
    renderImg: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80",
    icon: "FileText",
    deliverables: [
      "Comprehensive structural measurement blueprints",
      "Demolition, construction, and ceiling framing maps",
      "Electrical circuits, switch systems, and MEP guides"
    ]
  },
  {
    step: 9,
    phase: "Sourcing & Material Procurement",
    title: "Material Selection",
    desc: "1. After the plan is finalized, the designer selects the primary materials for the client and prepares the material list.",
    pdfImg: "/workflow/step_9.png",
    renderImg: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=80",
    icon: "Briefcase",
    deliverables: [
      "Review sample stones, tiles, timber, and glass",
      "Confirm material performance classifications",
      "Draft list of client material coordinates"
    ]
  },
  {
    step: 10,
    phase: "Sourcing & Material Procurement",
    title: "Hardening Material Connection",
    desc: "If necessary, coordinate and confirm the specific materials through communication.",
    pdfImg: "/workflow/step_10.png",
    renderImg: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80",
    icon: "Layers",
    deliverables: [
      "Structural material connection checks",
      "Supplier and fabricator custom alignment",
      "Verify joint sealing and tolerances on site"
    ]
  },
  {
    step: 11,
    phase: "Sourcing & Material Procurement",
    title: "Hard Installation Sourcing List",
    desc: "List of hard finishing materials and list of woodwork components.",
    pdfImg: "/workflow/step_11.png",
    renderImg: "https://images.unsplash.com/photo-1617806118233-18e1db207f62?auto=format&fit=crop&w=1200&q=80",
    icon: "ClipboardList",
    deliverables: [
      "Bespoke woodwork dimensions schedule",
      "Quantities, pricing, and factory dispatch charts",
      "Secure procurement manifest registration"
    ]
  },
  {
    step: 12,
    phase: "Styling, Installation & Shoot",
    title: "Soft Furnishing Coordination",
    desc: "If necessary, provide the property owner with a detailed list of soft furnishing combinations.",
    pdfImg: "/workflow/step_12.png",
    renderImg: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80",
    icon: "Palette",
    deliverables: [
      "Select custom fabrics, leather, and materials",
      "Coordinate furniture silhouettes and accents",
      "Design spatial balance for curtains and carpets"
    ]
  },
  {
    step: 13,
    phase: "Styling, Installation & Shoot",
    title: "Soft Furnishing List",
    desc: "Detailed and itemized Soft Furnishing Sourcing List.",
    pdfImg: "/workflow/step_13.png",
    renderImg: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
    icon: "FileSpreadsheet",
    deliverables: [
      "Compile dynamic shopping lists with item details",
      "Map lighting fixtures, artwork, and accents",
      "Track supplier progress and dispatch logs"
    ]
  },
  {
    step: 14,
    phase: "Styling, Installation & Shoot",
    title: "Guidelines for Soft Furnishing and Interior Design",
    desc: "After completing the purchase of furniture and accessories, the designer provides remote guidance to the client or on-site colleagues on placing the selected soft furnishings in appropriate locations.",
    pdfImg: "/workflow/step_14.png",
    renderImg: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    icon: "Wrench",
    deliverables: [
      "Physical and remote placement styling plans",
      "On-site alignment supervision for accents",
      "Verify overall styling flows for visual balance"
    ]
  },
  {
    step: 15,
    phase: "Styling, Installation & Shoot",
    title: "Graduation Photo Shoot",
    desc: "Take graduation photos and give them away. The homeowner has a set of exquisite electronic photos.",
    pdfImg: "/workflow/step_15.png",
    renderImg: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    icon: "Camera",
    deliverables: [
      "Arrange luxury architectural photoshoot",
      "Set details and spatial photography styling angles",
      "Handover high-end processed digital photo set"
    ]
  }
];

export const INITIAL_CONTENT = {
  hero: { slides: HERO_SLIDES, cta: DEFAULT_CTA },
  about: {
    ...ABOUT_DATA,
    founder: 'John Dakey',
    role: 'Managing Director',
    storyTitle: 'Crafting the Future of Structural Glass & Interiors',
    story: "Under the leadership of John Dakey, Managing Director, Westline Future has evolved from a structural glass specialist into Ghana's premier hub for complete interior finishing. Our mission is to bridge the gap between industrial engineering and luxury design.",
    bio: 'The leadership of Westline Future brings together deep expertise in structural glass, aluminum systems, and international procurement. Our mission: deliver a world-class finish on every project through China-sourced precision materials and expert installation.'
  },
  services:      SERVICES_DATA,
  homeServices:  DEFAULT_HOME_SERVICES,
  process:       PROCESS_STEPS,
  portfolio:     PORTFOLIO_DATA,
  gallery:       ROOM_GALLERY,
  products:      GLASS_CATALOG_DATA,
  categories:    GLASS_CATALOG_CATEGORIES,
  brand:         BRAND0,
  stats:         DEFAULT_STATS,
  whyUs:         DEFAULT_WHY_US,
  workflow:      DEFAULT_WORKFLOW,
};
