import React from 'react';
import { DollarSign, Eye, MessageSquare, CheckCircle, Users, Factory, Truck } from 'lucide-react';

export const PROJECT_STAGES = [
  {
    id: 1, name: 'Design & Materials', statusLabel: 'Selecting items', days: 7, color: '#231F78',
    icon: 'palette', description: 'Finalising specifications and selecting premium materials for your build.',
    tasks: ['Confirm site measurements & survey', 'Select glass type and specifications', 'Choose aluminum finish and hardware', 'Approve material samples']
  },
  {
    id: 2, name: 'Quote & Approval', statusLabel: 'Awaiting your OK', days: 3, color: '#2196F3', requiresApproval: true,
    icon: 'file-check', description: 'Reviewing the full project quotation and technical drawings for your sign-off.',
    tasks: ['Review detailed quotation', 'Sign off technical drawings', 'Confirm project scope & terms', 'Submit initial deposit']
  },
  {
    id: 3, name: 'Funding Secured', statusLabel: 'Funds confirmed', days: 2, color: '#4CAF50', requiresPayment: true, paymentPct: 50,
    icon: 'dollar-sign', description: 'Deposit received and materials ordered from our global supply chain.',
    tasks: ['Deposit payment confirmed', 'Materials ordered from supplier', 'Production slot allocated', 'Client portal access granted']
  },
  {
    id: 4, name: 'Production', statusLabel: 'Factory is working', days: 21, color: '#0D0B2E',
    icon: 'factory', description: 'Your glass and aluminum components are being precision-fabricated at the factory.',
    tasks: ['Cutting & processing complete', 'Tempering and coating applied', 'Quality control inspection passed', 'Components packed for dispatch']
  },
  {
    id: 5, name: 'Shipping & Delivery', statusLabel: 'In transit to Ghana', days: 30, color: '#607D8B',
    icon: 'ship', description: 'Cargo is in transit from the factory to your site via ocean freight.',
    tasks: ['Dispatched from factory', 'Ocean freight booking confirmed', 'Customs clearance processed', 'Local delivery to site completed']
  },
  {
    id: 6, name: 'Installation', statusLabel: 'Active installation', days: 5, color: '#16A34A',
    icon: 'wrench', description: 'Our technical crew is on-site fitting and finishing all components.',
    tasks: ['Site prepared and secured', 'Structural installation complete', 'Finishing and sealant applied', 'Snag list resolved & signed off']
  },
  {
    id: 7, name: 'Completed', statusLabel: 'Project Handover', days: 1, color: '#4945BE',
    icon: 'star', description: 'Project complete. Final inspection done and handover documents issued.',
    tasks: ['Final inspection passed', 'Balance payment received', 'Handover documents signed', 'Client satisfaction confirmed']
  }
];

export const KANBAN_COLUMNS = [
  { id: 'design', label: 'Design & Quote', stages: [1, 2], color: '#231F78', bg: 'rgba(35,31,120,0.08)' },
  { id: 'funded', label: 'Funded', stages: [3], color: '#4CAF50', bg: 'rgba(76,175,80,0.08)' },
  { id: 'production', label: 'In Production', stages: [4], color: '#0D0B2E', bg: 'rgba(13,11,46,0.05)' },
  { id: 'shipping', label: 'Shipping', stages: [5], color: '#607D8B', bg: 'rgba(96,125,139,0.08)' },
  { id: 'installation', label: 'Installation', stages: [6], color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
  { id: 'done', label: 'Completed', stages: [7], color: '#4945BE', bg: 'rgba(229,195,135,0.08)' },
];

export const LIFE_RIBBON = [
  { id: 'onboard', label: 'Start', icon: <Users size={24} />, stages: [1], color: '#231F78', text: 'We are setting up your project and checking all the details.' },
  { id: 'design', label: 'Design', icon: <Eye size={24} />, stages: [2], color: '#2196F3', text: 'Our engineers are drawing the technical plans for your space.' },
  { id: 'deposit', label: 'Secure', icon: <DollarSign size={24} />, stages: [3], color: '#4CAF50', text: 'We are securing the high-quality materials for your build.' },
  { id: 'factory', label: 'Build', icon: <Factory size={24} />, stages: [4], color: '#0D0B2E', text: 'Your items are being carefully built in our factory.' },
  { id: 'shipping', label: 'Move', icon: <Truck size={24} />, stages: [5], color: '#607D8B', text: 'Your order is packed and moving toward your location.' },
  { id: 'delivered', label: 'Finish', icon: <CheckCircle size={24} />, stages: [6], color: '#16A34A', text: 'Everything is installed and ready for you to enjoy.' }
];

export const PROCUREMENT_STAGES = [
  { id: 'to-buy', name: 'To Buy', icon: '🛒', color: '#E4E3F0' },
  { id: 'ordered', name: 'Order Placed', icon: '📝', color: '#FF9800' },
  { id: 'production', name: 'In Production', icon: '🏭', color: '#0D0B2E' },
  { id: 'warehouse', name: 'At Warehouse', icon: '📦', color: '#3F51B5' },
  { id: 'transit', name: 'In Transit', icon: '🚢', color: '#9C27B0' },
  { id: 'site', name: 'At Site', icon: '🏠', color: '#16A34A' }
];

export const ABOUT_DATA = {
  founder: 'Managing Director',
  role: 'Managing Director',
  storyTitle: 'Crafting the Future of Structural Glass & Interiors',
  story: 'Under the leadership of Managing Director, Managing Director, Westline Future has evolved from a structural glass specialist into Ghana’s premier hub for complete interior finishing. Our mission is to bridge the gap between industrial engineering and luxury design.',
  bio: 'Managing Director leads Westline Future with a commitment to sub-millimeter precision and aesthetic excellence. From Spintex to the most exclusive developments in Accra, his vision is to provide a "million-dollar finish" for every project, leveraging global sourcing and local technical expertise.',
  image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop'
};

export const BRAND0 = {
  name: 'Westline Future',
  tagline: 'Complete Interior & Finishing Solutions',
  logo: '/logo.png',
  color: '#231F78',
  phone: '+233 59 845 5012',
  email: 'admin@westlinefuture.com',
  location: 'Spintex Road Industrial Area, Accra',
  instagram: '@westlinefuture_gh',
  facebook: 'WestlineFuture',
  twitter: '@westlinefuture_gh',
  linkedin: 'westlinefuture-fabrications',
  whatsapp: '+233598455012',
  website: 'www.westlinefuture.com.gh'
};

export const TEAM_MEMBERS = [
  {id:1,name:'Managing Director',role:'Managing Director',bio:'Visionary leader with a focus on structural glass and interior finishing engineering.',img:'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80',av:'JD',email:'admin@westlinefuture.com',phone:'+233 59 845 5012',status:'Online'},
  {id:2,name:'Kwame Osei',role:'Technical Lead',bio:'Expert in curtain wall systems and high-pressure glazing.',img:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',av:'KO',email:'kwame@westlinefuture.com',phone:'+233 24 111 0002',status:'Online'},
  {id:3,name:'Abena Darko',role:'admin',bio:'Ensures on-site precision and safety across all glass installations.',img:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',av:'AD',email:'admin@westlinefuture.com',phone:'+233 24 111 0003',status:'Idle'},
  {id:4,name:'Nana Boateng',role:'CAD Engineer',bio:'Specializes in precision technical drawings and fabrication specs.',img:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',av:'NB',email:'nana@westlinefuture.com',phone:'+233 24 111 0004',status:'Idle'},
];

export const PORTFOLIO_DATA = [
  {id:1,title:'The Volta Suite',cat:'Full Interior',after:'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80',before:'',year:'2024',loc:'East Legon, Accra',area:'4,200 sq ft',duration:'5 months',budget:'$195,000',style:'Modern Industrial',hasBA:false,desc:'Total interior finishing including kitchens, tiling, and lighting.',imgs:['https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&q=80']},
  {id:2,title:'Airport Hills Kitchen',cat:'Kitchen Installation',after:'https://images.unsplash.com/photo-1556911223-e1534ff6f755?w=1600&q=80',before:'',year:'2024',loc:'Airport Hills',area:'1,100 sq ft',duration:'2 months',budget:'$72,000',style:'Minimalist',hasBA:false,desc:'Bespoke smart kitchen installation with high-gloss finish.',imgs:['https://images.unsplash.com/photo-1556911223-e1534ff6f755?w=1600&q=80']},
];

export const HERO_SLIDES = [
  { img: '/hero_seo.png', title: 'Complete Interior\nSolutions.', sub: 'Industrial precision for West Africa’s most ambitious architectural projects.' },
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
    description: 'High-performance curtain wall systems engineered for the harsh West African climate.',
    hotspots: [
      { x: 45, y: 55, title: 'Structural Silicone Glazing', desc: 'Frameless exterior appearance with mechanical fixings.', specs: { wind_load: '3.5 kPa', sealant: 'Dow Corning 993', movement: '±25%' } },
      { x: 70, y: 40, title: 'Solar Control Coating', desc: 'Reflective coating for energy efficiency and privacy.', specs: { shgc: '0.22', vlt: '18%', reflectance: '34%' } }
    ]
  }
];

export const INITIAL_CONTENT = {
  hero: { slides: HERO_SLIDES },
  about: {
    ...ABOUT_DATA,
    founder: 'Managing Director',
    role: 'Managing Director',
    storyTitle: 'Crafting the Future of Structural Glass & Interiors',
    story: 'Under the leadership of Managing Director, Managing Director, Westline Future has evolved from a structural glass specialist into Ghana’s premier hub for complete interior finishing. Our mission is to bridge the gap between industrial engineering and luxury design.',
    bio: 'Managing Director leads Westline Future with a commitment to sub-millimeter precision and aesthetic excellence. From Spintex to the most exclusive developments in Accra, his vision is to provide a "million-dollar finish" for every project, leveraging global sourcing and local technical expertise.'
  },
  services: SERVICES_DATA,
  process: PROCESS_STEPS,
  portfolio: PORTFOLIO_DATA,
  gallery: ROOM_GALLERY,
  products: GLASS_CATALOG_DATA,
  categories: GLASS_CATALOG_CATEGORIES,
  brand: BRAND0
};
