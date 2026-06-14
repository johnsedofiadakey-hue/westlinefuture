import React from 'react';
import { DollarSign, Eye, MessageSquare, CheckCircle, Users, Factory, Truck, Layers, AppWindow, ShowerHead, ChefHat, Shirt, LayoutGrid, DoorOpen, Zap, Droplets, Hammer, Sofa, Refrigerator, Sparkles, Grid3x3 } from 'lucide-react';

// ─── Single Source of Truth: 8-Stage Project Pipeline ────────────────────────
// Used by BOTH admin portal (PROJECT_STAGES) and client portal (CLIENT_PROJECT_STAGES).
// Any change here propagates everywhere — Gantt chart, admin client hub, client portal roadmap.
export const CLIENT_PROJECT_STAGES = [
  {
    id: 1, name: 'Survey & Measurements', short: 'Survey', emoji: '🔍',
    color: `var(--text-secondary)`, pct: 5, days: 7,
    statusLabel: 'Site survey & measurements', icon: 'search',
    whoActs: 'admin',
    clientMsg: 'Our team is conducting a technical site survey and taking precise measurements.',
    adminPrompt: 'Conduct on-site survey, record all measurements and dimensions before advancing.',
    tasks: ['Understand scope', 'Conduct site visits', 'Take measurements', 'Prepare initial quotation and drawings'],
  },
  {
    id: 2, name: 'Design & Rendering', short: 'Design', emoji: '🎨',
    color: '#9333EA', pct: 15, days: 7,
    statusLabel: 'Design & 3D rendering', icon: 'palette',
    whoActs: 'client',
    clientMsg: 'Pay to unlock the rendering, review the final design, then sign the complete project specification to authorise production pricing.',
    adminPrompt: 'Verify rendering payment, manage design approval, then upload the final specification for the client to authorise production.',
    tasks: ['Verify rendering fee', 'Produce and revise 3D renders', 'Client approves final design', 'Upload final project specification', 'Client authorises production'],
    requiresDesignApproval: true,
  },
  {
    id: 3, name: 'Quote Approval & Deposit', short: 'Quote', emoji: '💳',
    color: `var(--accent-primary)`, pct: 25, days: 7,
    statusLabel: 'Funds confirmed', icon: 'dollar-sign',
    whoActs: 'client',
    clientMsg: 'Production is authorised. Review the final quotation, approve it, and complete the required project payment.',
    adminPrompt: 'Issue the final quotation from the signed specification, monitor approval, and verify the required payment before production begins.',
    tasks: ['Issue final quotation', 'Client approves quotation', 'Client submits required payment', 'Admin verifies payment', 'Schedule production'],
    needsClientApproval: true, requiresPayment: true, paymentPct: 50,
  },
  {
    id: 4, name: 'Procurement & Production', short: 'Production', emoji: '🏭',
    color: '#3E2414', pct: 45, days: 30,
    statusLabel: 'Factory is working', icon: 'factory',
    whoActs: 'admin',
    clientMsg: 'Procuring materials and fabricating your custom components at our facility.',
    adminPrompt: 'Procuring materials and fabricating custom components at the facility.',
    tasks: ['Procure materials', 'Cutting & processing complete', 'Quality control inspection passed', 'Components packed for dispatch'],
  },
  {
    id: 5, name: 'Shipping & Delivery', short: 'Shipping', emoji: '🚛',
    color: '#A69282', pct: 60, days: 35,
    statusLabel: 'In transit to site', icon: 'ship',
    whoActs: 'admin',
    clientMsg: 'Cargo is in transit from the factory to your site via ocean freight.',
    adminPrompt: 'Cargo is in transit from the factory to your site via ocean freight.',
    tasks: ['Dispatched from factory', 'Ocean freight booking confirmed', 'Customs clearance processed', 'Local delivery to site completed'],
  },
  {
    id: 6, name: 'Installation', short: 'Install', emoji: '🔧',
    color: '#3E2414', pct: 80, days: 7,
    statusLabel: 'Active installation', icon: 'wrench',
    whoActs: 'worker',
    clientMsg: 'Our technical crew is on-site fitting and finishing all components.',
    adminPrompt: 'Our technical crew is on-site fitting and finishing all components.',
    tasks: ['Site prepared and secured', 'Structural installation complete', 'Finishing and sealant applied', 'Upload daily photos'],
    fullServiceOnly: true,
  },
  {
    id: 7, name: 'Inspection & Sign-off', short: 'Inspect', emoji: '🔎',
    color: `var(--accent-primary)`, pct: 90, days: 3,
    statusLabel: 'Quality checks', icon: 'search',
    whoActs: 'both',
    clientMsg: 'Conducting final quality checks. Please review the work and sign off.',
    adminPrompt: 'Conducting final quality checks and client sign-off.',
    tasks: ['Run through quality checklist', 'Resolve minor defects', 'Client sign-off on completion'],
    needsClientApproval: true, requiresApproval: true,
  },
  {
    id: 8, name: 'Handover & Final Settlement', short: 'Completion', emoji: '🌟',
    color: `var(--accent-secondary)`, pct: 100, days: 1,
    statusLabel: 'Project handover', icon: 'star',
    whoActs: 'done',
    clientMsg: 'Project complete. Handover documents have been issued. Thank you for choosing Westline Future!',
    adminPrompt: 'Project complete. Issue handover certificate and close out.',
    tasks: ['Handover documents issued', 'Warranty activated', 'Client satisfaction confirmed'],
  },
];

// Admin portal alias — same 8 stages, ensuring full consistency across Gantt, ClientHub, and ClientPortal
export const PROJECT_STAGES = CLIENT_PROJECT_STAGES;

export const KANBAN_COLUMNS = [
  { id: 'intake',       label: 'Intake',           stages: [1],   color: `var(--text-secondary)`,  bg: 'rgba(139,115,85,0.07)' },
  { id: 'design',       label: 'Design',            stages: [2],   color: '#9333EA',                bg: 'rgba(147,51,234,0.07)' },
  { id: 'quote',        label: 'Quote & Deposit',   stages: [3],   color: `var(--accent-primary)`,  bg: 'rgba(200,143,67,0.07)' },
  { id: 'production',   label: 'Production',        stages: [4],   color: '#3E2414',                bg: 'rgba(62,36,20,0.06)' },
  { id: 'delivery',     label: 'Delivery',          stages: [5],   color: '#A69282',                bg: 'rgba(166,146,130,0.07)' },
  { id: 'installation', label: 'Installation',      stages: [6],   color: '#3E2414',                bg: 'rgba(62,36,20,0.07)' },
  { id: 'inspection',   label: 'Inspection',        stages: [7],   color: `var(--accent-primary)`,  bg: 'rgba(200,143,67,0.07)' },
  { id: 'completion',   label: 'Completion',        stages: [8],   color: `var(--accent-secondary)`,bg: 'rgba(24,14,6,0.08)' },
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
  story: "Founded by CEO Mrs Han alongside partner Andy, Westline Future is a newly established full interior decoration firm, standing as Ghana's leading destination for comprehensive interior finishing. Our mission unites industrial engineering precision with luxury custom interior design.",
  storyTitle: 'One Company. Your Complete Full-Home Interior Decoration Solution.',
  // Co-founders
  founder: 'Mrs Hannah (Han)',
  role: 'CEO & Founding Partner',
  bio: "As CEO and Founding Partner, Mrs Hannah brings over 20 years of elite interior design expertise forged working with top-tier interior brands across Qingdao and Yantai, China. A diligent, detail-driven industry veteran with relentless work ethic, she leverages her decades of refined craftsmanship and high-end design know-how to steer Westline Future's luxury interior operations across Ghana, infusing global Chinese design standards into local Ghanaian bespoke finishing projects.",
  image: null, // Image will be added later
  coFounder: 'Andy',
  coFounderRole: 'Founding Partner',
  coFounderBio: "As founding partner of Westline Future, Andy oversees the company's global marketing strategy and all social media operations while serving as the public brand face for the firm. Drawing on extensive cross-industry entrepreneurial experience, he also leads East Bridge Motors, a specialized Chinese electric vehicle dealership, holds an active partnership with MS Auto Africa, and independently operates his own e-commerce platform: AndyTrackShop.com. His robust background spanning automotive trade, cross-border commerce and digital retail fuels Westline Future's seamless international material sourcing and market expansion.",
  coFounderImage: null,
  // Offices
  accraOffice: 'Lakeside Estates, Accra, Ghana',
  chinaHQ: 'Yantai, Shandong Province, China',
};

export const BRAND0 = {
  name: 'Westline Future',
  tagline: 'Global Trading Co, Ltd',
  logo: '/logo.png?v=2',
  color: `var(--accent-secondary)`,
  phone: '0247319778',
  email: 'admin@westlinefuture.com',
  location: 'Lakeside Estates, Accra, Ghana',
  instagram: '@westlinefuture',
  facebook: 'WestlineFuture',
  twitter: '@westlinefuture',
  linkedin: 'westlinefuture',
  whatsapp: '233247319778',
  website: 'www.westlinedecor.com'
};

// Live team data comes from Firestore (users collection, role != 'client').
// This fallback is only used in offline/demo mode.
export const TEAM_MEMBERS = [];

export const PORTFOLIO_DATA = [
  {
    id: 1,
    title: 'Residential Full Interior — Accra',
    cat: 'Full Interior',
    after: '/portfolio/site9.jpg',
    before: '',
    year: '2024',
    loc: 'Accra, Ghana',
    area: '',
    duration: '',
    budget: '',
    style: 'Contemporary',
    hasBA: false,
    desc: 'Complete interior fit-out including custom built-in wardrobes, kitchen cabinets and full flooring installation.',
    imgs: ['/portfolio/site9.jpg', '/portfolio/site6.jpg', '/portfolio/site7.jpg', '/portfolio/site8.jpg'],
  },
  {
    id: 2,
    title: 'Custom Kitchen & Living — Accra',
    cat: 'Kitchen Installation',
    after: '/portfolio/site12.jpg',
    before: '',
    year: '2024',
    loc: 'Accra, Ghana',
    area: '',
    duration: '',
    budget: '',
    style: 'Modern',
    hasBA: false,
    desc: 'Kitchen cabinet installation with wood flooring and open-plan living area fit-out.',
    imgs: ['/portfolio/site12.jpg', '/portfolio/site13.jpg', '/portfolio/site10.jpg', '/portfolio/site11.jpg'],
  },
  {
    id: 3,
    title: 'Installation Process — Site Works',
    cat: 'Full Interior',
    after: '/portfolio/site17.jpg',
    before: '',
    year: '2024',
    loc: 'Ghana',
    area: '',
    duration: '',
    budget: '',
    style: 'Modern',
    hasBA: false,
    desc: 'Our team on-site completing full interior installation — flooring, wardrobes and kitchen units simultaneously.',
    imgs: ['/portfolio/site17.jpg', '/portfolio/site14.jpg', '/portfolio/site15.jpg', '/portfolio/site16.jpg'],
  },
  {
    id: 4,
    title: 'Completed Residential Site',
    cat: 'Full Interior',
    after: '/portfolio/site20.jpg',
    before: '',
    year: '2024',
    loc: 'Accra, Ghana',
    area: '',
    duration: '',
    budget: '',
    style: 'Contemporary',
    hasBA: false,
    desc: 'Full interior decoration project — tiles, wardrobes, kitchen and exterior fixtures.',
    imgs: ['/portfolio/site20.jpg', '/portfolio/site18.jpg', '/portfolio/site19.jpg', '/portfolio/site21.jpg'],
  },
  {
    id: 5,
    title: 'Exterior & Finishing Works',
    cat: 'Surface Finishes',
    after: '/portfolio/site25.jpg',
    before: '',
    year: '2024',
    loc: 'Ghana',
    area: '',
    duration: '',
    budget: '',
    style: 'Modern',
    hasBA: false,
    desc: 'Exterior fence installation, stone cladding and site finishing works at a completed residential project.',
    imgs: ['/portfolio/site25.jpg', '/portfolio/site22.jpg', '/portfolio/site23.jpg', '/portfolio/site24.jpg'],
  },
  {
    id: 6,
    title: 'Goods Arriving in Ghana',
    cat: 'Sourcing & Logistics',
    after: '/portfolio/site30.jpg',
    before: '',
    year: '2024',
    loc: 'Tema Port, Ghana',
    area: '',
    duration: '',
    budget: '',
    style: 'Process',
    hasBA: false,
    desc: 'Interior materials sourced from China arriving at Tema Port — kitchen cabinets, wardrobes and furnishing packages ready for site delivery.',
    imgs: ['/portfolio/site30.jpg', '/portfolio/site26.jpg', '/portfolio/site27.jpg', '/portfolio/site28.jpg', '/portfolio/site29.jpg'],
  },
  {
    id: 7,
    title: 'Residential Interior — Site Completion',
    cat: 'Full Interior',
    after: '/portfolio/site32.jpg',
    before: '',
    year: '2024',
    loc: 'Accra, Ghana',
    area: '',
    duration: '',
    budget: '',
    style: 'Contemporary',
    hasBA: false,
    desc: 'Additional completed site views — full interior fit-out including custom wardrobes, kitchen installation, tiling and finishing works.',
    imgs: ['/portfolio/site32.jpg', '/portfolio/site31.jpg', '/portfolio/site33.jpg', '/portfolio/site34.jpg', '/portfolio/site35.jpg'],
  },
];

export const HERO_SLIDES = [
  { img: '/hero_seo.png', title: 'Design. Source.\nInstall.', sub: 'A managed project system for premium interiors, CAD/3D rendering, global sourcing, logistics, installation, and handover.' },
  { img: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop', title: 'From concept\nto handover.', sub: 'Clients approve drawings, quotes, payments, timelines, and completion records through a controlled Westline workflow.' }
];

export const ALL_SERVICES = [
  {
    id: 'surface-finishes',
    Icon: LayoutGrid,
    name: 'Surface Finishes & Fixtures',
    tagline: 'Tiles, flooring, doors, sanitary ware & all surface-level interior finishes',
    keywords: ['floor tiles accra', 'wall tiles ghana', 'interior doors accra', 'wood flooring ghana', 'vinyl flooring accra', 'sanitary ware ghana', 'bathroom fixtures accra', 'countertops ghana', 'cabinet hardware accra'],
    desc: 'The foundation of every great interior. We supply and install premium wall and floor tiles, high-quality flooring systems — hardwood, vinyl plank, and laminate — along with interior doors, sanitary ware, bathroom fixtures, stone and engineered countertops, and all cabinet hardware. Every material is sourced directly from vetted factories in China, giving you luxury finishes at realistic prices.',
    items: [
      'Wall & Floor Tiles (porcelain, ceramic, large-format)',
      'Wood, Vinyl Plank & Laminate Flooring',
      'Interior Doors (timber, WPC, frosted glass)',
      'Sanitary Ware (WCs, basins, bidets)',
      'Bathroom Fixtures (shower systems, brassware, mixers)',
      'Countertops (quartz, granite, engineered stone)',
      'Cabinet Hardware (handles, hinges, soft-close runners)',
      'Skirting Boards & Architraves',
    ],
    whatsapp: 'Hi Westline Future, I need a quote for surface finishes — tiles, flooring, doors or fixtures.',
    img: '🪟',
  },
  {
    id: 'custom-carpentry',
    Icon: Hammer,
    name: 'Fixed Custom Carpentry',
    tagline: 'Bespoke built-in cabinetry — kitchens, wardrobes, vanities & storage',
    keywords: ['custom kitchen cabinets ghana', 'fitted wardrobe accra', 'built-in wardrobe ghana', 'vanity cabinet accra', 'TV cabinet ghana', 'shoe cabinet accra', 'bespoke carpentry ghana', 'kitchen units ghana'],
    desc: 'Every cabinet we build is designed around your exact space and approved 3D layout. Our fixed carpentry is manufactured to precision — clean joints, soft-close mechanisms, and durable finishes. We supply the full suite of built-in furniture that transforms a house into a home: custom kitchen cabinet sets, fitted walk-in and built-in wardrobes, vanity cabinets, TV wall units, and entrance shoe cabinets. All sourced from China\'s leading interior manufacturers and installed by our in-house team.',
    items: [
      'Custom Kitchen Cabinet Sets (base, wall & tall units)',
      'Fitted Walk-in Wardrobes',
      'Built-in Wardrobes (swing & sliding door)',
      'Vanity Cabinets & Bathroom Storage',
      'TV Wall Units & Media Cabinets',
      'Entrance & Hallway Shoe Cabinets',
      'Home Office Built-in Shelving',
      'Under-stair Storage Solutions',
    ],
    whatsapp: 'Hi Westline Future, I need a quote for custom carpentry — kitchen cabinets, wardrobes or built-ins.',
    img: '🪚',
  },
  {
    id: 'home-furniture',
    Icon: Sofa,
    name: 'Home Furniture',
    tagline: 'Sofas, dining sets, beds, coffee tables & living room furniture — sourced from China',
    keywords: ['sofa accra', 'furniture supplier ghana', 'dining set accra', 'bed frame ghana', 'coffee table accra', 'sideboard ghana', 'living room furniture ghana', 'bedroom furniture accra'],
    desc: 'Premium home furniture sourced factory-direct from China and delivered to your door in Ghana. We curate collections for every room — statement sofas, full dining sets, bed frames with storage, coffee tables, sideboards, and accent pieces — all coordinated with your approved 3D interior design so every piece belongs. No guesswork, no mismatch. One order, one delivery, one perfectly furnished home.',
    items: [
      'Sofas & Sectionals (fabric & leather)',
      'Dining Tables & Chair Sets',
      'Bed Frames, Headboards & Storage Beds',
      'Bedside Tables & Dressers',
      'Coffee Tables & Side Tables',
      'Sideboards & Display Cabinets',
      'Armchairs & Accent Seating',
      'Outdoor & Balcony Furniture',
    ],
    whatsapp: 'Hi Westline Future, I need a quote for home furniture — sofa, dining set or bedroom furniture.',
    img: '🛋️',
  },
  {
    id: 'home-appliances',
    Icon: Zap,
    name: 'Home Appliances',
    tagline: 'Refrigerators, washing machines, cooker hoods, hobs, water heaters & TVs',
    keywords: ['refrigerator accra', 'washing machine ghana', 'kitchen hood accra', 'hob ghana', 'water heater accra', 'TV ghana', 'home appliances ghana', 'kitchen appliances accra'],
    desc: 'A fully furnished home needs fully equipped rooms. We supply and install all the appliances your home requires — coordinated with your kitchen and bathroom design to ensure seamless integration. Every appliance is sourced from certified manufacturers: efficient refrigerators, quiet washing machines, powerful range hoods, precision induction and gas hobs, instant and storage water heaters, and quality television sets for every room.',
    items: [
      'Refrigerators (single & double door, American-style)',
      'Washing Machines (front-load & top-load)',
      'Kitchen Range Hoods & Extractors',
      'Gas & Induction Hobs',
      'Built-in Ovens & Microwaves',
      'Bathroom Water Heaters (instant & storage)',
      'Televisions (LED, QLED, OLED)',
      'Dishwashers',
    ],
    whatsapp: 'Hi Westline Future, I need a quote for home appliances — fridge, washing machine, hob or TV.',
    img: '🏠',
  },
  {
    id: 'decor-accessories',
    Icon: Sparkles,
    name: 'Décor & Accessories',
    tagline: 'Curtains, lighting fixtures, bathroom mirrors, decorative trims & finishing touches',
    keywords: ['curtains accra', 'lighting fixtures ghana', 'bathroom mirror accra', 'decorative trims ghana', 'window blinds accra', 'LED lighting ghana', 'home decor accra', 'interior accessories ghana'],
    desc: 'The details that complete a room. After the big installations are done, it is the thoughtful finishing touches that make a space feel truly designed. We supply and install the full range of interior accessories: custom-length curtains and window treatments, statement lighting fixtures and LED systems, oversized bathroom mirrors, decorative wall trims and cornices, and coordinated accent pieces — all selected to complement your approved 3D design.',
    items: [
      'Curtains, Drapes & Sheers (custom length)',
      'Roller & Venetian Blinds',
      'Pendant Lights, Chandeliers & Downlights',
      'LED Strip Lighting & Cove Lighting',
      'Bathroom Mirrors (framed & frameless, LED)',
      'Decorative Wall Trims & Cornices',
      'Feature Wall Panels & 3D Wall Art',
      'Door & Window Hardware Accessories',
    ],
    whatsapp: 'Hi Westline Future, I need a quote for décor accessories — curtains, lighting or mirrors.',
    img: '✨',
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

// Maps legacy 12-stage admin records to the unified 8-stage pipeline.
const LEGACY_STAGE_MAP = {
  1:1, 2:1, 3:2, 4:2, 5:3, 6:3, 7:3, 8:4, 9:4, 10:5, 11:6, 12:7
};
export function normalizeStageId(id) {
  const n = typeof id === 'number' ? id : parseInt(id, 10);
  if (isNaN(n) || n < 1) return 1;
  if (n <= 8) return n;
  return LEGACY_STAGE_MAP[n] ?? Math.min(8, Math.ceil((n / 12) * 8));
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
  { emoji: '🎨', title: 'Custom 3D Design',       desc: 'We create full photorealistic 3D layouts for your home before a single product is ordered — so you see exactly what you\'re getting.' },
  { emoji: '📦', title: 'End-to-End Sourcing',    desc: 'Every product your interior needs sourced and procured directly — kitchens, bathrooms, tiles, wardrobes, windows and doors.' },
  { emoji: '🔧', title: 'Turnkey Installation',   desc: 'Full fit-out from start to finish, built strictly per your approved 3D design. One team, one contract, zero handoff headaches.' },
  { emoji: '🌏', title: 'Global Materials',       desc: 'Premium décor materials shipped direct from China to Ghana. Factory-vetted certified goods with full supply chain transparency.' },
];

export const DEFAULT_HOME_SERVICES = [
  {
    id: 'surface-finishes',
    emoji: '🪟',
    name: 'Surface Finishes & Fixtures',
    tagline: 'Tiles · Flooring · Doors · Sanitary ware · Countertops',
    short: 'Premium wall & floor tiles, wood and vinyl flooring, interior doors, sanitary ware, bathroom fixtures, countertops and cabinet hardware — sourced from China, installed to spec.',
    title: 'Surface Finishes & Fixtures',
  },
  {
    id: 'custom-carpentry',
    emoji: '🪚',
    name: 'Fixed Custom Carpentry',
    tagline: 'Kitchen cabinets · Wardrobes · Vanities · TV units · Shoe cabinets',
    short: 'Bespoke built-in cabinetry crafted to your approved 3D layout — kitchen cabinet sets, fitted walk-in and built-in wardrobes, vanity cabinets, TV wall units and entrance shoe cabinets.',
    title: 'Fixed Custom Carpentry',
  },
  {
    id: 'home-furniture',
    emoji: '🛋️',
    name: 'Home Furniture',
    tagline: 'Sofas · Dining sets · Beds · Coffee tables · Sideboards',
    short: 'Factory-direct furniture from China, coordinated with your 3D interior design — sofas, dining sets, bed frames, coffee tables, sideboards and accent pieces delivered to your door.',
    title: 'Home Furniture',
  },
  {
    id: 'home-appliances',
    emoji: '🏠',
    name: 'Home Appliances',
    tagline: 'Fridges · Washing machines · Range hoods · Hobs · Water heaters · TVs',
    short: 'Every appliance your home needs, integrated seamlessly with your kitchen and bathroom design — refrigerators, washing machines, range hoods, hobs, water heaters and televisions.',
    title: 'Home Appliances',
  },
  {
    id: 'decor-accessories',
    emoji: '✨',
    name: 'Décor & Accessories',
    tagline: 'Curtains · Lighting · Mirrors · Decorative trims',
    short: 'The finishing touches that complete a room — custom curtains, pendant lights and LED systems, oversized bathroom mirrors, decorative wall trims and coordinated accent pieces.',
    title: 'Décor & Accessories',
  },
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
