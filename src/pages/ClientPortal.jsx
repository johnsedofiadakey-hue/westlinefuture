import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LogOut, ChevronRight, Send, MessageSquare, FileText,
  DollarSign, CheckCircle2, Circle, Clock, Loader2,
  Star, AlertCircle, Bell, BellOff, User, Briefcase, Home,
  Search, Palette, CreditCard, Factory, Anchor, Globe,
  Truck, Wrench, ShoppingCart, ArrowRight, Lock,
  Download, File, Image, Archive, Package, Camera,
  X, Copy, Check, RefreshCw, Gift, Edit3, ChevronDown,
  ZoomIn, ScanSearch, PenTool
} from 'lucide-react';
import { CLIENT_PROJECT_STAGES, PROJECT_TYPES } from '../data';
import { db, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  collection, onSnapshot, query, where, orderBy, limit, addDoc, serverTimestamp
} from 'firebase/firestore';
import { usePaystackPayment } from 'react-paystack';
import ClientRenderingVault from '../components/ClientRenderingVault';
import UnifiedPaymentGateway from '../components/UnifiedPaymentGateway';
import WorldClassChat from '../components/WorldClassChat';

const AC = `var(--accent-secondary)`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtShort(val) {
  if (!val) return null;
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysSince(val) {
  if (!val) return null;
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

// ─── Payment Receipt PDF ─────────────────────────────────────────────────────
// ─── Shared Branded PDF Renderer ─────────────────────────────────────────────
function printBrandedDoc(opts, brand) {
  // Rich Beige / Cream / Brown Palette for PDFs
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
  const web = brand?.website || 'www.westlinefuture.com';
  const logoUrl = brand?.logo || '';
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="height:60px;object-fit:contain;display:block;" alt="${co}" />`
    : `<div style="display:flex;flex-direction:column;line-height:1;gap:2px;">
         <div style="font-size:28px;font-weight:900;color:${theme.primary};letter-spacing:0.05em;">WESTLINE</div>
         <div style="font-size:12px;font-weight:600;color:${theme.secondary};letter-spacing:0.45em;">FUTURE</div>
       </div>`;

  const {
    docType = 'INVOICE',           // INVOICE | QUOTATION | PAYMENT RECEIPT | PURCHASE ORDER
    docNumber = '',
    dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    dueStr = '',
    clientName = '—',
    clientPhone = '',
    clientEmail = '',
    clientAddress = '',
    projectTitle = '',
    rows = [],                      // [{ label, value }] for receipts
    lineItems = [],                 // [{ desc, qty, unit, rate, total }] for invoices
    totalAmount = '',
    amountPaidStr = '',
    balanceDueStr = '',
    totalLabel = 'TOTAL DUE',
    statusBadge = '',               // e.g. 'PAID', 'PENDING'
    statusColor = theme.secondary,
    notes = '',
    bankDetails = '',
    terms = '',
    footerNote = '',
  } = opts;

  const isReceipt = docType === 'PAYMENT RECEIPT';
  const accentBar = `<div style="height:12px;background:${theme.primary};margin:-72px -72px 0 -72px;"></div>`;

  const lineItemsHtml = lineItems.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;font-size:13px;">
      <thead>
        <tr style="background:${theme.primary};color:${theme.bg};">
          <th style="padding:14px 18px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;">Description</th>
          <th style="padding:14px 18px;text-align:center;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;">Qty</th>
          <th style="padding:14px 18px;text-align:center;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;">Unit</th>
          <th style="padding:14px 18px;text-align:right;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;">Rate</th>
          <th style="padding:14px 18px;text-align:right;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map((item, i) => `
          <tr style="border-bottom:1px solid ${theme.accent}60;">
            <td style="padding:18px 18px;font-weight:700;color:${theme.primary};">${item.desc || item.description || '—'}</td>
            <td style="padding:18px 18px;text-align:center;color:${theme.textMuted};font-weight:600;">${item.qty ?? 1}</td>
            <td style="padding:18px 18px;text-align:center;color:${theme.textMuted};">${item.unit || 'job'}</td>
            <td style="padding:18px 18px;text-align:right;color:${theme.textMuted};">${item.rate ? `GH₵ ${Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
            <td style="padding:18px 18px;text-align:right;font-weight:800;color:${theme.primary};">${item.total || item.amount ? `GH₵ ${Number(item.total || item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : '';

  const rowsHtml = rows.length > 0 ? `
    <div style="margin-bottom:32px;">
      ${rows.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px 0;border-bottom:1px solid ${theme.accent}60;gap:20px;">
          <span style="font-size:13px;color:${theme.textMuted};font-weight:600;white-space:nowrap;">${r.label}</span>
          <span style="font-size:14px;font-weight:800;color:${theme.primary};text-align:right;">${r.value}</span>
        </div>`).join('')}
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${docType} — ${co}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: ${theme.bg}; font-family: 'Inter', -apple-system, sans-serif; color: ${theme.primary}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { padding: 0; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 72px; position: relative; overflow: hidden; background: ${theme.bg}; border: 12px solid ${theme.accent}; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-40deg); font-size: 100px; font-weight: 900; opacity: 0.03; white-space: nowrap; pointer-events: none; color: ${theme.primary}; z-index: 0; }
    .content { position: relative; z-index: 1; }
    @page { size: A4; margin: 0; }
    @media print { html, body { width: 210mm; } .page { box-shadow: none !important; border: none; } button { display: none !important; } }
    @media screen { .page { box-shadow: 0 0 60px rgba(0,0,0,0.12); margin: 40px auto; border-radius: 4px; } body { background: #e5e5e5; } }
  </style>
</head>
<body>
<div class="page">
  ${accentBar}
  <div class="watermark">${docType}</div>
  <div class="content">

    <!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:40px;margin-bottom:48px;padding-bottom:32px;border-bottom:2px solid ${theme.accent};">
      <div style="display:flex;align-items:center;gap:24px;">
        ${logoHtml}
        <div>
          <div style="font-size:20px;font-weight:800;color:${theme.primary};letter-spacing:1px;text-transform:uppercase;">${co}</div>
          <div style="font-size:11px;color:${theme.secondary};margin-top:4px;letter-spacing:1px;text-transform:uppercase;">${addr}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:32px;font-weight:400;letter-spacing:1px;text-transform:uppercase;color:${theme.primary};margin-bottom:12px;">${docType}</div>
        <div style="display:inline-block;background:${theme.primary};color:${theme.bg};padding:4px 12px;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:1px;">Ref: #${docNumber || 'DRAFT'}</div>
      </div>
    </div>

    <!-- META ROW -->
    <div style="display:grid;grid-template-columns:repeat(${dueStr ? 3 : 2},1fr);gap:20px;margin-bottom:36px;">
      <div style="padding:16px 20px;background:${theme.surface};border-radius:8px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:6px;">Date Issued</div>
        <div style="font-size:15px;font-weight:700;color:${theme.primary};">${dateStr}</div>
      </div>
      ${dueStr ? `<div style="padding:16px 20px;background:${theme.surface};border-radius:8px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:6px;">Due Date</div><div style="font-size:15px;font-weight:700;color:${theme.primary};">${dueStr}</div></div>` : ''}
      ${statusBadge ? `<div style="padding:16px 20px;background:${statusColor}10;border-radius:8px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${statusColor};font-weight:800;margin-bottom:6px;">Status</div><div style="font-size:15px;font-weight:800;color:${statusColor};">${statusBadge}</div></div>` : ''}
    </div>

    <!-- BILL TO / FROM -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:40px;">
      <div style="padding:24px;border:1px solid ${theme.accent}60;border-radius:8px;background:${theme.surface};">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${theme.accent};font-weight:900;margin-bottom:12px;">${isReceipt ? 'Received From' : 'Prepared For'}</div>
        <div style="font-size:18px;font-weight:800;color:${theme.primary};margin-bottom:8px;">${clientName}</div>
        ${clientPhone ? `<div style="font-size:13px;color:${theme.textMuted};margin-bottom:2px;">${clientPhone}</div>` : ''}
        ${clientEmail ? `<div style="font-size:13px;color:${theme.textMuted};margin-bottom:2px;">${clientEmail}</div>` : ''}
        ${clientAddress ? `<div style="font-size:13px;color:${theme.textMuted};">${clientAddress}</div>` : ''}
      </div>
      <div style="padding:24px;border:1px solid ${theme.accent}60;border-radius:8px;text-align:right;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${theme.accent};font-weight:900;margin-bottom:12px;">Issued By</div>
        <div style="font-size:15px;font-weight:800;color:${theme.primary};margin-bottom:6px;">${co}</div>
        <div style="font-size:12px;color:${theme.textMuted};margin-bottom:2px;">${addr}</div>
        ${phone ? `<div style="font-size:12px;color:${theme.textMuted};margin-bottom:2px;">Tel: ${phone}</div>` : ''}
        ${email ? `<div style="font-size:12px;color:${theme.textMuted};">Email: ${email}</div>` : ''}
      </div>
    </div>

    ${projectTitle ? `<div style="margin-bottom:32px;padding:20px 24px;border:1px solid ${theme.accent};border-radius:8px;background:${theme.surface};display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:6px;">Subject / Project</div><div style="font-size:16px;font-weight:800;color:${theme.primary};text-transform:uppercase;">${projectTitle}</div></div></div>` : ''}

    ${lineItemsHtml}
    ${rowsHtml}

    <!-- TOTAL BOX -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:40px;">
      <div style="min-width:320px;background:${theme.surface};border:1px solid ${theme.accent};border-radius:8px;padding:24px;">
        ${amountPaidStr ? `
        <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid ${theme.accent}60;">
          <span style="font-size:16px;font-weight:700;color:${theme.primary};">GRAND TOTAL</span>
          <span style="font-size:18px;font-weight:800;color:${theme.primary};">${totalAmount}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid ${theme.accent}60;">
          <span style="font-size:15px;font-weight:600;color:${theme.textMuted};">AMOUNT PAID</span>
          <span style="font-size:16px;font-weight:700;color:#16A34A;">${amountPaidStr}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:18px;font-weight:900;text-transform:uppercase;color:${theme.primary};">BALANCE DUE</span>
          <span style="font-size:24px;font-weight:900;color:#DC2626;">${balanceDueStr}</span>
        </div>
        ` : `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:18px;font-weight:900;text-transform:uppercase;color:${theme.primary};">${totalLabel}</span>
          <span style="font-size:24px;font-weight:900;color:${theme.secondary};">${totalAmount}</span>
        </div>
        `}
      </div>
    </div>

    ${bankDetails ? `<div style="margin-bottom:24px;padding:24px;background:${theme.surface};border-radius:8px;border:1px solid ${theme.accent}60;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${theme.secondary};font-weight:900;margin-bottom:12px;">Electronic Fund Transfer</div><div style="font-size:13px;color:${theme.primary};line-height:1.8;font-weight:700;">${bankDetails.replace(/\n/g, '<br/>')}</div></div>` : ''}
    ${notes ? `<div style="margin-bottom:24px;padding:20px;background:${theme.surface};border-radius:8px;border:1px solid ${theme.accent}40;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:900;margin-bottom:8px;">Notes</div><div style="font-size:13px;color:${theme.textMuted};line-height:1.7;">${notes}</div></div>` : ''}
    ${terms ? `<div style="margin-bottom:40px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:900;margin-bottom:8px;">Contractual Conditions</div><div style="font-size:12px;color:${theme.textMuted};line-height:1.7;">${terms.replace(/\n/g, '<br/>')}</div></div>` : ''}

    <div style="padding-top:32px;border-top:2px solid ${theme.accent};display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:12px;color:${theme.textMuted};line-height:1.7;font-weight:500;">${footerNote || `This is an official document from ${co}.<br/>For queries contact ${email} or ${phone}`}</div>
      <div style="text-align:right;">
        <div style="font-size:13px;font-weight:800;color:${theme.primary};">Finance Director</div>
        <div style="font-size:11px;color:${theme.textMuted};margin-top:4px;">${co}</div>
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

function downloadPaymentReceipt(txn, project, client, brand) {
  const d = txn.date?.seconds ? new Date(txn.date.seconds * 1000) : txn.date ? new Date(txn.date) : new Date();
  const dateStr = isNaN(d) ? '—' : d.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const amount = Number(txn.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ref = txn.reference || txn.id?.slice(-10).toUpperCase() || 'GT-' + Date.now();

  printBrandedDoc({
    docType: 'PAYMENT RECEIPT',
    docNumber: ref,
    dateStr,
    clientName: client?.name || 'Valued Client',
    clientPhone: client?.phone || '',
    clientEmail: client?.email || client?.proxyEmail || '',
    projectTitle: project?.title || project?.project || '',
    rows: [
      { label: 'Amount Received', value: `GH₵ ${amount}` },
      { label: 'Description', value: txn.description || txn.title || 'Project payment' },
      ...(txn.method ? [{ label: 'Payment Method', value: txn.method }] : []),
      ...(txn.reference ? [{ label: 'Transaction Reference', value: txn.reference }] : []),
      { label: 'Received by', value: brand?.name || 'Westline Future Ltd.' },
      { label: 'Date & Time', value: dateStr },
    ],
    totalAmount: `GH₵ ${amount}`,
    totalLabel: 'AMOUNT RECEIVED',
    statusBadge: 'PAID IN FULL',
    statusColor: '#16A34A',
    footerNote: `This is an official payment receipt. Thank you for your business.<br/>${brand?.name || 'Westline Future Ltd.'} — ${brand?.website || 'www.westlinefuture.com'}`,
  }, brand);
}

// ─── Stage Icon Map ───────────────────────────────────────────────────────────
const STAGE_ICONS = {
  1: <Search size={16} />,
  2: <PenTool size={16} />,
  3: <CreditCard size={16} />,
  4: <Factory size={16} />,
  5: <Truck size={16} />,
  6: <Wrench size={16} />,
  7: <ScanSearch size={16} />,
  8: <Star size={16} />,
};

// ─── Payment Schedule Configs ─────────────────────────────────────────────────
const SCHEDULE_CONFIGS = {
  standard: {
    label: 'Standard (10/40/40/10)',
    milestones: [
      { key: 'deposit',      label: '10% Deposit',         pct: 0.10, cumPct: 0.10 },
      { key: 'pre-prod',     label: '40% Pre-production',  pct: 0.40, cumPct: 0.50 },
      { key: 'pre-delivery', label: '40% Pre-delivery',    pct: 0.40, cumPct: 0.90 },
      { key: 'completion',   label: '10% Completion',      pct: 0.10, cumPct: 1.00 },
    ],
  },
  '70-30': {
    label: '70/30 (Before / After Delivery)',
    milestones: [
      { key: 'pre-delivery', label: '70% Before Delivery', pct: 0.70, cumPct: 0.70 },
      { key: 'completion',   label: '30% After Delivery',  pct: 0.30, cumPct: 1.00 },
    ],
  },
  custom: {
    label: 'Custom / Batch Payments',
    milestones: [],
  },
};
const MILESTONES = SCHEDULE_CONFIGS.standard.milestones;

// ─── Invoice PDF Download ─────────────────────────────────────────────────────
function downloadInvoicePDF(invoice, project, client, brand) {
  const issuedDate = invoice.createdAt
    ? new Date(invoice.createdAt?.seconds ? invoice.createdAt.seconds * 1000 : invoice.createdAt)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : invoice.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const dueDate = invoice.due
    ? new Date(invoice.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const docNum = invoice.invoiceNumber || (invoice.id || '').slice(-8).toUpperCase();
  const rawTotal = parseFloat(String(invoice.amount || 0).replace(/[^0-9.]/g, '')) || 0;
  const totalStr = `GH₵ ${rawTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const isPaid = invoice.status === 'Paid';
  const isQuote = invoice.type === 'Quotation' || invoice.type === 'quotation';

  const items = invoice.items?.length
    ? invoice.items.map(it => ({
        desc: it.desc || it.description || 'Service',
        qty: it.qty ?? 1,
        unit: it.unit || 'job',
        rate: it.rate || it.amount || 0,
        total: (it.qty ?? 1) * (it.rate || it.amount || 0) || it.total || it.amount || 0,
      }))
    : [{ desc: invoice.description || project?.title || 'Glass Fabrication Services', qty: 1, unit: 'job', rate: rawTotal, total: rawTotal }];

  const isPartiallyPaid = invoice.status === 'Partially Paid' || (invoice.amountPaid > 0 && invoice.amountPaid < rawTotal);
  
  const amountPaidStr = invoice.amountPaid ? `GH₵ ${Number(invoice.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null;
  const balanceDueStr = invoice.amountPaid ? `GH₵ ${Math.max(0, rawTotal - Number(invoice.amountPaid)).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null;

  printBrandedDoc({
    docType: isQuote ? 'QUOTATION' : 'INVOICE',
    docNumber: docNum,
    dateStr: issuedDate,
    dueStr: dueDate,
    clientName: client?.name || invoice.client || invoice.clientName || '—',
    clientPhone: client?.phone || '',
    clientEmail: client?.email || client?.proxyEmail || '',
    projectTitle: project?.title || project?.project || invoice.title || '',
    lineItems: items,
    totalAmount: totalStr,
    amountPaidStr,
    balanceDueStr,
    totalLabel: isPaid ? 'TOTAL PAID' : isPartiallyPaid ? 'GRAND TOTAL' : isQuote ? 'QUOTED AMOUNT' : 'TOTAL DUE',
    statusBadge: isPaid ? 'PAID' : isPartiallyPaid ? 'PARTIALLY PAID' : isQuote ? 'PENDING APPROVAL' : 'PAYMENT DUE',
    statusColor: isPaid ? '#16A34A' : isPartiallyPaid ? '#059669' : isQuote ? '#D97706' : `var(--accent-primary)`,
    notes: invoice.notes || '',
    bankDetails: brand?.bankDetails || 'Bank Name | Account Number | Branch',
    terms: '1. Payments are due within 14 days of invoice date.\n2. Late payments attract 2% monthly interest.\n3. All glass fabrication works are subject to our standard warranty policy.',
    footerNote: `Thank you for your business. — ${brand?.name || 'Westline Future Ltd.'} | ${brand?.website || 'www.westlinefuture.com'}`,
  }, brand);
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

// ─── FileType Icon Helper ─────────────────────────────────────────────────────
function FileTypeIcon({ fileType }) {
  const ft = (fileType || '').toLowerCase();
  if (ft.includes('image') || ft.includes('jpg') || ft.includes('jpeg') || ft.includes('png') || ft.includes('webp')) {
    return <Image size={18} color="var(--accent-secondary)" />;
  }
  if (ft.includes('pdf')) return <FileText size={18} color="#DC2626" />;
  if (ft.includes('zip') || ft.includes('rar')) return <Archive size={18} color="#B45309" />;
  if (ft.includes('excel') || ft.includes('sheet') || ft.includes('xlsx') || ft.includes('csv')) {
    return <File size={18} color="#16A34A" />;
  }
  return <File size={18} color="#6B7280" />;
}

function isImageType(fileType) {
  const ft = (fileType || '').toLowerCase();
  return ft.includes('image') || ft.includes('jpg') || ft.includes('jpeg') || ft.includes('png') || ft.includes('webp');
}

// ─── PaymentButton ────────────────────────────────────────────────────────────
function PaymentButton({ label, amountGHS, email, projectId, invoiceId, paymentType, onSuccess, onClose, disabled }) {
  const [processing, setProcessing] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  const config = {
    reference: 'GT-' + Date.now(),
    email: email || 'client@clients.westlinefuture.com',
    amount: Math.round((amountGHS || 0) * 100),
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(config);

  const handlePay = () => {
    if (disabled || processing) return;
    setVerifyError(null);
    setProcessing(true);
    initializePayment({
      onSuccess: async (ref) => {
        const reference = ref?.reference || ref?.trxref || String(ref);
        // Server-side verification — never trust the client alone
        if (functions && projectId) {
          try {
            const verify = httpsCallable(functions, 'verifyPaystackPayment');
            await verify({ reference, projectId, invoiceId, type: paymentType || 'payment' });
          } catch (err) {
            if (import.meta.env.DEV) console.error('[Paystack] Verify failed:', err.message);
            setVerifyError('Payment received but server verification failed. Contact support with ref: ' + reference);
          }
        }
        setProcessing(false);
        if (onSuccess) onSuccess(ref);
      },
      onClose: () => {
        setProcessing(false);
        if (onClose) onClose();
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        onClick={handlePay}
        disabled={disabled || processing}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '14px 28px', borderRadius: 14, border: 'none',
          background: disabled ? `var(--border-color)` : 'linear-gradient(135deg, #16A34A, #15803D)',
          color: disabled ? `var(--text-secondary)` : '#fff',
          fontSize: 15, fontWeight: 800, cursor: disabled ? 'default' : 'pointer',
          boxShadow: disabled ? 'none' : '0 4px 16px rgba(22,163,74,.35)',
          transition: 'all .2s',
          letterSpacing: '.01em',
        }}
      >
        {processing
          ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verifying payment...</>
          : <><CreditCard size={18} /> {label}</>
        }
      </button>
      {verifyError && (
        <div style={{ fontSize: 12, color: '#DC2626', padding: '8px 12px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>
          {verifyError}
        </div>
      )}
    </div>
  );
}

// ─── Stage Action Card ────────────────────────────────────────────────────────
function StageActionCard({ project, user, approveQuote, payInvoice, updateProjectStage }) {
  const applicableStages = CLIENT_PROJECT_STAGES.filter(s => {
    const typeStages = PROJECT_TYPES[project.projectType]?.stages || CLIENT_PROJECT_STAGES.map(x => x.id);
    return typeStages.includes(s.id);
  });
  const currentStage = applicableStages.find(s => s.id === project.stageId);
  const [acting, setActing] = useState(false);

  if (!currentStage || (currentStage.whoActs !== 'client' && currentStage.whoActs !== 'both')) return null;

  const email = user?.proxyEmail || (user?.phone ? user.phone + '@clients.westlinefuture.com' : 'client@clients.westlinefuture.com');
  const budget = project.budget || 0;
  const halfBudget = budget * 0.5;

  if (currentStage.needsClientApproval) {
    if (currentStage.id === 3 && project.quoteApproved) return null;

    return (
      <div style={{
        padding: '24px 28px', borderRadius: 20,
        background: 'linear-gradient(135deg, #FDFAF6, #F4EFE6)',
        border: '1.5px solid rgba(200,169,110,0.35)', marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <AlertCircle size={18} color="var(--accent-primary)" />
          <span style={{ fontSize: 12, fontWeight: 800, color: `var(--accent-primary)`, textTransform: 'uppercase', letterSpacing: '.06em' }}>Action Required</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 6 }}>Approval Required</div>
        <div style={{ fontSize: 14, color: `var(--text-secondary)`, lineHeight: 1.6, marginBottom: 20 }}>
          {currentStage.id === 3 ? "We've prepared your final quotation. Please review the document, then approve it below." : "Please review the work and confirm your approval."}
        </div>
        <button
          onClick={async () => {
            if (acting) return;
            setActing(true);
            if (currentStage.id === 3) {
              await approveQuote(project.id);
            } else if (currentStage.id === 7) {
              await updateProjectStage(project.id, 8);
            }
            setActing(false);
          }}
          disabled={acting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 32px', borderRadius: 14, border: 'none',
            background: acting ? `var(--border-color)` : `var(--accent-secondary)`,
            color: acting ? `var(--text-secondary)` : '#fff',
            fontSize: 15, fontWeight: 800, cursor: acting ? 'default' : 'pointer',
            boxShadow: acting ? 'none' : '0 4px 16px rgba(26,20,16,.25)',
            transition: 'all .2s',
          }}
        >
          {acting
            ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Approving...</>
            : <>Confirm Approval <ArrowRight size={18} /></>
          }
        </button>
      </div>
    );
  }

  if (currentStage.requiresPayment) {
    const isDeposit = currentStage.id === 3;
    return (
      <div style={{
        padding: '24px 28px', borderRadius: 20,
        background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
        border: '1.5px solid #16A34A30', marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <AlertCircle size={18} color="#16A34A" />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '.06em' }}>Payment Required</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 4 }}>
          {isDeposit ? "Your 50% deposit is due" : "Your final balance is due"}
        </div>
        {budget > 0 && (
          <div style={{ fontSize: 15, fontWeight: 700, color: '#16A34A', marginBottom: 6 }}>
            Amount: GHS {Number(halfBudget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
          {isDeposit ? "A 50% deposit is required to initiate production and material procurement." : "Your project is nearly complete. Please settle the remaining 50% balance."}
        </div>
        <UnifiedPaymentGateway
          label={`Pay ${isDeposit ? 'Deposit' : 'Balance'} — GHS ${Number(halfBudget).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          amountGHS={halfBudget}
          email={email}
          projectId={project.id}
          paymentType={isDeposit ? "deposit" : "final"}
          onSuccess={(ref) => {
            console.log(`${isDeposit ? 'Deposit' : 'Final'} payment verified:`, ref);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px 24px', borderRadius: 20,
      background: '#FFFBEB', border: '1.5px solid #D9770630', marginBottom: 4,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Bell size={20} color="#D97706" />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Your attention is needed</div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
          Please confirm receipt or contact your account manager to proceed.
        </div>
      </div>
    </div>
  );
}

// ─── Client Next Action / Approval Surfaces ──────────────────────────────────
function ClientNextActionCard({ project, invoices = [], renderingPackages = [], addOns = [], setActiveTab, isMobile }) {
  if (!project) return null;
  const parseAmount = value => parseFloat(String(value || '0').replace(/[^0-9.]/g, '')) || 0;
  const projectInvoices = invoices.filter(i => i.projectId === project.id || i.parentId === project.id);
  const projectPackages = renderingPackages.filter(pkg => pkg.projectId === project.id);
  const projectAddOns = addOns.filter(a => a.projectId === project.id);
  const lockedRendering = projectPackages.find(pkg => {
    const linkedInv = projectInvoices.find(i => i.id === pkg.linkedInvoiceId || i.renderingPackageId === pkg.id);
    return linkedInv && linkedInv.status !== 'Paid' && !pkg.unlocked;
  });
  const reviewRendering = projectPackages.find(pkg => {
    const linkedInv = projectInvoices.find(i => i.id === pkg.linkedInvoiceId || i.renderingPackageId === pkg.id);
    const unlocked = pkg.unlocked || pkg.status === 'Paid / Unlocked' || linkedInv?.status === 'Paid';
    return unlocked && pkg.status !== 'Approved';
  });
  const pendingAddOn = projectAddOns.find(a => ['Pending', 'Pending Approval', 'Priced'].includes(a.status || a.approvalStatus));
  const unpaidInvoice = projectInvoices.find(i => !['Paid', 'paid'].includes(i.status) && i.type !== 'Quotation' && i.documentKind !== 'quotation');
  const pendingQuote = projectInvoices.find(i => ['Quotation', 'quote', 'quotation'].includes(i.type || i.documentKind) && !['Approved', 'Paid'].includes(i.status));

  let action;
  if (lockedRendering) {
    action = { tone: '#D97706', bg: '#FFF7ED', icon: <Lock size={18} />, title: 'Rendering fee required', body: 'Pay the separate design/rendering invoice to unlock your CAD or 3D package.', button: 'Open Design Vault', tab: 'design' };
  } else if (reviewRendering) {
    action = { tone: 'var(--accent-primary)', bg: '#F4EFE6', icon: <PenTool size={18} />, title: 'Review your rendering', body: 'Your design package is unlocked. Review it, leave pins, request changes, or approve the final version.', button: 'Review Design', tab: 'design' };
  } else if (pendingQuote) {
    action = { tone: 'var(--accent-primary)', bg: '#FDFAF6', icon: <FileText size={18} />, title: 'Quote awaiting your review', body: 'Review the latest quote or quotation before kickoff approval.', button: 'View Quotes', tab: 'approvals' };
  } else if (pendingAddOn) {
    action = { tone: '#B45309', bg: '#FFFBEB', icon: <Gift size={18} />, title: 'Add-on needs decision', body: `${pendingAddOn.title || pendingAddOn.description || 'A project variation'} is waiting for your approval.`, button: 'Review Add-ons', tab: 'addons' };
  } else if (unpaidInvoice) {
    const amount = parseAmount(unpaidInvoice.amount || unpaidInvoice.total);
    action = { tone: '#16A34A', bg: '#F0FDF4', icon: <CreditCard size={18} />, title: 'Payment pending', body: `${unpaidInvoice.title || 'An invoice'} is outstanding${amount ? `: GHS ${amount.toLocaleString()}` : ''}.`, button: 'Open Payments', tab: 'payments' };
  } else {
    const currentStage = CLIENT_PROJECT_STAGES.find(s => s.id === project.stageId);
    action = { tone: '#16A34A', bg: '#F0FDF4', icon: <CheckCircle2 size={18} />, title: project.nextAction || 'Everything is on track', body: currentStage?.clientMsg || 'Your project is moving. We will notify you when your next action is required.', button: 'View Timeline', tab: 'timeline' };
  }

  return (
    <div style={{ padding: isMobile ? '18px 18px' : '22px 26px', borderRadius: isMobile ? 24 : 20, border: `1.5px solid ${action.tone}30`, background: action.bg, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 16, boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.06)' : '0 4px 18px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fff', color: action.tone, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{action.icon}</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: action.tone, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Next Action</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 3 }}>{action.title}</div>
          <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.5 }}>{action.body}</div>
        </div>
      </div>
      <button onClick={() => setActiveTab(action.tab)} style={{ padding: '11px 18px', borderRadius: 12, border: 'none', background: action.tone, color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer', alignSelf: isMobile ? 'stretch' : 'auto', whiteSpace: 'nowrap' }}>
        {action.button}
      </button>
    </div>
  );
}

function ClientApprovalsTab({ project, invoices = [], approveQuote, brand, user, isMobile }) {
  const quoteDocs = invoices.filter(i => (i.projectId === project.id || i.parentId === project.id) && ['Quotation', 'quote', 'quotation'].includes(i.type || i.documentKind));
  const cardStyle = { padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' };

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900, color: `var(--accent-secondary)` }}>Quotes & Approvals</div>
        <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 4 }}>Review official quote versions and approval records.</div>
      </div>
      {quoteDocs.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: `var(--text-secondary)`, fontSize: 13 }}>No quote has been issued for this project yet.</div>
      ) : quoteDocs.map(inv => (
        <div key={inv.id} style={{ padding: 16, borderRadius: 16, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: `var(--accent-secondary)` }}>{inv.title || `Quote v${inv.version || 1}`}</div>
            <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 3 }}>{inv.amount || `GHS ${Number(inv.total || 0).toLocaleString()}`} · {inv.status || 'Pending'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => downloadInvoicePDF(inv, project, user, brand)} style={{ padding: '9px 13px', borderRadius: 10, border: '1px solid var(--border-color)', background: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Download</button>
            {approveQuote && !project.quoteApproved && (
              <button onClick={() => approveQuote(project.id)} style={{ padding: '9px 13px', borderRadius: 10, border: 'none', background: `var(--accent-primary)`, color: '#fff', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>Approve Quote</button>
            )}
          </div>
        </div>
      ))}
      {project.quoteApproved && (
        <div style={{ padding: 14, borderRadius: 14, background: '#F0FDF4', color: '#16A34A', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={15} /> Final quote approved and contract record available in Progress.
        </div>
      )}
    </div>
  );
}

function ClientAddOnsTab({ project, addOns = [], invoices = [], user, isMobile }) {
  const projectAddOns = addOns.filter(a => a.projectId === project.id);
  const email = user?.proxyEmail || (user?.phone ? user.phone + '@clients.westlinefuture.com' : 'client@clients.westlinefuture.com');
  const parseAmount = value => parseFloat(String(value || '0').replace(/[^0-9.]/g, '')) || 0;
  const cardStyle = { padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' };

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900, color: `var(--accent-secondary)` }}>Add-ons & Variations</div>
        <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 4 }}>Every approved scope change stays visible with cost, status, and linked payment.</div>
      </div>
      {projectAddOns.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: `var(--text-secondary)`, fontSize: 13 }}>No add-ons or variations have been added to this project.</div>
      ) : projectAddOns.map(addOn => {
        const linkedInv = invoices.find(i => i.id === addOn.invoiceId || i.addOnId === addOn.id);
        const amount = parseAmount(addOn.price || addOn.amount || linkedInv?.amount || linkedInv?.total);
        const unpaid = linkedInv && linkedInv.status !== 'Paid';
        return (
          <div key={addOn.id} style={{ padding: 16, borderRadius: 16, border: '1px solid var(--border-color)', background: `var(--bg-secondary)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: `var(--accent-secondary)` }}>{addOn.title || addOn.description || 'Project Add-on'}</div>
                <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 3 }}>{addOn.reason || addOn.timelineImpact || 'Scope variation'}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 900, color: addOn.status === 'Approved' ? '#16A34A' : '#D97706', background: addOn.status === 'Approved' ? '#F0FDF4' : '#FFF7ED', padding: '4px 9px', borderRadius: 999, height: 24 }}>{addOn.status || addOn.approvalStatus || 'Pending'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: `var(--accent-secondary)` }}>{amount ? `GHS ${amount.toLocaleString()}` : 'Pricing pending'}</div>
              {unpaid && amount > 0 && (
                <div style={{ width: 240, maxWidth: '100%' }}>
                  <UnifiedPaymentGateway label="Pay Add-on" amountGHS={amount} email={email} projectId={project.id} invoiceId={linkedInv.id} paymentType="addon" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shipping Tracker Card ────────────────────────────────────────────────────
// ─── Installation Status Card ─────────────────────────────────────────────────
function InstallationStatusCard({ project }) {
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    if (!db || project.stageId !== 6) return;
    const q = query(
      collection(db, 'projects', project.id, 'documents'),
      where('docType', '==', 'progress_photo'),
      orderBy('createdAt', 'desc'),
      limit(6)
    );
    return onSnapshot(q, snap => setRecentPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setRecentPhotos([]));
  }, [project.id, project.stageId]);

  if (project.stageId !== 6) return null;

  const installEntry = (project.stageHistory || []).find(h => h.stageId === 6);
  const startDate = installEntry?.timestamp
    ? (() => {
        const d = installEntry.timestamp?.toDate ? installEntry.timestamp.toDate() : new Date(installEntry.timestamp);
        return isNaN(d) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      })()
    : null;

  return (
    <div style={{ padding: '24px 28px', borderRadius: 20, background: 'linear-gradient(135deg, #F0FDF4, #DCFCE760)', border: '1.5px solid #16A34A30' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wrench size={22} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Installation · In Progress</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: `var(--accent-secondary)` }}>Our crew is on-site</div>
          {startDate && <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 2 }}>Started {startDate}</div>}
        </div>
        <div style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, background: '#16A34A', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', animation: 'pulse 1.5s infinite' }} />
          Live
        </div>
      </div>

      {/* What the client can expect */}
      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: recentPhotos.length > 0 ? 20 : 0, padding: '12px 16px', background: 'rgba(255,255,255,.7)', borderRadius: 12 }}>
        Our technical crew is fitting and finishing all components on-site. Progress photos are posted as work is completed — check the <strong>Photos</strong> tab for the full gallery. You will be notified when we're ready for your inspection sign-off.
      </div>

      {/* Recent site photos */}
      {recentPhotos.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 10 }}>Latest Site Photos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {recentPhotos.slice(0, 6).map(photo => (
              <div
                key={photo.id}
                onClick={() => setZoom(photo)}
                style={{ aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: `var(--border-color)`, cursor: 'pointer', position: 'relative' }}
              >
                {photo.url ? (
                  <img src={photo.url} alt={photo.name || 'Site photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={18} color="var(--text-secondary)" />
                  </div>
                )}
              </div>
            ))}
          </div>
          {recentPhotos.length === 6 && (
            <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, marginTop: 8, textAlign: 'center' }}>Tap Photos tab to see all →</div>
          )}
        </div>
      )}

      {recentPhotos.length === 0 && (
        <div style={{ marginTop: 12, padding: '14px 16px', background: 'rgba(255,255,255,.6)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Camera size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: 12, color: `var(--text-secondary)` }}>Progress photos will appear here as our crew completes each section.</span>
        </div>
      )}

      {/* Photo zoom modal */}
      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={zoom.url} alt={zoom.name || 'Site photo'} style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 16, objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setZoom(null)} style={{ position: 'fixed', top: 20, right: 20, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#fff" />
          </button>
        </div>
      )}
    </div>
  );
}

function ShippingTrackerCard({ project }) {
  const sd = project.shippingDetails;
  if (!sd?.vesselName || (project.stageId || 0) < 4) return null;

  const eta = sd.eta
    ? (() => {
        const d = sd.eta?.toDate ? sd.eta.toDate() : new Date(sd.eta);
        return isNaN(d) ? sd.eta : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
      })()
    : null;

  return (
    <div style={{
      padding: '20px 20px', borderRadius: 20,
      background: 'linear-gradient(135deg, #0C4A6E, #0369A1)',
      color: '#fff', marginBottom: 4,
      boxShadow: '0 8px 32px rgba(3,105,161,.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 24 }}>🚢</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Live Shipping Tracker</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>{sd.vesselName}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
        {sd.blNumber && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,.1)', borderRadius: 12, backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>BL Number</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'monospace', letterSpacing: '.03em' }}>{sd.blNumber}</div>
          </div>
        )}
        {sd.containerNumber && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,.1)', borderRadius: 12, backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Container</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: 'monospace', letterSpacing: '.03em' }}>{sd.containerNumber}</div>
          </div>
        )}
        {eta && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,.15)', borderRadius: 12, border: '1px solid rgba(255,255,255,.2)', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>ETA</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#7DD3FC' }}>{eta}</div>
          </div>
        )}
      </div>
      {sd.notes && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,.08)', borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,.75)', lineHeight: 1.5, fontStyle: 'italic' }}>
          {sd.notes}
        </div>
      )}
    </div>
  );
}

// ─── Document Viewer Modal ────────────────────────────────────────────────────
function DocViewer({ doc, onClose }) {
  const isImage = doc.fileType?.includes('image') || /\.(jpe?g|png|gif|webp|svg)$/i.test(doc.name || '');
  const isPDF = doc.fileType?.includes('pdf') || /\.pdf$/i.test(doc.name || '');
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,8,6,0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '90vw', maxWidth: 1000, height: '85vh',
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', background: `var(--accent-secondary)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isImage ? <Image size={16} color="var(--accent-secondary)" /> : <FileText size={16} color="var(--accent-secondary)" />}
            <span className="lxf" style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{doc.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: `var(--accent-secondary)`, color: `var(--accent-secondary)`, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>
              <Download size={13} /> Download
            </a>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✕</button>
          </div>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `var(--bg-secondary)` }}>
          {isImage && <img src={doc.url} alt={doc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 16 }} />}
          {isPDF && <iframe src={doc.url} title={doc.name} style={{ width: '100%', height: '100%', border: 'none' }} />}
          {!isImage && !isPDF && (
            <div style={{ textAlign: 'center', color: `var(--text-secondary)` }}>
              <FileText size={48} color="var(--text-secondary)" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Preview not available</div>
              <a href={doc.url} download={doc.name} style={{ color: `var(--accent-secondary)`, fontWeight: 700 }}>Download the file instead</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
function DocumentsTab({ projectId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    if (!db || !projectId) { setLoading(false); return; }
    const q = query(
      collection(db, 'projects', projectId, 'documents'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q,
      snap => {
        setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => {
        if (import.meta.env.DEV) console.warn('[DocumentsTab]', err.code);
        setLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 72, borderRadius: 14, background: `var(--border-color)`, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>📂</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 8 }}>No documents yet</div>
        <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
          No documents uploaded yet. Your account manager will upload quotes, BOLs, and certificates here.
        </div>
      </div>
    );
  }

  return (
    <>
      {viewingDoc && <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {docs.map(doc => {
          const stageInfo = doc.stageId ? CLIENT_PROJECT_STAGES.find(s => s.id === doc.stageId) : null;
          const uploadedDate = doc.createdAt?.seconds
            ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
          const sizeMB = doc.size ? (doc.size / (1024 * 1024)).toFixed(1) : null;

          return (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', background: '#FAFAF9', borderRadius: 16,
              border: '1.5px solid var(--border-color)', transition: 'border-color .2s',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileTypeIcon fileType={doc.fileType} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: `var(--accent-secondary)`, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {stageInfo && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: stageInfo.color, background: `${stageInfo.color}15`, padding: '2px 8px', borderRadius: 10 }}>
                      {stageInfo.short}
                    </span>
                  )}
                  {uploadedDate && <span style={{ fontSize: 11, color: `var(--text-secondary)` }}>{uploadedDate}</span>}
                  {sizeMB && <span style={{ fontSize: 11, color: `var(--text-secondary)` }}>{sizeMB} MB</span>}
                  {doc.uploadedBy && <span style={{ fontSize: 11, color: `var(--text-secondary)` }}>by {doc.uploadedBy}</span>}
                </div>
              </div>
              {doc.url && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setViewingDoc(doc)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 10,
                      background: `var(--border-color)`, color: `var(--accent-secondary)`,
                      fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                    }}
                  >
                    <ZoomIn size={13} /> View
                  </button>
                  <a
                    href={doc.url}
                    download={doc.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 10,
                      background: `var(--accent-secondary)`, color: '#fff',
                      fontSize: 12, fontWeight: 700, textDecoration: 'none',
                    }}
                  >
                    <Download size={13} /> Download
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Photo Feed ───────────────────────────────────────────────────────────────
function PhotoFeed({ projectId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!db || !projectId) { setLoading(false); return; }
    const q = query(
      collection(db, 'projects', projectId, 'documents'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q,
      snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDocs(all.filter(d => isImageType(d.fileType)));
        setLoading(false);
      },
      err => {
        if (import.meta.env.DEV) console.warn('[PhotoFeed]', err.code);
        setLoading(false);
      }
    );
    return unsub;
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: 14, background: `var(--border-color)`, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>📸</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 8 }}>No site photos yet</div>
        <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
          Your team will share progress photos here.
        </div>
      </div>
    );
  }

  const stageFor = (doc) => {
    if (!doc.stageId) return null;
    return CLIENT_PROJECT_STAGES.find(s => s.id === doc.stageId);
  };

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}>
        <style>{`
          @media (min-width: 640px) {
            .photo-grid { grid-template-columns: repeat(3, 1fr) !important; }
          }
        `}</style>
        {docs.map(doc => {
          const stage = stageFor(doc);
          const dateStr = doc.createdAt?.seconds
            ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            : null;
          return (
            <div
              key={doc.id}
              onClick={() => setLightbox(doc)}
              style={{
                position: 'relative', aspectRatio: '1', borderRadius: 14,
                overflow: 'hidden', cursor: 'pointer',
                background: `var(--border-color)`,
                boxShadow: '0 2px 12px rgba(0,0,0,.08)',
                transition: 'transform .2s, box-shadow .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.08)'; }}
            >
              <img
                src={doc.url}
                alt={doc.name || 'Site photo'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(to top, rgba(92, 58, 33,.85) 0%, transparent 100%)',
                padding: '20px 10px 8px',
              }}>
                {stage && (
                  <div style={{ fontSize: 9, fontWeight: 800, color: stage.color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
                    {stage.short}
                  </div>
                )}
                {dateStr && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{dateStr}</div>
                )}
              </div>
              <div style={{
                position: 'absolute', top: 8, right: 8,
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(92, 58, 33,.5)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ZoomIn size={13} color="#fff" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,.92)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,.1)', border: 'none',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.name}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '85vh',
              objectFit: 'contain', borderRadius: 16,
              boxShadow: '0 24px 80px rgba(0,0,0,.6)',
            }}
          />
          {lightbox.name && (
            <div style={{
              position: 'absolute', bottom: 28,
              left: '50%', transform: 'translateX(-50%)',
              fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.7)',
              background: 'rgba(0,0,0,.5)', padding: '8px 16px', borderRadius: 20,
              backdropFilter: 'blur(4px)',
              whiteSpace: 'nowrap', maxWidth: '80vw', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {lightbox.name}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Cost Breakdown Card (client-visible) ────────────────────────────────────
function CostBreakdownCard({ project, fmt, card, pad, isMobile }) {
  const breakdown = project.breakdown || {};
  const surcharges = project.surcharges || [];
  const hasBd = breakdown.product?.enabled || breakdown.shipping?.enabled || breakdown.installation?.enabled || (breakdown.extras?.length > 0);
  if (!hasBd && surcharges.length === 0) return null;

  const BD_ROWS = [
    { key: 'product',      label: 'Product / Materials',  color: `var(--accent-secondary)` },
    { key: 'shipping',     label: 'Shipping & Freight',   color: `var(--text-secondary)` },
    { key: 'installation', label: 'Installation Labour',  color: '#D97706' },
  ].filter(r => breakdown[r.key]?.enabled && breakdown[r.key]?.amount > 0);

  const extraRows = (breakdown.extras || []).filter(e => e.amount > 0);
  const bdSubtotal = BD_ROWS.reduce((s, r) => s + (breakdown[r.key]?.amount || 0), 0)
    + extraRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const scTotal = surcharges.reduce((s, sc) => s + (Number(sc.amount) || 0), 0);
  const grandTotal = bdSubtotal + scTotal;

  return (
    <div style={{ ...card, padding: pad }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 4 }}>Project Cost Breakdown</div>
      <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginBottom: 18 }}>Itemised summary of your project cost</div>

      {/* Line items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {BD_ROWS.map((r, i) => (
          <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid var(--border-color)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#3D3530', fontWeight: 600 }}>{r.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{fmt(breakdown[r.key].amount)}</span>
          </div>
        ))}
        {extraRows.map(e => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6B7280', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#3D3530', fontWeight: 600 }}>{e.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{fmt(e.amount)}</span>
          </div>
        ))}

        {/* Surcharges */}
        {surcharges.map(sc => (
          <div key={sc.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#3D3530', fontWeight: 700 }}>{sc.label}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#DC2626', whiteSpace: 'nowrap', marginLeft: 12 }}>+{fmt(sc.amount)}</span>
            </div>
            <div style={{ marginLeft: 18, padding: '10px 14px', background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA30' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Reason for adjustment</div>
              <div style={{ fontSize: 12, color: `var(--text-secondary)`, lineHeight: 1.6 }}>{sc.reason}</div>
              <div style={{ fontSize: 10, color: `var(--text-secondary)`, marginTop: 6, fontWeight: 600 }}>Effective {sc.date}</div>
            </div>
          </div>
        ))}

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: `var(--accent-secondary)` }}>Total Project Value</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: `var(--accent-secondary)` }}>{fmt(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────
function PaymentsTab({ project, user, transactions: propTxns, invoices: propInvs, brand, isMobile }) {
  const budget = Number(project.budget) || 0;
  const USD_RATE = Number(brand?.exchangeRate) || 15.5;
  const [showUSD, setShowUSD] = useState(
    user?.currency === 'USD' || project?.currency === 'USD'
  );
  const [livePayments, setLivePayments] = useState(null);
  const [liveInvoices, setLiveInvoices] = useState(null);

  useEffect(() => {
    if (!db || !project?.id) return;
    const q = query(
      collection(db, 'projects', project.id, 'transactions'),
      orderBy('date', 'desc')
    );
    return onSnapshot(q,
      snap => setLivePayments(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setLivePayments([])
    );
  }, [project?.id]);

  useEffect(() => {
    if (!db || !project?.id) return;
    const q = query(
      collection(db, 'projects', project.id, 'payments'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q,
      snap => setLiveInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setLiveInvoices([])
    );
  }, [project?.id]);

  const uid = user?.id || user?.uid || user?.phone;
  const allPayments = livePayments
    ?? (propTxns || []).filter(t => t.projectId === project.id);
  const allInvoices = liveInvoices
    ?? (propInvs || []).filter(i => i.projectId === project.id || i.parentId === project.id);

  const parseAmount = value => parseFloat(String(value || '0').replace(/[^0-9.]/g, '')) || 0;
  const totalPaid = allPayments.reduce((s, t) => s + parseAmount(t.amount), 0);
  const paidPct = budget > 0 ? Math.min(100, (totalPaid / budget) * 100) : 0;

  const fmt = (ghsAmount) => {
    const n = Number(ghsAmount) || 0;
    if (showUSD) return `$${(n / USD_RATE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtDate = (val, withTime = false) => {
    if (!val) return '—';
    const d = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-GB', withTime
      ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const scheduleType = project.paymentSchedule || 'standard';
  const scheduleConfig = SCHEDULE_CONFIGS[scheduleType] || SCHEDULE_CONFIGS.standard;
  const activeMilestones = scheduleConfig.milestones;
  const isCustom = scheduleType === 'custom';

  const getMilestoneStatus = (m) => {
    if (budget <= 0) return 'upcoming';
    if (totalPaid >= budget * m.cumPct) return 'paid';
    if (totalPaid >= budget * (m.cumPct - m.pct)) return 'due';
    return 'upcoming';
  };
  const currentDueMilestone = activeMilestones.find(m => getMilestoneStatus(m) === 'due');
  const email = user?.proxyEmail || (user?.phone ? user.phone + '@clients.westlinefuture.com' : 'client@clients.westlinefuture.com');

  const card = {
    background: '#fff',
    borderRadius: isMobile ? 24 : 20,
    border: isMobile ? 'none' : '1px solid var(--border-color)',
    boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)',
  };
  const pad = isMobile ? '20px 18px' : '24px 28px';
  const sectionTitle = { fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 16 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20 }}>

      {/* Currency toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 2px' : 0 }}>
        <div style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 600 }}>
          Base currency: <strong style={{ color: `var(--accent-secondary)` }}>GHS</strong>
        </div>
        <button
          onClick={() => setShowUSD(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 22,
            background: showUSD ? `var(--accent-secondary)` : `var(--bg-secondary)`,
            border: `2px solid ${showUSD ? `var(--accent-secondary)` : `var(--border-color)`}`,
            color: showUSD ? `var(--accent-secondary)` : `var(--text-secondary)`,
            fontSize: 12, fontWeight: 800, cursor: 'pointer',
            minHeight: 40, touchAction: 'manipulation', transition: 'all .2s',
          }}
        >
          {showUSD ? '🇬🇭 GHS' : '🇺🇸 USD'}
        </button>
      </div>

      {/* ── Cost breakdown (if set by admin) ── */}
      <CostBreakdownCard project={project} fmt={fmt} card={card} pad={pad} isMobile={isMobile} />

      {/* ── A. Payment schedule ── */}
      <div style={{ ...card, padding: pad }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={sectionTitle}>Payment Schedule</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: -10 }}>
              {scheduleConfig.label}
            </div>
          </div>
          {budget > 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#16A34A' }}>{fmt(totalPaid)}</div>
              <div style={{ fontSize: 10, color: `var(--text-secondary)`, fontWeight: 600 }}>paid so far</div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {budget > 0 && (
          <div style={{ marginBottom: isCustom ? 16 : 20 }}>
            <div style={{ height: 10, background: `var(--border-color)`, borderRadius: 5, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${paidPct}%`, background: 'linear-gradient(90deg, #16A34A80, #16A34A)', borderRadius: 5, transition: 'width 1.2s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: `var(--text-secondary)` }}>
              <span style={{ fontWeight: 700, color: paidPct >= 100 ? '#16A34A' : `var(--accent-secondary)` }}>{paidPct.toFixed(1)}% paid</span>
              <span>{fmt(budget - totalPaid)} remaining · Total {fmt(budget)}</span>
            </div>
          </div>
        )}

        {/* ── Custom schedule: simple ledger summary ── */}
        {isCustom ? (
          <div>
            {budget <= 0 ? (
              <div style={{ fontSize: 13, color: `var(--text-secondary)`, textAlign: 'center', padding: '12px 0' }}>
                No project budget set yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: 14, border: '1.5px solid #16A34A20' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Amount Paid</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#16A34A' }}>{fmt(totalPaid)}</div>
                  <div style={{ fontSize: 10, color: `var(--text-secondary)`, marginTop: 2 }}>{allPayments.length} payment{allPayments.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ padding: '14px 16px', background: '#FFFBEB', borderRadius: 14, border: '1.5px solid #D9770620' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Balance Due</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: totalPaid >= budget ? '#16A34A' : '#D97706' }}>
                    {totalPaid >= budget ? 'Cleared ✓' : fmt(budget - totalPaid)}
                  </div>
                  <div style={{ fontSize: 10, color: `var(--text-secondary)`, marginTop: 2 }}>{paidPct.toFixed(0)}% of {fmt(budget)}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Milestone-based schedule ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeMilestones.map((m, idx) => {
              const status = getMilestoneStatus(m);
              const isPaid = status === 'paid';
              const isDue = status === 'due';
              return (
                <div key={m.key} style={{
                  display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 14,
                  padding: isMobile ? '13px 14px' : '15px 18px', borderRadius: 14,
                  background: isDue ? '#F0FDF4' : '#FAFAF9',
                  border: `1.5px solid ${isDue ? '#16A34A40' : isPaid ? '#16A34A20' : `var(--border-color)`}`,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isPaid ? '#16A34A' : isDue ? '#F0FDF4' : `var(--border-color)`,
                    border: isDue ? '2px solid #16A34A' : 'none',
                  }}>
                    {isPaid
                      ? <Check size={14} color="#fff" />
                      : <span style={{ fontSize: 11, fontWeight: 900, color: isDue ? '#16A34A' : `var(--text-secondary)` }}>{idx + 1}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)` }}>{m.label}</div>
                    {budget > 0 && (
                      <div style={{ fontSize: 13, fontWeight: 800, color: isPaid ? '#16A34A' : isDue ? '#16A34A' : `var(--text-secondary)`, marginTop: 2 }}>
                        {fmt(budget * m.pct)}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isPaid && <span style={{ fontSize: 10, fontWeight: 800, color: '#065F46', background: '#D1FAE5', padding: '4px 10px', borderRadius: 20 }}>Paid ✓</span>}
                    {isDue && <span style={{ fontSize: 10, fontWeight: 800, color: '#92400E', background: '#FEF3C7', padding: '4px 10px', borderRadius: 20 }}>Due Now</span>}
                    {status === 'upcoming' && <span style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, background: `var(--border-color)`, padding: '4px 10px', borderRadius: 20 }}>Upcoming</span>}
                  </div>
                </div>
              );
            })}

            {currentDueMilestone && budget > 0 && (
              <div style={{ marginTop: 10, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 13, color: `var(--text-secondary)`, marginBottom: 12 }}>
                  Ready to pay your <strong>{currentDueMilestone.label}</strong>?
                </div>
                <UnifiedPaymentGateway
                  label={`Pay ${fmt(budget * currentDueMilestone.pct)} Now`}
                  amountGHS={budget * currentDueMilestone.pct}
                  email={email}
                  projectId={project?.id}
                  paymentType={currentDueMilestone.label?.toLowerCase().replace(/\s+/g, '_')}
                  onSuccess={async (ref) => {
                    if (import.meta.env.DEV) console.log('[PaymentsTab] Payment success', ref);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── B. Payment history ── */}
      <div style={{ ...card, padding: pad }}>
        <div style={sectionTitle}>Payment History</div>
        {allPayments.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💸</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: `var(--accent-secondary)`, marginBottom: 4 }}>No payments yet</div>
            <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>Your payment records will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allPayments.map(t => (
              <div key={t.id} style={{ background: '#FAFAF9', borderRadius: 16, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: isMobile ? '14px 14px 10px' : '16px 18px 10px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Check size={16} color="#16A34A" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, marginBottom: 4 }}>
                      {t.description || t.title || 'Payment received'}
                    </div>
                    <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginBottom: 4 }}>
                      {fmtDate(t.date || t.createdAt, true)}
                    </div>
                    {t.reference && (
                      <div style={{ display: 'inline-block', fontSize: 10, color: `var(--text-secondary)`, fontFamily: 'monospace', background: `var(--border-color)`, padding: '2px 8px', borderRadius: 6 }}>
                        {t.reference}
                      </div>
                    )}
                    {t.method && (
                      <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 4 }}>via {t.method}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#16A34A' }}>{fmt(t.amount)}</div>
                    {showUSD && (
                      <div style={{ fontSize: 10, color: `var(--text-secondary)`, marginTop: 2 }}>
                        ≈ GHS {Number(t.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', padding: isMobile ? '9px 14px' : '9px 18px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => downloadPaymentReceipt(t, project, user, brand)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: `var(--border-color)`, border: 'none', fontSize: 11, fontWeight: 700, color: `var(--accent-secondary)`, cursor: 'pointer', touchAction: 'manipulation', minHeight: 34 }}
                  >
                    <Download size={12} /> Download Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── C. Invoices ── */}
      <div style={{ ...card, padding: pad }}>
        <div style={sectionTitle}>Invoices</div>
        {allInvoices.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, marginBottom: 4 }}>No invoices yet</div>
            <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>Invoices will appear here as they are issued.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allInvoices.map(inv => (
              <div key={inv.id} style={{ background: '#FAFAF9', borderRadius: 16, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: isMobile ? '14px 14px 10px' : '16px 18px 10px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <FileText size={16} color="#D97706" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, marginBottom: 3 }}>
                      Invoice #{inv.invoiceNumber || (inv.id || '').slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginBottom: 6 }}>
                      {fmtDate(inv.createdAt || inv.date)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)` }}>{fmt(parseAmount(inv.amount || inv.total))}</span>
                      {showUSD && inv.amount && (
                        <span style={{ fontSize: 10, color: `var(--text-secondary)` }}>≈ GHS {parseAmount(inv.amount || inv.total).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                        background: inv.status === 'Paid' ? '#D1FAE5' : inv.status === 'Overdue' ? '#FEE2E2' : '#FEF3C7',
                        color: inv.status === 'Paid' ? '#065F46' : inv.status === 'Overdue' ? '#991B1B' : '#92400E',
                      }}>
                        {inv.status || 'Pending'}
                      </span>
                    </div>
                    {inv.title && <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 4 }}>{inv.title}</div>}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', padding: isMobile ? '9px 14px' : '9px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                  {inv.status !== 'Paid' && parseAmount(inv.amount || inv.total) > 0 && (
                    <div style={{ width: 180 }}>
                      <UnifiedPaymentGateway
                        label="Pay Invoice"
                        amountGHS={parseAmount(inv.amount || inv.total)}
                        email={email}
                        projectId={project.id}
                        invoiceId={inv.id}
                        paymentType={inv.documentKind === 'receipt' ? 'receipt' : 'invoice'}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => downloadInvoicePDF(inv, project, user, brand)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: `var(--accent-secondary)`, border: 'none', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', touchAction: 'manipulation', minHeight: 34 }}
                  >
                    <Download size={12} /> Download Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ProjectChat is replaced by WorldClassChat — see import above

// ─── Stage Timeline (enhanced) ────────────────────────────────────────────────
function StageTimeline({ project, onRequestChange, isMobile }) {
  const applicableStages = CLIENT_PROJECT_STAGES.filter(s => {
    const typeStages = PROJECT_TYPES[project.projectType]?.stages || CLIENT_PROJECT_STAGES.map(s => s.id);
    return typeStages.includes(s.id);
  });
  const currentIdx = applicableStages.findIndex(s => s.id === project.stageId);
  const currentStage = applicableStages[currentIdx];

  // Calculate overall progress percentage
  const progressPct = applicableStages.length > 1
    ? Math.round((Math.max(0, currentIdx) / (applicableStages.length - 1)) * 100)
    : (currentStage?.pct || 5);

  // Estimate completion
  const estCompletion = (() => {
    if (project.estimatedCompletion) {
      const d = project.estimatedCompletion?.toDate
        ? project.estimatedCompletion.toDate()
        : new Date(project.estimatedCompletion);
      if (!isNaN(d)) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    // fallback: last stage history entry + 30 days
    const history = project.stageHistory || [];
    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      if (lastEntry?.timestamp) {
        const d = lastEntry.timestamp?.toDate ? lastEntry.timestamp.toDate() : new Date(lastEntry.timestamp);
        if (!isNaN(d)) {
          const est = new Date(d.getTime() + 30 * 86400000);
          return est.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        }
      }
    }
    return null;
  })();

  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-current="true"]');
      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [project.stageId]);

  const ac = AC;

  return (
    <div>
      {/* Enhanced progress bar with est. completion */}
      <div style={{ marginBottom: 24, padding: '16px 20px', background: `var(--bg-secondary)`, borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 2 }}>Overall Progress</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: `var(--accent-secondary)` }}>{progressPct}%</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {estCompletion && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Est. Completion</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: ac }}>{estCompletion}</div>
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Total Duration</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: ac }}>~{applicableStages.reduce((sum, s) => sum + (s.days || 0), 0)} days</div>
          </div>
        </div>
        <div style={{ height: 10, background: `var(--border-color)`, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: `linear-gradient(90deg, ${ac}80, ${ac})`,
            borderRadius: 5,
            transition: 'width 1.2s ease',
          }} />
        </div>
      </div>

      {/* Stage pills — horizontal on desktop, vertical trail on mobile */}
      {isMobile ? (
        /* ── Mobile: vertical stage trail ── */
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {applicableStages.map((s, idx) => {
            const isCurrent = s.id === project.stageId;
            const isPast = (project.stageId || 1) > s.id;
            const histEntry = (project.stageHistory || []).find(h => h.stageId === s.id);
            const enteredDate = histEntry?.timestamp ? fmtShort(histEntry.timestamp) : null;
            const isLast = idx === applicableStages.length - 1;
            const dotColor = isPast ? s.color : isCurrent ? s.color : '#DFD9D1';
            const dotBg = isPast ? s.color : isCurrent ? '#fff' : '#F5F3F0';
            const dotBorder = isPast ? s.color : isCurrent ? s.color : `var(--border-color)`;
            return (
              <div key={s.id} data-current={isCurrent ? 'true' : 'false'} style={{ display: 'flex', gap: 14, alignItems: 'stretch', minHeight: isCurrent ? 64 : 48 }}>
                {/* Left rail */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: dotBg, border: `2px solid ${dotBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isPast ? '#fff' : dotColor,
                    boxShadow: isCurrent ? `0 0 0 4px ${s.color}18` : 'none',
                    transition: 'all .3s',
                    fontSize: 13,
                  }}>
                    {isPast ? <CheckCircle2 size={13} /> : <span style={{ fontSize: 12 }}>{STAGE_ICONS[s.id]}</span>}
                  </div>
                  {!isLast && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 8, marginTop: 3,
                      background: isPast ? `linear-gradient(to bottom, ${s.color}, ${applicableStages[idx + 1]?.color || s.color})` : '#EAE5DF',
                      borderRadius: 2,
                    }} />
                  )}
                </div>
                {/* Right content */}
                <div style={{ flex: 1, paddingBottom: isLast ? 0 : 8, paddingTop: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      fontSize: isCurrent ? 14 : 12,
                      fontWeight: isCurrent ? 900 : isPast ? 700 : 500,
                      color: isCurrent ? s.color : isPast ? `var(--accent-secondary)` : `var(--text-secondary)`,
                      lineHeight: 1.3,
                    }}>
                      {s.name}
                    </div>
                    {isCurrent && (
                      <div style={{ fontSize: 10, fontWeight: 800, color: s.color, background: `${s.color}12`, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                        Active
                      </div>
                    )}
                  </div>
                  {s.days && (
                    <div style={{ fontSize: 10, color: isCurrent ? s.color : `var(--text-secondary)`, fontWeight: isCurrent ? 800 : 600, marginTop: 1 }}>
                      ~{s.days} day{s.days !== 1 ? 's' : ''}
                    </div>
                  )}
                  {enteredDate && (isPast || isCurrent) && (
                    <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 1 }}>{enteredDate}</div>
                  )}
                  {isCurrent && s.clientMsg && (
                    <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>
                      {s.clientMsg}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Desktop: horizontal scrolling pills ── */
        <div ref={scrollRef} style={{ display: 'flex', overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', gap: 0 }}>
          {applicableStages.map((s, idx) => {
            const isCurrent = s.id === project.stageId;
            const isPast = (project.stageId || 1) > s.id;
            const histEntry = (project.stageHistory || []).find(h => h.stageId === s.id);
            const enteredDate = histEntry?.timestamp ? fmtShort(histEntry.timestamp) : null;
            const isLast = idx === applicableStages.length - 1;
            return (
              <div
                key={s.id}
                data-current={isCurrent ? 'true' : 'false'}
                style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 96 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', position: 'relative' }}>
                  {/* connector before */}
                  {idx > 0 && (
                    <div style={{ position: 'absolute', right: '50%', top: 20, marginRight: 14, height: 2, left: 0, background: isPast ? s.color : `var(--border-color)` }} />
                  )}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', zIndex: 1, flexShrink: 0,
                    background: isPast ? s.color : isCurrent ? '#fff' : `var(--border-color)`,
                    border: isPast ? `2px solid ${s.color}` : isCurrent ? `2.5px solid ${s.color}` : '2px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isPast ? '#fff' : isCurrent ? s.color : `var(--text-secondary)`,
                    boxShadow: isCurrent ? `0 0 0 4px ${s.color}20` : 'none',
                    transition: 'all .3s',
                  }}>
                    {isPast ? <CheckCircle2 size={15} /> : STAGE_ICONS[s.id]}
                  </div>
                  {/* connector after */}
                  {!isLast && (
                    <div style={{ position: 'absolute', left: '50%', top: 20, marginLeft: 14, height: 2, right: 0, background: isPast ? s.color : `var(--border-color)` }} />
                  )}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: isPast ? `var(--text-secondary)` : isCurrent ? s.color : '#DFD9D1', textAlign: 'center', lineHeight: 1.2, maxWidth: 90, marginTop: 2 }}>
                  {s.name}
                </div>
                {s.days && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: isCurrent ? s.color : '#C4B9AE', textAlign: 'center', background: isCurrent ? `${s.color}10` : 'transparent', padding: isCurrent ? '1px 6px' : 0, borderRadius: 20 }}>
                    ~{s.days}d
                  </div>
                )}
                {enteredDate && (isPast || isCurrent) && (
                  <div style={{ fontSize: 9, color: `var(--text-secondary)`, textAlign: 'center', lineHeight: 1.2 }}>{enteredDate}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Current stage detail — only show on desktop (mobile trail shows inline) */}
      {currentStage && !isMobile && (
        <div style={{ marginTop: 20, padding: '20px 24px', background: `${currentStage.color}08`, borderRadius: 16, border: `1.5px solid ${currentStage.color}25` }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${currentStage.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: currentStage.color, flexShrink: 0 }}>
              {STAGE_ICONS[currentStage.id]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: currentStage.color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                Stage {currentStage.id} of {applicableStages.length} — Active Now
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 6 }}>{currentStage.name}</div>
              <div style={{ fontSize: 14, color: `var(--text-secondary)`, lineHeight: 1.6, marginBottom: 10 }}>{currentStage.clientMsg}</div>
              {(() => {
                const entry = (project.stageHistory || []).find(h => h.stageId === currentStage.id);
                const date = entry?.timestamp ? fmtShort(entry.timestamp) : null;
                const days = entry?.timestamp ? daysSince(entry.timestamp) : null;
                return date ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: `var(--text-secondary)`, marginBottom: 8 }}>
                    <Clock size={11} /> Entered {date}
                    {days !== null && <span style={{ fontWeight: 700, color: `var(--text-secondary)` }}>· {days} day{days !== 1 ? 's' : ''} in this stage</span>}
                  </div>
                ) : null;
              })()}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                {currentStage.whoActs === 'client' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: `var(--accent-primary)`, background: '#FDFAF6', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(200,169,110,0.25)' }}>
                    <AlertCircle size={13} /> Action required from you
                  </div>
                )}
                {onRequestChange && (
                  <button
                    onClick={onRequestChange}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 700, color: `var(--text-secondary)`,
                      background: `var(--bg-secondary)`, padding: '6px 14px', borderRadius: 20,
                      border: '1px solid var(--border-color)', cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={12} /> Request Change
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: action strip below the trail */}
      {currentStage && isMobile && (
        <div style={{ marginTop: 16, padding: '16px', background: `${currentStage.color}08`, borderRadius: 16, border: `1.5px solid ${currentStage.color}25` }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 6 }}>
            {currentStage.name}
          </div>
          {(() => {
            const entry = (project.stageHistory || []).find(h => h.stageId === currentStage.id);
            const days = entry?.timestamp ? daysSince(entry.timestamp) : null;
            return days !== null ? (
              <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginBottom: 10 }}>
                <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                {days} day{days !== 1 ? 's' : ''} in this stage
              </div>
            ) : null;
          })()}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {currentStage.whoActs === 'client' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: `var(--accent-primary)`, background: '#FDFAF6', padding: '7px 14px', borderRadius: 20, border: '1px solid rgba(200,169,110,0.25)' }}>
                <AlertCircle size={12} /> Action needed
              </div>
            )}
            {onRequestChange && (
              <button
                onClick={onRequestChange}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 700, color: `var(--text-secondary)`,
                  background: `var(--bg-secondary)`, padding: '7px 14px', borderRadius: 20,
                  border: '1px solid var(--border-color)', cursor: 'pointer',
                }}
              >
                <Edit3 size={12} /> Request Change
              </button>
            )}
          </div>
        </div>
      )}

      {project.status === 'Completed' && (
        <div style={{ marginTop: 16, padding: '20px 24px', background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', borderRadius: 16, border: '1.5px solid #16A34A40', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 32 }}>🌟</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#16A34A', marginBottom: 4 }}>Project Complete!</div>
            <div style={{ fontSize: 13, color: '#4B7A62' }}>Thank you for choosing Westline Future. Your handover documents have been issued.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Change Request Modal ─────────────────────────────────────────────────────
function ChangeRequestModal({ project, user, onClose }) {
  const [type, setType] = useState('Design Change');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Normal');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const changeTypes = ['Design Change', 'Material Upgrade', 'Size Adjustment', 'Additional Item', 'Other'];
  const urgencies = ['Normal', 'Urgent'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'change_requests'), {
        projectId: project.id,
        clientId: user?.id || user?.uid,
        type,
        description: description.trim(),
        urgency,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[ChangeRequestModal]', err);
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(92, 58, 33,.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: '#fff', borderRadius: 24, padding: '32px 32px 28px',
          boxShadow: '0 24px 80px rgba(0,0,0,.2)',
        }}
      >
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#16A34A', marginBottom: 8 }}>Request Submitted</div>
            <div style={{ fontSize: 13, color: `var(--text-secondary)` }}>Our team will review your change request and get back to you shortly.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Project Change</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)` }}>Request a Change</div>
              </div>
              <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: `var(--border-color)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: `var(--text-secondary)`, marginBottom: 8 }}>Change Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', color: `var(--accent-secondary)`, appearance: 'none', boxSizing: 'border-box' }}
                >
                  {changeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: `var(--text-secondary)`, marginBottom: 8 }}>Description <span style={{ color: '#DC2626' }}>*</span></label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  placeholder="Describe the change you'd like to request..."
                  rows={4}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: `var(--text-secondary)`, marginBottom: 8 }}>Urgency</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {urgencies.map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: 13, transition: 'all .15s',
                        background: urgency === u ? (u === 'Urgent' ? '#FEE2E2' : `var(--accent-secondary)`) : `var(--border-color)`,
                        color: urgency === u ? (u === 'Urgent' ? '#991B1B' : '#fff') : `var(--text-secondary)`,
                      }}
                    >
                      {u === 'Urgent' ? '🔴 Urgent' : '⚪ Normal'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!description.trim() || submitting}
                style={{
                  width: '100%', height: 48, borderRadius: 14, border: 'none',
                  background: !description.trim() || submitting ? `var(--border-color)` : `var(--accent-secondary)`,
                  color: !description.trim() || submitting ? `var(--text-secondary)` : '#fff',
                  fontSize: 15, fontWeight: 800, cursor: !description.trim() || submitting ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all .2s',
                }}
              >
                {submitting
                  ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                  : 'Submit Change Request'
                }
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ project, user, onSubmit, onDismiss }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    await onSubmit({ projectId: project.id, rating, text: text.trim(), clientName: user?.name, clientId: user?.id || user?.uid });
    setSubmitted(true);
    setTimeout(() => onDismiss(), 2000);
    setSubmitting(false);
  };

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(92, 58, 33,.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: '#fff', borderRadius: 24, padding: '36px 32px 28px',
          boxShadow: '0 24px 80px rgba(0,0,0,.25)',
          textAlign: 'center',
        }}
      >
        {submitted ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🌟</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#16A34A', marginBottom: 8 }}>Thank you!</div>
            <div style={{ fontSize: 14, color: `var(--text-secondary)` }}>Your review helps us improve. We appreciate your trust.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🌟</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 8 }}>Your Project is Complete!</div>
            <div style={{ fontSize: 14, color: `var(--text-secondary)`, lineHeight: 1.6, marginBottom: 28 }}>
              We'd love to hear about your experience. Your feedback helps us deliver even better projects.
            </div>

            {/* Star rating */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  style={{
                    width: 48, height: 48, borderRadius: 12, border: 'none',
                    background: (hovered || rating) >= s ? '#FEF3C7' : `var(--border-color)`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s',
                    transform: (hovered || rating) >= s ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <Star size={24} fill={(hovered || rating) >= s ? '#F59E0B' : 'none'} color={(hovered || rating) >= s ? '#F59E0B' : `var(--text-secondary)`} />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <div style={{ fontSize: 13, fontWeight: 700, color: AC, marginBottom: 18 }}>
                {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
              </div>
            )}

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Share your experience (optional)..."
              rows={3}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1.5px solid var(--border-color)', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', marginBottom: 20 }}
            />

            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              style={{
                width: '100%', height: 48, borderRadius: 14, border: 'none',
                background: rating === 0 ? `var(--border-color)` : `var(--accent-secondary)`,
                color: rating === 0 ? `var(--text-secondary)` : '#fff',
                fontSize: 15, fontWeight: 800, cursor: rating === 0 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: 14, transition: 'all .2s',
              }}
            >
              {submitting
                ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                : 'Submit Review'
              }
            </button>

            <button
              onClick={onDismiss}
              style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: `var(--text-secondary)`, cursor: 'pointer', padding: '4px 0' }}
            >
              I'll do this later
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Referral Card ────────────────────────────────────────────────────────────
function ReferralCard({ user, ac }) {
  const [copied, setCopied] = useState(false);
  const code = 'GT-' + (user?.id || user?.uid || '').slice(-6).toUpperCase();
  const link = `https://westlinefuture.com?ref=${code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      padding: '20px 24px', borderRadius: 20,
      background: `linear-gradient(135deg, ${ac}10, ${ac}05)`,
      border: `1.5px solid ${ac}30`,
      display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: `${ac}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Gift size={22} color={ac} />
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 2 }}>Refer a client, earn a discount</div>
        <div style={{ fontSize: 12, color: `var(--text-secondary)`, lineHeight: 1.5 }}>Share your code and get a discount on your next project when they sign on.</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          padding: '8px 16px', borderRadius: 20,
          background: `var(--accent-secondary)`, color: ac,
          fontSize: 13, fontWeight: 900, fontFamily: 'monospace',
          letterSpacing: '.06em',
        }}>
          {code}
        </div>
        <button
          onClick={handleCopy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 20, border: 'none',
            background: copied ? '#D1FAE5' : `var(--border-color)`,
            color: copied ? '#065F46' : `var(--text-secondary)`,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            transition: 'all .2s',
          }}
        >
          {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy link</>}
        </button>
      </div>
    </div>
  );
}

// ─── Client Notification Bell ─────────────────────────────────────────────────
function ClientNotificationBell({ notifications = [], onMarkRead, ac }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.read);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Bell size={18} color={unread.length > 0 ? ac : `var(--text-secondary)`} fill={unread.length > 0 ? ac : 'none'} />
        {unread.length > 0 && (
          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread.length > 9 ? '9+' : unread.length}
          </div>
        )}
      </button>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 48, width: 340, maxHeight: 400, overflowY: 'auto', background: '#fff', borderRadius: 18, border: '1.5px solid var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 1000 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Notifications</div>
            {unread.length > 0 && <button onClick={() => { notifications.forEach(n => !n.read && onMarkRead?.(n.id)); setOpen(false); }} style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: ac, cursor: 'pointer' }}>Mark all read</button>}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: `var(--text-secondary)`, fontSize: 13 }}>No notifications yet</div>
          ) : (
            notifications.slice(0, 20).map(n => (
              <div key={n.id} onClick={() => onMarkRead?.(n.id)} style={{ padding: '14px 20px', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', gap: 12, alignItems: 'flex-start', background: n.read ? '#fff' : '#FAFAF7', cursor: 'pointer', transition: 'background .15s' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? `var(--border-color)` : ac, marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, color: `var(--accent-secondary)`, lineHeight: 1.4, fontWeight: n.read ? 500 : 700 }}>{n.msg}</div>
                  <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 4 }}>
                    {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Push Notification Bell ───────────────────────────────────────────────────
function PushNotificationBell({ ac }) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [tooltip, setTooltip] = useState(false);

  const handleClick = async () => {
    if (permission === 'granted') return;
    if (permission === 'denied') {
      setTooltip(true);
      setTimeout(() => setTooltip(false), 3000);
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      new Notification('Westline Future Portal', {
        body: "You'll be notified when your project updates.",
        icon: '/favicon.ico',
      });
    }
  };

  const tooltipText =
    permission === 'granted' ? 'Notifications enabled' :
    permission === 'denied' ? 'Notifications blocked in browser settings' :
    'Enable project notifications';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleClick}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        title={tooltipText}
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,.08)', border: 'none',
          cursor: permission === 'granted' ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .2s',
          color: permission === 'granted' ? ac : 'rgba(255,255,255,.6)',
        }}
      >
        {permission === 'denied'
          ? <BellOff size={17} />
          : permission === 'granted'
            ? <Bell size={17} fill={ac} />
            : <Bell size={17} />
        }
      </button>
      {tooltip && (
        <div style={{
          position: 'absolute', right: 0, top: '110%', marginTop: 4,
          background: `var(--accent-secondary)`, color: '#fff', fontSize: 11, fontWeight: 600,
          padding: '6px 12px', borderRadius: 10, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,.3)', zIndex: 200,
          border: '1px solid rgba(255,255,255,.1)',
        }}>
          {tooltipText}
        </div>
      )}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, isSelected, onClick }) {
  const stg = CLIENT_PROJECT_STAGES.find(s => s.id === project.stageId);
  const pt = PROJECT_TYPES[project.projectType];

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '20px 24px',
        borderRadius: 20, border: `2px solid ${isSelected ? AC : `var(--border-color)`}`,
        background: isSelected ? `${AC}08` : '#fff',
        cursor: 'pointer', transition: 'all .25s',
        boxShadow: isSelected ? `0 8px 24px ${AC}18` : '0 2px 8px rgba(0,0,0,.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)`, lineHeight: 1.3, marginBottom: 4 }}>{project.title}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: `var(--text-secondary)` }}>{pt?.label || 'Full Service'}</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: stg?.color || AC, background: `${stg?.color || AC}15`, padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {stg?.short || 'Stage 1'}
        </div>
      </div>
      <div style={{ height: 4, background: `var(--border-color)`, borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${stg?.pct || 5}%`, background: stg?.color || AC, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: `var(--text-secondary)`, fontWeight: 600 }}>
        <span>{stg?.pct || 5}% complete</span>
        {project.budget && <span>Budget: GHS {Number(project.budget).toLocaleString()}</span>}
      </div>
    </button>
  );
}

// ─── Project Header Card ──────────────────────────────────────────────────────
function ProjectHeaderCard({ project, isMobile, ac, brand }) {
  const budget = Number(project.budget) || 0;

  // Use paidAmount from project doc if set (logged by admin), else 0
  const paid = budget > 0 ? Math.min(budget, Number(project.paidAmount) || 0) : 0;
  const paidPct = budget > 0 ? Math.min(100, (paid / budget) * 100) : 0;
  const outstanding = budget > 0 ? budget - paid : 0;

  const startDate = project.createdAt?.seconds
    ? new Date(project.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : project.createdAt
      ? new Date(project.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Recently';

  const stageTotal = CLIENT_PROJECT_STAGES.length;
  const progressPct = Math.round(((project.stageId || 1) / stageTotal) * 100);

  const waPhone = (brand?.phone || '').replace(/\D/g, '') || '233598455012';
  const waMsg = encodeURIComponent(`Hi, I'm checking on my project: ${project.title}`);
  const waLink = `https://wa.me/${waPhone}?text=${waMsg}`;

  return (
    <div style={{ background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)', overflow: 'hidden' }}>

      {/* Header row */}
      <div style={{ padding: isMobile ? '20px 18px 16px' : '24px 28px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: ac, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
              {PROJECT_TYPES[project.projectType]?.label || 'Full Service'} Project
            </div>
            <div style={{ fontSize: isMobile ? 19 : 23, fontWeight: 900, color: `var(--accent-secondary)`, lineHeight: 1.25 }}>{project.title}</div>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 800, flexShrink: 0,
            color: project.status === 'Completed' ? '#16A34A' : project.status === 'On Hold' ? '#D97706' : `var(--accent-primary)`,
            background: project.status === 'Completed' ? '#F0FDF4' : project.status === 'On Hold' ? '#FFFBEB' : '#FDFAF6',
            padding: '5px 12px', borderRadius: 20,
            border: `1px solid ${project.status === 'Completed' ? '#DCFCE7' : project.status === 'On Hold' ? '#FDE68A' : 'rgba(200,169,110,0.2)'}`,
            letterSpacing: '.04em',
          }}>
            {project.status || 'Active'}
          </div>
        </div>

        {project.description && (
          <div style={{ fontSize: 14, color: `var(--text-secondary)`, lineHeight: 1.6, marginBottom: 14 }}>
            {project.description}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: `var(--text-secondary)`, marginBottom: 6 }}>
            <span>Stage {project.stageId || 1} of {stageTotal}</span>
            <span>{progressPct}% complete</span>
          </div>
          <div style={{ height: 6, background: `var(--border-color)`, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg, ${ac}, ${ac}CC)`, borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
        </div>

        {/* Key stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 10 : 16 }}>
          <div style={{ background: `var(--bg-secondary)`, borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 16px' }}>
            <div style={{ fontSize: 10, color: `var(--text-secondary)`, fontWeight: 700, marginBottom: 4 }}>Started</div>
            <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{startDate}</div>
          </div>
          {budget > 0 ? (
            <div style={{ background: `var(--bg-secondary)`, borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 16px' }}>
              <div style={{ fontSize: 10, color: `var(--text-secondary)`, fontWeight: 700, marginBottom: 4 }}>Project Value</div>
              <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: `var(--accent-secondary)` }}>GHS {Number(budget).toLocaleString()}</div>
            </div>
          ) : (
            <div style={{ background: `var(--bg-secondary)`, borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 16px' }}>
              <div style={{ fontSize: 10, color: `var(--text-secondary)`, fontWeight: 700, marginBottom: 4 }}>Type</div>
              <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{PROJECT_TYPES[project.projectType]?.label || 'Full Service'}</div>
            </div>
          )}
          <div style={{ background: `var(--bg-secondary)`, borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 16px' }}>
            <div style={{ fontSize: 10, color: `var(--text-secondary)`, fontWeight: 700, marginBottom: 4 }}>Days In</div>
            <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: `var(--accent-secondary)` }}>
              {project.createdAt
                ? `${Math.max(1, daysSince(project.createdAt))} days`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Payment summary strip — only when budget is known */}
      {budget > 0 && (
        <div style={{ borderTop: '1px solid var(--border-color)', padding: isMobile ? '14px 18px' : '16px 28px', background: '#FAFAF9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: `var(--text-secondary)` }}>Payment progress</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: `var(--accent-secondary)` }}>{paidPct}% paid</span>
          </div>
          <div style={{ height: 8, background: '#EDE8E3', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', width: `${paidPct}%`, background: paidPct === 100 ? '#16A34A' : ac, borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>
              ✓ GHS {paid.toLocaleString()} paid
            </div>
            {outstanding > 0 && (
              <div style={{ fontSize: 11, color: '#D97706', fontWeight: 700 }}>
                GHS {outstanding.toLocaleString()} remaining
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── App Install Guide Modal ──────────────────────────────────────────────────
function AppInstallGuideModal({ onDismiss, ac }) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/.test(navigator.userAgent);
  
  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(92, 58, 33,.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: '#fff', borderRadius: 24, padding: '32px 28px',
          boxShadow: '0 24px 80px rgba(0,0,0,.25)',
          textAlign: 'center', position: 'relative'
        }}
      >
        <button onClick={onDismiss} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${ac}15`, color: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 12 }}>Install Our App</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          Get instant access to your project updates by adding our portal to your home screen. It works just like a native app!
        </div>
        
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: '16px', textAlign: 'left', marginBottom: 24 }}>
          {isIOS ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: 8 }}>For iPhone/iPad:</div>
              <ol style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Tap the <strong>Share</strong> button at the bottom of Safari (looks like a square with an arrow pointing up).</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong> in the top right corner.</li>
              </ol>
            </>
          ) : isAndroid ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: 8 }}>For Android:</div>
              <ol style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Tap the <strong>Menu</strong> icon (3 dots in upper right-hand corner).</li>
                <li>Tap <strong>Add to Home Screen</strong>.</li>
                <li>Follow the onscreen instructions to add it.</li>
              </ol>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: 8 }}>For Desktop/Other:</div>
              <ul style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Look for an install icon in your browser's address bar.</li>
                <li>Or, find the <strong>Install</strong> option in your browser's menu.</li>
              </ul>
            </>
          )}
        </div>
        
        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: ac, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
            transition: 'background .2s'
          }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

// ─── Main ClientPortal ────────────────────────────────────────────────────────
export default function ClientPortal({ client, onLogout, updateClientProfile, ...props }) {
  const user = props.user || client;
  const ac = props.brand?.color || AC;

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');

  // Mobile detection — use UA (catches "Request Desktop Site" on iOS) + viewport width
  const detectMobile = () => {
    const ua = navigator.userAgent || navigator.vendor || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    return isMobileUA || window.innerWidth < 900;
  };
  const [isMobile, setIsMobile] = useState(detectMobile);
  useEffect(() => {
    const handler = () => setIsMobile(detectMobile());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Change request modal
  const [showChangeRequest, setShowChangeRequest] = useState(false);

  // App Install Guide Modal logic
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  useEffect(() => {
    // Check if the user is running the app as a PWA already
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    // Check local storage to ensure we only show it once
    const hasSeenGuide = localStorage.getItem('hasSeenInstallGuide');
    if (!hasSeenGuide && user) {
      // Delay showing it briefly so the UI loads first
      const timer = setTimeout(() => {
        setShowInstallGuide(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const dismissInstallGuide = () => {
    localStorage.setItem('hasSeenInstallGuide', 'true');
    setShowInstallGuide(false);
  };

  // Review modal state
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // In-app notification toast
  const [notifToast, setNotifToast] = useState(null);
  const prevNotifCount = useRef(0);
  useEffect(() => {
    const notifs = props.userNotifications || [];
    const unread = notifs.filter(n => !n.read).length;
    if (unread > prevNotifCount.current && prevNotifCount.current > 0) {
      const latest = notifs.find(n => !n.read);
      if (latest) setNotifToast(latest.msg);
    }
    prevNotifCount.current = unread;
  }, [props.userNotifications]);

  const [projectsError, setProjectsError] = useState(null);

  // Subscribe to projects for this client.
  // We skip orderBy to avoid needing a composite index (sort in JS instead).
  // We try multiple possible clientId formats via 'in' to handle any phone format mismatch.
  useEffect(() => {
    if (!db || !user) { setLoadingProjects(false); return; }

    // Build a de-duped list of every possible ID this client might be stored under
    const rawPhone = user.phone || '';
    const normalised = rawPhone.replace(/\D/g, '');
    const candidates = [...new Set([
      user.id,
      user.uid,
      user.phone,
      normalised,
      normalised.startsWith('0') && normalised.length === 10 ? '233' + normalised.slice(1) : null,
      normalised.startsWith('233') ? normalised : null,
      normalised.length === 9 ? '233' + normalised : null,
    ].filter(Boolean))].slice(0, 10); // Firestore 'in' supports max 10 values

    if (candidates.length === 0) { setLoadingProjects(false); return; }

    const q = query(
      collection(db, 'projects'),
      where('clientIds', 'array-contains-any', candidates),
      limit(50)
    );
    const unsub = onSnapshot(q,
      snap => {
        const mine = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ta = a.createdAt?.seconds ?? (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
            const tb = b.createdAt?.seconds ?? (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
            return tb - ta;
          });
        setProjects(mine);
        setProjectsError(null);
        if (mine.length > 0 && !selectedId) setSelectedId(mine[0].id);
        setLoadingProjects(false);
      },
      err => {
        console.error('[ClientPortal] projects query failed:', err.code, err.message);
        setProjectsError(err.code || 'query-failed');
        setLoadingProjects(false);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.uid, user?.phone]);

  const selected = projects.find(p => p.id === selectedId);
  const activeCount = projects.filter(p => p.status !== 'Completed').length;
  const completedCount = projects.filter(p => p.status === 'Completed').length;

  // Auto-show review modal for completed projects
  const showReviewModal =
    selected &&
    selected.stageId === 8 &&
    !reviewDismissed &&
    !reviewSubmitted;

  const tabs = [
    { id: 'timeline',  label: 'Progress',  icon: <CheckCircle2 size={14} /> },
    { id: 'design',    label: 'Design Vault', icon: <PenTool size={14} /> },
    { id: 'approvals', label: 'Approvals', icon: <FileText size={14} /> },
    { id: 'photos',    label: 'Photos',    icon: <Camera size={14} /> },
    { id: 'payments',  label: 'Payments',  icon: <CreditCard size={14} /> },
    { id: 'addons',    label: 'Add-ons', icon: <Gift size={14} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={14} /> },
    { id: 'messages',  label: 'Messages',  icon: <MessageSquare size={14} /> },
  ];

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  return (
    <div style={{ minHeight: '100dvh', background: isMobile ? '#EDEAE6' : '#F8F6F3', fontFamily: 'Inter, Satoshi, sans-serif', overscrollBehavior: 'contain' }}>

      {/* ── NOTIFICATION TOAST ── */}
      {notifToast && (
        <div onClick={() => setNotifToast(null)} style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9998,
          background: `var(--accent-secondary)`, color: '#fff', padding: '14px 20px',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer',
          maxWidth: 360, animation: 'slideInRight .3s ease',
          borderLeft: `4px solid ${ac}`,
        }}>
          <Bell size={16} color={ac} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: ac, marginBottom: 2 }}>New Update</div>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>{notifToast}</div>
          </div>
          <div style={{ marginLeft: 'auto', opacity: 0.5 }}>✕</div>
        </div>
      )}

      {/* ── APP INSTALL GUIDE MODAL ── */}
      {showInstallGuide && <AppInstallGuideModal onDismiss={dismissInstallGuide} ac={ac} />}

      {isMobile ? (
        /* ── MOBILE: HERO APP HEADER (dark banner + greeting, non-sticky so it scrolls away) ── */
        <div style={{ background: `var(--accent-secondary)`, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div style={{ height: 52, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {props.brand?.logo && (
                <img src={props.brand.logo} style={{ height: 36, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} alt="Logo" onError={e => { e.target.style.display = 'none'; }} />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ClientNotificationBell notifications={props.userNotifications || []} onMarkRead={props.markNotificationRead} ac={ac} />
              <PushNotificationBell ac={ac} />
              <button onClick={handleLogout} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.1)', borderRadius: 12, border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.65)', touchAction: 'manipulation', flexShrink: 0 }}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
          <div style={{ padding: '4px 20px 32px' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-.02em' }}>
              Hey {(user?.name || 'there').split(' ')[0]} 👋
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>
              {loadingProjects ? 'Loading your projects…' : projects.length === 0
                ? 'No projects yet — contact our team'
                : `${activeCount} active project${activeCount !== 1 ? 's' : ''}${completedCount > 0 ? ` · ${completedCount} completed` : ''}`}
            </div>
          </div>
          <div style={{ height: 26, background: '#EDEAE6', borderRadius: '24px 24px 0 0' }} />
        </div>
      ) : (
        /* ── DESKTOP: STICKY TOP NAV ── */
        <div style={{
          background: `var(--accent-secondary)`, padding: '0 24px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {props.brand?.logo && (
              <img src={props.brand.logo} style={{ height: 40, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} alt="Logo" onError={e => { e.target.style.display = 'none'; }} />
            )}
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', fontWeight: 300 }}>|</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>Client Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ClientNotificationBell notifications={props.userNotifications || []} onMarkRead={props.markNotificationRead} ac={ac} />
            <PushNotificationBell ac={ac} />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{user?.name || 'Client'}</div>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: isMobile ? '100%' : 1200, margin: '0 auto', padding: isMobile ? '0 16px' : '32px 24px' }}>

        {/* ── DESKTOP WELCOME HEADER ── */}
        {!isMobile && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 6 }}>
              Welcome back, {(user?.name || 'there').split(' ')[0]} 👋
            </div>
            <div style={{ fontSize: 15, color: `var(--text-secondary)`, marginBottom: 20 }}>
              {loadingProjects ? 'Loading your projects...' : projects.length === 0
                ? 'You have no active projects yet. Speak to our team to get started.'
                : `${activeCount} active project${activeCount !== 1 ? 's' : ''}${completedCount > 0 ? ` · ${completedCount} completed` : ''}`}
            </div>
            {user && !loadingProjects && projects.length > 0 && <ReferralCard user={user} ac={ac} />}
          </div>
        )}

        {/* ── MOBILE REFERRAL CARD ── */}
        {isMobile && user && !loadingProjects && projects.length > 0 && (
          <div style={{ marginBottom: 16, marginTop: 4 }}>
            <ReferralCard user={user} ac={ac} />
          </div>
        )}

        {loadingProjects ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: isMobile ? 16 : 0 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: i === 1 ? 140 : 80, borderRadius: isMobile ? 24 : 20, background: '#fff', animation: 'pulse 1.5s infinite', animationDelay: `${i * 0.15}s`, boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,.06)' : 'none' }} />
            ))}
          </div>
        ) : projectsError ? (
          <div style={{ padding: isMobile ? '48px 24px' : '80px 40px', textAlign: 'center', background: '#fff', borderRadius: 24, boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : 'none', marginTop: isMobile ? 8 : 0 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 8 }}>Couldn't load your projects</div>
            <div style={{ fontSize: 13, color: `var(--text-secondary)`, marginBottom: 24, lineHeight: 1.6 }}>
              There was a connection issue. Please refresh the page or contact our team.
            </div>
            <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: `var(--accent-secondary)`, color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: isMobile ? '60px 28px' : '80px 40px', textAlign: 'center', background: '#fff', borderRadius: isMobile ? 24 : 24, border: isMobile ? 'none' : '1.5px dashed var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : 'none', marginTop: isMobile ? 8 : 0 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 8 }}>No projects yet</div>
            <div style={{ fontSize: 14, color: `var(--text-secondary)`, marginBottom: 24, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 24px' }}>
              Once your account manager creates a project for you, it will appear here with real-time updates.
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: ac, background: `${ac}10`, padding: '12px 24px', borderRadius: 14, border: `1.5px solid ${ac}30` }}>
              Contact us: {props.brand?.phone || '+233 59 845 5012'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: (isMobile || projects.length === 1) ? '1fr' : '320px 1fr', gap: isMobile ? 16 : 24, alignItems: 'start' }}>

            {/* LEFT — Project List (desktop) / Chip row (mobile) */}
            {projects.length > 1 && (
              isMobile ? (
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4, marginBottom: 4 }}>
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedId(p.id); setActiveTab('timeline'); }}
                      style={{
                        flexShrink: 0, padding: '8px 16px', borderRadius: 20,
                        border: `2px solid ${p.id === selectedId ? ac : `var(--border-color)`}`,
                        background: p.id === selectedId ? `${ac}15` : '#fff',
                        color: p.id === selectedId ? `var(--accent-secondary)` : `var(--text-secondary)`,
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        whiteSpace: 'nowrap', minHeight: 44, touchAction: 'manipulation',
                      }}
                    >
                      {p.title || 'Project'}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Your Projects</div>
                  {projects.map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      isSelected={p.id === selectedId}
                      onClick={() => { setSelectedId(p.id); setActiveTab('timeline'); }}
                    />
                  ))}
                </div>
              )
            )}

            {/* RIGHT — Selected Project Detail */}
            {selected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Project header card */}
                <ProjectHeaderCard project={selected} isMobile={isMobile} ac={ac} brand={props.brand} />

                <ClientNextActionCard
                  project={selected}
                  invoices={props.invoices || []}
                  renderingPackages={props.renderingPackages || []}
                  addOns={props.addOns || []}
                  setActiveTab={setActiveTab}
                  isMobile={isMobile}
                />

                {/* Tabs — desktop only; mobile uses bottom dock */}
                {!isMobile && (
                  <div style={{ display: 'flex', gap: 4, background: '#fff', padding: 5, borderRadius: 16, border: '1px solid var(--border-color)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {tabs.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                          height: 38, padding: '0 16px', borderRadius: 12, border: 'none',
                          background: activeTab === t.id ? `var(--accent-secondary)` : 'transparent',
                          color: activeTab === t.id ? '#fff' : `var(--text-secondary)`,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 7,
                          transition: 'all .2s', flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.icon}{t.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── TIMELINE TAB ── */}
                {activeTab === 'timeline' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {selected.quoteApproved && (
                      <div style={{
                        padding: '20px 24px', borderRadius: 20,
                        background: 'linear-gradient(135deg, #FDFBF7, #F4EFE6)',
                        border: '1.5px solid #C5A88060', marginBottom: 4,
                        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        justifyContent: 'space-between', gap: 16
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#C5A88020', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={20} color="#8C6C52" />
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#8C6C52', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Contract Executed</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: '#4A3B32' }}>Fabrication & Installation Agreement</div>
                            <div style={{ fontSize: 11, color: '#716259', marginTop: 2 }}>
                              Signed electronically via SMS OTP on {selected.quoteSignedAt
                                ? (() => {
                                    const d = selected.quoteSignedAt?.toDate ? selected.quoteSignedAt.toDate() : new Date(selected.quoteSignedAt);
                                    return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                  })()
                                : '—'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => printSignedContractDoc(selected, user, props.brand)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '10px 20px', borderRadius: 10, border: '1px solid #8C6C52',
                            background: 'transparent', color: '#4A3B32',
                            fontSize: 13, fontWeight: 800, cursor: 'pointer',
                            transition: 'all .2s',
                            alignSelf: isMobile ? 'stretch' : 'auto',
                            textAlign: 'center', justifyContent: 'center'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = '#8C6C52'; e.currentTarget.style.color = '#fff'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4A3B32'; }}
                        >
                          <Download size={14} /> Download Contract (PDF)
                        </button>
                      </div>
                    )}
                    <StageActionCard
                      project={selected}
                      user={user}
                      approveQuote={props.approveQuote}
                      payInvoice={props.payInvoice}
                      updateProjectStage={props.updateProjectStage}
                    />
                    <InstallationStatusCard project={selected} />
                    <ShippingTrackerCard project={selected} />
                    <div style={{ padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 20 }}>Project Timeline</div>
                      <StageTimeline
                        project={selected}
                        onRequestChange={() => setShowChangeRequest(true)}
                        isMobile={isMobile}
                      />

                      {/* Activity log */}
                      {(selected.stageHistory || []).length > 1 && (
                        <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 16 }}>Activity Log</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[...(selected.stageHistory || [])].reverse().map((h, idx) => {
                              const s = CLIENT_PROJECT_STAGES.find(st => st.id === h.stageId);
                              return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: `var(--bg-secondary)`, borderRadius: 12 }}>
                                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${s?.color || AC}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s?.color || AC, flexShrink: 0 }}>
                                    {STAGE_ICONS[h.stageId] || <CheckCircle2 size={14} />}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)` }}>{s?.name || `Stage ${h.stageId}`}</div>
                                    <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>
                                      {h.timestamp
                                        ? (() => {
                                            const d = h.timestamp?.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
                                            return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                          })()
                                        : ''}
                                    </div>
                                    {h.note && <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 2, fontStyle: 'italic' }}>{h.note}</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── DESIGN VAULT TAB ── */}
                {activeTab === 'design' && (
                  <ClientRenderingVault
                    project={selected}
                    brand={props.brand}
                    renderingPackages={props.renderingPackages || []}
                    invoices={props.invoices || []}
                  />
                )}

                {/* ── APPROVALS TAB ── */}
                {activeTab === 'approvals' && (
                  <ClientApprovalsTab
                    project={selected}
                    invoices={props.invoices || []}
                    approveQuote={props.approveQuote}
                    brand={props.brand}
                    user={user}
                    isMobile={isMobile}
                  />
                )}

                {/* ── PHOTOS TAB ── */}
                {activeTab === 'photos' && (
                  <div style={{ padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 20 }}>Site Photos</div>
                    <PhotoFeed projectId={selected.id} />
                  </div>
                )}

                {/* ── PAYMENTS TAB ── */}
                {activeTab === 'payments' && (
                  <PaymentsTab
                    project={selected}
                    user={user}
                    transactions={props.transactions}
                    invoices={props.invoices}
                    formatPrice={props.formatPrice}
                    brand={props.brand}
                    isMobile={isMobile}
                  />
                )}

                {/* ── ADD-ONS TAB ── */}
                {activeTab === 'addons' && (
                  <ClientAddOnsTab
                    project={selected}
                    addOns={props.addOns || []}
                    invoices={props.invoices || []}
                    user={user}
                    isMobile={isMobile}
                  />
                )}

                {/* ── DOCUMENTS TAB ── */}
                {activeTab === 'documents' && (
                  <div style={{ padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 20 }}>Project Documents</div>
                    <DocumentsTab projectId={selected.id} />
                  </div>
                )}

                {/* ── MESSAGES TAB ── */}
                {activeTab === 'messages' && (
                  <div style={{
                    padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff',
                    borderRadius: isMobile ? 24 : 20,
                    border: isMobile ? 'none' : '1px solid var(--border-color)',
                    boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)',
                    height: isMobile ? 'calc(100dvh - 320px)' : 560,
                    minHeight: isMobile ? 320 : undefined,
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 16, flexShrink: 0 }}>Messages</div>
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <WorldClassChat
                        project={selected}
                        user={user}
                        accentColor={selected?.brandColor || 'var(--accent-secondary)'}
                        addProjectMessage={props.addProjectMessage}
                        isAdmin={false}
                        height="100%"
                      />
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>

      {/* ── BOTTOM DOCK — iOS-style frosted tab bar (mobile only) ── */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: 'rgba(250,248,245,0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderTop: '1px solid rgba(200,190,180,0.25)',
          paddingTop: 10,
          paddingBottom: 'max(18px, env(safe-area-inset-bottom, 18px))',
          display: 'flex',
        }}>
          {[
            { id: 'timeline',  label: 'Progress',  icon: CheckCircle2 },
            { id: 'design',    label: 'Design',    icon: PenTool },
            { id: 'approvals', label: 'Approve',   icon: FileText },
            { id: 'payments',  label: 'Payments',  icon: CreditCard },
            { id: 'addons',    label: 'Add-ons',   icon: Gift },
            { id: 'messages',  label: 'Messages',  icon: MessageSquare },
          ].map(t => {
            const active = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => selected && setActiveTab(t.id)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '2px 4px 0', touchAction: 'manipulation', minHeight: 48,
                  opacity: selected ? 1 : 0.4,
                }}
              >
                <div style={{
                  width: 48, height: 32, borderRadius: 16,
                  background: active ? `${ac}20` : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .18s',
                }}>
                  <Icon size={22} strokeWidth={active ? 2.2 : 1.7} color={active ? ac : '#8E8880'} />
                </div>
                <span style={{
                  fontSize: 10, fontWeight: active ? 700 : 500,
                  color: active ? ac : '#8E8880',
                  transition: 'color .18s',
                  letterSpacing: '-.01em',
                }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom spacer for dock */}
      <div style={{ height: isMobile ? 90 : 40 }} />

      {/* ── CHANGE REQUEST MODAL ── */}
      {showChangeRequest && selected && (
        <ChangeRequestModal
          project={selected}
          user={user}
          onClose={() => setShowChangeRequest(false)}
        />
      )}

      {/* ── REVIEW MODAL ── */}
      {showReviewModal && (
        <ReviewModal
          project={selected}
          user={user}
          onSubmit={async (data) => {
            if (props.submitTestimonial) await props.submitTestimonial(data);
            setReviewSubmitted(true);
          }}
          onDismiss={() => setReviewDismissed(true)}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        ::-webkit-scrollbar { display: none; }
        * { -webkit-tap-highlight-color: transparent; }
        html { scroll-behavior: smooth; }
        body { overscroll-behavior: contain; }
      `}</style>
    </div>
  );
}
