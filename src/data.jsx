import React from 'react';
import { DollarSign, Eye, MessageSquare, CheckCircle, Users, Factory, Truck } from 'lucide-react';

export const PROJECT_STAGES = [
  {
    id: 1, name: 'Client Intake & Site Brief', statusLabel: 'Brief captured', days: 3, color: '#231F78',
    icon: 'clipboard-list', description: 'Capturing client details, measurements, requirements, budget range, and site notes.',
    tasks: ['Confirm client profile', 'Capture site measurements', 'Document project requirements', 'Prepare rendering fee invoice']
  },
  {
    id: 2, name: 'Rendering Fee Payment', statusLabel: 'Rendering locked', days: 2, color: '#2563EB', requiresPayment: true, paymentType: 'rendering_fee',
    icon: 'lock', description: 'The CAD/3D rendering package remains locked until the separate rendering fee is paid and verified.',
    tasks: ['Issue rendering fee invoice', 'Collect Paystack or Hubtel payment', 'Verify transaction', 'Unlock rendering package']
  },
  {
    id: 3, name: 'Rendering Review & Approval', statusLabel: 'Design review', days: 5, color: '#7C3AED', requiresApproval: true,
    icon: 'scan-search', description: 'Client reviews the unlocked CAD/3D rendering, requests revisions, and approves the final version.',
    tasks: ['Upload rendering version', 'Track client comments', 'Manage included revisions', 'Record final rendering approval']
  },
  {
    id: 4, name: 'Final Quote & Kickoff Approval', statusLabel: 'Quote approval', days: 3, color: '#0891B2', requiresApproval: true,
    icon: 'file-check', description: 'The full project quote is prepared from the approved rendering and approved as a versioned quote.',
    tasks: ['Prepare quote v1', 'Revise quote if scope changes', 'Capture approved quote version', 'Generate deposit invoice']
  },
  {
    id: 5, name: 'Project Deposit Payment', statusLabel: 'Deposit due', days: 2, color: '#16A34A', requiresPayment: true, paymentPct: 50, paymentType: 'deposit',
    icon: 'dollar-sign', description: 'The project deposit is paid against the approved quote. This starts the commercial project.',
    tasks: ['Confirm approved quote', 'Issue deposit invoice', 'Verify payment', 'Release procurement']
  },
  {
    id: 6, name: 'Procurement & Production', statusLabel: 'Sourcing and fabrication', days: 21, color: '#374151',
    icon: 'factory', description: 'Materials are sourced, ordered, fabricated, manufactured, or prepared.',
    tasks: ['Raise purchase orders', 'Track supplier status', 'Monitor production', 'Update procurement timeline']
  },
  {
    id: 7, name: 'Shipping & Delivery', statusLabel: 'In transit to site', days: 30, color: '#607D8B',
    icon: 'truck', description: 'Freight, customs, warehousing, local logistics, and delivery to site.',
    tasks: ['Dispatch from factory', 'Confirm freight details', 'Process customs', 'Deliver to site']
  },
  {
    id: 8, name: 'Installation', statusLabel: 'Active installation', days: 5, color: '#16A34A',
    icon: 'wrench', description: 'Field crew executes the installation with checklists, notes, and photo evidence.',
    tasks: ['Prepare site', 'Complete installation checklist', 'Upload site photos', 'Request inspection']
  },
  {
    id: 9, name: 'Inspection & Sign-Off', statusLabel: 'Quality review', days: 2, color: '#A855F7', requiresApproval: true,
    icon: 'scan-search', description: 'Quality review, snag list, corrections, and formal client/admin sign-off.',
    tasks: ['Complete inspection checklist', 'Resolve snag list', 'Capture client sign-off', 'Prepare handover']
  },
  {
    id: 10, name: 'Handover & Final Settlement', statusLabel: 'Final settlement', days: 1, color: '#4945BE', requiresPayment: true, paymentPct: 50, paymentType: 'final_balance',
    icon: 'star', description: 'Final payment, warranty, documents, completion report, and closeout.',
    tasks: ['Confirm final payment', 'Issue handover documents', 'Close project', 'Request client feedback']
  }
];

export const KANBAN_COLUMNS = [
  { id: 'intake',       label: 'Intake',       stages: [1], color: '#231F78', bg: 'rgba(35,31,120,0.07)' },
  { id: 'rendering',    label: 'Rendering',    stages: [2,3], color: '#7C3AED', bg: 'rgba(124,58,237,0.07)' },
  { id: 'quote',        label: 'Quote',        stages: [4,5], color: '#0891B2', bg: 'rgba(8,145,178,0.07)' },
  { id: 'production',   label: 'Production',   stages: [6], color: '#374151', bg: 'rgba(55,65,81,0.06)' },
  { id: 'delivery',     label: 'Delivery',     stages: [7], color: '#607D8B', bg: 'rgba(96,125,139,0.07)' },
  { id: 'installation', label: 'Installation', stages: [8], color: '#16A34A', bg: 'rgba(22,163,74,0.07)' },
  { id: 'closeout',     label: 'Closeout',     stages: [9,10], color: '#4945BE', bg: 'rgba(73,69,190,0.08)' },
];

export const LIFE_RIBBON = [
  { id: 'onboard', label: 'Start', icon: <Users size={24} />, stages: [1], color: '#231F78', text: 'We are setting up your project and checking all the details.' },
  { id: 'rendering', label: 'Render', icon: <Eye size={24} />, stages: [2,3], color: '#7C3AED', text: 'Your rendering unlocks after the separate design fee is verified.' },
  { id: 'quote', label: 'Approve', icon: <DollarSign size={24} />, stages: [4,5], color: '#0891B2', text: 'The approved rendering becomes your final project quote and deposit gate.' },
  { id: 'factory', label: 'Build', icon: <Factory size={24} />, stages: [6], color: '#374151', text: 'Your items are being sourced and prepared for production.' },
  { id: 'shipping', label: 'Move', icon: <Truck size={24} />, stages: [7], color: '#607D8B', text: 'Your order is packed and moving toward your location.' },
  { id: 'delivered', label: 'Finish', icon: <CheckCircle size={24} />, stages: [8,9,10], color: '#16A34A', text: 'Everything is installed, inspected, settled, and handed over.' }
];

export const PROCUREMENT_STAGES = [
  { id: 'to-buy', name: 'To Buy', icon: '🛒', color: '#DFD9D1' },
  { id: 'ordered', name: 'Order Placed', icon: '📝', color: '#FF9800' },
  { id: 'production', name: 'In Production', icon: '🏭', color: '#0D0B2E' },
  { id: 'warehouse', name: 'At Warehouse', icon: '📦', color: '#3F51B5' },
  { id: 'transit', name: 'In Transit', icon: '🚢', color: '#9C27B0' },
  { id: 'site', name: 'At Site', icon: '🏠', color: '#16A34A' }
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
  logo: '/logo.png',
  color: '#231F78',
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
  { img: '/hero_seo.png', title: 'Complete Interior\nSolutions.', sub: 'Industrial precision for the world\'s most ambitious architectural projects.' },
  { img: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop', title: 'Architectural\nPrecision.', sub: 'Premier structural glass and luxury aluminum finishing systems.' }
];

export const SERVICES_DATA = [
  {id:'glass',icon:'🏢',name:'Glass & Aluminum',short:'Structural glazing and facades.',catLabel:'Specialist',desc:'High-performance panes.'}
];

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
  { name: 'Residential', value: 45, color: '#231F78' },
  { name: 'Commercial', value: 35, color: '#0D0B2E' },
  { name: 'Industrial', value: 20, color: '#607D8B' }
];

export const PIE_C = [
  { name: 'Ghana', value: 70, color: '#231F78' },
  { name: 'Togo', value: 15, color: '#0D0B2E' },
  { name: 'Nigeria', value: 15, color: '#607D8B' }
];

export const NOTIFS_DATA = [
  { id: 1, title: 'New Project Request', body: 'The Volta Suite requires technical survey.', time: '2h ago', type: 'project' },
  { id: 2, title: 'Payment Verified', body: 'Airport Hills Kitchen deposit confirmed.', time: '5h ago', type: 'payment' }
];

export const CLIENT_NAMES = ['LuxeSpace Ghana', 'AFCFTA Secretariat', 'Airport Hills Dev'];

// ─── 10-Stage Client Project Pipeline ────────────────────────────────────────
export const CLIENT_PROJECT_STAGES = [
  {
    id: 1, name: 'Client Intake & Site Brief', short: 'Intake', emoji: '🔍', color: '#231F78', pct: 8,
    whoActs: 'admin',
    clientMsg: 'Our team is reviewing your requirements, site notes, and initial brief.',
    adminPrompt: 'Confirm client details, measurements, site notes, and prepare the rendering fee invoice.',
  },
  {
    id: 2, name: 'Rendering Fee Payment', short: 'Render Fee', emoji: '🔒', color: '#2563EB', pct: 16,
    whoActs: 'client',
    clientMsg: 'Please pay the separate rendering fee to unlock your CAD/3D drawing package.',
    adminPrompt: 'Issue the separate rendering/design fee invoice. Rendering remains locked until payment is verified.',
    requiresPayment: true, paymentType: 'rendering_fee',
  },
  {
    id: 3, name: 'Rendering Review & Approval', short: 'Render OK', emoji: '🧩', color: '#7C3AED', pct: 25,
    whoActs: 'client',
    clientMsg: 'Your rendering is unlocked. Review it, request changes if needed, and approve the final version.',
    adminPrompt: 'Manage rendering versions, comments, included revisions, and final client approval.',
    needsClientApproval: true,
  },
  {
    id: 4, name: 'Final Quote & Kickoff Approval', short: 'Quote OK', emoji: '📄', color: '#0891B2', pct: 34,
    whoActs: 'client',
    clientMsg: 'Review and approve the final quote version created from your approved rendering.',
    adminPrompt: 'Create a versioned final quote and capture approval before deposit is requested.',
    needsClientApproval: true,
  },
  {
    id: 5, name: 'Project Deposit Payment', short: 'Deposit', emoji: '💳', color: '#16A34A', pct: 42,
    whoActs: 'client',
    clientMsg: 'Please pay the project deposit based on the approved quote so procurement can begin.',
    adminPrompt: 'Verify quote approval, issue deposit invoice, and confirm payment before procurement.',
    requiresPayment: true, paymentPct: 50, paymentType: 'deposit',
  },
  {
    id: 6, name: 'Procurement & Production', short: 'Produce', emoji: '🏭', color: '#374151', pct: 56,
    whoActs: 'admin',
    clientMsg: 'Your materials and components are being sourced, ordered, fabricated, or prepared.',
    adminPrompt: 'Track purchase orders, supplier status, production, and timeline changes.',
  },
  {
    id: 7, name: 'Shipping & Delivery', short: 'Delivery', emoji: '🚛', color: '#607D8B', pct: 68,
    whoActs: 'admin',
    clientMsg: 'Your order is moving through shipping, customs, warehouse, and delivery.',
    adminPrompt: 'Add shipping details, manage customs clearance, and coordinate site delivery.',
  },
  {
    id: 8, name: 'Installation', short: 'Install', emoji: '🔧', color: '#16A34A', pct: 80,
    whoActs: 'worker',
    clientMsg: 'Our technical crew is on-site fitting and finishing all components.',
    adminPrompt: 'Assign field crew, track site progress, checklists, and photo evidence.',
    fullServiceOnly: true,
  },
  {
    id: 9, name: 'Inspection & Sign-Off', short: 'Sign-off', emoji: '🔎', color: '#A855F7', pct: 92,
    whoActs: 'both',
    clientMsg: 'Quality check is in progress. Please sign off once you are satisfied with the work.',
    adminPrompt: 'Run QC inspection checklist, resolve snags, and obtain client sign-off before handover.',
    needsClientApproval: true,
  },
  {
    id: 10, name: 'Handover & Final Settlement', short: 'Handover', emoji: '🌟', color: '#4945BE', pct: 100,
    whoActs: 'client',
    clientMsg: 'Your project is complete. Please make the final balance payment to receive handover documents.',
    adminPrompt: 'Confirm final payment, issue handover certificate, and mark project complete.',
    requiresPayment: true, paymentPct: 50, paymentType: 'final_balance',
  },
];

// Maps legacy 7/12-stage IDs to the current 10-stage pipeline.
// Applied at Firestore read time so old project documents stay compatible.
const LEGACY_STAGE_MAP = { 1:1, 2:4, 3:6, 4:7, 5:8, 6:9, 7:10, 8:7, 9:7, 10:8, 11:9, 12:10 };
export function normalizeStageId(id) {
  const n = typeof id === 'number' ? id : parseInt(id, 10);
  if (!n || n < 1) return 1;
  if (n <= 10) return n;
  return LEGACY_STAGE_MAP[n] ?? Math.min(10, Math.ceil((n / 12) * 10));
}

export const PROJECT_TYPES = {
  'full-service': { label: 'Full Service',  desc: 'We design, quote, source, ship, deliver, install, and hand over.', stages: [1,2,3,4,5,6,7,8,9,10], color: '#231F78' },
  'buy-only':     { label: 'Buy & Deliver', desc: 'We design, quote, source, ship, clear, and deliver. No installation.', stages: [1,2,3,4,5,6,7,9,10], color: '#2563EB' },
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
};
