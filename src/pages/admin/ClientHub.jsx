import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Plus, Send, CheckCircle2, Circle, ChevronRight,
  User, Briefcase, DollarSign, Phone, Calendar, X, Loader2,
  Lock, MessageSquare, AlertCircle, Star, Truck, ShoppingCart,
  Factory, Package, Wrench, Search, CreditCard,
  Users, UserCheck, MoreVertical, Clock,
  Globe, Upload, FileText, Download, ScanSearch, StickyNote, Anchor,
  TrendingUp, Camera, PenTool, RefreshCw, Trash2
} from 'lucide-react';
import { PAv, PSBadge } from '../../components/Shared';
import { CLIENT_PROJECT_STAGES, PROJECT_TYPES, GLASS_CATALOG_DATA } from '../../data';
import { db } from '../../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, updateDoc
} from 'firebase/firestore';
import AdminRenderingManager from '../../components/AdminRenderingManager';
import AdminAddOnManager from '../../components/AdminAddOnManager';
import WorldClassChat from '../../components/WorldClassChat';
import { calculateTimeline } from '../sharedHelpers';

const AC = `var(--accent-secondary)`;

// ─── Stage Icon Map ───────────────────────────────────────────────────────────
const STAGE_ICONS = {
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
const SCHEDULE_CONFIGS = {
  standard: {
    label: 'Standard',
    sub: '10% → 40% → 40% → 10%',
    milestones: [
      { key: 'deposit',      label: '10% Deposit',         pct: 0.10, cumPct: 0.10 },
      { key: 'pre-prod',     label: '40% Pre-production',  pct: 0.40, cumPct: 0.50 },
      { key: 'pre-delivery', label: '40% Pre-delivery',    pct: 0.40, cumPct: 0.90 },
      { key: 'completion',   label: '10% Completion',      pct: 0.10, cumPct: 1.00 },
    ],
  },
  '70-30': {
    label: '70/30',
    sub: '70% before delivery · 30% after',
    milestones: [
      { key: 'pre-delivery', label: '70% Before Delivery', pct: 0.70, cumPct: 0.70 },
      { key: 'completion',   label: '30% After Delivery',  pct: 0.30, cumPct: 1.00 },
    ],
  },
  custom: {
    label: 'Custom',
    sub: 'Flexible batch payments',
    milestones: [],
  },
};

// ─── Premium Materials Catalog ────────────────────────────────────────────────
const PREMIUM_CATALOG = [
  { id: 'cat-glass-1', name: '12mm Clear Tempered Structural Glass', price: 290, unit: 'sqm', category: 'Glass' },
  { id: 'cat-glass-2', name: '13.52mm Acoustic Laminated Glazing', price: 360, unit: 'sqm', category: 'Glass' },
  { id: 'cat-glass-3', name: '24mm Double Glazed Low-E Unit (DGU)', price: 440, unit: 'sqm', category: 'Glass' },
  { id: 'cat-profile-1', name: '103 Slim-Line Sliding Aluminum Frame (Black)', price: 185, unit: 'm', category: 'Profiles' },
  { id: 'cat-profile-2', name: 'Satin Bronze Balustrade Channel Profile', price: 220, unit: 'm', category: 'Profiles' },
  { id: 'cat-wash-1', name: 'Frameless Glass Shower Enclosure System', price: 850, unit: 'pcs', category: 'Washrooms' },
  { id: 'cat-kitchen-1', name: 'Sintered Stone Premium Kitchen Countertop', price: 1200, unit: 'pcs', category: 'Kitchens' },
  { id: 'cat-door-1', name: 'Solid Timber Interior Flush Door', price: 380, unit: 'pcs', category: 'Doors' }
];

// ─── Helper Print Engines ────────────────────────────────────────────────────
function printInvoiceOrReceipt(inv, brand) {
  const theme = {
    primary: '#4A3B32',     // Dark espresso brown
    secondary: '#8C6C52',   // Mid-tone warm brown
    accent: '#C5A880',      // Rich beige gold
    bg: '#FDFBF7',          // Pristine cream base
    surface: '#F4EFE6',     // Light beige for table headers / blocks
    textMuted: '#716259'    // Muted brown for subtext
  };

  const co = brand?.name || 'Westline Future Ltd.';
  const addr = brand?.address || 'Accra, Ghana';
  const phone = brand?.phone || '059 845 5012';
  const email = brand?.email || 'info@westlinefuture.com';
  const logoUrl = brand?.logo || '';
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="height:60px;object-fit:contain;display:block;" alt="${co}" />`
    : `<div style="display:flex;flex-direction:column;line-height:1;gap:2px;">
         <div style="font-size:28px;font-weight:900;color:${theme.primary};letter-spacing:0.05em;">WESTLINE</div>
         <div style="font-size:12px;font-weight:600;color:${theme.secondary};letter-spacing:0.45em;">FUTURE</div>
       </div>`;

  const clientName = inv.clientName || 'Valued Client';
  const clientPhone = inv.clientPhone || '';
  const clientEmail = inv.clientEmail || '';
  
  const currency = inv.currency || 'GHS';
  const symbol = currency === 'USD' ? '$' : 'GH₵';
  const total = Number(inv.total || 0);
  const paid = Number(inv.paidAmount || 0);
  const balance = Math.max(0, total - paid);

  const formattedTotal = `${symbol} ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedPaid = `${symbol} ${paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedBalance = `${symbol} ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const items = inv.items || [];
  const taxRate = inv.taxRate || 0;
  const subtotal = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const taxAmount = (subtotal * taxRate) / 100;

  const status = (inv.status || 'Pending').toUpperCase();
  const statusColor = status === 'PAID' ? '#16A34A' : status === 'PARTIALLY PAID' ? '#D97706' : '#DC2626';

  const itemsHtml = items.map((item, idx) => `
    <tr style="border-bottom: 1px solid #E5E5E5;">
      <td style="padding: 12px 8px; font-size: 12px; font-weight: 600; color: ${theme.primary};">${idx + 1}</td>
      <td style="padding: 12px 8px; font-size: 12px; color: ${theme.primary};">
        <div style="font-weight:700;">${item.desc || 'Item'}</div>
      </td>
      <td style="padding: 12px 8px; font-size: 12px; text-align: center; color: ${theme.textMuted};">${item.qty || 1}</td>
      <td style="padding: 12px 8px; font-size: 12px; text-align: center; color: ${theme.textMuted}; text-transform: uppercase;">${item.unit || 'pcs'}</td>
      <td style="padding: 12px 8px; font-size: 12px; text-align: right; color: ${theme.textMuted};">${symbol} ${Number(item.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td style="padding: 12px 8px; font-size: 12px; text-align: right; font-weight: 700; color: ${theme.primary};">${symbol} ${(Number(item.qty || 0) * Number(item.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${status === 'PAID' ? 'SALES RECEIPT' : 'INVOICE'} — WF-${(inv.id || '').slice(-8).toUpperCase()}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: ${theme.bg}; font-family: 'Inter', -apple-system, sans-serif; color: ${theme.primary}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { padding: 0; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 60px 72px; position: relative; overflow: hidden; background: ${theme.bg}; border: 12px solid ${theme.accent}; }
    .watermark { position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 100px; font-weight: 900; opacity: 0.03; white-space: nowrap; pointer-events: none; color: ${statusColor}; z-index: 0; text-transform: uppercase; letter-spacing: 0.1em; }
    .content { position: relative; z-index: 1; }
    h2 { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: ${theme.primary}; margin-bottom: 12px; margin-top: 24px; border-bottom: 1px solid ${theme.accent}60; padding-bottom: 6px; }
    p { font-size: 11px; color: ${theme.textMuted}; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
    th { padding: 10px 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${theme.secondary}; border-bottom: 2px solid ${theme.accent}; background: ${theme.surface}; text-align: left; }
    @page { size: A4; margin: 0; }
    @media print { html, body { width: 210mm; } .page { box-shadow: none !important; border: none; } }
    @media screen { .page { box-shadow: 0 0 60px rgba(0,0,0,0.12); margin: 40px auto; border-radius: 4px; } body { background: #e5e5e5; } }
  </style>
</head>
<body>
<div class="page">
  <div style="height:12px;background:${theme.primary};margin:-60px -72px 0 -72px;"></div>
  <div class="watermark">${status}</div>
  <div class="content">

    <!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:20px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid ${theme.accent};">
      <div style="display:flex;align-items:center;gap:20px;">
        ${logoHtml}
        <div>
          <div style="font-size:18px;font-weight:800;color:${theme.primary};letter-spacing:1px;text-transform:uppercase;">${co}</div>
          <div style="font-size:10px;color:${theme.secondary};margin-top:2px;letter-spacing:1px;text-transform:uppercase;">${addr}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:24px;font-weight:400;letter-spacing:1px;text-transform:uppercase;color:${theme.primary};margin-bottom:6px;">
          ${status === 'PAID' ? 'SALES RECEIPT' : 'OFFICIAL INVOICE'}
        </div>
        <div style="display:inline-block;background:${statusColor};color:${theme.bg};padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:1px;">
          STATUS: ${status}
        </div>
      </div>
    </div>

    <!-- METADATA -->
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:24px;">
      <div style="padding:10px 14px;background:${theme.surface};border-radius:6px;">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:4px;">Document ID</div>
        <div style="font-size:12px;font-weight:800;color:${theme.primary};">WF-${(inv.id || '').slice(-8).toUpperCase()}</div>
      </div>
      <div style="padding:10px 14px;background:${theme.surface};border-radius:6px;">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:4px;">Date Issued</div>
        <div style="font-size:12px;font-weight:800;color:${theme.primary};">${inv.date || ''}</div>
      </div>
      <div style="padding:10px 14px;background:${theme.surface};border-radius:6px;">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:4px;">Date Due</div>
        <div style="font-size:12px;font-weight:800;color:${theme.primary};">${inv.due || '—'}</div>
      </div>
      <div style="padding:10px 14px;background:${theme.surface};border-radius:6px;">
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:4px;">Project Ref</div>
        <div style="font-size:12px;font-weight:800;color:${theme.primary};">WF-${(inv.parentId || '').slice(-8).toUpperCase()}</div>
      </div>
    </div>

    <!-- PARTIES -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;padding:14px 18px;border:1px solid ${theme.accent}60;border-radius:6px;background:${theme.surface}50;">
      <div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:${theme.accent};font-weight:900;margin-bottom:4px;">Billed From</div>
        <div style="font-size:13px;font-weight:800;color:${theme.primary};">${co}</div>
        <div style="font-size:10px;color:${theme.textMuted};">${addr}</div>
        <div style="font-size:10px;color:${theme.textMuted};">${phone} | ${email}</div>
      </div>
      <div>
        <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:${theme.accent};font-weight:900;margin-bottom:4px;">Billed To</div>
        <div style="font-size:13px;font-weight:800;color:${theme.primary};">${clientName}</div>
        <div style="font-size:10px;color:${theme.textMuted};">${clientPhone}</div>
        <div style="font-size:10px;color:${theme.textMuted};">${clientEmail}</div>
      </div>
    </div>

    <!-- INVOICE TITLE / SUMMARY -->
    <div style="padding:12px 16px;border:1px solid ${theme.accent};border-radius:6px;background:${theme.surface};margin-bottom:16px;">
      <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:4px;">Subject Description</div>
      <div style="font-size:13px;font-weight:800;color:${theme.primary};text-transform:uppercase;">${inv.title || 'Architectural Glass Sourcing & Service'}</div>
    </div>

    <!-- LINE ITEMS TABLE -->
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th>Description</th>
          <th style="width: 80px; text-align: center;">Qty</th>
          <th style="width: 80px; text-align: center;">Unit</th>
          <th style="width: 120px; text-align: right;">Unit Price</th>
          <th style="width: 130px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- TOTALS SECTION -->
    <div style="display: flex; justify-content: space-between; margin-top: 24px;">
      <div style="width: 45%; padding: 12px; border: 1px solid #E5E5E5; border-radius: 6px;">
        <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: ${theme.secondary}; letter-spacing: 0.5px; margin-bottom: 6px;">Payment Terms & Instructions</div>
        <div style="font-size: 10px; color: ${theme.textMuted}; line-height: 1.5;">
          ${inv.notes || ''}
        </div>
      </div>
      <div style="width: 45%;">
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #EEE; font-size: 11px;">
          <span style="color: ${theme.textMuted};">Subtotal</span>
          <span style="font-weight: 600; color: ${theme.primary};">${symbol} ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        ${taxRate > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #EEE; font-size: 11px;">
          <span style="color: ${theme.textMuted};">Taxes (${taxRate}%)</span>
          <span style="font-weight: 600; color: ${theme.primary};">${symbol} ${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 2px solid ${theme.accent}; font-size: 13px; font-weight: 800;">
          <span style="color: ${theme.primary};">Grand Total</span>
          <span style="color: ${theme.primary};">${formattedTotal}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #EEE; font-size: 11px;">
          <span style="color: ${theme.textMuted};">Amount Paid</span>
          <span style="font-weight: 600; color: #16A34A;">${formattedPaid}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; font-weight: 800;">
          <span style="color: ${theme.primary};">Balance Due</span>
          <span style="color: ${status === 'PAID' ? '#16A34A' : '#DC2626'};">${formattedBalance}</span>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="position: absolute; bottom: 60px; left: 72px; right: 72px; padding-top: 20px; border-top: 1.5px solid ${theme.accent}; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 9px; color: ${theme.textMuted}; line-height: 1.5; font-weight: 500;">
        This document serves as the official transaction record of ${co}.<br/>Thank you for your valued patronage.
      </div>
      <div style="text-align: right; font-size: 9px; color: ${theme.textMuted};">
        SaaS CRM Billing Ledger · www.westlinefuture.com
      </div>
    </div>

  </div>
</div>
<script>
  window.onload = () => { setTimeout(() => { window.print(); }, 500); };
</script>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();
  
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };
}

function printSignedContractDoc(project, user, brand) {
  const theme = {
    primary: '#4A3B32',     // Dark espresso brown
    secondary: '#8C6C52',   // Mid-tone warm brown
    accent: '#C5A880',      // Rich beige gold
    bg: '#FDFBF7',          // Pristine cream base
    surface: '#F4EFE6',     // Light beige for table headers / blocks
    textMuted: '#716259'    // Muted brown for subtext
  };

  const co = brand?.name || 'Westline Future Ltd.';
  const addr = brand?.address || 'International';
  const phone = brand?.phone || '';
  const email = brand?.email || 'info@westlinefuture.com';
  const logoUrl = brand?.logo || '';
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="height:60px;object-fit:contain;display:block;" alt="${co}" />`
    : `<div style="display:flex;flex-direction:column;line-height:1;gap:2px;">
         <div style="font-size:28px;font-weight:900;color:${theme.primary};letter-spacing:0.05em;">WESTLINE</div>
         <div style="font-size:12px;font-weight:600;color:${theme.secondary};letter-spacing:0.45em;">FUTURE</div>
       </div>`;

  const clientName = user?.name || project?.clientName || project?.client || 'Valued Client';
  const clientPhone = project?.quoteSignedByPhone || user?.phone || '';
  const clientEmail = user?.email || user?.proxyEmail || '';
  
  const budget = Number(project.budget || 0);
  const budgetStr = budget ? `GH₵ ${budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—';
  
  const signedDate = project.quoteSignedAt
    ? (project.quoteSignedAt.toDate ? project.quoteSignedAt.toDate() : new Date(project.quoteSignedAt)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const estCompletion = project.estimatedCompletion
    ? (project.estimatedCompletion.toDate ? project.estimatedCompletion.toDate() : new Date(project.estimatedCompletion)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Pending Scheduling';

  const signatureHtml = project.quoteSignature
    ? `<img src="${project.quoteSignature}" style="max-height:80px; max-width:250px; object-fit:contain; display:block; border-bottom:1px solid ${theme.accent}; padding-bottom:8px; margin-bottom:8px;" alt="Client Signature" />`
    : `<div style="height:80px; border-bottom:1px solid ${theme.accent}; margin-bottom:8px; display:flex; align-items:center; color:${theme.textMuted}; font-style:italic;">No signature on file</div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CONTRACT AGREEMENT — ${project.title || 'Project'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: ${theme.bg}; font-family: 'Inter', -apple-system, sans-serif; color: ${theme.primary}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { padding: 0; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 60px 72px; position: relative; overflow: hidden; background: ${theme.bg}; border: 12px solid ${theme.accent}; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-40deg); font-size: 80px; font-weight: 900; opacity: 0.02; white-space: nowrap; pointer-events: none; color: ${theme.primary}; z-index: 0; text-transform: uppercase; }
    .content { position: relative; z-index: 1; }
    h2 { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: ${theme.primary}; margin-bottom: 12px; margin-top: 24px; border-bottom: 1px solid ${theme.accent}60; padding-bottom: 6px; }
    p, li { font-size: 12px; color: ${theme.textMuted}; line-height: 1.6; margin-bottom: 10px; }
    ol { margin-left: 20px; }
    @page { size: A4; margin: 0; }
    @media print { html, body { width: 210mm; } .page { box-shadow: none !important; border: none; } button { display: none !important; } }
    @media screen { .page { box-shadow: 0 0 60px rgba(0,0,0,0.12); margin: 40px auto; border-radius: 4px; } body { background: #e5e5e5; } }
  </style>
</head>
<body>
<div class="page">
  <div style="height:12px;background:${theme.primary};margin:-60px -72px 0 -72px;"></div>
  <div class="watermark">CONTRACT SIGNED</div>
  <div class="content">

    <!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:20px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid ${theme.accent};">
      <div style="display:flex;align-items:center;gap:20px;">
        ${logoHtml}
        <div>
          <div style="font-size:18px;font-weight:800;color:${theme.primary};letter-spacing:1px;text-transform:uppercase;">${co}</div>
          <div style="font-size:10px;color:${theme.secondary};margin-top:2px;letter-spacing:1px;text-transform:uppercase;">${addr}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:24px;font-weight:400;letter-spacing:1px;text-transform:uppercase;color:${theme.primary};margin-bottom:6px;">CONTRACT AGREEMENT</div>
        <div style="display:inline-block;background:#16A34A;color:${theme.bg};padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:1px;">STATUS: SIGNED & SECURED</div>
      </div>
    </div>

    <!-- CONTRACT METADATA -->
    <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;margin-bottom:24px;">
      <div style="padding:12px 16px;background:${theme.surface};border-radius:6px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:4px;">Contract Reference</div>
        <div style="font-size:13px;font-weight:800;color:${theme.primary};">WF-${(project.id || '').slice(-8).toUpperCase()}</div>
      </div>
      <div style="padding:12px 16px;background:${theme.surface};border-radius:6px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:4px;">Date Executed</div>
        <div style="font-size:13px;font-weight:800;color:${theme.primary};">${signedDate}</div>
      </div>
      <div style="padding:12px 16px;background:${theme.surface};border-radius:6px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:4px;">Contract Value</div>
        <div style="font-size:13px;font-weight:800;color:${theme.primary};">${budgetStr}</div>
      </div>
    </div>

    <!-- PARTIES -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;padding:16px 20px;border:1px solid ${theme.accent}60;border-radius:6px;background:${theme.surface}50;">
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${theme.accent};font-weight:900;margin-bottom:4px;">Contractor (First Party)</div>
        <div style="font-size:14px;font-weight:800;color:${theme.primary};">${co}</div>
        <div style="font-size:11px;color:${theme.textMuted};">${addr}</div>
        <div style="font-size:11px;color:${theme.textMuted};">${phone} | ${email}</div>
      </div>
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${theme.accent};font-weight:900;margin-bottom:4px;">Client (Second Party)</div>
        <div style="font-size:14px;font-weight:800;color:${theme.primary};">${clientName}</div>
        <div style="font-size:11px;color:${theme.textMuted};">${clientPhone}</div>
        <div style="font-size:11px;color:${theme.textMuted};">${clientEmail}</div>
      </div>
    </div>

    <div style="padding:14px 18px;border:1px solid ${theme.accent};border-radius:6px;background:${theme.surface};margin-bottom:24px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:4px;">Scope of Project</div>
      <div style="font-size:14px;font-weight:800;color:${theme.primary};text-transform:uppercase;">${project.title || 'Premium Architectural Glass Project'}</div>
      <div style="font-size:12px;color:${theme.textMuted};margin-top:4px;">Target Completion Date: <strong>${estCompletion}</strong></div>
    </div>

    <h2>Standard Contractual Conditions</h2>
    <ol>
      <li><strong>Scope of Work:</strong> Contractor agrees to manufacture, fabricate, supply, and install custom high-end premium structural glass fittings, frameless balustrades, or specialized glass components in accordance with final approved technical designs in the design vault.</li>
      <li><strong>Payment Terms:</strong> Works shall commence upon execution of this contract and clearing of the 50% mobilization deposit (GHS ${(budget * 0.5).toLocaleString(undefined, { minimumFractionDigits: 2 })}). The remaining 50% balance (GHS ${(budget * 0.5).toLocaleString(undefined, { minimumFractionDigits: 2 })}) is due upon completion of site installation and final inspection.</li>
      <li><strong>Installation and Access:</strong> The Client shall provide adequate, safe, and clean working space for the Contractor's installers on the site. All field inspections are geo-fenced and locked to site coordinates for absolute quality assurance.</li>
      <li><strong>Warranty Policy:</strong> Contractor provides a 12-month limited warranty on the structural alignment and architectural grade silicone sealant components. Glass breakage due to external physical impact, force majeure, or site modifications after handover is excluded.</li>
      <li><strong>Governing Law:</strong> This agreement and all subsequent performance evaluations are governed by the laws of the Republic of Ghana.</li>
    </ol>

    <h2>Electronic Execution & Verification Log</h2>
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:32px;margin-top:16px;">
      <div style="padding:16px;border:1.5px dashed ${theme.accent};border-radius:8px;background:${theme.surface}30;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:12px;">Electronic Signature Verification</div>
        ${signatureHtml}
        <div style="font-size:13px;font-weight:800;color:${theme.primary};">${clientName}</div>
        <div style="font-size:11px;color:${theme.textMuted};margin-top:2px;">Phone Authenticated: <strong>${clientPhone}</strong></div>
        <div style="font-size:11px;color:${theme.textMuted};margin-top:2px;">Authentication Protocol: <strong>Dual-Factor Carrier SMS OTP</strong></div>
        <div style="font-size:11px;color:${theme.textMuted};margin-top:2px;">IP Reference Log: <strong>${project.quoteVerificationStamp?.ipAddress || 'client-portal-secure'}</strong></div>
      </div>
      <div style="display:flex;flex-direction:column;justify-content:space-between;padding:16px;border:1px solid ${theme.accent}60;border-radius:8px;">
        <div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:12px;">Contractor Sign-off</div>
          <div style="height:60px;margin-top:8px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;">
            <div style="font-family:'Georgia',serif;font-size:24px;font-style:italic;color:${theme.secondary};letter-spacing:2px;font-weight:bold;text-decoration:underline;">Westline Future</div>
          </div>
        </div>
        <div>
          <div style="font-size:13px;font-weight:800;color:${theme.primary};">Authorized Representative</div>
          <div style="font-size:11px;color:${theme.textMuted};margin-top:2px;">Westline Future Ltd.</div>
          <div style="font-size:10px;color:${theme.textMuted};margin-top:2px;">Date: ${signedDate}</div>
        </div>
      </div>
    </div>

    <div style="padding-top:20px;margin-top:32px;border-top:1.5px solid ${theme.accent};display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:10px;color:${theme.textMuted};line-height:1.5;font-weight:500;">This document serves as the legally binding contract between the parties.<br/>Verified securely via Westline Future Premium SaaS CRM Suite.</div>
      <div style="text-align:right;font-size:10px;color:${theme.textMuted};">Ref: WF-CONTRACT-${(project.id || '').slice(-8).toUpperCase()}</div>
    </div>

  </div>
</div>
<script>
  window.onload = () => { setTimeout(() => { window.print(); }, 500); };
</script>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();
  
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };
}

// ─── Itemized Invoice Creator Modal ──────────────────────────────────────────
function InvoiceCreatorModal({ project, brand, createInvoice, onClose, notify }) {
  const [docTitle, setDocTitle] = useState(`Invoice — ${project.title || project.name}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [due, setDue] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('GHS');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('Please pay all balances within the specified period. Sourcing and production timelines are contingent on cleared deposits. For international payments, contact accounts.');
  const [items, setItems] = useState([{ id: Date.now(), desc: '', qty: 1, rate: 0, unit: 'sqm' }]);
  const [catSearch, setCatSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const addItem = () => {
    setItems([...items, { id: Date.now(), desc: '', qty: 1, rate: 0, unit: 'sqm' }]);
  };

  const removeItem = (id) => {
    if (items.length === 1) {
      setItems([{ id: Date.now(), desc: '', qty: 1, rate: 0, unit: 'sqm' }]);
    } else {
      setItems(items.filter(it => it.id !== id));
    }
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(it => {
      if (it.id === id) {
        return { ...it, [field]: value };
      }
      return it;
    }));
  };

  const addCatalogItem = (catItem) => {
    const newItem = {
      id: Date.now(),
      desc: catItem.name,
      qty: 1,
      rate: catItem.price,
      unit: catItem.unit
    };
    if (items.length === 1 && !items[0].desc.trim()) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
    notify?.('success', `Added ${catItem.name} to invoice`);
  };

  const subtotal = items.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.rate || 0)), 0);
  const taxAmount = (subtotal * Number(taxRate || 0)) / 100;
  const totalAmount = subtotal + taxAmount;

  const handleIssue = async () => {
    if (!project?.clientId) { notify?.('error', 'Project must have a client set'); return; }
    const validItems = items.filter(it => it.desc.trim() && Number(it.qty) > 0);
    if (validItems.length === 0) {
      notify?.('error', 'Please enter at least one valid line item');
      return;
    }

    try {
      const invoiceData = {
        projectId: project.id,
        clientId: project.clientId,
        clientName: project.name || project.title || 'Client',
        clientEmail: project.email || '',
        clientPhone: project.phone || '',
        title: docTitle.trim(),
        currency,
        date,
        due,
        items: validItems.map(it => ({
          desc: it.desc.trim(),
          qty: Number(it.qty) || 1,
          rate: Number(it.rate) || 0,
          unit: it.unit || 'pcs'
        })),
        taxRate: Number(taxRate) || 0,
        total: totalAmount,
        paidAmount: 0,
        status: 'Pending',
        type: 'Invoice',
        notes: notes.trim(),
        parentId: project.id,
      };

      const invId = await createInvoice(invoiceData);
      
      printInvoiceOrReceipt({ ...invoiceData, id: invId }, brand);
      onClose();
    } catch (err) {
      console.error(err);
      notify?.('error', 'Failed to generate invoice');
    }
  };

  const filteredCatalog = PREMIUM_CATALOG.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(catSearch.toLowerCase()) || p.category.toLowerCase().includes(catSearch.toLowerCase());
    const matchesFilter = catFilter === 'All' || p.category === catFilter;
    return matchesSearch && matchesFilter;
  });

  const categories = ['All', 'Glass', 'Profiles', 'Washrooms', 'Kitchens', 'Doors'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(24, 14, 6, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#FFF', borderRadius: 24, width: '95vw', maxWidth: 1100, height: '90vh', display: 'flex', flexDirection: 'row', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
        
        {/* Workspace */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 32, overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#4A3B32' }}>Create New Official Invoice</div>
              <div style={{ fontSize: 11, color: '#8C6C52', fontWeight: 600 }}>Project: {project.title || project.name}</div>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: '#F4EFE6', padding: 8, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#4A3B32" />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Document Title</label>
              <input value={docTitle} onChange={e => setDocTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 12, background: '#FFF', outline: 'none' }} placeholder="e.g. Deposit Payment" />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Issue Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 12, background: '#FFF', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Due Date</label>
              <input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 12, background: '#FFF', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Billing Currency</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['GHS', 'USD'].map(curr => (
                  <button key={curr} type="button" onClick={() => setCurrency(curr)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${currency === curr ? '#4A3B32' : '#F4EFE6'}`, background: currency === curr ? '#4A3B32' : '#FFF', color: currency === curr ? '#FFF' : '#4A3B32', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                    {curr === 'GHS' ? 'GH₵ (GHS)' : '$ (USD)'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Tax Rate (%)</label>
              <input type="number" min="0" max="100" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 12, background: '#FFF', outline: 'none' }} placeholder="e.g. 15" />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#4A3B32', textTransform: 'uppercase', letterSpacing: 0.5 }}>Billable Line Items</div>
              <button type="button" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: '#F4EFE6', color: '#4A3B32', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                <Plus size={14} /> Add Custom Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((it, idx) => (
                <div key={it.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 24, fontSize: 11, fontWeight: 800, color: '#8C6C52', textAlign: 'center' }}>{idx + 1}</div>
                  <input value={it.desc} onChange={e => updateItem(it.id, 'desc', e.target.value)} style={{ flex: 3, padding: '9px 12px', borderRadius: 8, border: '1px solid #F4EFE6', fontSize: 12, outline: 'none' }} placeholder="Item description" />
                  <input type="number" min="1" value={it.qty} onChange={e => updateItem(it.id, 'qty', Number(e.target.value))} style={{ flex: 0.8, padding: '9px 12px', borderRadius: 8, border: '1px solid #F4EFE6', fontSize: 12, outline: 'none', textAlign: 'center' }} placeholder="Qty" />
                  <input value={it.unit} onChange={e => updateItem(it.id, 'unit', e.target.value)} style={{ flex: 0.8, padding: '9px 12px', borderRadius: 8, border: '1px solid #F4EFE6', fontSize: 12, outline: 'none', textAlign: 'center' }} placeholder="Unit" />
                  <input type="number" min="0" value={it.rate} onChange={e => updateItem(it.id, 'rate', Number(e.target.value))} style={{ flex: 1.5, padding: '9px 12px', borderRadius: 8, border: '1px solid #F4EFE6', fontSize: 12, outline: 'none', textAlign: 'right' }} placeholder="Rate" />
                  <div style={{ flex: 1.2, padding: '9px 12px', background: '#F4EFE650', borderRadius: 8, fontSize: 12, fontWeight: 800, color: '#4A3B32', textAlign: 'right' }}>
                    {(currency === 'USD' ? '$' : 'GH₵') + ' ' + (Number(it.qty || 0) * Number(it.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <button type="button" onClick={() => removeItem(it.id)} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={15} color="#DC2626" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F4EFE6', paddingTop: 24, marginTop: 'auto' }}>
            <div style={{ width: '50%' }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Invoice Terms & Instructions</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', height: 80, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 11, background: '#FFF', outline: 'none', resize: 'none', lineHeight: 1.5 }} />
            </div>
            <div style={{ width: '40%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F4EFE6', fontSize: 12 }}>
                <span style={{ color: '#716259' }}>Subtotal</span>
                <span style={{ fontWeight: 700, color: '#4A3B32' }}>{currency === 'USD' ? '$' : 'GH₵'} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {taxRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F4EFE6', fontSize: 12 }}>
                  <span style={{ color: '#716259' }}>Taxes ({taxRate}%)</span>
                  <span style={{ fontWeight: 700, color: '#4A3B32' }}>{currency === 'USD' ? '$' : 'GH₵'} {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '2px solid #C5A880', fontSize: 14, fontWeight: 900, marginBottom: 20 }}>
                <span style={{ color: '#4A3B32' }}>Total Amount</span>
                <span style={{ color: '#4A3B32' }}>{currency === 'USD' ? '$' : 'GH₵'} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <button type="button" onClick={handleIssue} style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#16A34A', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> Issue & Print Official Invoice
              </button>
            </div>
          </div>

        </div>

        {/* Catalog Sidebar */}
        <div style={{ width: 320, borderLeft: '1px solid #E5E5E5', background: '#FDFBF7', padding: 24, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#4A3B32', marginBottom: 14, letterSpacing: 0.5, textTransform: 'uppercase' }}>Materials Catalog</div>
          
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8C6C52' }} />
            <input value={catSearch} onChange={e => setCatSearch(e.target.value)} placeholder="Search catalog..." style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid #F4EFE6', fontSize: 12, outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{ padding: '4px 10px', borderRadius: 100, border: 'none', fontSize: 10, fontWeight: 800, cursor: 'pointer', background: catFilter === cat ? '#4A3B32' : '#F4EFE6', color: catFilter === cat ? '#FFF' : '#4A3B32' }}>
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredCatalog.map(p => (
              <button key={p.id} onClick={() => addCatalogItem(p)} style={{ width: '100%', padding: 12, background: '#FFF', border: '1px solid #F4EFE6', borderRadius: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, transition: 'all 0.2s' }} className="hover-lift">
                <div style={{ fontSize: 11, fontWeight: 800, color: '#4A3B32' }}>{p.name}</div>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: '#8C6C52', background: '#F4EFE6', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{p.category.toUpperCase()}</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#C5A880' }}>${p.price} <span style={{ fontSize: 8, color: '#716259', fontWeight: 600 }}>/{p.unit}</span></span>
                </div>
              </button>
            ))}
            {filteredCatalog.length === 0 && (
              <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 11, color: '#8C6C52', fontStyle: 'italic' }}>No catalog items found.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Project Invoices & Billing Ledger ───────────────────────────────────────
function ProjectInvoicesLedger({ project, invoices, brand, updateInvoice, deleteInvoice, notify, user }) {
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const projectInvoices = (invoices || []).filter(inv => inv.parentId === project.id);

  const openPaymentModal = (inv) => {
    setPayingInvoice(inv);
    const balance = Math.max(0, Number(inv.total || 0) - Number(inv.paidAmount || 0));
    setPayAmt(balance.toString());
    setPayNote(`Payment received against Invoice WF-${(inv.id || '').slice(-8).toUpperCase()}`);
  };

  const handleRecordPayment = async () => {
    if (!payingInvoice || !payAmt || Number(payAmt) <= 0 || savingPayment) return;
    setSavingPayment(true);
    try {
      const amount = Number(payAmt);
      const fxRate = Number(brand?.exchangeRate) || 15.5;
      const amountInGhs = payingInvoice.currency === 'USD' ? amount * fxRate : amount;

      await addDoc(collection(db, 'projects', project.id, 'transactions'), {
        amount: amountInGhs,
        description: payNote.trim() || 'Payment received',
        date: payDate,
        projectId: project.id,
        type: 'payment',
        createdAt: serverTimestamp(),
      });

      const newPaid = Number(payingInvoice.paidAmount || 0) + amount;
      const newStatus = newPaid >= Number(payingInvoice.total || 0) ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Pending';
      
      await updateInvoice(payingInvoice.id, {
        paidAmount: newPaid,
        status: newStatus
      });

      await updateDoc(doc(db, 'projects', project.id), {
        paidAmount: (Number(project.paidAmount) || 0) + amountInGhs
      });

      notify?.('success', 'Payment logged and project economics reconciled successfully');
      setPayingInvoice(null);
    } catch (err) {
      console.error(err);
      notify?.('error', 'Failed to log payment');
    }
    setSavingPayment(false);
  };

  const handleDelete = async (invId) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This will permanently remove it from the ledger.')) return;
    try {
      await deleteInvoice(invId);
    } catch (err) {
      console.error(err);
      notify?.('error', 'Failed to delete invoice');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)', marginTop: 16 }}>
      
      {project.quoteApproved && (
        <div style={{
          display: 'flex', justifyItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: '#FDFBF7', border: '1px solid #C5A880', borderRadius: 12, marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, background: '#F4EFE6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={18} color="#C5A880" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#4A3B32' }}>Legally Executed E-Contract Vault</div>
              <div style={{ fontSize: 11, color: '#716259', fontWeight: 600 }}>Secured via Carrier SMS OTP Authentications</div>
            </div>
          </div>
          <button
            onClick={() => printSignedContractDoc(project, user, brand)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
              background: '#4A3B32', color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer'
            }}
          >
            <Download size={14} /> Download Signed Contract (PDF)
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-secondary)' }}>Project Invoices & Billing Ledger</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Official historical logs of billing documents</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8 }}>
          {projectInvoices.length} billing records
        </div>
      </div>

      {projectInvoices.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ref Number</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Title</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Issue Date</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Due Date</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Outstanding</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projectInvoices.map((inv) => {
                const currency = inv.currency || 'GHS';
                const symbol = currency === 'USD' ? '$' : 'GH₵';
                const total = Number(inv.total || 0);
                const paid = Number(inv.paidAmount || 0);
                const balance = Math.max(0, total - paid);

                const status = (inv.status || 'Pending').toLowerCase();
                const badgeStyle = status === 'paid'
                  ? { background: '#D1FAE5', color: '#065F46' }
                  : status === 'partially paid'
                    ? { background: '#FEF3C7', color: '#92400E' }
                    : { background: '#F3F4F6', color: '#374151' };

                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover-row">
                    <td style={{ padding: '14px 10px', fontSize: 12, fontWeight: 800, color: 'var(--accent-secondary)' }}>
                      WF-${(inv.id || '').slice(-8).toUpperCase()}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: 12, color: 'var(--accent-secondary)' }}>
                      {inv.title}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {inv.date}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {inv.due || '—'}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: 12, fontWeight: 800, color: 'var(--accent-secondary)', textAlign: 'right' }}>
                      {symbol} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: 12, fontWeight: 800, color: balance > 0 ? '#DC2626' : '#16A34A', textAlign: 'right' }}>
                      {symbol} {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, ...badgeStyle }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        
                        <button
                          onClick={() => printInvoiceOrReceipt(inv, brand)}
                          title="Print / Export PDF"
                          style={{ border: 'none', background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Download size={13} color="var(--text-secondary)" />
                        </button>

                        {balance > 0 && (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            title="Quick Settle / Record Payment"
                            style={{ border: 'none', background: '#D1FAE5', padding: '6px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <CreditCard size={13} color="#065F46" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(inv.id)}
                          title="Delete Document"
                          style={{ border: 'none', background: '#FEE2E2', padding: '6px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={13} color="#DC2626" />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 12 }}>
          No invoices or billing records have been generated for this project yet.
        </div>
      )}

      {payingInvoice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(24, 14, 6, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFF', borderRadius: 20, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 20px 45px rgba(0,0,0,0.15)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#4A3B32' }}>Quick Record Payment</div>
                <div style={{ fontSize: 11, color: '#8C6C52', fontWeight: 700 }}>Invoice: WF-${(payingInvoice.id || '').slice(-8).toUpperCase()}</div>
              </div>
              <button onClick={() => setPayingInvoice(null)} style={{ border: 'none', background: '#F4EFE6', padding: 6, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={15} color="#4A3B32" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Payment Amount ({payingInvoice.currency || 'GHS'})</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmt}
                  onChange={e => setPayAmt(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 13, background: '#FFF', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Payment Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 13, background: '#FFF', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Description / Note</label>
                <input
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 13, background: '#FFF', outline: 'none' }}
                  placeholder="e.g. Settle balance via bank transfer"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleRecordPayment}
                disabled={savingPayment || !payAmt}
                style={{ flex: 1, padding: '12px', borderRadius: 10, background: '#16A34A', color: '#fff', border: 'none', fontSize: 12, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {savingPayment ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />} Log Payment
              </button>
              <button onClick={() => setPayingInvoice(null)} style={{ padding: '12px 18px', borderRadius: 10, background: '#F4EFE6', color: '#4A3B32', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// ─── Payment Schedule Card (admin) ───────────────────────────────────────────
function PaymentScheduleCard({ project, createInvoice, notify, brand }) {
  const budget = Number(project.budget) || 0;
  const scheduleType = project.paymentSchedule || 'standard';
  const config = SCHEDULE_CONFIGS[scheduleType] || SCHEDULE_CONFIGS.standard;
  const [changing, setChanging] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logForm, setLogForm] = useState({ amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [payments, setPayments] = useState([]);
  useEffect(() => {
    if (!db || !project?.id) return;
    const q = query(collection(db, 'projects', project.id, 'transactions'), orderBy('date', 'desc'));
    return onSnapshot(q, snap => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setPayments([]));
  }, [project?.id]);

  const totalPaid = payments.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const paidPct = budget > 0 ? Math.min(100, (totalPaid / budget) * 100) : 0;
  const remaining = Math.max(0, budget - totalPaid);

  const fmt = v => `GHS ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getMilestoneStatus = (m) => {
    if (budget <= 0) return 'upcoming';
    if (totalPaid >= budget * m.cumPct) return 'paid';
    if (totalPaid >= budget * (m.cumPct - m.pct)) return 'due';
    return 'upcoming';
  };

  const changeSchedule = async (type) => {
    if (!db || !project?.id) return;
    await updateDoc(doc(db, 'projects', project.id), { paymentSchedule: type });
    setChanging(false);
  };

  const logPayment = async () => {
    if (!logForm.amount || Number(logForm.amount) <= 0 || saving) return;
    setSaving(true);
    try {
      const amount = Number(logForm.amount);
      await addDoc(collection(db, 'projects', project.id, 'transactions'), {
        amount,
        description: logForm.description.trim() || 'Payment received',
        date: logForm.date,
        projectId: project.id,
        type: 'payment',
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'projects', project.id), { paidAmount: totalPaid + amount });
      setLogForm({ amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
      setLogging(false);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[logPayment]', e);
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 2 }}>Payment Schedule</div>
          <div style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 600 }}>{config.label} · {config.sub}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {scheduleType === 'custom' && (
            <button
              onClick={() => setLogging(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
            >
              <Plus size={13} /> Log Payment
            </button>
          )}
          {createInvoice && (
            <button
              onClick={() => {
                if (!project?.clientId) { notify?.('error', 'Project must have a client set'); return; }
                setShowInvoiceModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#16A34A', color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
            >
              <FileText size={13} /> Generate Invoice
            </button>
          )}
          <button
            onClick={() => setChanging(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, background: changing ? `var(--accent-secondary)` : `var(--bg-secondary)`, color: changing ? '#fff' : `var(--text-secondary)`, border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            {changing ? 'Done' : 'Change'}
          </button>
        </div>
      </div>

      {/* Schedule picker */}
      {changing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16, padding: '14px', background: `var(--bg-secondary)`, borderRadius: 14 }}>
          {Object.entries(SCHEDULE_CONFIGS).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => changeSchedule(key)}
              style={{
                padding: '12px 10px', borderRadius: 12, border: `2px solid ${scheduleType === key ? `var(--accent-secondary)` : `var(--border-color)`}`,
                background: scheduleType === key ? `var(--accent-secondary)` : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: scheduleType === key ? `var(--accent-secondary)` : `var(--accent-secondary)`, marginBottom: 3 }}>{cfg.label}</div>
              <div style={{ fontSize: 10, color: scheduleType === key ? 'rgba(255,255,255,.6)' : `var(--text-secondary)`, lineHeight: 1.4 }}>{cfg.sub}</div>
            </button>
          ))}
        </div>
      )}

      {/* Log Payment form */}
      {logging && (
        <div style={{ marginBottom: 16, padding: '16px', background: `var(--bg-secondary)`, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: `var(--accent-secondary)` }}>Record a Payment</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Amount (GHS) *</label>
              <input
                type="number"
                value={logForm.amount}
                onChange={e => setLogForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="e.g. 15000"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Date</label>
              <input
                type="date"
                value={logForm.date}
                onChange={e => setLogForm(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Note</label>
            <input
              value={logForm.description}
              onChange={e => setLogForm(p => ({ ...p, description: e.target.value }))}
              placeholder="e.g. Second batch payment — wire transfer"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={logPayment}
              disabled={saving || !logForm.amount}
              style={{ flex: 1, padding: '10px', borderRadius: 10, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !logForm.amount ? 0.5 : 1 }}
            >
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Record Payment'}
            </button>
            <button onClick={() => setLogging(false)} style={{ padding: '10px 16px', borderRadius: 10, background: `var(--bg-secondary)`, color: `var(--text-secondary)`, border: '1px solid var(--border-color)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {budget > 0 && (
        <div style={{ marginBottom: config.milestones.length > 0 ? 14 : 0 }}>
          <div style={{ height: 7, background: `var(--border-color)`, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${paidPct}%`, background: 'linear-gradient(90deg, #16A34A80, #16A34A)', borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: `var(--text-secondary)` }}>
            <span><strong style={{ color: '#16A34A' }}>{fmt(totalPaid)}</strong> paid · {paidPct.toFixed(1)}%</span>
            <span>{fmt(remaining)} remaining · {fmt(budget)}</span>
          </div>
        </div>
      )}

      {/* Custom: recent payments mini-list */}
      {scheduleType === 'custom' && payments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {payments.slice(0, 5).map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: `var(--bg-secondary)`, borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: `var(--accent-secondary)` }}>{p.description || 'Payment'}</div>
                <div style={{ fontSize: 10, color: `var(--text-secondary)` }}>{p.date || '—'}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#16A34A' }}>{fmt(p.amount)}</div>
            </div>
          ))}
          {payments.length > 5 && (
            <div style={{ fontSize: 11, color: `var(--text-secondary)`, textAlign: 'center', paddingTop: 4 }}>+{payments.length - 5} more payments</div>
          )}
        </div>
      )}

      {/* Milestone rows */}
      {config.milestones.length > 0 && budget > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {config.milestones.map((m, idx) => {
            const status = getMilestoneStatus(m);
            const isPaid = status === 'paid';
            const isDue = status === 'due';
            return (
              <div key={m.key} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                background: isDue ? '#F0FDF4' : '#FAFAF9',
                border: `1.5px solid ${isDue ? '#16A34A40' : isPaid ? '#16A34A20' : `var(--border-color)`}`,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPaid ? '#16A34A' : isDue ? '#F0FDF4' : `var(--border-color)`, border: isDue ? '2px solid #16A34A' : 'none' }}>
                  {isPaid ? <CheckCircle2 size={13} color="#fff" /> : <span style={{ fontSize: 10, fontWeight: 900, color: isDue ? '#16A34A' : `var(--text-secondary)` }}>{idx + 1}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: `var(--accent-secondary)` }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isPaid ? '#16A34A' : isDue ? '#16A34A' : `var(--text-secondary)` }}>{fmt(budget * m.pct)}</div>
                </div>
                <div>
                  {isPaid && <span style={{ fontSize: 10, fontWeight: 800, color: '#065F46', background: '#D1FAE5', padding: '3px 9px', borderRadius: 20 }}>Paid ✓</span>}
                  {isDue && <span style={{ fontSize: 10, fontWeight: 800, color: '#92400E', background: '#FEF3C7', padding: '3px 9px', borderRadius: 20 }}>Due</span>}
                  {status === 'upcoming' && <span style={{ fontSize: 10, color: `var(--text-secondary)`, background: `var(--border-color)`, padding: '3px 9px', borderRadius: 20 }}>Upcoming</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showInvoiceModal && (
        <InvoiceCreatorModal
          project={project}
          brand={brand}
          createInvoice={createInvoice}
          onClose={() => setShowInvoiceModal(false)}
          notify={notify}
        />
      )}
    </div>
  );
}

// ─── New Project Modal ────────────────────────────────────────────────────────
const BD_ITEMS_CONFIG = [
  { key: 'product',      label: 'Product / Materials', color: `var(--accent-secondary)`, icon: <Package size={13} /> },
  { key: 'shipping',     label: 'Shipping & Freight',  color: `var(--text-secondary)`, icon: <Truck size={13} /> },
  { key: 'installation', label: 'Installation Labour', color: '#D97706', icon: <Wrench size={13} /> },
];

function NewProjectModal({ client, teamMembers = [], onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    projectType: 'full-service',
    budget: '',
    renderingFee: '',
    description: '',
    paymentSchedule: 'standard',
    projectDate: '',
    estimatedStartDate: '',
    targetCompletionDate: '',
    assignedStaff: '',
    assignedWorker: '',
    kickoffMode: 'rendering-first',
    latitude: '',
    longitude: '',
    cat: '',
  });
  const [showBackdate, setShowBackdate] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [bd, setBd] = useState({
    product:      { enabled: true,  amount: '' },
    shipping:     { enabled: false, amount: '' },
    installation: { enabled: false, amount: '' },
    extras: [],
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const bdTotal = showBreakdown
    ? BD_ITEMS_CONFIG.filter(i => bd[i.key].enabled).reduce((s, i) => s + (Number(bd[i.key].amount) || 0), 0)
      + bd.extras.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    : null;

  const toggleBd  = key => setBd(p => ({ ...p, [key]: { ...p[key], enabled: !p[key].enabled } }));
  const setBdAmt  = (key, v) => setBd(p => ({ ...p, [key]: { ...p[key], amount: v } }));
  const addExtra  = () => setBd(p => ({ ...p, extras: [...p.extras, { id: `ext_${Date.now()}`, label: '', amount: '' }] }));
  const rmExtra   = id => setBd(p => ({ ...p, extras: p.extras.filter(e => e.id !== id) }));
  const setExtra  = (id, f, v) => setBd(p => ({ ...p, extras: p.extras.map(e => e.id === id ? { ...e, [f]: v } : e) }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { ...form, clientId: client.id };
    if (showBreakdown && bdTotal > 0) {
      payload.breakdown = {
        product:      { enabled: bd.product.enabled,      amount: Number(bd.product.amount)      || 0 },
        shipping:     { enabled: bd.shipping.enabled,     amount: Number(bd.shipping.amount)     || 0 },
        installation: { enabled: bd.installation.enabled, amount: Number(bd.installation.amount) || 0 },
        extras: bd.extras.filter(e => e.label.trim()).map(e => ({ id: e.id, label: e.label.trim(), amount: Number(e.amount) || 0 })),
      };
      payload.budget = String(bdTotal);
    }
    await onCreate(payload);
    setSaving(false);
    onClose();
  };

  const lS = { fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 };
  const iS = { width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const fmtTotal = v => `GHS ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const staffOptions = (teamMembers || []).filter(m => ['admin', 'staff', 'project-manager', 'Project Manager'].includes(m.role) || /manager|staff|admin/i.test(m.jobRole || ''));
  const workerOptions = (teamMembers || []).filter(m => m.role === 'worker' || /worker|installer|field/i.test(m.jobRole || ''));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 880, padding: 40, position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,.2)', margin: '20px auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        <div style={{ fontSize: 11, fontWeight: 800, color: AC, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Project Launch Console</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 28 }}>{client.name}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 280px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Title */}
          <div>
            <label style={lS}>Project Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. East Legon Villa — Curtain Wall" style={iS} />
          </div>

          {/* Work Category + Site Coordinates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={lS}>Work Category *</label>
              <select value={form.cat} onChange={e => set('cat', e.target.value)} style={iS}>
                <option value="">— Select Category —</option>
                <option value="glass">Glass & Glazing</option>
                <option value="shower">Shower & Washroom</option>
                <option value="partition">Glass Partition & Balustrade</option>
                <option value="pergola">Pergola & Canopy</option>
                <option value="cladding">ACP Cladding & Facade</option>
                <option value="kitchen">Kitchen & Interiors</option>
                <option value="general">General / Other</option>
              </select>
            </div>
            <div>
              <label style={lS}>Site Latitude (GPS)</label>
              <input value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="e.g. 5.6037" style={iS} />
            </div>
            <div>
              <label style={lS}>Site Longitude (GPS)</label>
              <input value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="e.g. -0.1870" style={iS} />
            </div>
          </div>

          <div>
            <label style={lS}>Launch Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { id: 'rendering-first', title: 'Rendering First', desc: 'Client pays design/CAD fee before seeing rendering, then approves quote.' },
                { id: 'direct-kickoff', title: 'Direct Kickoff', desc: 'Use only for legacy or pre-approved projects with admin responsibility.' },
              ].map(mode => (
                <button key={mode.id} type="button" onClick={() => set('kickoffMode', mode.id)} style={{ padding: 14, borderRadius: 14, border: `2px solid ${form.kickoffMode === mode.id ? AC : `var(--border-color)`}`, background: form.kickoffMode === mode.id ? 'var(--bg-secondary)' : '#fff', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: form.kickoffMode === mode.id ? AC : `var(--accent-secondary)`, marginBottom: 4 }}>{mode.title}</div>
                  <div style={{ fontSize: 11, color: `var(--text-secondary)`, lineHeight: 1.45 }}>{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Project Type */}
          <div>
            <label style={lS}>Project Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(PROJECT_TYPES).map(([key, pt]) => (
                <button key={key} onClick={() => set('projectType', key)} style={{ padding: '14px 16px', borderRadius: 14, border: `2px solid ${form.projectType === key ? pt.color : `var(--border-color)`}`, background: form.projectType === key ? `${pt.color}10` : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .2s' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: form.projectType === key ? pt.color : `var(--accent-secondary)`, marginBottom: 4 }}>{pt.label}</div>
                  <div style={{ fontSize: 11, color: `var(--text-secondary)`, lineHeight: 1.4 }}>{pt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Budget / Breakdown */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ ...lS, marginBottom: 0 }}>Project Value (GHS)</label>
              <button
                type="button"
                onClick={() => setShowBreakdown(p => !p)}
                style={{ fontSize: 11, fontWeight: 800, color: showBreakdown ? AC : `var(--text-secondary)`, background: showBreakdown ? '#FFF7ED' : `var(--bg-secondary)`, border: `1.5px solid ${showBreakdown ? 'var(--accent-secondary)50' : `var(--border-color)`}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' }}
              >
                {showBreakdown ? '− Simple total' : '+ Add cost breakdown'}
              </button>
            </div>

            {!showBreakdown ? (
              <input value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="e.g. 75000" type="number" style={iS} />
            ) : (
              <div style={{ background: '#FAFAF9', borderRadius: 16, border: '1.5px solid var(--border-color)', padding: '14px 14px 10px' }}>

                {/* Core cost rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
                  {BD_ITEMS_CONFIG.map(({ key, label, color, icon }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: bd[key].enabled ? '#fff' : '#F5F3F0', border: `1.5px solid ${bd[key].enabled ? `var(--border-color)` : `var(--border-color)`}`, opacity: bd[key].enabled ? 1 : 0.55, transition: 'all .2s' }}>
                      <button onClick={() => toggleBd(key)} style={{ width: 32, height: 18, borderRadius: 9, background: bd[key].enabled ? color : '#E0DAD4', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                        <div style={{ position: 'absolute', top: 1, left: bd[key].enabled ? 15 : 1, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
                      </button>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: `var(--accent-secondary)` }}>{label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 9, padding: '5px 9px', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700 }}>GHS</span>
                        <input type="number" min="0" value={bd[key].amount} onChange={e => setBdAmt(key, e.target.value)} disabled={!bd[key].enabled} placeholder="0" style={{ width: 80, border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, background: 'transparent', fontFamily: 'inherit', textAlign: 'right' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Extras */}
                {bd.extras.map(extra => (
                  <div key={extra.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: `var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={11} color="var(--text-secondary)" /></div>
                    <input value={extra.label} onChange={e => setExtra(extra.id, 'label', e.target.value)} placeholder="Extra item description" style={{ flex: 1, padding: '8px 11px', borderRadius: 9, border: '1.5px solid var(--border-color)', fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 9, padding: '5px 9px', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700 }}>GHS</span>
                      <input type="number" min="0" value={extra.amount} onChange={e => setExtra(extra.id, 'amount', e.target.value)} placeholder="0" style={{ width: 70, border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, background: 'transparent', fontFamily: 'inherit', textAlign: 'right' }} />
                    </div>
                    <button onClick={() => rmExtra(extra.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={12} color="var(--text-secondary)" /></button>
                  </div>
                ))}

                <button onClick={addExtra} style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={12} /> Add extra line
                </button>

                {bdTotal > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1.5px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.04em' }}>Total Project Value</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: `var(--accent-secondary)` }}>{fmtTotal(bdTotal)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lS}>Separate Rendering / CAD Fee (GHS)</label>
              <input value={form.renderingFee} onChange={e => set('renderingFee', e.target.value)} placeholder="e.g. 1500" type="number" style={iS} />
            </div>
            <div>
              <label style={lS}>Target Completion</label>
              <input value={form.targetCompletionDate} onChange={e => set('targetCompletionDate', e.target.value)} type="date" style={iS} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lS}>Project Manager</label>
              <select value={form.assignedStaff} onChange={e => set('assignedStaff', e.target.value)} style={iS}>
                <option value="">Assign later</option>
                {staffOptions.map(m => <option key={m.uid || m.id} value={m.uid || m.id}>{m.name || m.email || m.id}</option>)}
              </select>
            </div>
            <div>
              <label style={lS}>Lead Installer / Worker</label>
              <select value={form.assignedWorker} onChange={e => set('assignedWorker', e.target.value)} style={iS}>
                <option value="">Assign later</option>
                {workerOptions.map(m => <option key={m.uid || m.id} value={m.uid || m.id}>{m.name || m.email || m.id}</option>)}
              </select>
            </div>
          </div>

          {/* Payment Schedule */}
          <div>
            <label style={lS}>Payment Schedule</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {Object.entries(SCHEDULE_CONFIGS).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => set('paymentSchedule', key)} style={{ padding: '12px 10px', borderRadius: 12, border: `2px solid ${form.paymentSchedule === key ? `var(--accent-secondary)` : `var(--border-color)`}`, background: form.paymentSchedule === key ? `var(--accent-secondary)` : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: form.paymentSchedule === key ? `var(--accent-secondary)` : `var(--accent-secondary)`, marginBottom: 3 }}>{cfg.label}</div>
                  <div style={{ fontSize: 10, color: form.paymentSchedule === key ? 'rgba(255,255,255,.6)' : `var(--text-secondary)`, lineHeight: 1.4 }}>{cfg.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={lS}>Brief / Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the scope, site location, and any special requirements..." rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
          </div>

          {/* Backdate */}
          <div>
            <button
              type="button"
              onClick={() => setShowBackdate(p => !p)}
              style={{ fontSize: 11, fontWeight: 800, color: showBackdate ? '#DC2626' : `var(--text-secondary)`, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Calendar size={12} />
              {showBackdate ? 'Remove backdate' : 'Backdate this project'}
            </button>
            {showBackdate && (
              <div style={{ marginTop: 10, padding: '14px 16px', background: '#FEF2F2', borderRadius: 12, border: '1.5px solid #FCA5A530' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Project Start Date</div>
                <input
                  type="date"
                  value={form.projectDate}
                  onChange={e => set('projectDate', e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #FECACA', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
                />
                <div style={{ fontSize: 11, color: '#DC2626', marginTop: 6, lineHeight: 1.5 }}>
                  Sets the project creation date. Use for historical projects only.
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 18, borderRadius: 18, background: '#F8F8FD', border: '1.5px solid var(--border-color)' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 12 }}>Launch Checklist</div>
            {[
              { ok: !!form.title.trim(), label: 'Project title captured' },
              { ok: !!(showBreakdown ? bdTotal : form.budget), label: 'Project value entered' },
              { ok: form.kickoffMode !== 'rendering-first' || !!form.renderingFee, label: 'Rendering fee set' },
              { ok: !!form.assignedStaff, label: 'Project manager assigned' },
              { ok: !!form.targetCompletionDate, label: 'Estimated completion date set' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: item.ok ? '#16A34A' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                  {item.ok && <CheckCircle2 size={12} />}
                </div>
                <div style={{ fontSize: 12, color: item.ok ? `var(--accent-secondary)` : `var(--text-secondary)`, fontWeight: item.ok ? 800 : 600 }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: 18, borderRadius: 18, background: '#fff', border: '1.5px solid var(--border-color)' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 10 }}>What happens after create</div>
            {[
              'Project opens at intake stage.',
              'Rendering/design access starts locked.',
              'Rendering fee remains separate from project value.',
              'Quote and deposit gates are prepared for the client journey.',
              'Timeline records are initialized for audit tracking.',
            ].map(step => (
              <div key={step} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 11, color: `var(--text-secondary)`, lineHeight: 1.45 }}>
                <ChevronRight size={13} color={AC} style={{ flexShrink: 0, marginTop: 1 }} /> {step}
              </div>
            ))}
          </div>
        </div>
        </div>

        <button
          onClick={submit}
          disabled={saving || !form.title.trim()}
          style={{ marginTop: 28, width: '100%', height: 52, borderRadius: 14, background: form.title.trim() ? `var(--accent-secondary)` : `var(--border-color)`, color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: form.title.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s' }}
        >
          {saving ? <><Loader2 size={16} className="spin" /> Creating...</> : 'Create Project'}
        </button>
      </div>
    </div>
  );
}

// ─── Stage Advance Modal ──────────────────────────────────────────────────────
function AdvanceModal({ project, stage, nextStage, invoices = [], onClose, onAdvance }) {
  const [note, setNote] = useState('');
  const [clientVisibleNote, setClientVisibleNote] = useState('');
  const [timelineStatus, setTimelineStatus] = useState(project.timelineStatus || 'On track');
  const [overrideDate, setOverrideDate] = useState('');
  const [approvalOverride, setApprovalOverride] = useState(false);
  const [gateOverride, setGateOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const needsApproval = stage?.needsClientApproval || stage?.whoActs === 'client';
  const projectInvoices = (invoices || []).filter(inv => inv.parentId === project.id || inv.projectId === project.id);
  const hasPaidInvoice = (label) => projectInvoices.some(inv => {
    const title = `${inv.title || ''} ${inv.type || ''} ${inv.invoiceType || ''}`.toLowerCase();
    return title.includes(label) && String(inv.status || '').toLowerCase() === 'paid';
  });
  const gateChecks = [
    {
      id: 'rendering-fee',
      label: 'Rendering/CAD fee configured',
      applies: nextStage.id >= 2 && project.kickoffMode !== 'direct-kickoff',
      ok: !!project.renderingFee || !!project.renderingFeeInvoiceId,
    },
    {
      id: 'rendering-approved',
      label: 'Rendering/design approved or admin-confirmed',
      applies: nextStage.id >= 3 && project.kickoffMode !== 'direct-kickoff',
      ok: !!(project.renderingApproved || project.designApproved || project.renderingStatus === 'Approved'),
    },
    {
      id: 'quote-approved',
      label: 'Final quote approved',
      applies: nextStage.id >= 4,
      ok: !!(project.quoteApproved || project.quoteStatus === 'approved' || project.approvedQuoteId),
    },
    {
      id: 'deposit-paid',
      label: 'Project deposit paid or verified',
      applies: nextStage.id >= 4,
      ok: !!(project.depositPaid || project.depositStatus === 'Paid' || hasPaidInvoice('deposit')),
    },
    {
      id: 'field-crew',
      label: 'Field crew assigned before installation',
      applies: nextStage.id >= 6,
      ok: (project.assignedWorkers || []).length > 0,
    },
    {
      id: 'final-settlement',
      label: 'Final settlement cleared before handover',
      applies: nextStage.id >= 8,
      ok: !!(project.finalPaymentPaid || project.finalSettlementPaid || hasPaidInvoice('final')),
    },
  ].filter(c => c.applies);
  const blockingChecks = gateChecks.filter(c => !c.ok);
  const canAdvance = blockingChecks.length === 0 || gateOverride;

  const submit = async () => {
    if (!canAdvance) return;
    setSaving(true);
    const fullNote = [
      note,
      approvalOverride ? 'Client approval confirmed verbally / informally — proceeding by admin override.' : '',
      gateOverride ? `Gate override used for: ${blockingChecks.map(c => c.label).join(', ')}` : '',
    ].filter(Boolean).join(' ');
    await onAdvance(project.id, nextStage.id, fullNote, {
      overrideDate: overrideDate || null,
      gateOverride,
      gateChecks,
      clientVisibleNote,
      timelineStatus,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 620, padding: 36, position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,.2)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Advance Stage</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 4 }}>{project.title}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: `var(--bg-secondary)`, borderRadius: 14, margin: '20px 0', border: `1px solid ${nextStage.color}30` }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${nextStage.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {STAGE_ICONS[nextStage.id]}
          </div>
          <div>
            <div style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700 }}>Moving to</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: nextStage.color }}>{nextStage.name}</div>
            <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 2 }}>{nextStage.adminPrompt}</div>
          </div>
        </div>

        {gateChecks.length > 0 && (
          <div style={{ marginBottom: 18, padding: '14px 16px', background: '#F8F8FD', borderRadius: 12, border: '1.5px solid var(--border-color)' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Stage Gate Review</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gateChecks.map(check => (
                <div key={check.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: check.ok ? '#16A34A' : '#FEF2F2', color: check.ok ? '#fff' : '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {check.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  </div>
                  <div style={{ fontSize: 12, color: check.ok ? `var(--accent-secondary)` : '#991B1B', fontWeight: check.ok ? 800 : 700 }}>{check.label}</div>
                </div>
              ))}
            </div>
            {blockingChecks.length > 0 && (
              <label style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={gateOverride} onChange={e => setGateOverride(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                <span style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5, fontWeight: 700 }}>
                  Proceed with admin override. This will be logged on the stage history.
                </span>
              </label>
            )}
          </div>
        )}

        {/* Client approval override (shown when current stage requires client action) */}
        {needsApproval && (
          <div style={{ marginBottom: 18, padding: '14px 16px', background: '#FFFBEB', borderRadius: 12, border: '1.5px solid #FDE68A' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#92400E', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              ⚠ This stage normally requires client approval
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={approvalOverride}
                onChange={e => setApprovalOverride(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>
                Client has already approved (verbally or informally). Proceed by admin override and log this in the project record.
              </span>
            </label>
          </div>
        )}

        {/* Internal note */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Internal Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add context for your team about this stage transition..." rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Client-visible note</label>
            <input value={clientVisibleNote} onChange={e => setClientVisibleNote(e.target.value)} placeholder="Optional client-friendly update..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Timeline status</label>
            <select value={timelineStatus} onChange={e => setTimelineStatus(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }}>
              {['On track', 'At risk', 'Delayed', 'Waiting on client', 'Waiting on payment', 'Waiting on supplier', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Backdate this stage transition */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
            <Calendar size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            Backdate transition (optional)
          </label>
          <input
            type="date"
            value={overrideDate}
            onChange={e => setOverrideDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: overrideDate ? `var(--accent-secondary)` : `var(--text-secondary)` }}
          />
          {overrideDate && (
            <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 5 }}>Stage will be recorded as occurring on {overrideDate}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={submit}
            disabled={saving || (needsApproval && !approvalOverride) || !canAdvance}
            style={{ flex: 2, height: 48, borderRadius: 12, background: ((needsApproval && !approvalOverride) || !canAdvance) ? `var(--border-color)` : nextStage.color, color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: ((needsApproval && !approvalOverride) || !canAdvance) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s' }}
          >
            {saving ? <><Loader2 size={15} className="spin" /> Advancing...</> : `Advance → ${nextStage.short}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shipping Details Form ────────────────────────────────────────────────────
function ShippingDetailsCard({ project, updateShippingDetails }) {
  const init = {
    vesselName: project.shippingDetails?.vesselName || '',
    blNumber: project.shippingDetails?.blNumber || '',
    containerNumber: project.shippingDetails?.containerNumber || '',
    eta: project.shippingDetails?.eta || '',
    notes: project.shippingDetails?.notes || '',
  };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Re-sync if project changes
  useEffect(() => {
    setForm({
      vesselName: project.shippingDetails?.vesselName || '',
      blNumber: project.shippingDetails?.blNumber || '',
      containerNumber: project.shippingDetails?.containerNumber || '',
      eta: project.shippingDetails?.eta || '',
      notes: project.shippingDetails?.notes || '',
    });
    setSaved(false);
  }, [project.id]);

  const setF = (k, v) => { setForm(p => ({ ...p, [k]: v })); setSaved(false); };

  const handleSave = async () => {
    if (!updateShippingDetails) return;
    setSaving(true);
    await updateShippingDetails(project.id, form);
    setSaving(false);
    setSaved(true);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: '1.5px solid var(--border-color)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 800,
    color: `var(--text-secondary)`,
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 20, border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Anchor size={15} color="var(--text-secondary)" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Shipping Details</div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            height: 34, padding: '0 16px', borderRadius: 10,
            background: saved ? '#F0FDF4' : `var(--accent-secondary)`,
            color: saved ? '#16A34A' : '#fff',
            border: saved ? '1.5px solid #16A34A40' : 'none',
            fontSize: 12, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
          }}
        >
          {saving ? <><Loader2 size={13} className="spin" /> Saving...</> : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Vessel Name</label>
          <input
            value={form.vesselName}
            onChange={e => setF('vesselName', e.target.value)}
            placeholder="e.g. MSC Eleonora"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Bill of Lading Number</label>
          <input
            value={form.blNumber}
            onChange={e => setF('blNumber', e.target.value)}
            placeholder="e.g. MSCUAA123456"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Container Number</label>
          <input
            value={form.containerNumber}
            onChange={e => setF('containerNumber', e.target.value)}
            placeholder="e.g. MSCU1234567"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>ETA</label>
          <input
            type="date"
            value={form.eta}
            onChange={e => setF('eta', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={labelStyle}>Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={e => setF('notes', e.target.value)}
          placeholder="Port of discharge, customs notes, special instructions..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>
    </div>
  );
}

// ─── Project Economics ────────────────────────────────────────────────────────
function ProjectEconomics({ project, user }) {
  const costs = project.costs || {};
  const [form, setForm] = useState({
    product:      { enabled: costs.product?.enabled      ?? true,  amount: costs.product?.amount      || '' },
    shipping:     { enabled: costs.shipping?.enabled     ?? false, amount: costs.shipping?.amount     || '' },
    installation: { enabled: costs.installation?.enabled ?? false, amount: costs.installation?.amount || '' },
    extras: costs.extras || [],
  });
  const [surcharges, setSurcharges] = useState(project.surcharges || []);
  const [newSC, setNewSC] = useState({ label: '', amount: '', reason: '', date: new Date().toISOString().slice(0, 10) });
  const [showAddSC, setShowAddSC] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [savingSC, setSavingSC] = useState(false);

  useEffect(() => {
    const c = project.costs || {};
    setForm({
      product:      { enabled: c.product?.enabled      ?? true,  amount: c.product?.amount      || '' },
      shipping:     { enabled: c.shipping?.enabled     ?? false, amount: c.shipping?.amount     || '' },
      installation: { enabled: c.installation?.enabled ?? false, amount: c.installation?.amount || '' },
      extras: c.extras || [],
    });
    setSurcharges(project.surcharges || []);
    setSaved(false);
  }, [project.id]);

  const toggle   = key => { setForm(f => ({ ...f, [key]: { ...f[key], enabled: !f[key].enabled } })); setSaved(false); };
  const setAmt   = (key, v) => { setForm(f => ({ ...f, [key]: { ...f[key], amount: v } })); setSaved(false); };
  const addExtra = () => { setForm(f => ({ ...f, extras: [...f.extras, { id: `ext_${Date.now()}`, label: '', amount: '' }] })); setSaved(false); };
  const rmExtra  = id => { setForm(f => ({ ...f, extras: f.extras.filter(e => e.id !== id) })); setSaved(false); };
  const setEx    = (id, field, v) => { setForm(f => ({ ...f, extras: f.extras.map(e => e.id === id ? { ...e, [field]: v } : e) })); setSaved(false); };

  const totalCOGS = BD_ITEMS_CONFIG.filter(i => form[i.key].enabled).reduce((s, i) => s + (Number(form[i.key].amount) || 0), 0)
    + form.extras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalSurcharges = surcharges.reduce((s, sc) => s + (Number(sc.amount) || 0), 0);
  const salePrice   = Number(project.budget) || 0;
  const grossProfit = salePrice - totalCOGS;
  const margin      = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;

  const handleSave = async () => {
    if (!db || !project?.id || saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        costs: {
          product:      { enabled: form.product.enabled,      amount: Number(form.product.amount)      || 0 },
          shipping:     { enabled: form.shipping.enabled,     amount: Number(form.shipping.amount)     || 0 },
          installation: { enabled: form.installation.enabled, amount: Number(form.installation.amount) || 0 },
          extras: form.extras.filter(e => e.label?.trim()).map(e => ({ id: e.id, label: e.label.trim(), amount: Number(e.amount) || 0 })),
        },
      });
      setSaved(true);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[ProjectEconomics save]', e);
    }
    setSaving(false);
  };

  const handleAddSurcharge = async () => {
    if (!newSC.label.trim() || !newSC.amount || !newSC.reason.trim()) return;
    setSavingSC(true);
    try {
      const entry = {
        id: `sc_${Date.now()}`,
        label: newSC.label.trim(),
        amount: Number(newSC.amount) || 0,
        reason: newSC.reason.trim(),
        date: newSC.date,
        addedBy: user?.name || user?.displayName || 'Admin',
        addedAt: new Date().toISOString(),
      };
      const updated = [...surcharges, entry];
      const newBudget = salePrice + entry.amount;
      await updateDoc(doc(db, 'projects', project.id), { surcharges: updated, budget: String(newBudget) });
      setSurcharges(updated);
      setNewSC({ label: '', amount: '', reason: '', date: new Date().toISOString().slice(0, 10) });
      setShowAddSC(false);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Surcharge save]', e);
    }
    setSavingSC(false);
  };

  const removeSurcharge = async (id) => {
    const sc = surcharges.find(s => s.id === id);
    const updated = surcharges.filter(s => s.id !== id);
    const newBudget = Math.max(0, salePrice - (sc?.amount || 0));
    try {
      await updateDoc(doc(db, 'projects', project.id), { surcharges: updated, budget: String(newBudget) });
      setSurcharges(updated);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Surcharge remove]', e);
    }
  };

  const fmt = v => `GHS ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Internal Cost Breakdown (COGS) ── */}
      <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Internal Cost Breakdown</div>
              <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>Your costs vs sale price — not visible to client</div>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} style={{ height: 34, padding: '0 16px', borderRadius: 10, background: saved ? '#F0FDF4' : `var(--accent-secondary)`, color: saved ? '#16A34A' : '#fff', border: saved ? '1.5px solid #16A34A40' : 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
            {saving ? <><Loader2 size={13} className="spin" /> Saving...</> : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>

        {/* Core cost rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {BD_ITEMS_CONFIG.map(({ key, label, icon, color }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: form[key].enabled ? '#FAFAF9' : `var(--bg-secondary)`, border: `1.5px solid ${form[key].enabled ? `var(--border-color)` : `var(--border-color)`}`, opacity: form[key].enabled ? 1 : 0.55, transition: 'all .2s' }}>
              <button onClick={() => toggle(key)} style={{ width: 36, height: 20, borderRadius: 10, background: form[key].enabled ? color : `var(--border-color)`, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                <div style={{ position: 'absolute', top: 2, left: form[key].enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
              </button>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: `var(--accent-secondary)` }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 10, padding: '6px 10px' }}>
                <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700, flexShrink: 0 }}>GHS</span>
                <input type="number" min="0" value={form[key].amount} onChange={e => setAmt(key, e.target.value)} disabled={!form[key].enabled} placeholder="0.00" style={{ width: 90, border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, background: 'transparent', fontFamily: 'inherit', textAlign: 'right' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Extras */}
        {form.extras.map(extra => (
          <div key={extra.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={12} color="var(--text-secondary)" /></div>
            <input value={extra.label} onChange={e => setEx(extra.id, 'label', e.target.value)} placeholder="Extra cost description" style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: '1.5px solid var(--border-color)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 9, padding: '5px 9px', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700 }}>GHS</span>
              <input type="number" min="0" value={extra.amount} onChange={e => setEx(extra.id, 'amount', e.target.value)} placeholder="0" style={{ width: 80, border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, background: 'transparent', fontFamily: 'inherit', textAlign: 'right' }} />
            </div>
            <button onClick={() => rmExtra(extra.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={12} color="var(--text-secondary)" /></button>
          </div>
        ))}
        <button onClick={addExtra} style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={12} /> Add extra cost
        </button>

        {/* Summary strip */}
        <div style={{ background: `var(--accent-secondary)`, borderRadius: 14, padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Total COGS',   value: fmt(totalCOGS),   color: '#fff' },
            { label: 'Sale Price',   value: fmt(salePrice),   color: AC },
            { label: 'Gross Profit', value: fmt(grossProfit), color: grossProfit >= 0 ? '#4ADE80' : '#F87171' },
            { label: 'Margin',       value: `${margin.toFixed(1)}%`, color: margin >= 20 ? '#4ADE80' : margin >= 10 ? '#FBBF24' : '#F87171' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Price Adjustments / Surcharges ── */}
      <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (surcharges.length > 0 || showAddSC) ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={15} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Price Adjustments</div>
              <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>Documented surcharges — visible to client with full reason</div>
            </div>
          </div>
          <button onClick={() => setShowAddSC(p => !p)} style={{ height: 32, padding: '0 14px', borderRadius: 9, background: showAddSC ? `var(--bg-secondary)` : `var(--accent-secondary)`, color: showAddSC ? `var(--text-secondary)` : '#fff', border: showAddSC ? '1.5px solid var(--border-color)' : 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
            {showAddSC ? 'Cancel' : <><Plus size={13} /> Add Surcharge</>}
          </button>
        </div>

        {surcharges.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: showAddSC ? 16 : 0 }}>
            {surcharges.map(sc => (
              <div key={sc.id} style={{ padding: '14px 16px', borderRadius: 14, background: '#FEF2F2', border: '1.5px solid #FCA5A520' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{sc.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 900, color: '#DC2626' }}>+{fmt(sc.amount)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: `var(--text-secondary)`, lineHeight: 1.5, marginBottom: 6 }}>{sc.reason}</div>
                    <div style={{ fontSize: 10, color: `var(--text-secondary)`, fontWeight: 600 }}>{sc.date} · Added by {sc.addedBy}</div>
                  </div>
                  <button onClick={() => removeSurcharge(sc.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #FECACA', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={12} color="#DC2626" /></button>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 800, color: `var(--text-secondary)`, textAlign: 'right' }}>
              Total adjustments: <span style={{ color: '#DC2626' }}>+{fmt(totalSurcharges)}</span>
            </div>
          </div>
        )}

        {surcharges.length === 0 && !showAddSC && (
          <div style={{ fontSize: 12, color: `var(--text-secondary)`, padding: '6px 0' }}>No price adjustments on this project.</div>
        )}

        {showAddSC && (
          <div style={{ background: '#FAFAF9', borderRadius: 14, border: '1.5px solid var(--border-color)', padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Adjustment Label *</div>
                  <input value={newSC.label} onChange={e => setNewSC(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Material price increase" style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Amount (GHS) *</div>
                  <input type="number" min="0" value={newSC.amount} onChange={e => setNewSC(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Reason / Explanation * (visible to client)</div>
                <textarea value={newSC.reason} onChange={e => setNewSC(p => ({ ...p, reason: e.target.value }))} placeholder="Explain why this adjustment was necessary — the client will see this..." rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Effective Date</div>
                <input type="date" value={newSC.date} onChange={e => setNewSC(p => ({ ...p, date: e.target.value }))} style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <button onClick={handleAddSurcharge} disabled={savingSC || !newSC.label.trim() || !newSC.amount || !newSC.reason.trim()} style={{ height: 42, borderRadius: 11, background: (newSC.label.trim() && newSC.amount && newSC.reason.trim()) ? '#DC2626' : `var(--border-color)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'background .2s' }}>
                {savingSC ? <><Loader2 size={14} className="spin" /> Saving...</> : 'Add Price Adjustment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Document Vault ───────────────────────────────────────────────────────────
function DocumentVault({ project, addProjectDocument, user }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (!db || !project?.id) { setDocs([]); return; }
    const q = query(
      collection(db, 'projects', project.id, 'documents'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [project?.id]);

  const uploaderName = user?.name || user?.displayName || 'Staff';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !addProjectDocument) return;
    setUploading(true);
    await addProjectDocument(project.id, file, {
      uploadedBy: uploaderName,
      uploadedById: user?.uid || user?.id,
      stageId: project.stageId,
      docType: 'document',
    });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !addProjectDocument) return;
    setUploadingPhoto(true);
    await addProjectDocument(project.id, file, {
      uploadedBy: uploaderName,
      uploadedById: user?.uid || user?.id,
      stageId: project.stageId,
      docType: 'progress_photo',
      name: `Progress photo — Stage ${project.stageId} · ${new Date().toLocaleDateString('en-GB')}`,
    });
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const fileIcon = (fileType) => {
    if (!fileType) return <FileText size={14} color="var(--text-secondary)" />;
    if (fileType.includes('pdf')) return <FileText size={14} color="#DC2626" />;
    if (fileType.includes('image') || fileType.includes('jpg') || fileType.includes('png')) return <FileText size={14} color="var(--accent-secondary)" />;
    return <FileText size={14} color="var(--text-secondary)" />;
  };

  return (
    <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Documents & Progress Photos</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Progress photo button */}
          <label style={{
            height: 34, padding: '0 14px', borderRadius: 10,
            background: 'var(--accent-secondary)15', color: `var(--accent-secondary)`, border: '1px solid var(--accent-secondary)30',
            fontSize: 12, fontWeight: 800, cursor: uploadingPhoto ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: uploadingPhoto ? 0.6 : 1, transition: 'opacity .2s',
          }}>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
              disabled={uploadingPhoto}
            />
            {uploadingPhoto ? <><Loader2 size={13} className="spin" /> Uploading...</> : <><Camera size={13} /> Progress Photo</>}
          </label>
          {/* Document upload button */}
          <label style={{
            height: 34, padding: '0 14px', borderRadius: 10,
            background: `var(--accent-secondary)`, color: '#fff',
            fontSize: 12, fontWeight: 800, cursor: uploading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: uploading ? 0.6 : 1, transition: 'opacity .2s',
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.png,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading ? <><Loader2 size={13} className="spin" /> Uploading...</> : <><Upload size={13} /> Upload Document</>}
          </label>
        </div>
      </div>

      {docs.length === 0 ? (
        <div style={{ padding: '28px 0', textAlign: 'center', border: '1.5px dashed var(--border-color)', borderRadius: 12 }}>
          <FileText size={28} color="var(--border-color)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 600 }}>No documents yet</div>
          <div style={{ fontSize: 11, color: '#DFD9D1', marginTop: 4, lineHeight: 1.5 }}>Upload quotes, BOLs, and certificates here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map(doc => {
            const isPhoto = doc.docType === 'progress_photo' || (doc.fileType || '').includes('image');
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: isPhoto ? '#FAF5FF' : `var(--bg-secondary)`, borderRadius: 12, border: `1px solid ${isPhoto ? '#E9D5FF' : `var(--border-color)`}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: isPhoto ? 'var(--accent-secondary)15' : '#fff', border: `1px solid ${isPhoto ? '#E9D5FF' : `var(--border-color)`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isPhoto ? <Camera size={14} color="var(--accent-secondary)" /> : fileIcon(doc.fileType)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: `var(--accent-secondary)`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                  <div style={{ fontSize: 10, color: `var(--text-secondary)`, marginTop: 2 }}>
                    {doc.uploadedBy && <span style={{ color: isPhoto ? `var(--accent-secondary)` : undefined }}>{doc.uploadedBy} · </span>}
                    {formatDate(doc.createdAt)}{doc.size ? ` · ${formatSize(doc.size)}` : ''}
                  </div>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: 30, height: 30, borderRadius: 8, background: '#fff', border: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      color: `var(--text-secondary)`, textDecoration: 'none', transition: 'background .15s',
                    }}
                    title={isPhoto ? 'View photo' : 'Download'}
                  >
                    <Download size={13} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ProjectConversation replaced by WorldClassChat — see import above

// ─── Main ClientHub ───────────────────────────────────────────────────────────
export default function ClientHub({ clientId, dbClients = [], onBack, ...props }) {
  const brand = props.brand || {};
  const ac = brand.color || AC;

  const client = dbClients.find(c => c.id === clientId) || dbClients.find(c => c.phone === clientId);
  const teamMembers = props.teamMembers || [];

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [settingDate, setSettingDate] = useState(false);
  const [estDate, setEstDate] = useState('');

  useEffect(() => {
    if (!db || !client) { setLoadingProjects(false); return; }
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mine = all.filter(p =>
        p.clientId === client.id || p.clientId === client.phone ||
        (p.clientIds || []).includes(client.id) || (p.clientIds || []).includes(client.phone)
      );
      setProjects(mine);
      if (mine.length > 0 && !selectedId) setSelectedId(mine[0].id);
      setLoadingProjects(false);
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  const selected = projects.find(p => p.id === selectedId);

  useEffect(() => {
    if (selected?.estimatedCompletion) {
      const d = selected.estimatedCompletion?.toDate
        ? selected.estimatedCompletion.toDate()
        : new Date(selected.estimatedCompletion);
      if (!isNaN(d)) setEstDate(d.toISOString().slice(0, 10));
    } else {
      setEstDate('');
    }
  }, [selected?.id, selected?.estimatedCompletion]);

  const saveEstDate = async () => {
    if (!db || !selected || !estDate) return;
    setSettingDate(true);
    await updateDoc(doc(db, 'projects', selected.id), { estimatedCompletion: new Date(estDate).toISOString() });
    setSettingDate(false);
  };

  const applicableStages = selected
    ? CLIENT_PROJECT_STAGES.filter(s => {
        const typeStages = PROJECT_TYPES[selected.projectType]?.stages || CLIENT_PROJECT_STAGES.map(s => s.id);
        return typeStages.includes(s.id);
      })
    : [];

  const currentStageObj = applicableStages.find(s => s.id === selected?.stageId);
  const currentIdx = applicableStages.findIndex(s => s.id === selected?.stageId);
  const nextStage = applicableStages[currentIdx + 1];

  const fmt = v => `GH\u20B5 ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const TABS = [
    { id: 'overview',   label: 'Overview',   icon: <Briefcase size={14} /> },
    { id: 'timeline',   label: 'Timeline',   icon: <Calendar size={14} /> },
    { id: 'financials', label: 'Financials', icon: <DollarSign size={14} /> },
    { id: 'renderings', label: 'Design Vault', icon: <PenTool size={14} /> },
    { id: 'documents',  label: 'Documents',  icon: <FileText size={14} /> },
    { id: 'team',       label: 'Team',       icon: <Users size={14} /> },
    { id: 'chat',       label: 'Chat',       icon: <MessageSquare size={14} /> },
  ];

  if (!client) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <AlertCircle size={40} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 18, fontWeight: 800, color: `var(--accent-secondary)` }}>Client not found</div>
      <button onClick={onBack} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 12, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Go Back</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 16px 0', flexShrink: 0, borderBottom: '1px solid var(--border-color)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: `var(--accent-secondary)`, flexShrink: 0 }}>
            {(client.name || 'C').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, lineHeight: 1.2 }}>{client.name}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 2 }}>
              {client.phone && <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 600 }}>{client.phone}</span>}
              <PSBadge s={client.status || 'Active'} />
              <span style={{ fontSize: 11, color: `var(--text-secondary)` }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>{projects.filter(p => p.status !== 'Completed').length} active</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowNewModal(true)} style={{ height: 40, padding: '0 20px', borderRadius: 12, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={15} /> New Project
        </button>
      </div>

      {/* 2-PANEL BODY */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          <div style={{ padding: '16px 18px', background: `var(--accent-secondary)`, borderRadius: 16, color: '#fff', marginBottom: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: ac, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Client Summary</div>
            {[
              { label: 'Total Projects', value: projects.length },
              { label: 'Active', value: projects.filter(p => p.status !== 'Completed').length },
              { label: 'Completed', value: projects.filter(p => p.status === 'Completed').length },
              { label: 'Since', value: client.joined ? new Date(client.joined).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 11 }}>
                <span style={{ opacity: 0.55 }}>{row.label}</span>
                <span style={{ fontWeight: 800 }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em', paddingLeft: 2, paddingBottom: 4 }}>Projects</div>

          {loadingProjects ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: `var(--bg-secondary)`, animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : projects.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', border: '1.5px dashed var(--border-color)', borderRadius: 14 }}>
              <Briefcase size={24} color="var(--border-color)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 600 }}>No projects yet</div>
              <button onClick={() => setShowNewModal(true)} style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: ac, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Create first project</button>
            </div>
          ) : projects.map(p => {
            const stg = CLIENT_PROJECT_STAGES.find(s => s.id === p.stageId);
            const isActive = p.id === selectedId;
            return (
              <button key={p.id} onClick={() => { setSelectedId(p.id); setActiveTab('overview'); }}
                style={{ width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: 13, border: `2px solid ${isActive ? ac : 'transparent'}`, background: isActive ? `${ac}10` : `var(--bg-secondary)`, cursor: 'pointer', transition: 'all .2s' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 3, lineHeight: 1.3 }}>{p.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: stg?.color || `var(--text-secondary)`, background: `${stg?.color || `var(--text-secondary)`}18`, padding: '2px 7px', borderRadius: 20 }}>{stg?.short || 'Stage 1'}</span>
                  <span style={{ fontSize: 9, color: `var(--text-secondary)` }}>{p.status === 'Completed' ? '✓ Done' : 'Active'}</span>
                </div>
                <div style={{ height: 3, background: `var(--border-color)`, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${stg?.pct || 5}%`, background: stg?.color || ac, borderRadius: 2 }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT — Tabbed Main */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
              <Briefcase size={48} color="var(--border-color)" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 18, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 8 }}>Select a project</div>
              <div style={{ fontSize: 13, color: `var(--text-secondary)` }}>Choose a project from the sidebar or create a new one.</div>
            </div>
          ) : (
            <>
              {/* Project Title Bar */}
              <div style={{ padding: '14px 20px', background: `var(--bg-secondary)`, borderRadius: 16, border: '1px solid var(--border-color)', marginBottom: 14, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                      {PROJECT_TYPES[selected.projectType]?.label || 'Full Service'} &middot; ID {selected.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, lineHeight: 1.2 }}>{selected.title}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, whiteSpace: 'nowrap' }}>Est. Completion</label>
                      <input type="date" value={estDate} onChange={e => setEstDate(e.target.value)} onBlur={saveEstDate}
                        style={{ padding: '5px 10px', borderRadius: 9, border: '1.5px solid var(--border-color)', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: `var(--accent-secondary)`, background: '#fff', cursor: 'pointer' }} />
                      {settingDate && <Loader2 size={12} color="var(--text-secondary)" style={{ animation: 'spin 1s linear infinite' }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: currentStageObj?.color || ac, background: `${currentStageObj?.color || ac}15`, padding: '5px 12px', borderRadius: 20 }}>
                        {currentStageObj?.pct || 5}% complete
                      </div>
                      {nextStage && (
                        <button onClick={() => setShowAdvanceModal(true)}
                          style={{ height: 34, padding: '0 14px', borderRadius: 10, background: currentStageObj?.color || ac, color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          Advance <ChevronRight size={13} />
                        </button>
                      )}
                      {!nextStage && <div style={{ fontSize: 11, fontWeight: 800, color: '#16A34A', background: '#F0FDF4', padding: '5px 12px', borderRadius: 20 }}>✓ All Done</div>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', alignItems: 'center' }}>
                  {selected.budget && (
                    <div>
                      <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Budget</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: `var(--accent-secondary)` }}>{fmt(selected.budget)}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Current Stage</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: currentStageObj?.color || ac }}>{currentStageObj?.name || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Created</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>
                      {selected.createdAt?.seconds ? new Date(selected.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Duration</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>~{applicableStages.reduce((s, st) => s + (st.days || 0), 0)} days</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, height: 5, background: `var(--border-color)`, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${currentStageObj?.pct || 5}%`, background: currentStageObj?.color || ac, borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
              </div>

              {/* Tab Bar */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexShrink: 0, background: `var(--bg-secondary)`, padding: 4, borderRadius: 13, border: '1px solid var(--border-color)' }}>
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    style={{ flex: 1, height: 34, borderRadius: 10, background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? `var(--accent-secondary)` : `var(--text-secondary)`, border: activeTab === tab.id ? '1px solid var(--border-color)' : '1px solid transparent', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .18s', boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,.07)' : 'none' }}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>

                {/* DESIGN VAULT (RENDERINGS) */}
                {activeTab === 'renderings' && (
                  <AdminRenderingManager project={selected} brand={brand} renderingPackages={props.renderingPackages} invoices={props.invoices} />
                )}

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {currentStageObj && selected.status !== 'Completed' && (
                      <div style={{ padding: '18px 22px', background: '#fff', borderRadius: 16, border: `2px solid ${currentStageObj.color}30` }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${currentStageObj.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: currentStageObj.color, fontSize: 22 }}>
                            {STAGE_ICONS[currentStageObj.id]}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: currentStageObj.color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                              Active Stage {currentStageObj.id} of {applicableStages.length} &middot; ~{currentStageObj.days} days for this stage
                            </div>
                            <div style={{ fontSize: 17, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 6 }}>{currentStageObj.name}</div>
                            <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.5 }}>{currentStageObj.adminPrompt}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                              {currentStageObj.whoActs === 'client' && <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E', background: '#FFFBEB', padding: '4px 12px', borderRadius: 20, border: '1px solid #FDE68A' }}>⏳ Waiting on client</span>}
                              {currentStageObj.whoActs === 'worker' && <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#F0FDF4', padding: '4px 12px', borderRadius: 20, border: '1px solid #A7F3D0' }}>🔧 Field team task</span>}
                              {currentStageObj.whoActs === 'admin' && <span style={{ fontSize: 11, fontWeight: 700, color: `var(--accent-secondary)`, background: `var(--bg-secondary)`, padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border-color)' }}>👤 Admin action needed</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selected.stageId === 4 && <ShippingDetailsCard project={selected} updateShippingDetails={props.updateShippingDetails} />}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Project Type', value: PROJECT_TYPES[selected.projectType]?.label || 'Full Service', icon: '📋' },
                        { label: 'Quote Status', value: selected.quoteApproved ? '✅ Approved' : '⏳ Pending', icon: '💳' },
                        { label: 'Team Assigned', value: `${(selected.assignedWorkers || []).length} member${(selected.assignedWorkers || []).length !== 1 ? 's' : ''}`, icon: '👥' },
                      ].map(item => (
                        <div key={item.label} style={{ padding: '14px 16px', background: '#fff', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {selected.description && (
                      <div style={{ padding: '16px 20px', background: '#fff', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Description</div>
                        <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.6 }}>{selected.description}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TIMELINE */}
                {activeTab === 'timeline' && (() => {
                  const computedTimeline = calculateTimeline(selected.createdAt || selected.projectDate, selected.timeline || {}, applicableStages);
                  const firstStage = applicableStages[0];
                  const lastStage = applicableStages[applicableStages.length - 1];
                  const minDateObj = new Date(computedTimeline[firstStage?.id]?.startDate || selected.createdAt);
                  const maxDateObj = new Date(computedTimeline[lastStage?.id]?.endDate || selected.createdAt);
                  const minDate = minDateObj.getTime();
                  const maxDate = maxDateObj.getTime();
                  const totalTime = maxDate - minDate || 1;

                  const totalProjectDays = Math.ceil(totalTime / (1000 * 60 * 60 * 24));

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
                      {/* STATS STRIP */}
                      <div style={{ padding: '16px 24px', background: `var(--bg-secondary)`, borderRadius: 18, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Calculated Span</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: `var(--accent-secondary)` }}>{totalProjectDays} calendar days</div>
                        </div>
                        {estDate && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Est. Completion</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: ac }}>{new Date(estDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                          </div>
                        )}
                      </div>

                      {/* GANTT CHART VISUALIZER */}
                      <div style={{ padding: '24px', background: '#fff', borderRadius: 20, border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ac }} />
                          Gantt Visual Timeline
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
                          {/* Horizontal Grid Lines */}
                          <div style={{ position: 'absolute', left: '160px', right: 0, top: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 0 }}>
                            {[0, 25, 50, 75, 100].map(pct => (
                              <div key={pct} style={{ width: 1, borderLeft: '1px dashed var(--border-color)', height: '100%' }} />
                            ))}
                          </div>

                          {applicableStages.map(s => {
                            const stageInfo = computedTimeline[s.id] || {};
                            const stTime = new Date(stageInfo.startDate).getTime();
                            const enTime = new Date(stageInfo.endDate).getTime();
                            
                            const leftPercent = Math.max(0, Math.min(100, ((stTime - minDate) / totalTime) * 100));
                            const widthPercent = Math.max(2, Math.min(100 - leftPercent, ((enTime - stTime) / totalTime) * 100));
                            
                            const isCurrent = s.id === selected.stageId;
                            const isPast = (selected.stageId || 1) > s.id;

                            return (
                              <div key={s.id} style={{ display: 'flex', alignItems: 'center', height: 28, zIndex: 1 }}>
                                {/* Stage Name Label */}
                                <div style={{ width: 150, fontSize: 11, fontWeight: 800, color: isCurrent ? `var(--accent-secondary)` : `var(--text-secondary)`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 10 }}>
                                  {s.short}
                                </div>
                                {/* Gantt Bar Container */}
                                <div style={{ flex: 1, height: '100%', position: 'relative', background: '#FAFAF9', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                  <div 
                                    style={{ 
                                      position: 'absolute', 
                                      left: `${leftPercent}%`, 
                                      width: `${widthPercent}%`, 
                                      height: '100%', 
                                      background: s.color, 
                                      opacity: isCurrent ? 1 : isPast ? 0.6 : 0.25,
                                      borderRadius: 5,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 9,
                                      fontWeight: 900,
                                      color: '#fff',
                                      boxShadow: isCurrent ? `0 0 12px ${s.color}60` : 'none',
                                      transition: 'all 0.3s'
                                    }}
                                    title={`${s.name}: ${stageInfo.startDate} to ${stageInfo.endDate} (${stageInfo.durationDays} days)`}
                                  >
                                    <span style={{ opacity: widthPercent > 12 ? 1 : 0, transition: 'opacity 0.2s', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                      {stageInfo.durationDays}d
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Gantt Footer (Dates Timeline) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 160, marginTop: 12, fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700 }}>
                          <span>{minDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span>{new Date(minDate + totalTime * 0.25).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span>{new Date(minDate + totalTime * 0.50).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span>{new Date(minDate + totalTime * 0.75).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          <span>{maxDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>

                      {/* STAGE SCHEDULER & DETAILS LIST */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }} />
                          Stage Dates & Schedule Settings
                        </div>

                        <div style={{ position: 'relative', paddingLeft: 44 }}>
                          <div style={{ position: 'absolute', left: 16, top: 12, bottom: 12, width: 2, background: `var(--border-color)`, zIndex: 0 }} />
                          
                          {applicableStages.map((s, idx) => {
                            const isCurrent = s.id === selected.stageId;
                            const isPast = (selected.stageId || 1) > s.id;
                            const stageHistEntry = (selected.stageHistory || []).find(h => h.stageId === s.id);
                            const stageInfo = computedTimeline[s.id] || {};

                            return (
                              <div key={s.id} style={{ position: 'relative', display: 'flex', gap: 16, marginBottom: idx < applicableStages.length - 1 ? 24 : 0, zIndex: 1 }}>
                                <div style={{ position: 'absolute', left: -44, top: 0, width: 34, height: 34, borderRadius: '50%', background: isPast ? s.color : isCurrent ? '#fff' : `var(--bg-secondary)`, border: isPast ? `2px solid ${s.color}` : isCurrent ? `2.5px solid ${s.color}` : '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: isCurrent ? `0 0 0 4px ${s.color}20` : 'none', color: isPast ? '#fff' : s.color, transition: 'all .3s' }}>
                                  {isPast ? <CheckCircle2 size={14} /> : STAGE_ICONS[s.id]}
                                </div>

                                <div style={{ flex: 1, padding: '16px 20px', borderRadius: 16, background: isCurrent ? `${s.color}04` : isPast ? `var(--bg-secondary)` : '#fff', border: isCurrent ? `1.5px solid ${s.color}40` : '1px solid var(--border-color)', boxShadow: '0 2px 10px rgba(0,0,0,0.01)' }}>
                                  
                                  {/* Row Header */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: 14, fontWeight: 900, color: `var(--accent-secondary)` }}>{s.name}</span>
                                      {isCurrent && <span style={{ fontSize: 9, fontWeight: 800, color: s.color, background: `${s.color}15`, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Active</span>}
                                      {isPast && <span style={{ fontSize: 9, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 20 }}>Done</span>}
                                    </div>

                                    {/* Action Logs */}
                                    {stageHistEntry?.timestamp && (
                                      <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 600 }}>
                                        {(() => { const d = stageHistEntry.timestamp?.toDate ? stageHistEntry.timestamp.toDate() : new Date(stageHistEntry.timestamp); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); })()}
                                        {isCurrent && (() => { const d = stageHistEntry.timestamp?.toDate ? stageHistEntry.timestamp.toDate() : new Date(stageHistEntry.timestamp); const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)); return <span style={{ fontWeight: 700, color: s.color, marginLeft: 6 }}>({days}d active)</span>; })()}
                                      </span>
                                    )}
                                  </div>

                                  {/* Scheduler Inputs */}
                                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#fff', padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                                    
                                    {/* Start Date */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <span style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.04em' }}>Start Date</span>
                                      <input 
                                        type="date"
                                        value={stageInfo.startDate || ''}
                                        onChange={async (e) => {
                                          const newStart = e.target.value;
                                          const updatedStageTimeline = {
                                            ...(selected.timeline || {}),
                                            [s.id]: {
                                              ...(selected.timeline?.[s.id] || {}),
                                              startDate: newStart,
                                              manualOverride: true
                                            }
                                          };
                                          const newTimeline = calculateTimeline(selected.createdAt || selected.projectDate, updatedStageTimeline, applicableStages);
                                          const lastStage = applicableStages[applicableStages.length - 1];
                                          const estComp = newTimeline[lastStage.id]?.endDate || '';
                                          await props.updateProject(selected.id, { timeline: newTimeline, estimatedCompletion: estComp });
                                        }}
                                        style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: `var(--accent-secondary)`, fontWeight: 700 }}
                                      />
                                    </div>

                                    {/* Duration Days */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <span style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.04em' }}>Duration</span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <input 
                                          type="number"
                                          min="1"
                                          value={stageInfo.durationDays || 5}
                                          onChange={async (e) => {
                                            const newDuration = parseInt(e.target.value, 10) || 1;
                                            const updatedStageTimeline = {
                                              ...(selected.timeline || {}),
                                              [s.id]: {
                                                ...(selected.timeline?.[s.id] || {}),
                                                durationDays: newDuration
                                              }
                                            };
                                            const newTimeline = calculateTimeline(selected.createdAt || selected.projectDate, updatedStageTimeline, applicableStages);
                                            const lastStage = applicableStages[applicableStages.length - 1];
                                            const estComp = newTimeline[lastStage.id]?.endDate || '';
                                            await props.updateProject(selected.id, { timeline: newTimeline, estimatedCompletion: estComp });
                                          }}
                                          style={{ width: 60, border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: `var(--accent-secondary)`, fontWeight: 700, textAlign: 'center' }}
                                        />
                                        <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 600 }}>days</span>
                                      </div>
                                    </div>

                                    {/* End Date (Computed, readonly) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <span style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.04em' }}>End Date</span>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: `var(--text-secondary)`, padding: '7px 0' }}>
                                        {stageInfo.endDate ? new Date(stageInfo.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                      </div>
                                    </div>

                                    {/* Override Badge & Reset */}
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                                      {stageInfo.manualOverride ? (
                                        <>
                                          <span style={{ fontSize: 9, fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Overridden</span>
                                          <button 
                                            onClick={async () => {
                                              const updatedStageTimeline = { ...(selected.timeline || {}) };
                                              if (updatedStageTimeline[s.id]) {
                                                updatedStageTimeline[s.id].manualOverride = false;
                                                delete updatedStageTimeline[s.id].startDate;
                                              }
                                              const newTimeline = calculateTimeline(selected.createdAt || selected.projectDate, updatedStageTimeline, applicableStages);
                                              const lastStage = applicableStages[applicableStages.length - 1];
                                              const estComp = newTimeline[lastStage.id]?.endDate || '';
                                              await props.updateProject(selected.id, { timeline: newTimeline, estimatedCompletion: estComp });
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 8 }}
                                            title="Restore default sequential schedule"
                                          >
                                            <RefreshCw size={12} /> Auto
                                          </button>
                                        </>
                                      ) : (
                                        <span style={{ fontSize: 9, fontWeight: 800, color: '#059669', background: '#F0FDF4', padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Auto Sequence</span>
                                      )}
                                    </div>

                                  </div>

                                  {/* Admin Prompts & Custom Displays */}
                                  {isCurrent && <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 10, lineHeight: 1.5, padding: '0 4px' }}>{s.adminPrompt}</div>}

                                  {s.id === 2 && (isPast || isCurrent) && (
                                     <div style={{ marginTop: 10, padding: '0 4px' }}>
                                       {selected.quoteApproved
                                         ? <span style={{ fontSize: 10, fontWeight: 800, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '3px 10px', borderRadius: 20, display: 'inline-block' }}>✓ Client approved quote</span>
                                         : isCurrent ? <span style={{ fontSize: 10, fontWeight: 800, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '3px 10px', borderRadius: 20, display: 'inline-block' }}>⏳ Awaiting client approval</span>
                                         : null}
                                     </div>
                                   )}

                                   {s.id === 4 && (isPast || isCurrent) && (
                                     <div style={{ marginTop: 12, padding: '12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                       <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Shipping & Logistics Details</div>
                                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                         <input type="text" placeholder="Vessel Name" defaultValue={selected.shippingDetails?.vesselName || ''} onBlur={e => {
                                           if(e.target.value !== (selected.shippingDetails?.vesselName || '')) props.updateProject(selected.id, { shippingDetails: { ...(selected.shippingDetails || {}), vesselName: e.target.value } });
                                         }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12 }} />
                                         <input type="text" placeholder="BL Number" defaultValue={selected.shippingDetails?.blNumber || ''} onBlur={e => {
                                           if(e.target.value !== (selected.shippingDetails?.blNumber || '')) props.updateProject(selected.id, { shippingDetails: { ...(selected.shippingDetails || {}), blNumber: e.target.value } });
                                         }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12 }} />
                                         <input type="text" placeholder="Container Number" defaultValue={selected.shippingDetails?.containerNumber || ''} onBlur={e => {
                                           if(e.target.value !== (selected.shippingDetails?.containerNumber || '')) props.updateProject(selected.id, { shippingDetails: { ...(selected.shippingDetails || {}), containerNumber: e.target.value } });
                                         }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12 }} />
                                         <input type="date" placeholder="ETA" defaultValue={selected.shippingDetails?.eta || ''} onBlur={e => {
                                           if(e.target.value !== (selected.shippingDetails?.eta || '')) props.updateProject(selected.id, { shippingDetails: { ...(selected.shippingDetails || {}), eta: e.target.value } });
                                         }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12 }} />
                                       </div>
                                     </div>
                                   )}

                                  {isPast && stageHistEntry?.note && stageHistEntry.note !== 'Stage advanced' && stageHistEntry.note !== 'Project created' && (
                                    <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 6, fontStyle: 'italic', padding: '0 4px' }}>{stageHistEntry.note}</div>
                                  )}

                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  );
                })()}

                {/* FINANCIALS */}
                {activeTab === 'financials' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <PaymentScheduleCard project={selected} createInvoice={props.createInvoice} notify={props.notify} brand={brand} />
                    <ProjectInvoicesLedger project={selected} invoices={props.invoices} brand={brand} updateInvoice={props.updateInvoice} deleteInvoice={props.deleteInvoice} notify={props.notify} user={props.user} />
                    <ProjectEconomics project={selected} user={props.user} />
                    <div style={{ height: 1, background: 'var(--border-color)', margin: '16px 0' }} />
                    <AdminAddOnManager project={selected} brand={brand} addOns={props.addOns} invoices={props.invoices} createInvoice={props.createInvoice} />
                  </div>
                )}

                {/* DOCUMENTS */}
                {activeTab === 'documents' && (
                  <DocumentVault project={selected} addProjectDocument={props.addProjectDocument} user={props.user} />
                )}

                {/* TEAM */}
                {activeTab === 'team' && (
                  <div style={{ paddingBottom: 24 }}>
                    <div style={{ padding: '20px 22px', background: '#fff', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 4 }}>Assign Team Members</div>
                      <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginBottom: 18, lineHeight: 1.5 }}>Click a member to toggle their assignment. Assigned staff can see this project in their portal.</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {teamMembers.map(m => {
                          const assigned = (selected.assignedWorkers || []).includes(m.id?.toString() || m.email);
                          return (
                            <button key={m.id} onClick={() => props.assignWorkerToProject && props.assignWorkerToProject(selected.id, m.id?.toString() || m.email)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 13, border: `2px solid ${assigned ? `var(--accent-secondary)` : `var(--border-color)`}`, background: assigned ? `var(--accent-secondary)` : `var(--bg-secondary)`, color: assigned ? '#fff' : `var(--text-secondary)`, cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all .2s' }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: assigned ? 'rgba(255,255,255,0.2)' : `var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                                {(m.name || m.email || '?').slice(0, 1).toUpperCase()}
                              </div>
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name || m.email || 'Staff'}</div>
                                <div style={{ fontSize: 10, opacity: 0.7 }}>{m.jobRole || m.role || 'Team Member'}</div>
                              </div>
                              {assigned && <UserCheck size={14} style={{ marginLeft: 'auto' }} />}
                            </button>
                          );
                        })}
                        {teamMembers.length === 0 && <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>No team members configured. Add staff from the Staff section.</div>}
                      </div>
                    </div>
                  </div>
                )}

                {/* CHAT */}
                {activeTab === 'chat' && (
                  <div style={{ height: 'calc(100vh - 340px)', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 16, border: '1px solid var(--border-color)', padding: '16px 20px' }}>
                    <WorldClassChat
                      project={selected}
                      user={props.user}
                      accentColor={props.brand?.color || props.brand?.accentSecondary || 'var(--accent-secondary)'}
                      addProjectMessage={props.addProjectMessage}
                      isAdmin={true}
                      height="100%"
                    />
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewProjectModal client={client} teamMembers={teamMembers} onClose={() => setShowNewModal(false)} onCreate={props.createClientProject} />
      )}
      {showAdvanceModal && selected && nextStage && (
        <AdvanceModal project={selected} stage={currentStageObj} nextStage={nextStage} invoices={props.invoices || []} onClose={() => setShowAdvanceModal(false)} onAdvance={props.updateProjectStage} />
      )}
    </div>
  );
}
