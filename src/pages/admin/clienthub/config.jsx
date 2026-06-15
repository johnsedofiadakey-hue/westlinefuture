import React from 'react';
import {
  Search, PenTool, CreditCard, Factory, Truck, Wrench, ScanSearch, Star, Package
} from 'lucide-react';

export const AC = `var(--accent-secondary)`;

// ─── Stage Icon Map ───────────────────────────────────────────────────────────
export const STAGE_ICONS = {
  1: <Search size={15} />,
  2: <PenTool size={15} />,
  3: <CreditCard size={15} />,
  4: <Factory size={15} />,
  5: <Truck size={15} />,
  6: <Wrench size={15} />,
  7: <ScanSearch size={15} />,
  8: <Star size={15} />,
};

// ─── Payment Schedule Configs ─────────────────────────────────────────────────
export const SCHEDULE_CONFIGS = {
  standard: {
    label: 'Standard',
    sub: '60% on contract · 30% on production completion · 10% on Ghana arrival',
    milestones: [
      { key: 'initial-deposit',          label: 'Approved Quotation — Initial Project Deposit',   pct: 0.60, cumPct: 0.60, stageId: 3 },
      { key: 'production-balance',       label: 'Production Complete — Production Balance',        pct: 0.30, cumPct: 0.90, stageId: 4 },
      { key: 'pre-installation-balance', label: 'Goods Arrived in Ghana — Final Arrival Balance', pct: 0.10, cumPct: 1.00, stageId: 5 },
    ],
  },
  '50-50': {
    label: '50/50',
    sub: '50% deposit · 50% on completion',
    milestones: [
      { key: 'deposit',    label: 'Project Mobilisation Deposit',           pct: 0.50, cumPct: 0.50 },
      { key: 'completion', label: 'Project Completion — Final Settlement',  pct: 0.50, cumPct: 1.00 },
    ],
  },
  '70-30': {
    label: '70/30',
    sub: '70% before delivery · 30% after',
    milestones: [
      { key: 'pre-delivery', label: 'Pre-Delivery Instalment',              pct: 0.70, cumPct: 0.70 },
      { key: 'completion',   label: 'Project Completion — Final Settlement', pct: 0.30, cumPct: 1.00 },
    ],
  },
  custom: {
    label: 'Custom',
    sub: 'Flexible batch payments',
    milestones: [],
  },
};

// ─── Premium Materials Catalog ────────────────────────────────────────────────
export const PREMIUM_CATALOG = [
  { id: 'cat-glass-1', name: '12mm Clear Tempered Structural Glass', price: 290, unit: 'sqm', category: 'Glass' },
  { id: 'cat-glass-2', name: '13.52mm Acoustic Laminated Glazing', price: 360, unit: 'sqm', category: 'Glass' },
  { id: 'cat-glass-3', name: '24mm Double Glazed Low-E Unit (DGU)', price: 440, unit: 'sqm', category: 'Glass' },
  { id: 'cat-profile-1', name: '103 Slim-Line Sliding Aluminum Frame (Black)', price: 185, unit: 'm', category: 'Profiles' },
  { id: 'cat-profile-2', name: 'Satin Bronze Balustrade Channel Profile', price: 220, unit: 'm', category: 'Profiles' },
  { id: 'cat-wash-1', name: 'Frameless Glass Shower Enclosure System', price: 850, unit: 'pcs', category: 'Washrooms' },
  { id: 'cat-kitchen-1', name: 'Sintered Stone Premium Kitchen Countertop', price: 1200, unit: 'pcs', category: 'Kitchens' },
  { id: 'cat-door-1', name: 'Solid Timber Interior Flush Door', price: 380, unit: 'pcs', category: 'Doors' }
];

// ─── New Project Modal ────────────────────────────────────────────────────────
export const BD_ITEMS_CONFIG = [
  { key: 'product',      label: 'Product / Materials', color: `var(--accent-secondary)`, icon: <Package size={13} /> },
  { key: 'shipping',     label: 'Shipping & Freight',  color: `var(--text-secondary)`, icon: <Truck size={13} /> },
  { key: 'installation', label: 'Installation Labour', color: '#D97706', icon: <Wrench size={13} /> },
];
