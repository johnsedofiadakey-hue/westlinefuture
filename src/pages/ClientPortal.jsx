import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { translateClientDom } from '../lib/clientI18n';
import {
  LogOut, ChevronRight, Send, MessageSquare, FileText,
  DollarSign, CheckCircle2, Circle, Clock, Loader2,
  Star, AlertCircle, Bell, BellOff, User, Briefcase, Home,
  Search, Palette, CreditCard, Factory, Anchor, Globe,
  Truck, Wrench, ShoppingCart, ArrowRight, Lock,
  Download, File, Image, Archive, Package, Camera,
  X, Copy, Check, RefreshCw, Gift, Edit3, ChevronDown,
  ZoomIn, ScanSearch, PenTool, Printer, FileCheck, PenLine, ShieldCheck, Award, Map as MapIcon, HelpCircle, Calendar
} from 'lucide-react';
import { CLIENT_PROJECT_STAGES, PROJECT_TYPES } from '../data';
import { calculateTimeline, minimumAppointmentDateTime } from './sharedHelpers';
import { db, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  collection, onSnapshot, query, where, orderBy, limit, addDoc, serverTimestamp,
  updateDoc, doc
} from 'firebase/firestore';
import ClientRenderingVault from '../components/ClientRenderingVault';
import UnifiedPaymentGateway from '../components/UnifiedPaymentGateway';
import WorldClassChat from '../components/WorldClassChat';
import InvoiceDocument from '../components/InvoiceDocument';
import ClientUploadsTab from '../components/ClientUploadsTab';
import SecureVault from '../components/SecureVault';
import { clientPortalGateState, deriveWorkflowStep, workflowProgress, WORKFLOW_STEP } from '../lib/projectWorkflow';
import PortalRefreshButton from '../components/PortalRefreshButton';

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
    label: 'Standard (60/30/10)',
    milestones: [
      { key: 'initial-deposit',          label: '60% Initial Project Deposit',           pct: 0.60, cumPct: 0.60 },
      { key: 'production-balance',       label: '30% Production Balance',                pct: 0.30, cumPct: 0.90 },
      { key: 'pre-installation-balance', label: '10% Final Arrival Balance (Ghana)',     pct: 0.10, cumPct: 1.00 },
    ],
  },
  '50-50': {
    label: '50/50 (Deposit / Delivery)',
    milestones: [
      { key: 'deposit',     label: '50% Deposit',        pct: 0.50, cumPct: 0.50 },
      { key: 'completion',  label: '50% After Delivery', pct: 0.50, cumPct: 1.00 },
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

// Canonical paid-status check — handles "Paid", "paid", "Paid in Full", "paid in full"
const isPaidStatus = (status) => ['paid', 'paid in full'].includes(String(status || '').toLowerCase().trim());
const isInitialProjectDepositInvoice = (invoice) => {
  const descriptor = `${invoice?.title || ''} ${invoice?.type || ''} ${invoice?.documentKind || ''}`.toLowerCase();
  return ['initial-deposit', 'post-rendering'].includes(invoice?.milestoneKey)
    || descriptor.includes('deposit')
    || descriptor.includes('first instalment')
    || descriptor.includes('first installment');
};

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
  const isPaid = isPaidStatus(invoice.status);
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
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:20px;margin-bottom:32px;padding:24px;border-radius:12px;background:${theme.primary};color:${theme.bg};">
      <div style="display:flex;align-items:center;gap:20px;">
        <div style="background:rgba(255,255,255,0.1);padding:12px;border-radius:8px;">
          ${logoHtml.replace(`color:${theme.primary}`, `color:${theme.bg}`).replace(`color:${theme.secondary}`, `color:${theme.accent}`)}
        </div>
        <div>
          <div style="font-size:18px;font-weight:800;color:${theme.bg};letter-spacing:1px;text-transform:uppercase;">${co}</div>
          <div style="font-size:10px;color:${theme.accent};margin-top:2px;letter-spacing:1px;text-transform:uppercase;">${addr}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:24px;font-weight:400;letter-spacing:1px;text-transform:uppercase;color:${theme.bg};margin-bottom:6px;">CONTRACT AGREEMENT</div>
        <div style="display:inline-block;background:#16A34A;color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:1px;">STATUS: SIGNED & SECURED</div>
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
      <div style="font-size:14px;font-weight:800;color:${theme.primary};text-transform:uppercase;">${project.title || 'Premium Architectural Project'}</div>
      <div style="font-size:12px;color:${theme.textMuted};margin-top:4px;"><strong>Details:</strong> ${project.description || 'Project execution and delivery as outlined in the accepted quotation.'}</div>
      <div style="font-size:12px;color:${theme.textMuted};margin-top:4px;">Target Completion Date: <strong>${estCompletion}</strong></div>
    </div>

    <h2>Contractual Conditions</h2>
    ${project.contractTerms ? 
      `<div style="font-size:12px;color:${theme.textMuted};line-height:1.6;margin-bottom:10px;">${project.contractTerms.replace(/\\n/g, '<br/>')}</div>` 
      : 
      `<ol>
        <li><strong>Scope of Work:</strong> Contractor agrees to manufacture, fabricate, supply, and install custom high-end premium products in accordance with final approved technical designs in the design vault and the details specified above.</li>
        <li><strong>Payment Terms:</strong> Works shall commence upon execution of this contract and clearance of the mobilisation deposit as stated in the payment plan. ${(() => {
              const schedKey = project.paymentSchedule || 'standard';
              const sched = SCHEDULE_CONFIGS[schedKey] || SCHEDULE_CONFIGS.standard;
              if (sched.milestones && sched.milestones.length > 0) {
                const lines = sched.milestones.map(m => {
                  const amt = budget > 0 ? ` (GHS ${(budget * m.pct).toLocaleString(undefined, { minimumFractionDigits: 2 })})` : ` (${Math.round(m.pct * 100)}% of contract value)`;
                  return `${m.label}${amt}`;
                });
                return `Payment schedule: ${lines.join('; ')}.`;
              }
              return 'All milestone payments are due as per the agreed schedule.';
            })()} No installation works shall commence if any preceding milestone payment remains outstanding.</li>
        <li><strong>Installation and Access:</strong> The Client shall provide adequate, safe, and clean working space for the Contractor's installers on the site. All field inspections are geo-fenced and locked to site coordinates for absolute quality assurance.</li>
        <li><strong>Warranty Policy:</strong> Contractor provides a 12-month limited warranty on the structural alignment and architectural grade silicone sealant components. Glass breakage due to external physical impact, force majeure, or site modifications after handover is excluded.</li>
        <li><strong>Governing Law:</strong> This agreement and all subsequent performance evaluations are governed by the laws of the Republic of Ghana.</li>
      </ol>`
    }

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
      <div style="display:flex;flex-direction:column;justify-content:space-between;padding:16px;border:1px solid ${theme.accent}60;border-radius:8px;background:${theme.surface}30;">
        <div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${theme.secondary};font-weight:800;margin-bottom:12px;">Contractor Sign-off</div>
          <div style="height:60px;margin-top:8px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;">
            <div style="font-family:'Georgia',serif;font-size:24px;font-style:italic;color:${theme.secondary};letter-spacing:2px;font-weight:bold;text-decoration:none;">${brand?.adminSignatureName || brand?.name || 'Westline Future'}</div>
          </div>
        </div>
        <div>
          <div style="font-size:13px;font-weight:800;color:${theme.primary};">Authorized Representative</div>
          <div style="font-size:11px;color:${theme.textMuted};margin-top:2px;">${brand?.name || 'Westline Future Ltd.'}</div>
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

// ─── Contract Variable Substitution ──────────────────────────────────────────
function applyContractVariables(template, project, user, brand) {
  const budget = Number(project?.budget || 0);
  const budgetStr = budget ? `GH₵ ${budget.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'As quoted';
  const completionDate = project?.targetCompletionDate
    ? (project.targetCompletionDate.seconds
        ? new Date(project.targetCompletionDate.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date(project.targetCompletionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
    : 'Pending Scheduling';
  return (template || '')
    .replace(/\{\{clientName\}\}/g,     user?.name || project?.clientName || 'Valued Client')
    .replace(/\{\{projectTitle\}\}/g,   project?.title || 'Your Project')
    .replace(/\{\{budget\}\}/g,         budgetStr)
    .replace(/\{\{company\}\}/g,        brand?.name || 'Westline Future')
    .replace(/\{\{date\}\}/g,           new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
    .replace(/\{\{completionDate\}\}/g, completionDate);
}

// ─── Typed Name → Signature Image ────────────────────────────────────────────
function nameToSignatureDataUrl(name, ac) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = 110;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 480, 110);
    ctx.font = 'italic 52px Georgia, "Times New Roman", serif';
    ctx.fillStyle = ac && !ac.startsWith('var') ? ac : '#1A1410';
    ctx.fillText(name, 16, 78);
    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

// ─── SpecApprovalCard ─────────────────────────────────────────────────────────
function SpecApprovalCard({ project, user, brand, isMobile, invoices = [] }) {
  const ac = brand?.color || AC;
  const spec = project?.specDoc;
  const [busy, setBusy] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [done, setDone] = useState(false);
  const [typedName, setTypedName] = useState(user?.name || '');
  const [documentAccepted, setDocumentAccepted] = useState(false);
  const [legalConsent, setLegalConsent] = useState(false);
  const [error, setError] = useState('');

  if (!spec?.url) return null;

  const specificationStageOpen = Number(project.stageId || 1) >= 2;

  if (!specificationStageOpen && !['signed', 'rejected'].includes(spec.status)) {
    return null;
  }

  const handleReject = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        'specDoc.status': 'rejected',
        'specDoc.reviewedAt': new Date().toISOString(),
        'specDoc.reviewNote': rejectNote.trim(),
        'specDoc.reviewedBy': user?.name || user?.phone || 'Client',
      });
      await addDoc(collection(db, 'projects', project.id, 'activityLogs'), {
        actor: 'client',
        actorName: user?.name || user?.phone || 'Client',
        actionType: 'spec_review',
        actionDescription: `requested changes to the project specification. Note: ${rejectNote.trim()}`,
        timestamp: serverTimestamp(),
      });
      setDone(true);
      setShowRejectBox(false);
    } catch (e) {
      console.error('[SpecApproval]', e);
      setError(e.message || 'Could not submit the change request.');
    }
    setBusy(false);
  };

  const handleSign = async () => {
    if (busy || !documentAccepted || !legalConsent || typedName.trim().length < 3) return;
    setBusy(true);
    setError('');
    try {
      const signSpecification = httpsCallable(functions, 'signProjectSpecification');
      await signSpecification({
        projectId: project.id,
        typedName: typedName.trim(),
        documentVersion: Number(spec.version || 1),
        documentAccepted: true,
        legalConsent: true,
      });
      setDone(true);
    } catch (e) {
      console.error('[SpecSignature]', e);
      setError(e?.message || 'Could not sign the project specification.');
    }
    setBusy(false);
  };

  if (done || spec.status === 'signed') {
    return (
      <div style={{ padding: '20px 24px', borderRadius: 20, background: '#F0FDF4', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <CheckCircle2 size={24} color="#16A34A" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#15803D' }}>Project Brief Signed</div>
          <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
            Signed by {spec.signedBy || typedName || 'Client'} · Version {Number(spec.version || 1)}. This approval cannot be revoked from the portal and remains available for comparison with the completed work.
          </div>
        </div>
        <a href={spec.url} target="_blank" rel="noreferrer" style={{ padding: '9px 15px', borderRadius: 10, background: '#15803D', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 800 }}>
          View Signed Agreement
        </a>
      </div>
    );
  }

  if (spec.status === 'rejected') {
    return (
      <div style={{ padding: '20px 24px', borderRadius: 20, background: '#FEF2F2', border: '1.5px solid #FECACA', display: 'flex', alignItems: 'center', gap: 14 }}>
        <AlertCircle size={24} color="#DC2626" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#DC2626' }}>Specification Under Review</div>
          <div style={{ fontSize: 12, color: '#7F1D1D', marginTop: 2 }}>You've raised concerns. Our team will review and update the document shortly.</div>
          {spec.reviewNote && <div style={{ fontSize: 11, color: '#991B1B', marginTop: 6, fontStyle: 'italic' }}>Your note: "{spec.reviewNote}"</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: isMobile ? '20px 18px' : '24px 28px', borderRadius: 20,
      background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
      border: '1.5px solid #BFDBFE',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <PenLine size={18} color="#1D4ED8" />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Signature Required
        </span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 6 }}>
        Review & Sign Project Brief
      </div>
      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
        This legally binding pre-production agreement includes the final drawings, bill of materials, quantities, specifications, scope, exclusions, deliverables, and production requirements. Review every section before signing.
      </div>

      <div style={{ padding: '13px 15px', borderRadius: 13, background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#7F1D1D', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 900, marginBottom: 5 }}>
          <AlertCircle size={17} /> Legally binding approval
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          Signing document version {Number(spec.version || 1)} authorises Westline Future to procure materials and begin production under the approved quotation and contract. Do not sign until the drawings, materials, quantities, specifications, deliverables, outcomes, and exclusions are correct.
        </div>
      </div>

      {/* Document link */}
      <a
        href={spec.url}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 12,
          background: '#1D4ED8', color: '#fff', textDecoration: 'none',
          fontSize: 13, fontWeight: 700, marginBottom: 20,
        }}
      >
        <FileText size={15} /> Review Full Document · Version {Number(spec.version || 1)}
      </a>

      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontSize: 12, lineHeight: 1.55, marginBottom: 16 }}>
        <strong>What happens next:</strong> Your quotation, contract, and initial payment are already complete. Signing confirms the final production scope and authorises procurement and production to begin.
      </div>

      {!showRejectBox ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {spec.status === 'approved' && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: 12 }}>
              Your previous approval is recorded. A formal signature is still required before procurement and production can begin.
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#374151', display: 'block', marginBottom: 6 }}>
              Full legal name
            </label>
            <input
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              placeholder="Enter your full legal name"
              disabled={busy}
              style={{ width: '100%', height: 44, borderRadius: 11, border: '1.5px solid #BFDBFE', padding: '0 13px', fontSize: 14, boxSizing: 'border-box', background: '#fff' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={documentAccepted}
              onChange={e => setDocumentAccepted(e.target.checked)}
              disabled={busy}
              style={{ marginTop: 3 }}
            />
            <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>
              I have opened and reviewed the complete document, including its final drawings, bill of materials, quantities, specifications, scope, exclusions, and deliverables.
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={legalConsent}
              onChange={e => setLegalConsent(e.target.checked)}
              disabled={busy}
              style={{ marginTop: 3 }}
            />
            <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>
              I understand that entering my legal name creates my electronic signature, is intended to be legally binding, and authorises Westline Future to procure materials and begin production under this approved document.
            </span>
          </label>
          {error && (
            <div style={{ padding: '9px 12px', borderRadius: 10, background: '#FEF2F2', color: '#B91C1C', fontSize: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
              onClick={handleSign}
              disabled={busy || !documentAccepted || !legalConsent || typedName.trim().length < 3}
              style={{ flex: 2, minWidth: 220, padding: '13px 20px', borderRadius: 12, border: 'none', background: '#16A34A', color: '#fff', fontSize: 14, fontWeight: 800, cursor: busy ? 'default' : 'pointer', opacity: busy || !documentAccepted || !legalConsent || typedName.trim().length < 3 ? 0.55 : 1 }}
          >
              {busy ? 'Signing…' : 'Sign Project Brief'}
          </button>
          <button
            onClick={() => setShowRejectBox(true)}
            disabled={busy}
            style={{ flex: 1, minWidth: 140, padding: '13px 20px', borderRadius: 12, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
          >
            Request Changes
          </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            placeholder="Describe what needs to change…"
            rows={3}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #FECACA', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setShowRejectBox(false); setRejectNote(''); }} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={handleReject}
              disabled={busy || !rejectNote.trim()}
              style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 800, cursor: busy || !rejectNote.trim() ? 'default' : 'pointer', opacity: busy || !rejectNote.trim() ? 0.6 : 1 }}
            >
              {busy ? 'Sending…' : 'Submit Change Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ContractAgreementModal ───────────────────────────────────────────────────
function ContractAgreementModal({ project, user, brand, onClose, onSigned, isMobile }) {
  const ac = brand?.color || AC;
  const [step, setStep] = useState(1); // 1=read, 2=sign
  const [scrolled, setScrolled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [drawMode, setDrawMode] = useState(false);
  const [drawnSig, setDrawnSig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Build contract body text
  const rawTemplate = project?.contractTerms || brand?.finSettings?.contractTemplate || '';
  const budget = Number(project?.budget || 0);

  const contractBody = rawTemplate
    ? applyContractVariables(rawTemplate, project, user, brand)
    : null; // null = use default clauses

  const defaultClauses = [
    {
      title: 'Engagement',
      text: `Westline Future Ltd. ("Contractor") and the Client agree to deliver <strong>${project?.title || '[Project Name]'}</strong> under the approved 3D rendering and negotiated quotation. After this contract is signed and the initial project payment is verified, Westline Future will issue the final drawings, bill of materials, scope, exclusions, and deliverables for the Client's production authorisation.`,
    },
    {
      title: 'Payment Terms',
      text: 'The approved quotation states the project price and payment schedule. The initial project payment becomes due after this contract is signed. Procurement and production begin only after that payment is verified and the final deliverables document is signed. The final goods balance is due after the goods arrive in Ghana and before release to site. Installation is billed separately as an approved add-on.',
    },
    {
      title: '3D Design Approval',
      text: 'The Client confirms that the approved 3D interior design rendered by Westline Future forms the binding design specification for this contract. Any alterations requested after design approval are subject to a formal change order and may incur additional costs and revised timelines.',
    },
    {
      title: 'Site Readiness & Access',
      text: 'The Client is responsible for ensuring the property is structurally complete and ready for interior works by the agreed commencement date. The Client shall provide unrestricted, safe site access to the Contractor\'s installation team on all agreed working days. Any delays caused by the Client\'s failure to provide site access will extend the project timeline accordingly.',
    },
    {
      title: 'Pre-Interior Works',
      text: 'Where electrical rewiring, plumbing modifications, or other pre-fitout civil works are required, the Client acknowledges that such works must be completed and signed off before interior installation commences. Westline Future coordinates trusted local partners for these works where requested, at separately agreed costs.',
    },
    {
      title: 'Material Sourcing & Delivery',
      text: 'Westline Future sources materials globally, primarily from China and the wider international market. Lead times for shipped items are estimated and subject to logistics factors outside the Contractor\'s control. The Contractor will keep the Client informed of any material delays and adjust timelines accordingly.',
    },
    {
      title: 'Warranty',
      text: 'Westline Future provides a 12-month limited workmanship warranty on all installed items, commencing from the date of project handover. The warranty covers defects in installation quality. It does not cover damage arising from misuse, unauthorised modifications, natural wear, or events outside the Contractor\'s control.',
    },
    {
      title: 'Change Requests',
      text: 'Any changes to the approved scope of work, materials, or design specifications must be submitted in writing by the Client. All change requests are subject to a formal change order, written approval, and may revise the contract value and/or timeline.',
    },
    {
      title: 'Confidentiality',
      text: 'Both parties agree to keep all project details, pricing, design drawings, and proprietary information confidential. Westline Future reserves the right to use project photos and details for portfolio and marketing purposes unless the Client requests otherwise in writing.',
    },
    {
      title: 'Governing Law',
      text: 'This agreement is governed exclusively by the laws of the Republic of Ghana. Any disputes arising from this contract shall first be resolved through good-faith negotiation. If unresolved within 30 days, disputes shall be referred to mediation before any legal proceedings are commenced.',
    },
  ];

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setScrolled(true);
  };

  const handleSign = async () => {
    if (busy) return;
    const name = typedName.trim();
    if (!name && !drawnSig) { setError('Please type your full name or draw your signature.'); return; }
    if (!accepted) { setError('Please tick the acceptance checkbox.'); return; }
    setBusy(true);
    setError(null);
    try {
      const sigDataUrl = drawnSig || nameToSignatureDataUrl(name, ac);
      const signAgreement = httpsCallable(functions, 'signProjectAgreement');
      const result = await signAgreement({
        projectId: project.id,
        typedName: name || user?.name || 'Client Signature',
        signatureData: sigDataUrl,
        legalConsent: true,
        userAgent: navigator.userAgent,
      });

      onSigned?.(result.data);
    } catch (e) {
      const message = e?.message
        ?.replace(/^Firebase:\s*/i, '')
        ?.replace(/\s*\(functions\/[^)]+\)\.?$/i, '');
      setError(message || 'Failed to save signature. Please try again.');
      if (import.meta.env.DEV) console.error('[ContractSign]', e);
    }
    setBusy(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9900, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: isMobile ? '24px 24px 0 0' : 24, width: '100%', maxWidth: isMobile ? '100%' : 680, maxHeight: '96dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -8px 64px rgba(0,0,0,.25)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCheck size={16} color={ac} /> Contract Agreement
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{project?.title}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2].map(s => (
                <div key={s} style={{ width: s === step ? 24 : 8, height: 8, borderRadius: 4, background: s === step ? ac : s < step ? '#16A34A' : 'var(--border-color)', transition: 'all .3s' }} />
              ))}
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
          </div>
        </div>

        {/* Step 1 — Read */}
        {step === 1 && (
          <>
            <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 8px' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 4 }}>Review Your Contract</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Please read this agreement carefully. You must scroll to the bottom before you can accept and sign.
                </div>
              </div>

              {/* Project summary block */}
              <div style={{ padding: '14px 16px', borderRadius: 14, background: `${ac}10`, border: `1.5px solid ${ac}30`, marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: ac, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Project Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Project</div><div style={{ fontSize: 13, fontWeight: 700 }}>{project?.title || '—'}</div></div>
                  <div><div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Contract Value</div><div style={{ fontSize: 13, fontWeight: 700 }}>{budget ? `GH₵ ${budget.toLocaleString()}` : 'As quoted'}</div></div>
                  <div><div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Client</div><div style={{ fontSize: 13, fontWeight: 700 }}>{user?.name || '—'}</div></div>
                  <div><div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Contractor</div><div style={{ fontSize: 13, fontWeight: 700 }}>{brand?.name || 'Westline Future'}</div></div>
                </div>
              </div>

              {/* Contract body */}
              {contractBody ? (
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{contractBody}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {defaultClauses.map((c, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: 4 }}>{i + 1}. {c.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.text || '') }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Spacer so user must scroll */}
              <div style={{ height: 60 }} />
            </div>

            {/* Scroll hint */}
            {!scrolled && (
              <div style={{ padding: '8px 24px', background: '#FFF7ED', borderTop: '1px solid #FED7AA', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <ChevronDown size={14} color="#D97706" />
                <span style={{ fontSize: 11, color: '#92400E', fontWeight: 700 }}>Scroll to the bottom to continue</span>
              </div>
            )}

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
              <button
                onClick={() => { if (scrolled) setStep(2); }}
                disabled={!scrolled}
                style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', background: scrolled ? ac : 'var(--border-color)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: scrolled ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s' }}
              >
                <PenLine size={16} /> I've Read the Contract — Proceed to Sign
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Sign */}
        {step === 2 && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 4 }}>Sign the Agreement</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  By signing below you confirm you have read and agree to all terms in this contract.
                </div>
              </div>

              {/* Acceptance checkbox */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 14, background: accepted ? '#F0FDF4' : 'var(--bg-secondary)', border: `1.5px solid ${accepted ? '#BBF7D0' : 'var(--border-color)'}`, cursor: 'pointer', marginBottom: 20, transition: 'all .2s' }}>
                <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, cursor: 'pointer', accentColor: ac, flexShrink: 0 }} />
                <span style={{ fontSize: 13, lineHeight: 1.6, color: accepted ? '#15803D' : 'var(--text-primary)', fontWeight: accepted ? 700 : 400 }}>
                  I, <strong>{user?.name || 'the undersigned'}</strong>, confirm that I have read, understood, and agree to all terms and conditions of this contract with <strong>{brand?.name || 'Westline Future'}</strong> for the project <strong>{project?.title}</strong>.
                </span>
              </label>

              {/* Signature mode toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setDrawMode(false)} style={{ flex: 1, height: 36, borderRadius: 10, border: `1.5px solid ${!drawMode ? ac : 'var(--border-color)'}`, background: !drawMode ? `${ac}12` : 'transparent', color: !drawMode ? ac : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Type Name
                </button>
                <button onClick={() => setDrawMode(true)} style={{ flex: 1, height: 36, borderRadius: 10, border: `1.5px solid ${drawMode ? ac : 'var(--border-color)'}`, background: drawMode ? `${ac}12` : 'transparent', color: drawMode ? ac : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Draw Signature
                </button>
              </div>

              {!drawMode ? (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 8 }}>Type your full legal name</label>
                  <input
                    type="text"
                    value={typedName}
                    onChange={e => setTypedName(e.target.value)}
                    placeholder="e.g. John Kwame Mensah"
                    autoComplete="name"
                    style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px solid var(--border-color)', padding: '0 16px', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  {typedName.trim() && (
                    <div style={{ marginTop: 12, padding: '14px 20px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Signature Preview</div>
                      <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: 34, color: ac && !ac.startsWith('var') ? ac : 'var(--accent-secondary)', letterSpacing: 1 }}>{typedName}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 8 }}>Draw your signature</label>
                  <SignaturePadInline onSave={setDrawnSig} onClear={() => setDrawnSig(null)} ac={ac} />
                </div>
              )}

              {error && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12, fontWeight: 700 }}>
                  {error}
                </div>
              )}

              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: '#F0F9FF', fontSize: 11, color: '#0369A1', lineHeight: 1.6 }}>
                <ShieldCheck size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                Your IP address, device info and timestamp are logged for legal verification purposes.
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', flexShrink: 0, display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ height: 50, padding: '0 20px', borderRadius: 14, border: '1.5px solid var(--border-color)', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Back</button>
              <button
                onClick={handleSign}
                disabled={busy || !accepted || (!typedName.trim() && !drawnSig)}
                style={{ flex: 1, height: 50, borderRadius: 14, border: 'none', background: (busy || !accepted || (!typedName.trim() && !drawnSig)) ? 'var(--border-color)' : '#16A34A', color: '#fff', fontSize: 14, fontWeight: 800, cursor: (busy || !accepted || (!typedName.trim() && !drawnSig)) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s' }}
              >
                {busy ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Signing…</> : <><CheckCircle2 size={16} /> Sign & Accept Contract</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Inline Signature Pad (canvas) ───────────────────────────────────────────
function SignaturePadInline({ onSave, onClear, ac }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const ctxRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = ac && !ac.startsWith('var') ? ac : '#1A1410';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, [ac]);

  const getPos = e => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = e => { const { x, y } = getPos(e); ctxRef.current.beginPath(); ctxRef.current.moveTo(x, y); setIsDrawing(true); e.preventDefault(); };
  const move  = e => { if (!isDrawing) return; const { x, y } = getPos(e); ctxRef.current.lineTo(x, y); ctxRef.current.stroke(); setHasDrawn(true); e.preventDefault(); };
  const stop  = () => { setIsDrawing(false); if (hasDrawn) { onSave?.(canvasRef.current.toDataURL('image/png')); } };

  const clear = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    setHasDrawn(false);
    onClear?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ border: '1.5px dashed var(--border-color)', borderRadius: 14, background: '#fff', height: 160, position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
        />
        {!hasDrawn && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sign here with your finger or mouse</span></div>}
      </div>
      <button onClick={clear} style={{ alignSelf: 'flex-start', height: 30, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)' }}>Clear</button>
    </div>
  );
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

// ─── Stage Action Card ────────────────────────────────────────────────────────
function StageActionCard({ project, user, approveQuote, approveSignoff, payInvoice, updateProjectStage, setActiveTab }) {
  const applicableStages = CLIENT_PROJECT_STAGES.filter(s => {
    const typeStages = PROJECT_TYPES[project.projectType]?.stages || CLIENT_PROJECT_STAGES.map(x => x.id);
    return typeStages.includes(s.id);
  });
  const currentStage = applicableStages.find(s => s.id === project.stageId);
  const [acting, setActing] = useState(false);

  // Live invoice query so we show real amounts, not hardcoded 50%
  const [dueInvoice, setDueInvoice] = useState(null);
  const [issuedQuote, setIssuedQuote] = useState(null);
  const [justPaid, setJustPaid] = useState(false);
  useEffect(() => {
    if (!db || !project?.id || !currentStage?.requiresPayment) return;
    const q = query(
      collection(db, 'invoices'),
      where('projectId', '==', project.id),
    );
    const q2 = query(
      collection(db, 'invoices'),
      where('parentId', '==', project.id),
    );
    let fromProject = [], fromParent = [];
    const merge = () => {
      const merged = new Map();
      [...fromProject, ...fromParent].forEach(invoice => merged.set(invoice.id, invoice));
      const all = [...merged.values()];
      const quotes = all
        .filter(invoice => {
          const descriptor = `${invoice.type || ''} ${invoice.documentKind || ''}`.toLowerCase();
          return descriptor.includes('quotation') || descriptor === 'quote';
        })
        .filter(invoice => !['cancelled', 'superseded', 'rejected'].includes(String(invoice.status || '').toLowerCase()))
        .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
      setIssuedQuote(quotes[0] || null);
      const unpaid = all.filter(i => {
        const descriptor = `${i.type || ''} ${i.documentKind || ''}`.toLowerCase();
        const isQuote = descriptor.includes('quotation') || descriptor === 'quote';
        return !isQuote && !['paid', 'paid in full'].includes(String(i.status || '').toLowerCase().trim());
      });
      setDueInvoice(unpaid[0] || null);
    };
    const u1 = onSnapshot(q, s => { fromProject = s.docs.map(d => ({ id: d.id, ...d.data() })); merge(); }, () => merge());
    const u2 = onSnapshot(q2, s => { fromParent = s.docs.map(d => ({ id: d.id, ...d.data() })); merge(); }, () => merge());
    return () => { u1(); u2(); };
  }, [project?.id, currentStage?.requiresPayment]);

  if (!currentStage || (currentStage.whoActs !== 'client' && currentStage.whoActs !== 'both' && currentStage.id !== 8)) return null;

  const email = user?.proxyEmail || (user?.phone ? user.phone + '@clients.westlinefuture.com' : 'client@clients.westlinefuture.com');
  const budget = parseFloat(String(project.budget || '0').replace(/[^0-9.]/g, '')) || 0;
  const parseAmt = v => parseFloat(String(v || '0').replace(/[^0-9.]/g, '')) || 0;
  // Use actual invoice amount if available, otherwise derive from stage milestone percentage
  const stagePct = currentStage?.pct ? (currentStage.pct / 100) : 0.4; // default 40% if unknown
  const dueAmount = dueInvoice ? parseAmt(dueInvoice.amount || dueInvoice.total) : budget * stagePct;

  if (currentStage.needsClientApproval) {
    if (currentStage.id === 3 && project.quoteApproved) return null;
    if (currentStage.id === 7 && project.signOffApproved) return null;
    const renderingApprovalRequired = currentStage.id === 3 &&
      project.kickoffMode !== 'direct-kickoff' &&
      project.renderingApproved !== true &&
      project.designApproved !== true &&
      String(project.renderingStatus || '').toLowerCase() !== 'approved';
    const quoteMissing = currentStage.id === 3 && !issuedQuote;

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
        <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 6 }}>
          {quoteMissing ? 'Final Quote Not Issued Yet' : 'Approval Required'}
        </div>
        <div style={{ fontSize: 14, color: `var(--text-secondary)`, lineHeight: 1.6, marginBottom: renderingApprovalRequired ? 16 : 20 }}>
          {currentStage.id === 3
            ? quoteMissing
              ? 'Your rendering is approved. Your account manager must now prepare and issue the quotation before you can review the project cost.'
              : `Review "${issuedQuote.title || 'the quotation'}". Approve it if the cost is agreed, or request a revised version from your project manager.`
            : 'Please review the work and confirm your approval.'}
        </div>
        {renderingApprovalRequired && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: 20 }}>
            <AlertCircle size={15} color="#D97706" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>
              You must approve the final rendering before approving the quotation.
            </span>
          </div>
        )}
        {quoteMissing ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, background: '#F3F4F6', color: '#6B7280', fontSize: 13, fontWeight: 700 }}>
            <Clock size={15} /> Waiting for account manager
          </div>
        ) : <button
          onClick={async () => {
            if (acting || renderingApprovalRequired) return;
            setActing(true);
            try {
              if (currentStage.id === 3) {
                await approveQuote(project.id);
              } else if (currentStage.id === 7) {
                if (approveSignoff) await approveSignoff(project.id);
                else await updateProjectStage(project.id, 8);
              }
            } finally {
              setActing(false);
            }
          }}
          disabled={acting || renderingApprovalRequired}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 32px', borderRadius: 14, border: 'none',
            background: (acting || renderingApprovalRequired) ? `var(--border-color)` : `var(--accent-secondary)`,
            color: (acting || renderingApprovalRequired) ? `var(--text-secondary)` : '#fff',
            fontSize: 15, fontWeight: 800, cursor: (acting || renderingApprovalRequired) ? 'default' : 'pointer',
            boxShadow: (acting || renderingApprovalRequired) ? 'none' : '0 4px 16px rgba(26,20,16,.25)',
            transition: 'all .2s',
          }}
        >
          {acting
            ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Approving...</>
            : <>Confirm Approval <ArrowRight size={18} /></>
          }
        </button>}
        {!quoteMissing && currentStage.id === 3 && !project.quoteApproved && (
          <button
            onClick={async () => {
              const note = window.prompt('What should be changed in this quotation?');
              if (!note?.trim()) return;
              setActing(true);
              try {
                const requestChanges = httpsCallable(functions, 'requestProjectQuoteChanges');
                await requestChanges({ projectId: project.id, quoteId: issuedQuote.id, note: note.trim() });
              } finally {
                setActing(false);
              }
            }}
            disabled={acting}
            style={{ marginLeft: 10, padding: '14px 22px', borderRadius: 14, border: '1.5px solid #DC2626', background: '#fff', color: '#DC2626', fontSize: 14, fontWeight: 800, cursor: acting ? 'default' : 'pointer' }}
          >
            Request Changes
          </button>
        )}
      </div>
    );
  }

  if (currentStage.requiresPayment) {
    const isDeposit = currentStage.id === 3;
    const invoiceTitle = dueInvoice?.title || (isDeposit ? 'Project Deposit' : 'Balance Payment');
    const fmt = n => `GH₵ ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    if (justPaid || (dueInvoice && ['paid', 'paid in full'].includes(String(dueInvoice.status || '').toLowerCase().trim()))) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px', borderRadius: 20, background: '#F0FDF4', border: '1.5px solid #BBF7D0', marginBottom: 4 }}>
          <CheckCircle2 size={20} color="#16A34A" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#15803D' }}>Payment received — verifying</div>
            <div style={{ fontSize: 12, color: '#166534' }}>Your payment has been received and is being confirmed. This page will update automatically.</div>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        padding: '24px 28px', borderRadius: 20,
        background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
        border: '1.5px solid #16A34A30', marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <CreditCard size={18} color="#16A34A" />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '.06em' }}>Payment Required</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 4 }}>
          {invoiceTitle}
        </div>
        {dueAmount > 0 && (
          <div style={{ fontSize: 22, fontWeight: 900, color: '#15803D', marginBottom: 6 }}>
            {fmt(dueAmount)}
          </div>
        )}
        {dueInvoice?.due && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309', marginBottom: 8 }}>
            ⏰ Due by {new Date(dueInvoice.due + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
          {isDeposit
            ? 'This payment is required to initiate production and material procurement.'
            : 'Please settle this balance to continue to the next project stage.'}
        </div>
        <UnifiedPaymentGateway
          label={`Pay ${fmt(dueAmount)}`}
          amountGHS={dueAmount}
          email={email}
          projectId={project.id}
          invoiceId={dueInvoice?.id}
          paymentType={isDeposit ? 'deposit' : 'milestone'}
          onSuccess={() => { setJustPaid(true); setTimeout(() => window.location.reload(), 3000); }}
          onError={(err) => alert("Verification Error: " + err)}
        />
      </div>
    );
  }

  // Stage-specific action cards for stages that need direction but no inline form
  if (currentStage.id === 1) {
    return (
      <div style={{ padding: '20px 24px', borderRadius: 20, background: 'linear-gradient(135deg, #FDFAF6, #F4EFE6)', border: '1.5px solid rgba(200,169,110,0.35)', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <AlertCircle size={18} color="var(--accent-primary)" />
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Action Required</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 6 }}>Complete Your Onboarding</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
          Pay the rendering fee to unlock your 3D design, then confirm your site survey appointment so our technical team can take precise measurements.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab?.('financials')} style={{ padding: '11px 20px', borderRadius: 12, border: 'none', background: 'var(--accent-secondary)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={15} /> Pay Rendering Fee
          </button>
          <button onClick={() => setActiveTab?.('messages')} style={{ padding: '11px 20px', borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#fff', color: 'var(--accent-secondary)', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={15} /> Message Project Manager
          </button>
        </div>
      </div>
    );
  }

  if (currentStage.id === 2) {
    return (
      <div style={{ padding: '20px 24px', borderRadius: 20, background: 'linear-gradient(135deg, #FAF5FF, #F3E8FF)', border: '1.5px solid #D8B4FE50', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <AlertCircle size={18} color="#9333EA" />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#9333EA', textTransform: 'uppercase', letterSpacing: '.06em' }}>Review Required</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 6 }}>Your 3D Design Is Ready</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
          Our designers have prepared your 3D rendering. Review it carefully, request any revisions, and approve the final version to unlock the commercial stage.
        </div>
        <button onClick={() => setActiveTab?.('designs')} style={{ padding: '11px 22px', borderRadius: 12, border: 'none', background: '#9333EA', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Search size={15} /> Open 3D Design Review
        </button>
      </div>
    );
  }

  if (currentStage.id === 7) {
    return (
      <div style={{ padding: '20px 24px', borderRadius: 20, background: 'linear-gradient(135deg, #FDFAF6, #F4EFE6)', border: '1.5px solid rgba(200,169,110,0.35)', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <AlertCircle size={18} color="var(--accent-primary)" />
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Sign-off Required</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 6 }}>Final Inspection Awaiting</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
          Installation is complete. Please go through the inspection checklist, confirm everything meets your expectations, and sign off to move to handover.
        </div>
        <button onClick={() => setActiveTab?.('vault')} style={{ padding: '11px 22px', borderRadius: 12, border: 'none', background: 'var(--accent-secondary)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={15} /> Open Inspection Checklist
        </button>
      </div>
    );
  }

  if (currentStage.id === 8) {
    return (
      <div style={{ padding: '20px 24px', borderRadius: 20, background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE)', border: '1.5px solid #BAE6FD', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Star size={18} color="#0284C7" />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '.06em' }}>Almost Done</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 6 }}>Share Your Feedback</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
          Your project is complete — congratulations! Please take a moment to rate your experience and leave a short review to officially conclude the project.
        </div>
        <button onClick={() => setActiveTab?.('vault')} style={{ padding: '11px 22px', borderRadius: 12, border: 'none', background: '#0284C7', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Star size={15} /> Complete Handover & Feedback
        </button>
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
          {currentStage.clientMsg || 'Please contact your account manager to proceed.'}
        </div>
      </div>
    </div>
  );
}

// ─── Client Up Next / Approval Surfaces ──────────────────────────────────
function ClientNextActionCard({ project, invoices = [], renderingPackages = [], addOns = [], setActiveTab, isMobile }) {
  if (!project) return null;
  const parseAmount = value => parseFloat(String(value || '0').replace(/[^0-9.]/g, '')) || 0;
  const projectInvoices = invoices.filter(i => i.projectId === project.id || i.parentId === project.id);
  const projectPackages = renderingPackages.filter(pkg => pkg.projectId === project.id);
  const projectAddOns = addOns.filter(a => a.projectId === project.id);
  const lockedRendering = projectPackages.find(pkg => {
    const linkedInv = projectInvoices.find(i => i.id === pkg.linkedInvoiceId || i.renderingPackageId === pkg.id);
    return linkedInv && !isPaidStatus(linkedInv.status) && !pkg.unlocked;
  });
  const reviewRendering = projectPackages.find(pkg => {
    const linkedInv = projectInvoices.find(i => i.id === pkg.linkedInvoiceId || i.renderingPackageId === pkg.id);
    const unlocked = pkg.unlocked || pkg.status === 'Paid / Unlocked' || isPaidStatus(linkedInv?.status);
    return unlocked && pkg.status !== 'Approved';
  });
  const pendingAddOn = projectAddOns.find(a =>
    ['Pending', 'Pending Approval', 'Priced'].includes(a.status || a.approvalStatus)
  );
  const unpaidAddOn = projectAddOns.find(a => {
    const linkedInvoice = projectInvoices.find(i => i.id === a.linkedInvoiceId);
    return linkedInvoice && !isPaidStatus(linkedInvoice.status);
  });
  // Only surface invoices that have been explicitly activated by admin (have a due date, are Sent, or Overdue).
  // Auto-generated milestone invoices with due: null are future obligations — don't prompt yet.
  const unpaidInvoice = projectInvoices.find(i =>
    !isPaidStatus(i.status) &&
    i.type !== 'Quotation' && i.documentKind !== 'quotation' &&
    (i.status === 'Overdue' || i.status === 'Sent' || (i.due != null && i.due !== ''))
  );
  const quoteInvoices = projectInvoices
    .filter(i => ['Quotation', 'quote', 'quotation'].includes(i.type || i.documentKind))
    .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
  const pendingQuote = quoteInvoices.find(i => i.id === project.activeQuoteId) ||
    quoteInvoices.find(i => !['approved', 'superseded', 'cancelled'].includes(String(i.status || '').toLowerCase()));

  const noRendering = project.kickoffMode === 'direct-kickoff';
  const renderingPaid = project.renderingFeePaid === true || projectPackages.some(pkg => {
    const linkedInv = projectInvoices.find(i => i.id === pkg.linkedInvoiceId || i.renderingPackageId === pkg.id);
    return pkg.unlocked || pkg.status === 'Paid / Unlocked' || isPaidStatus(linkedInv?.status);
  });
  const renderingApproved = project.renderingApproved === true ||
    project.designApproved === true ||
    projectPackages.some(pkg => String(pkg.status || '').toLowerCase() === 'approved');
  const productionAuthorized = project.productionAuthorized === true || project.specDoc?.status === 'signed';
  const workflowStep = deriveWorkflowStep(project, { invoices: projectInvoices, renderingPackages: projectPackages });

  const specPending = Number(project.stageId || 1) >= 2 &&
    project.specDoc?.url &&
    project.specDoc?.status !== 'signed' &&
    project.specDoc?.status !== 'rejected';

  let action;
  if (!noRendering && !renderingPaid) {
    action = { tone: '#D97706', bg: '#FFF7ED', icon: <Lock size={18} />, title: 'Design fee payment needed', body: 'Pay the design fee to unlock your 3D renders.', button: 'View Designs', tab: 'designs' };
  } else if (workflowStep === WORKFLOW_STEP.SITE_VISIT_SCHEDULING) {
    action = { tone: '#2563EB', bg: '#EFF6FF', icon: <Calendar size={18} />, title: 'Choose your site visit date', body: 'Your rendering fee is confirmed. Select when our technical team can visit for measurements and photos.', button: 'Schedule Below', tab: 'overview' };
  } else if (workflowStep === WORKFLOW_STEP.SITE_SURVEY) {
    const visitDate = project.siteVisit?.startAt ? new Date(project.siteVisit.startAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    action = { tone: '#2563EB', bg: '#EFF6FF', icon: <Calendar size={18} />, title: 'Site visit confirmed', body: visitDate ? `Our technical team is scheduled for ${visitDate}.` : 'Your technical site visit is scheduled.', button: 'View Timeline', tab: 'overview' };
  } else if (!noRendering && project.siteVisit?.status === 'completed' && projectPackages.length === 0) {
    action = { tone: '#2563EB', bg: '#EFF6FF', icon: <Clock size={18} />, title: 'Your 3D rendering is being prepared', body: 'The site survey is complete. Westline Future has been prompted to prepare and upload your rendering package.', button: 'View Timeline', tab: 'overview' };
  } else if (!noRendering && lockedRendering) {
    action = { tone: '#D97706', bg: '#FFF7ED', icon: <Lock size={18} />, title: 'Design package is being verified', body: 'Your payment or rendering access is still being verified.', button: 'View Designs', tab: 'designs' };
  } else if (!noRendering && project.changeRequestPending) {
    action = { tone: '#D97706', bg: '#FFF7ED', icon: <Clock size={18} />, title: 'Rendering revision in progress', body: 'Your change request is with the design team. You will be notified when the revised 3D rendering is ready for review.', button: 'View Request', tab: 'designs' };
  } else if (!noRendering && reviewRendering) {
    action = { tone: 'var(--accent-primary)', bg: '#F4EFE6', icon: <PenTool size={18} />, title: 'Review your rendering', body: 'Your design package is unlocked. Review it, leave pins, request changes, or approve the final version.', button: 'Review Design', tab: 'designs' };
  } else if (pendingQuote && renderingApproved && !project.quoteApproved && String(pendingQuote.status || '').toLowerCase() === 'changes requested') {
    action = { tone: '#D97706', bg: '#FFF7ED', icon: <Clock size={18} />, title: 'Revised quotation in progress', body: 'Your quotation feedback was sent. The project manager is preparing the next version.', button: 'View Negotiation', tab: 'vault' };
  } else if (pendingQuote && renderingApproved && !project.quoteApproved) {
    action = { tone: 'var(--accent-primary)', bg: '#FDFAF6', icon: <FileText size={18} />, title: 'Quotation ready for negotiation', body: 'Review the project cost. Approve it or request changes before the contract is issued.', button: 'Review Quotation', tab: 'vault' };
  } else if (project.quoteApproved && !project.contractAccepted) {
    action = { tone: '#7C3AED', bg: '#F5F3FF', icon: <PenLine size={18} />, title: 'Sign the project contract', body: 'Your negotiated quotation is approved. Review and sign the contract and terms to unlock the initial payment.', button: 'Review Contract', tab: 'documents' };
  } else if (project.contractAccepted && !project.depositPaid && !project.initialDepositPaid) {
    action = { tone: '#16A34A', bg: '#F0FDF4', icon: <CreditCard size={18} />, title: 'Initial project payment required', body: 'Your contract is signed. Pay online or submit an offline payment for verification.', button: 'Open Payments', tab: 'financials' };
  } else if ((project.depositPaid || project.initialDepositPaid) && !project.specDoc?.url) {
    action = { tone: '#2563EB', bg: '#EFF6FF', icon: <Clock size={18} />, title: 'Final deliverables document is being prepared', body: 'Your initial payment is confirmed. Westline Future is preparing the final drawings, bill of materials, scope, exclusions, and deliverables.', button: 'View Documents', tab: 'documents' };
  } else if (specPending && (project.depositPaid || project.initialDepositPaid)) {
    action = { tone: '#1D4ED8', bg: '#EFF6FF', icon: <FileCheck size={18} />, title: 'Sign the final deliverables document', body: 'Review the final drawings, bill of materials, scope, deliverables, exclusions, and outcomes. Signing authorises production.', button: 'Review Deliverables', tab: 'documents' };
  } else if (pendingAddOn) {
    action = { tone: '#B45309', bg: '#FFFBEB', icon: <Gift size={18} />, title: 'Add-on needs decision', body: `${pendingAddOn.title || pendingAddOn.description || 'A project variation'} is waiting for your approval.`, button: 'Review Add-ons', tab: 'financials' };
  } else if (unpaidAddOn) {
    const linkedInvoice = projectInvoices.find(i => i.id === unpaidAddOn.linkedInvoiceId);
    const amount = parseAmount(linkedInvoice?.amount || linkedInvoice?.total || unpaidAddOn.amount);
    action = {
      tone: '#D97706',
      bg: '#FFF7ED',
      icon: <CreditCard size={18} />,
      title: 'New add-on invoice ready',
      body: `${unpaidAddOn.title || 'Project add-on'} requires payment${amount ? `: GH₵ ${amount.toLocaleString()}` : ''}. Open Financials to review the invoice and pay securely.`,
      button: 'View & Pay Invoice',
      tab: 'financials',
    };
  } else if (unpaidInvoice) {
    const amount = parseAmount(unpaidInvoice.amount || unpaidInvoice.total);
    action = { tone: '#16A34A', bg: '#F0FDF4', icon: <CreditCard size={18} />, title: 'Payment pending', body: `${unpaidInvoice.title || 'An invoice'} is outstanding${amount ? `: GH₵ ${amount.toLocaleString()}` : ''}.`, button: 'Open Payments', tab: 'financials' };
  } else {
    const currentStage = CLIENT_PROJECT_STAGES.find(s => s.id === project.stageId);
    const stageTitle = Number(project.stageId || 1) >= 4
      ? `${currentStage?.name || 'Project work'} is in progress`
      : 'Everything is on track';
    action = { tone: '#16A34A', bg: '#F0FDF4', icon: <CheckCircle2 size={18} />, title: stageTitle, body: currentStage?.clientMsg || 'Your project is moving. We will notify you when your next action is required.', button: 'View Timeline', tab: 'overview' };
  }

  return (
    <div style={{ padding: isMobile ? '18px 18px' : '22px 26px', borderRadius: isMobile ? 24 : 20, border: `1.5px solid ${action.tone}30`, background: action.bg, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 16, boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.06)' : '0 4px 18px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fff', color: action.tone, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{action.icon}</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: action.tone, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Up Next</div>
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

function ClientSiteVisitScheduler({ project, isMobile }) {
  const [startAt, setStartAt] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const workflowStep = deriveWorkflowStep(project);
  if (![WORKFLOW_STEP.SITE_VISIT_SCHEDULING, WORKFLOW_STEP.SITE_SURVEY].includes(workflowStep)) return null;

  const scheduled = project.siteVisit?.status === 'scheduled';
  const submit = async () => {
    if (!startAt || busy) return;
    const appointment = new Date(startAt);
    if (Number.isNaN(appointment.getTime()) || appointment.getTime() < Date.now() + 30 * 60 * 1000) {
      setError('Choose a date and time at least 30 minutes from now.');
      return;
    }
    setBusy(true);
    setError('');
    setConfirmation('');
    try {
      const scheduleSiteVisit = httpsCallable(functions, 'scheduleProjectSiteVisit');
      const result = await scheduleSiteVisit({
        projectId: project.id,
        startAt: appointment.toISOString(),
        durationMinutes: 120,
        timezone: 'Africa/Accra',
        source: 'client_portal',
        notes,
      });
      const confirmedStart = result.data?.siteVisit?.startAt || appointment.toISOString();
      setConfirmation(`Visit confirmed for ${new Date(confirmedStart).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}.`);
    } catch (e) {
      setError(String(e?.message || 'Could not schedule the site visit.').replace(/^Firebase:\s*/i, ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: isMobile ? 20 : 24, borderRadius: 20, background: '#fff', border: '1px solid var(--border-color)', boxShadow: '0 4px 18px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: (scheduled && !rescheduling) ? 0 : 18, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={19} /></div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>{scheduled ? 'Technical site visit confirmed' : 'Schedule your technical site visit'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 3 }}>
              {scheduled
                ? new Date(project.siteVisit.startAt).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })
                : 'Choose a date and time when our team can take measurements and site photos.'}
            </div>
          </div>
        </div>
        {scheduled && !rescheduling && (
          <button onClick={() => { setRescheduling(true); setError(''); setConfirmation(''); }} style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', background: 'transparent', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>Change Date</button>
        )}
      </div>
      {(!scheduled || rescheduling) && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, .8fr) 1.2fr auto', gap: 10 }}>
          <input type="datetime-local" value={startAt} min={minimumAppointmentDateTime()} onChange={e => { setStartAt(e.target.value); setError(''); setConfirmation(''); }} style={{ padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontFamily: 'inherit' }} />
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Access instructions or preferred contact" style={{ padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontFamily: 'inherit' }} />
          <button onClick={submit} disabled={!startAt || busy} style={{ padding: '12px 18px', borderRadius: 12, border: 'none', background: startAt ? 'var(--accent-secondary)' : 'var(--border-color)', color: '#fff', fontWeight: 800, cursor: startAt ? 'pointer' : 'default' }}>{busy ? 'Scheduling...' : 'Confirm Visit'}</button>
        </div>
      )}
      {error && <div style={{ color: '#DC2626', fontSize: 12, marginTop: 10 }}>{error}</div>}
      {confirmation && <div style={{ color: '#15803D', fontSize: 12, fontWeight: 700, marginTop: 10 }}>{confirmation}</div>}
    </div>
  );
}

function ClientApprovalsTab({ project, invoices = [], approvals = [], approveQuote, approveSignoff, brand, user, isMobile, setActiveTab, updateProjectStage, updateApproval }) {
  const [signOffBusy, setSignOffBusy] = useState(false);
  const [signOffDone, setSignOffDone] = useState(false);
  const [inspectionChecks, setInspectionChecks] = useState({});
  const [inspectionNote, setInspectionNote] = useState('');
  const [handoverRating, setHandoverRating] = useState(0);
  const [handoverFeedback, setHandoverFeedback] = useState('');
  const [handoverConsent, setHandoverConsent] = useState(false);
  const [handoverBusy, setHandoverBusy] = useState(false);
  const [handoverDone, setHandoverDone] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [contractJustSigned, setContractJustSigned] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState({});
  const [approvalBusy, setApprovalBusy] = useState({});
  const [reconsiderTarget, setReconsiderTarget] = useState(null);
  const [reconsiderText, setReconsiderText] = useState('');
  const [reconsiderBusy, setReconsiderBusy] = useState(false);
  const [quoteChangeNote, setQuoteChangeNote] = useState('');
  const [quoteChangeBusy, setQuoteChangeBusy] = useState(false);
  const [quoteChangeMessage, setQuoteChangeMessage] = useState('');
  const [quoteAction, setQuoteAction] = useState('approve'); // 'approve' | 'request' | 'counter'
  const [counterPrice, setCounterPrice] = useState('');

  const quoteDocs = invoices
    .filter(i => (i.projectId === project.id || i.parentId === project.id) && ['Quotation', 'quote', 'quotation'].includes(i.type || i.documentKind))
    .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
  const activeQuote = quoteDocs.find(quote => quote.id === project.activeQuoteId) ||
    quoteDocs.find(quote => !['superseded', 'cancelled'].includes(String(quote.status || '').toLowerCase())) ||
    quoteDocs[0];
  const productionAuthorized = project.productionAuthorized === true || project.specDoc?.status === 'signed';
  const pendingApprovals = (approvals || []).filter(a => a.projectId === project.id && a.status === 'pending');
  const pastApprovals = (approvals || []).filter(a => a.projectId === project.id && a.status !== 'pending');

  const handleApprovalResponse = async (id, status) => {
    if (!updateApproval || approvalBusy[id]) return;
    setApprovalBusy(b => ({ ...b, [id]: true }));
    try {
      await updateApproval(id, { status, clientNote: approvalNotes[id] || '' }, project.id);
    } finally {
      setApprovalBusy(b => ({ ...b, [id]: false }));
    }
  };
  const cardStyle = { padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' };

  const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 0', borderBottom: '1px solid var(--border-color)' };
  const sectionTitleStyle = { fontSize: 12, fontWeight: 900, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 };

  // ── Rendering Package status
  const renderPkg = (project.renderingPackages || []).find(p => p.status !== 'Superseded') || null;
  const renderStatus = renderPkg?.status || (project.stageId >= 2 ? 'Awaiting Upload' : null);

  const handleInspectionSignOff = async () => {
    if (signOffBusy || signOffDone) return;
    setSignOffBusy(true);
    try {
      if (approveSignoff) {
        await approveSignoff(project.id);
      } else if (updateProjectStage) {
        await updateProjectStage(project.id, 8, 'Client signed off on site inspection.');
      }
      setSignOffDone(true);
    } finally {
      setSignOffBusy(false);
    }
  };

  const handleQuoteChangeRequest = async () => {
    if (!activeQuote || quoteChangeBusy) return;
    const isCounter = quoteAction === 'counter';
    const note = isCounter
      ? `Counter offer: GHS ${counterPrice}${quoteChangeNote.trim() ? ` — ${quoteChangeNote.trim()}` : ''}`
      : quoteChangeNote.trim();
    if (!note) return;
    setQuoteChangeBusy(true);
    setQuoteChangeMessage('');
    try {
      const requestChanges = httpsCallable(functions, 'requestProjectQuoteChanges');
      await requestChanges({
        projectId: project.id,
        quoteId: activeQuote.id,
        note,
        ...(isCounter && counterPrice ? { counterPrice: Number(String(counterPrice).replace(/[^0-9.]/g, '')) } : {}),
      });
      setQuoteChangeNote('');
      setCounterPrice('');
      setQuoteChangeMessage(isCounter
        ? 'Your counter offer has been sent. The project manager will review and respond.'
        : 'Your request was sent. The project manager will issue a revised quotation.');
    } catch (error) {
      setQuoteChangeMessage(
        error?.message
          ?.replace(/^Firebase:\s*/i, '')
          ?.replace(/\s*\(functions\/[^)]+\)\.?$/i, '') ||
        'The request could not be sent.'
      );
    } finally {
      setQuoteChangeBusy(false);
    }
  };

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: `var(--accent-secondary)` }}>Approvals</div>
        <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 4 }}>Review and approve designs, quotes, and your final sign-off.</div>
      </div>

      {/* ── SECTION 0: Admin-Requested Approvals ──────────────────────── */}
      {(pendingApprovals.length > 0 || pastApprovals.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 0', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Action Needed — Requests from Your Team</div>
          {pendingApprovals.map(a => (
            <div key={a.id} style={{ padding: 16, borderRadius: 16, background: 'linear-gradient(135deg, #FFF7ED, #FFFBF5)', border: '1.5px solid #F59E0B40', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#92400E' }}>{a.title || a.type}</div>
                {a.description && <div style={{ fontSize: 12, color: '#78350F', marginTop: 4, lineHeight: 1.5 }}>{a.description}</div>}
                <div style={{ fontSize: 11, color: '#B45309', marginTop: 4 }}>{a.type} · Requested {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
              </div>
              <textarea
                value={approvalNotes[a.id] || ''}
                onChange={e => setApprovalNotes(n => ({ ...n, [a.id]: e.target.value }))}
                placeholder="Add a note (optional)…"
                rows={2}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #F59E0B60', fontSize: 12, resize: 'none', boxSizing: 'border-box', background: '#fff' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleApprovalResponse(a.id, 'approved')}
                  disabled={approvalBusy[a.id]}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#16A34A', color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer', opacity: approvalBusy[a.id] ? 0.6 : 1 }}
                >
                  {approvalBusy[a.id] ? 'Saving…' : '✓ Approve'}
                </button>
                <button
                  onClick={() => handleApprovalResponse(a.id, 'rejected')}
                  disabled={approvalBusy[a.id]}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid #DC2626', background: '#fff', color: '#DC2626', fontSize: 12, fontWeight: 900, cursor: 'pointer', opacity: approvalBusy[a.id] ? 0.6 : 1 }}
                >
                  ✗ Request Changes
                </button>
              </div>
            </div>
          ))}
          {pastApprovals.map(a => {
            // Allow revocation only if project hasn't advanced past where this approval matters
            // (i.e., not yet in production stage)
            const canRevoke = a.status === 'approved' && project.stageId < 4 && !project.contractAccepted === false;
            return (
              <div key={a.id} style={{ padding: '12px 16px', borderRadius: 14, background: a.status === 'approved' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${a.status === 'approved' ? '#BBF7D0' : '#FECACA'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: a.status === 'approved' ? '#15803D' : '#DC2626' }}>
                    {a.status === 'approved' ? '✓' : '✗'} {a.title || a.type}
                  </div>
                  {a.clientNote && <div style={{ fontSize: 11, color: '#666', marginTop: 2, fontStyle: 'italic' }}>"{a.clientNote}"</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 11, color: '#999' }}>{a.status === 'approved' ? 'Approved' : 'Changes Requested'}</div>
                  {canRevoke && updateApproval && (
                    <button
                      onClick={() => { setReconsiderTarget(a.id); setReconsiderText(''); }}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: '#fff', color: 'var(--text-secondary)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Reconsider
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SECTION 1: Rendering / Design Approval ──────────────────────── */}
      {project.stageId >= 2 && project.kickoffMode !== 'direct-kickoff' && (
        <div style={sectionStyle}>
          {/* Collapsed "done" state — show only a green tick row when design is approved */}
          {renderStatus === 'Approved' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <CheckCircle2 size={14} color="#16A34A" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>Design approved</span>
              <button onClick={() => setActiveTab?.('designs')} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 8, border: '1px solid #BBF7D0', background: '#fff', color: '#15803D', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>View</button>
            </div>
          ) : (
          <>
          <div style={sectionTitleStyle}>① Design Approval</div>
          {!renderPkg ? (
            <div style={{ padding: '14px 16px', borderRadius: 14, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', fontSize: 12, color: `var(--text-secondary)` }}>
              Awaiting upload from our design team. You'll be notified when the rendering is ready.
            </div>
          ) : (
            <div style={{ padding: 16, borderRadius: 16, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: `var(--accent-secondary)` }}>{renderPkg.title || 'Rendering Package'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {renderStatus === 'Approved' && <><CheckCircle2 size={13} color="#16A34A" /><span style={{ fontSize: 11, fontWeight: 800, color: '#16A34A' }}>Approved</span></>}
                  {renderStatus === 'Changes Requested' && <><AlertCircle size={13} color="#D97706" /><span style={{ fontSize: 11, fontWeight: 800, color: '#D97706' }}>Changes Requested — Revision Pending</span></>}
                  {renderStatus === 'Pending' && <><Clock size={13} color="#6B7280" /><span style={{ fontSize: 11, fontWeight: 800, color: '#6B7280' }}>Awaiting Your Review</span></>}
                  {renderStatus === 'Awaiting Upload' && <><Clock size={13} color="#6B7280" /><span style={{ fontSize: 11, fontWeight: 800, color: '#6B7280' }}>Awaiting Upload</span></>}
                </div>
              </div>
              {setActiveTab && (
                <button onClick={() => setActiveTab('designs')} style={{ padding: '9px 14px', borderRadius: 10, border: `1px solid var(--accent-secondary)`, background: 'transparent', color: `var(--accent-secondary)`, fontSize: 11, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  View Designs
                </button>
              )}
            </div>
          )}
          </>
          )}
        </div>
      )}

      {/* ── SECTION 2: Quotation negotiation ─────────────────────────────── */}
      {productionAuthorized && project.quoteApproved ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', margin: '0 0 8px 0' }}>
          <CheckCircle2 size={14} color="#16A34A" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>Quotation, contract, payment, and deliverables approved</span>
        </div>
      ) : (
      <div style={{ ...sectionStyle, borderBottom: project.stageId === 7 ? '1px solid var(--border-color)' : 'none' }}>
        <div style={sectionTitleStyle}>② Quotation &amp; Cost Negotiation</div>

        {/* Production-authorisation gate */}
        {productionAuthorized ? (
          <div style={{ padding: '12px 16px', borderRadius: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCheck size={15} color="#16A34A" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#15803D' }}>Production Authorised</div>
                <div style={{ fontSize: 11, color: '#16A34A' }}>
                  Project specification signed by {project.specDoc?.signedBy || user?.name || 'client'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 16, borderRadius: 16, background: 'linear-gradient(135deg, #FFF7ED, #FFFBF5)', border: '1.5px solid #F59E0B40', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#92400E', marginBottom: 4 }}>Final Deliverables Follow Payment</div>
            <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.6, marginBottom: 12 }}>
              First approve the quotation, sign the contract, and complete the initial payment. Westline Future will then issue the final deliverables document for production authorisation.
            </div>
            <button
              onClick={() => setActiveTab?.('documents')}
              style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: `var(--accent-secondary)`, color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
            >
              <FileCheck size={14} /> View Documents →
            </button>
          </div>
        )}

        {/* Quote documents */}
        {!activeQuote ? (
          <div style={{ padding: '14px 16px', borderRadius: 14, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', fontSize: 12, color: `var(--text-secondary)` }}>
            No quotation has been issued for this project yet. The project manager will send one once the 3D rendering is approved.
          </div>
        ) : (() => {
          const qTotal = Number(activeQuote.total || activeQuote.amount || 0);
          const fmtGHS = n => `GHS ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          const changesRequested = String(activeQuote.status || '').toLowerCase() === 'changes requested';
          const pmPhone = project.pmPhone || project.projectManagerPhone || '+233244927349';
          const pmWA = `https://wa.me/${pmPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm reviewing the quotation for my project "${project.title || ''}" (Ref: ${project.id?.slice(0,8) || ''}).`)}`;

          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Quote header card ───────────────────── */}
            <div style={{ borderRadius: 18, border: '1.5px solid var(--border-color)', overflow: 'hidden', background: '#fff' }}>

              {/* Top bar */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.1em', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Official Quotation · v{activeQuote.version || 1}</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.2 }}>{activeQuote.title || `${project.title || 'Project'} Quotation`}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>Issued {activeQuote.date || new Date().toLocaleDateString('en-GB')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-secondary)', letterSpacing: '-.5px' }}>{fmtGHS(qTotal)}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: project.quoteApproved ? '#16A34A' : changesRequested ? '#D97706' : '#6366F1', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>
                    {project.quoteApproved ? '✓ Approved' : changesRequested ? 'Revision Pending' : 'Awaiting Approval'}
                  </div>
                </div>
              </div>

              {/* Scope summary */}
              {activeQuote.scopeSummary && (
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, fontStyle: 'italic' }}>
                  "{activeQuote.scopeSummary}"
                </div>
              )}

              {/* Inclusions / Exclusions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ padding: '14px 20px', borderRight: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>✓ Included</div>
                  {['Product sourcing & materials', 'Procurement management', 'Production & fabrication', 'International shipping to Ghana'].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 7 }}>
                      <span style={{ color: '#16A34A', fontWeight: 900, fontSize: 12, lineHeight: 1.4 }}>·</span>
                      <span style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>✗ Excluded</div>
                  {['On-site installation (billed as a separate add-on)', 'Any out-of-scope purchases not in this quote', 'Client-requested additions after quote approval'].map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 7 }}>
                      <span style={{ color: '#DC2626', fontWeight: 900, fontSize: 12, lineHeight: 1.4 }}>·</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment schedule preview */}
              {qTotal > 0 && (
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', background: '#FAFAFA' }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Payment Schedule (on approval)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {[
                      { pct: '60%', label: 'Initial deposit', trigger: 'Due on contract signing', amount: qTotal * 0.6 },
                      { pct: '30%', label: 'Production balance', trigger: 'Due when production is complete', amount: qTotal * 0.3 },
                      { pct: '10%', label: 'Final arrival balance', trigger: 'Due when goods arrive in Ghana', amount: qTotal * 0.1 },
                    ].map(({ pct, label, trigger, amount }) => (
                      <div key={pct} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--accent-secondary)', minWidth: 32 }}>{pct}</span>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{trigger}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{fmtGHS(amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div style={{ padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => downloadInvoicePDF(activeQuote, project, user, brand)} style={{ padding: '8px 13px', borderRadius: 9, border: '1px solid var(--border-color)', background: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  Download PDF
                </button>
                <button onClick={() => setActiveTab?.('messages')} style={{ padding: '8px 13px', borderRadius: 9, border: '1px solid #25D36640', background: '#F0FDF4', fontSize: 11, fontWeight: 800, cursor: 'pointer', color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  💬 Message Project Manager
                </button>
                <a href={pmWA} target="_blank" rel="noreferrer" style={{ padding: '8px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                  or WhatsApp
                </a>
              </div>
            </div>

            {/* ── Client response area ─────────────────── */}
            {!project.quoteApproved && !changesRequested && (
              <div style={{ borderRadius: 18, border: '1.5px solid var(--border-color)', overflow: 'hidden', background: '#fff' }}>

                {/* Action tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                  {[
                    { key: 'approve', label: '✓ Approve' },
                    { key: 'request', label: 'Request Changes' },
                    { key: 'counter', label: 'Counter Offer' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => { setQuoteAction(tab.key); setQuoteChangeMessage(''); }}
                      style={{ flex: 1, padding: '12px 8px', border: 'none', background: quoteAction === tab.key ? '#fff' : '#FAFAFA', fontSize: 11, fontWeight: 900, cursor: 'pointer', color: quoteAction === tab.key ? (tab.key === 'approve' ? '#16A34A' : tab.key === 'counter' ? '#7C3AED' : '#DC2626') : 'var(--text-secondary)', borderBottom: quoteAction === tab.key ? `2px solid ${tab.key === 'approve' ? '#16A34A' : tab.key === 'counter' ? '#7C3AED' : '#DC2626'}` : '2px solid transparent', transition: 'all .15s' }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {quoteAction === 'approve' && (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        By approving this quotation you confirm the total of <strong>{fmtGHS(qTotal)}</strong> and the scope above. The project contract will be issued immediately and the 60% initial deposit invoice will become due within 7 days.
                      </div>
                      <button
                        onClick={() => approveQuote && approveQuote(project.id)}
                        style={{ alignSelf: 'flex-end', padding: '11px 22px', borderRadius: 11, border: 'none', background: '#16A34A', color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}
                      >
                        Approve Quotation →
                      </button>
                    </>
                  )}

                  {quoteAction === 'request' && (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Describe exactly what needs to change — scope items, quantities, materials, or a specific amount. The project manager will issue a revised quotation.
                      </div>
                      <textarea
                        value={quoteChangeNote}
                        onChange={e => setQuoteChangeNote(e.target.value)}
                        placeholder="e.g. Please remove the frameless shower enclosure from the scope. The revised total should be below GHS 70,000."
                        rows={4}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--border-color)', resize: 'vertical', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.5 }}
                      />
                      <button
                        onClick={handleQuoteChangeRequest}
                        disabled={quoteChangeBusy || !quoteChangeNote.trim()}
                        style={{ alignSelf: 'flex-end', padding: '11px 18px', borderRadius: 11, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 900, cursor: quoteChangeNote.trim() ? 'pointer' : 'default', opacity: quoteChangeNote.trim() ? 1 : .5 }}
                      >
                        {quoteChangeBusy ? 'Sending…' : 'Send Change Request →'}
                      </button>
                    </>
                  )}

                  {quoteAction === 'counter' && (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Propose a revised total. The project manager will review your offer and respond with an updated quotation or a discussion.
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>GHS</span>
                        <input
                          type="number"
                          value={counterPrice}
                          onChange={e => setCounterPrice(e.target.value)}
                          placeholder="Your proposed total"
                          style={{ flex: 1, padding: '10px 13px', borderRadius: 11, border: '1.5px solid #7C3AED60', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}
                        />
                      </div>
                      <textarea
                        value={quoteChangeNote}
                        onChange={e => setQuoteChangeNote(e.target.value)}
                        placeholder="Optional: explain the basis for your proposed price."
                        rows={3}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11, border: '1px solid var(--border-color)', resize: 'vertical', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.5 }}
                      />
                      <button
                        onClick={handleQuoteChangeRequest}
                        disabled={quoteChangeBusy || !counterPrice}
                        style={{ alignSelf: 'flex-end', padding: '11px 18px', borderRadius: 11, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 12, fontWeight: 900, cursor: counterPrice ? 'pointer' : 'default', opacity: counterPrice ? 1 : .5 }}
                      >
                        {quoteChangeBusy ? 'Sending…' : 'Submit Counter Offer →'}
                      </button>
                    </>
                  )}

                  {quoteChangeMessage && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: quoteChangeMessage.startsWith('Your counter') || quoteChangeMessage.startsWith('Your request') ? '#15803D' : '#DC2626', padding: '10px 13px', borderRadius: 9, background: quoteChangeMessage.startsWith('Your counter') || quoteChangeMessage.startsWith('Your request') ? '#F0FDF4' : '#FEF2F2' }}>
                      {quoteChangeMessage}
                    </div>
                  )}
                </div>
              </div>
            )}

            {changesRequested && !project.quoteApproved && (
              <div style={{ padding: '13px 16px', borderRadius: 14, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412', fontSize: 12, lineHeight: 1.55 }}>
                <strong>Revision in progress.</strong> The project manager is preparing quotation v{Number(activeQuote.version || 1) + 1} based on your feedback. You will be notified when the updated quote is ready.
              </div>
            )}
          </div>
          );
        })()}
        {quoteDocs.length > 1 && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {quoteDocs.length - 1} previous quotation version{quoteDocs.length === 2 ? '' : 's'} retained in the audit history.
          </div>
        )}
        {project.quoteApproved && (
          <div style={{ padding: 14, borderRadius: 14, background: '#F0FDF4', color: '#16A34A', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={15} /> Quote approved — project is moving forward.
          </div>
        )}
      </div>
      )} {/* end Section 2 conditional */}

      {/* Contract Modal */}
      {showContract && (
        <ContractAgreementModal
          project={project}
          user={user}
          brand={brand}
          isMobile={isMobile}
          onClose={() => setShowContract(false)}
          onSigned={() => {
            setContractJustSigned(true);
            setShowContract(false);
          }}
        />
      )}

      {/* ── SECTION 3: Inspection & Sign-off (Stage 7) ───────────── */}
      {project.stageId === 7 && (
        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          <div style={sectionTitleStyle}>③ Site Inspection & Sign-off</div>
          {signOffDone ? (
            <div style={{ padding: 14, borderRadius: 14, background: '#F0FDF4', color: '#16A34A', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={15} /> Inspection signed off — project is moving to handover.
            </div>
          ) : (() => {
            const INSPECTION_ITEMS = [
              { key: 'workmanship', label: 'Workmanship quality meets expectations' },
              { key: 'scope_match', label: 'All items match the agreed scope and specifications' },
              { key: 'surfaces', label: 'All surfaces are clean, finished, and undamaged' },
              { key: 'hardware', label: 'Hardware, fittings, and mechanisms are functional' },
              { key: 'dimensions', label: 'Dimensions and placement are as agreed' },
              { key: 'no_defects', label: 'No visible defects, scratches, or damage observed' },
              { key: 'site_clear', label: 'Site is clear and free of installation debris' },
            ];
            const allChecked = INSPECTION_ITEMS.every(item => inspectionChecks[item.key]);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: '14px 16px', borderRadius: 14, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E', fontSize: 12, lineHeight: 1.6 }}>
                  Our team has completed work and the project is ready for your inspection. Please go through each item below carefully, then sign off to confirm acceptance.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 14, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  {INSPECTION_ITEMS.map((item, idx) => (
                    <label
                      key={item.key}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                        background: inspectionChecks[item.key] ? '#F0FDF4' : (idx % 2 === 0 ? '#FAFAFA' : '#fff'),
                        borderBottom: idx < INSPECTION_ITEMS.length - 1 ? '1px solid var(--border-color)' : 'none',
                        cursor: 'pointer', transition: 'background .15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!inspectionChecks[item.key]}
                        onChange={e => setInspectionChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        style={{ width: 17, height: 17, accentColor: '#16A34A', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 13, color: inspectionChecks[item.key] ? '#15803D' : 'var(--text-primary)', fontWeight: inspectionChecks[item.key] ? 700 : 400, lineHeight: 1.5 }}>
                        {item.label}
                      </span>
                      {inspectionChecks[item.key] && <CheckCircle2 size={14} color="#16A34A" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                    </label>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Additional notes (optional)</div>
                  <textarea
                    value={inspectionNote}
                    onChange={e => setInspectionNote(e.target.value)}
                    placeholder="Any observations or minor snags to record before sign-off…"
                    rows={3}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                  />
                </div>
                {!allChecked && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E', fontSize: 12 }}>
                    Please tick all inspection items before signing off.
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (!allChecked || signOffBusy) return;
                    setSignOffBusy(true);
                    try {
                      await updateDoc(doc(db, 'projects', project.id), {
                        inspectionChecks,
                        inspectionNote: inspectionNote.trim(),
                        inspectionSignedOffAt: new Date().toISOString(),
                      });
                      if (approveSignoff) await approveSignoff(project.id);
                      else if (updateProjectStage) await updateProjectStage(project.id, 8, 'Client signed off on site inspection.');
                      setSignOffDone(true);
                    } finally {
                      setSignOffBusy(false);
                    }
                  }}
                  disabled={!allChecked || signOffBusy}
                  style={{
                    padding: '13px 18px', borderRadius: 12, border: 'none',
                    background: (!allChecked || signOffBusy) ? '#9CA3AF' : '#16A34A',
                    color: '#fff', fontSize: 13, fontWeight: 900,
                    cursor: (!allChecked || signOffBusy) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {signOffBusy
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                    : <><CheckCircle2 size={14} /> Sign Off — I Accept the Completed Work</>}
                </button>
                <div style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center' }}>This action is permanent and advances the project to handover.</div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SECTION 4: Handover & Feedback (Stage 8) ───────────── */}
      {project.stageId === 8 && (
        <div style={{ ...sectionStyle, borderBottom: 'none' }}>
          <div style={sectionTitleStyle}>④ Project Handover & Feedback</div>
          {handoverDone || project.handoverSubmittedAt ? (
            <div style={{ padding: 16, borderRadius: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803D', fontSize: 13, fontWeight: 900 }}>
                <CheckCircle2 size={16} /> Thank you — your feedback has been submitted!
              </div>
              <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
                We're glad to have delivered your project. Your review helps us serve future clients better. Welcome to the Westline Future family!
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE)', border: '1px solid #BAE6FD', color: '#0C4A6E', fontSize: 12, lineHeight: 1.6 }}>
                Your project is complete. We'd love to hear about your experience — your feedback takes less than a minute and means a lot to us.
              </div>

              {/* Star rating */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Overall experience</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setHandoverRating(star)}
                      style={{
                        width: 44, height: 44, borderRadius: 12, border: '1.5px solid',
                        borderColor: handoverRating >= star ? '#F59E0B' : 'var(--border-color)',
                        background: handoverRating >= star ? '#FEF3C7' : '#fff',
                        fontSize: 22, cursor: 'pointer', display: 'grid', placeItems: 'center',
                        transition: 'all .15s',
                      }}
                    >
                      {handoverRating >= star ? '★' : '☆'}
                    </button>
                  ))}
                  {handoverRating > 0 && (
                    <span style={{ alignSelf: 'center', fontSize: 12, color: '#92400E', fontWeight: 700, marginLeft: 4 }}>
                      {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][handoverRating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Your review</div>
                <textarea
                  value={handoverFeedback}
                  onChange={e => setHandoverFeedback(e.target.value)}
                  placeholder="Tell us about the quality of the furniture, delivery experience, communication, and anything else that stood out…"
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
                />
              </div>

              {/* Testimonial consent */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={handoverConsent}
                  onChange={e => setHandoverConsent(e.target.checked)}
                  style={{ width: 17, height: 17, marginTop: 2, accentColor: 'var(--accent-secondary)', flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  I'm happy for Westline Future to share my review as a testimonial on their website and marketing materials.
                </span>
              </label>

              <button
                onClick={async () => {
                  if (!handoverRating || !handoverFeedback.trim() || handoverBusy) return;
                  setHandoverBusy(true);
                  try {
                    await updateDoc(doc(db, 'projects', project.id), {
                      handoverRating,
                      handoverFeedback: handoverFeedback.trim(),
                      handoverTestimonialConsent: handoverConsent,
                      handoverSubmittedAt: new Date().toISOString(),
                      projectLifecycleStatus: 'Completed',
                      status: 'Completed',
                    });
                    setHandoverDone(true);
                  } finally {
                    setHandoverBusy(false);
                  }
                }}
                disabled={!handoverRating || !handoverFeedback.trim() || handoverBusy}
                style={{
                  padding: '13px 18px', borderRadius: 12, border: 'none',
                  background: (!handoverRating || !handoverFeedback.trim() || handoverBusy) ? '#9CA3AF' : 'var(--accent-secondary)',
                  color: '#fff', fontSize: 13, fontWeight: 900,
                  cursor: (!handoverRating || !handoverFeedback.trim() || handoverBusy) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {handoverBusy
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                  : <><CheckCircle2 size={14} /> Submit Feedback & Complete Project</>}
              </button>
              {(!handoverRating || !handoverFeedback.trim()) && (
                <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>A star rating and written review are required to submit.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reconsideration inline modal */}
      {reconsiderTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,.18)' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 6 }}>Request a change?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>Tell your account manager why you'd like to reconsider. They'll get back to you.</div>
            <textarea
              value={reconsiderText}
              onChange={e => setReconsiderText(e.target.value)}
              placeholder="e.g. I'd like to change the material colour before we proceed…"
              rows={3}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => { setReconsiderTarget(null); setReconsiderText(''); }} style={{ flex: 1, height: 42, borderRadius: 10, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button
                disabled={!reconsiderText.trim() || reconsiderBusy}
                onClick={async () => {
                  if (!reconsiderText.trim() || reconsiderBusy) return;
                  setReconsiderBusy(true);
                  try {
                    await updateApproval(reconsiderTarget, { status: 'pending', clientNote: `Reconsideration requested: ${reconsiderText.trim()}`, reconsiderationRequestedAt: new Date().toISOString() });
                    setReconsiderTarget(null);
                    setReconsiderText('');
                  } catch {
                    // silent fail — modal stays open
                  }
                  setReconsiderBusy(false);
                }}
                style={{ flex: 2, height: 42, borderRadius: 10, border: 'none', background: !reconsiderText.trim() ? 'var(--border-color)' : 'var(--accent-secondary)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: !reconsiderText.trim() ? 'default' : 'pointer' }}
              >
                {reconsiderBusy ? 'Sending…' : 'Send to team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientAddOnsTab({ project, addOns: propAddOns = [], invoices: propInvoices = [], user, isMobile }) {
  // Own live queries — bypasses the clientId/UID mismatch in AppContext for phone-auth users
  const [liveAddOns, setLiveAddOns] = useState(null);
  const [liveInvoices, setLiveInvoices] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null);
  const [respondedAddOns, setRespondedAddOns] = useState({});

  useEffect(() => {
    if (!db || !project?.id) return;
    const q = query(collection(db, 'addOns'), where('projectId', '==', project.id));
    return onSnapshot(q, snap => setLiveAddOns(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLiveAddOns([]));
  }, [project?.id]);

  useEffect(() => {
    if (!db || !project?.id) return;
    const q = query(collection(db, 'invoices'), where('projectId', '==', project.id));
    return onSnapshot(q, snap => setLiveInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLiveInvoices([]));
  }, [project?.id]);

  const projectAddOns = liveAddOns ?? propAddOns.filter(a => a.projectId === project.id);
  const allInvoices = liveInvoices ?? propInvoices.filter(i => i.projectId === project.id || i.parentId === project.id);
  const email = user?.proxyEmail || (user?.phone ? user.phone + '@clients.westlinefuture.com' : 'client@clients.westlinefuture.com');
  const parseAmount = value => parseFloat(String(value || '0').replace(/[^0-9.]/g, '')) || 0;
  const cardStyle = { padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' };
  const respondToAddOn = async (addOnId, decision) => {
    const note = decision === 'reject'
      ? window.prompt('Describe the change you need before approving this add-on:')?.trim()
      : '';
    if (decision === 'reject' && !note) return;
    setRespondingTo(addOnId);
    try {
      const respond = httpsCallable(functions, 'respondToProjectAddOn');
      await respond({ addOnId, decision, note });
      setRespondedAddOns(prev => ({ ...prev, [addOnId]: decision }));
    } catch (error) {
      console.error('[ClientAddOnsTab] Failed to respond to add-on:', error);
      alert(error?.message || 'The add-on response could not be recorded.');
    } finally {
      setRespondingTo(null);
    }
  };

  if (liveAddOns === null) {
    return <div style={{ ...cardStyle, padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Loading add-ons…</div>;
  }

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 900, color: `var(--accent-secondary)` }}>Add-ons & Variations</div>
        <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 4 }}>Every approved scope change stays visible with cost, status, and linked payment.</div>
      </div>
      {projectAddOns.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: `var(--text-secondary)`, fontSize: 13 }}>No add-ons or variations have been added to this project.</div>
      ) : projectAddOns.map(addOn => {
        // Admin saves field as `linkedInvoiceId` — check all possible field names
        const linkedInv = allInvoices.find(i =>
          i.id === addOn.linkedInvoiceId ||
          i.id === addOn.invoiceId ||
          i.addOnId === addOn.id
        );
        const amount = parseAmount(addOn.price || addOn.amount || linkedInv?.amount || linkedInv?.total);
        const isPaid = isPaidStatus(linkedInv?.status);
        const awaitingApproval = String(addOn.status || '').toLowerCase() === 'pending approval';
        const unpaid = linkedInv && !isPaid;
        const statusLabel = isPaid ? 'Paid' : addOn.status || 'Pending Payment';
        const statusColor = isPaid ? '#16A34A' : '#D97706';
        const statusBg = isPaid ? '#F0FDF4' : '#FFF7ED';
        return (
          <div key={addOn.id} style={{ padding: 16, borderRadius: 16, border: `1.5px solid ${isPaid ? '#BBF7D040' : 'var(--border-color)'}`, background: isPaid ? '#FAFFFE' : 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: `var(--accent-secondary)` }}>{addOn.title || addOn.description || 'Project Add-on'}</div>
                {addOn.description && addOn.title && (
                  <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 3 }}>{addOn.description}</div>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: 900, color: statusColor, background: statusBg, padding: '4px 9px', borderRadius: 999, height: 24, whiteSpace: 'nowrap', flexShrink: 0 }}>{statusLabel}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: isPaid ? '#16A34A' : `var(--accent-secondary)` }}>
                {amount ? `GH₵ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Pricing pending'}
                {isPaid && <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6 }}>✓ Settled</span>}
              </div>
              {awaitingApproval && (
                respondedAddOns[addOn.id] === 'approve' ? (
                  <div style={{ fontSize: 12, color: '#15803D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle2 size={14} color="#15803D" /> Approved — invoice being prepared
                  </div>
                ) : respondedAddOns[addOn.id] === 'reject' ? (
                  <div style={{ fontSize: 12, color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={14} color="#D97706" /> Change request sent — PM will follow up
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
                    <button
                      type="button"
                      disabled={respondingTo === addOn.id}
                      onClick={() => respondToAddOn(addOn.id, 'reject')}
                      style={{ flex: 1, minHeight: 42, padding: '0 14px', borderRadius: 10, border: '1px solid #DC2626', background: '#fff', color: '#B91C1C', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Request changes
                    </button>
                    <button
                      type="button"
                      disabled={respondingTo === addOn.id}
                      onClick={() => respondToAddOn(addOn.id, 'approve')}
                      style={{ flex: 1, minHeight: 42, padding: '0 18px', borderRadius: 10, border: 'none', background: '#166534', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {respondingTo === addOn.id ? 'Saving...' : 'Approve add-on'}
                    </button>
                  </div>
                )
              )}
              {unpaid && amount > 0 && (
                <div style={{ width: isMobile ? '100%' : 260, maxWidth: '100%' }}>
                  <UnifiedPaymentGateway
                    label={`Pay Add-on — GH₵ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    amountGHS={amount}
                    email={email}
                    projectId={project.id}
                    invoiceId={linkedInv.id}
                    paymentType="addon"
                    onSuccess={() => window.location.reload()}
                    onError={(err) => alert("Verification Error: " + err)}
                  />
                </div>
              )}
              {!linkedInv && !awaitingApproval && amount === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Invoice being prepared by your account manager.</div>
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

function ShippingTrackerCard({ project, invoices = [] }) {
  const sd = project.shippingDetails;
  if ((project.stageId || 0) < 5) return null;

  if (!sd?.vesselName) return null;

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
function DocumentsTab({ projectId, project, user, brand, isMobile, invoices = [] }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    if (!db || !projectId) { setLoading(false); return; }
    const q = query(
      collection(db, 'projects', projectId, 'documents'),
      where('clientVisible', '==', true),
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

  const specification = (
    <SpecApprovalCard
      project={project}
      user={user}
      brand={brand}
      isMobile={isMobile}
      invoices={invoices}
    />
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {specification}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 14, background: `var(--border-color)`, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {specification}
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#fff', borderRadius: 20, border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📂</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 8 }}>No other documents yet</div>
          <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
            Quotations, bills of lading, completion certificates, and other official project files will appear here as they are issued.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {viewingDoc && <DocViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {specification}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {docs.map(doc => {
          const stageInfo = doc.stageId ? CLIENT_PROJECT_STAGES.find(s => s.id === doc.stageId) : null;
          const isSignedSpecification = doc.type === 'signed_project_specification' || doc.documentKind === 'project_specification';
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
                  {isSignedSpecification && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: 10 }}>
                      Signed · Version {Number(doc.version || 1)}
                    </span>
                  )}
                  {uploadedDate && <span style={{ fontSize: 11, color: `var(--text-secondary)` }}>{uploadedDate}</span>}
                  {sizeMB && <span style={{ fontSize: 11, color: `var(--text-secondary)` }}>{sizeMB} MB</span>}
                  {doc.uploadedBy && <span style={{ fontSize: 11, color: `var(--text-secondary)` }}>by {doc.uploadedBy}</span>}
                  {isSignedSpecification && doc.signedBy && <span style={{ fontSize: 11, color: '#166534' }}>signed by {doc.signedBy}</span>}
                </div>
              </div>
              {doc.type === 'handover' ? (
                <div style={{ flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Project Handover Certificate</title>
<style>
  body { font-family: 'Georgia', serif; background: #f9f6f2; margin: 0; padding: 40px 24px; color: #1a1a1a; }
  .cert { max-width: 760px; margin: 0 auto; background: #fff; border: 2px solid #c9a96e; border-radius: 4px; padding: 64px 72px; text-align: center; box-shadow: 0 8px 40px rgba(0,0,0,.1); }
  .logo { font-size: 13px; font-weight: 700; letter-spacing: .3em; text-transform: uppercase; color: #6b4f1f; margin-bottom: 8px; }
  .divider { height: 1px; background: linear-gradient(90deg, transparent, #c9a96e, transparent); margin: 24px auto; width: 80%; }
  .title { font-size: 32px; font-weight: 400; letter-spacing: .12em; text-transform: uppercase; color: #1a1a1a; margin: 0 0 8px; }
  .subtitle { font-size: 12px; letter-spacing: .25em; text-transform: uppercase; color: #8b6d3a; margin-bottom: 40px; }
  .body { font-size: 15px; line-height: 1.9; color: #333; max-width: 560px; margin: 0 auto 40px; }
  .project { font-size: 22px; font-weight: 700; color: #1a1a1a; border-bottom: 1.5px solid #c9a96e; display: inline-block; padding-bottom: 4px; margin: 8px 0 24px; }
  .meta { display: flex; justify-content: center; gap: 48px; margin: 40px 0; }
  .meta-item { text-align: center; }
  .meta-label { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: #8b6d3a; margin-bottom: 6px; }
  .meta-value { font-size: 14px; font-weight: 700; color: #1a1a1a; }
  .seal { width: 90px; height: 90px; border-radius: 50%; border: 2px solid #c9a96e; display: flex; align-items: center; justify-content: center; margin: 32px auto 0; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #6b4f1f; line-height: 1.5; }
  @media print { body { background: #fff; padding: 0; } .cert { box-shadow: none; border: 1.5px solid #c9a96e; } }
</style></head><body>
<div class="cert">
  <div class="logo">Westline Future</div>
  <div class="divider"></div>
  <div class="title">Certificate of Completion</div>
  <div class="subtitle">Project Handover &amp; Acceptance</div>
  <div class="body">
    This is to certify that the interior design and installation project described below has been completed to the agreed scope and specification,
    and has been accepted by the client on the date shown. All contractual obligations have been fulfilled.
  </div>
  <div class="project">${doc.projectTitle || 'Interior Design Project'}</div>
  <div class="meta">
    <div class="meta-item"><div class="meta-label">Client</div><div class="meta-value">${doc.clientName || '—'}</div></div>
    <div class="meta-item"><div class="meta-label">Project Type</div><div class="meta-value">${doc.projectType || 'Interior Design'}</div></div>
    <div class="meta-item"><div class="meta-label">Handover Date</div><div class="meta-value">${doc.handoverDate || '—'}</div></div>
  </div>
  <div class="divider"></div>
  <div class="seal">Official<br>Handover<br>Issued</div>
</div>
<div style="text-align:center;margin-top:24px;font-size:11px;color:#999;">Westline Future · Ghana · westlinefuture.com · Print this page or save as PDF</div>
</body></html>`;
                      const w = window.open('', '_blank');
                      if (w) { w.document.write(html); w.document.close(); }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 10,
                      background: '#78350F', color: '#fff',
                      fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                    }}
                  >
                    <Award size={13} /> View Certificate
                  </button>
                </div>
              ) : doc.url ? (
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
              ) : null}
            </div>
          );
          })}
        </div>
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
  const hasBd = breakdown.product?.enabled || breakdown.shipping?.enabled || breakdown.installation?.enabled || (breakdown.extras?.length > 0);
  if (!hasBd) return null;

  const BD_ROWS = [
    { key: 'product',      label: 'Product / Materials',  color: `var(--accent-secondary)` },
    { key: 'shipping',     label: 'Shipping & Freight',   color: `var(--text-secondary)` },
    { key: 'installation', label: 'Installation Labour',  color: '#D97706' },
  ].filter(r => breakdown[r.key]?.enabled && breakdown[r.key]?.amount > 0);

  const extraRows = (breakdown.extras || []).filter(e => e.amount > 0);
  const bdSubtotal = BD_ROWS.reduce((s, r) => s + (breakdown[r.key]?.amount || 0), 0)
    + extraRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);

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

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: `var(--accent-secondary)` }}>Total Project Value</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: `var(--accent-secondary)` }}>{fmt(bdSubtotal)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────
function PaymentsTab({ project, user, transactions: propTxns, invoices: propInvs, brand, isMobile, finSettings = {} }) {
  const budget = Number(project.budget) || 0;
  const USD_RATE = Number(brand?.finSettings?.exchangeRate || brand?.exchangeRate) || 15.5;
  const [showUSD, setShowUSD] = useState(
    user?.currency === 'USD' || project?.currency === 'USD'
  );
  const [livePayments, setLivePayments] = useState(null);
  const [liveInvoices, setLiveInvoices] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [offlineMethod, setOfflineMethod] = useState(null); // 'bank' | 'cash' | null
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);
  const [offlineSubmitted, setOfflineSubmitted] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

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
    // Run two queries: some invoices use parentId, others use projectId
    // Merge and deduplicate by document id
    let byParent = [];
    let byProject = [];
    const merge = () => {
      const seen = {};
      [...byParent, ...byProject].forEach(inv => { seen[inv.id] = inv; });
      setLiveInvoices(Object.values(seen));
    };
    const q1 = query(collection(db, 'invoices'), where('parentId', '==', project.id));
    const q2 = query(collection(db, 'invoices'), where('projectId', '==', project.id));
    const unsub1 = onSnapshot(q1, snap => { byParent = snap.docs.map(d => ({ id: d.id, ...d.data() })); merge(); }, () => { byParent = []; merge(); });
    const unsub2 = onSnapshot(q2, snap => { byProject = snap.docs.map(d => ({ id: d.id, ...d.data() })); merge(); }, () => { byProject = []; merge(); });
    return () => { unsub1(); unsub2(); };
  }, [project?.id]);

  const uid = user?.id || user?.uid || user?.phone;
  const allPayments = livePayments
    ?? (propTxns || []).filter(t => t.projectId === project.id);
  const rawInvoices = liveInvoices
    ?? (propInvs || []).filter(i => i.projectId === project.id || i.parentId === project.id);
  const allInvoices = rawInvoices.filter(invoice => {
    const status = String(invoice.status || '').toLowerCase();
    const isQuotation = ['quotation', 'quote'].includes(String(invoice.type || '').toLowerCase()) ||
      ['quotation', 'quote'].includes(String(invoice.documentKind || '').toLowerCase()) ||
      String(invoice.invoiceType || '').toLowerCase() === 'quotation';
    return !isQuotation &&
      invoice.internalOnly !== true &&
      invoice.clientVisible !== false &&
      status !== 'draft' &&
      status !== 'void';
  });

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

  // Which project stage triggers each standard milestone key
  const MILESTONE_TRIGGERS = {
    'initial-deposit':          { stage: 3, label: 'After contract signing',   stageLabel: 'Stage 3 — Contract & Payment' },
    'pre-installation-balance': { stage: 5, label: 'After arrival in Ghana',    stageLabel: 'Stage 5 — Shipping' },
    'post-rendering':  { stage: 3, label: 'After rendering approval',  stageLabel: 'Stage 3 — Quote' },
    'post-production': { stage: 5, label: 'After production complete', stageLabel: 'Stage 5 — Delivery' },
    'post-shipping':   { stage: 7, label: 'After delivery',            stageLabel: 'Stage 7 — Inspection' },
  };

  const getMilestoneStatus = (m) => {
    if (budget <= 0) return 'upcoming';
    // Check if the linked Firestore invoice is paid
    const linkedInv = allInvoices.find(i => i.milestoneKey === m.key);
    if (linkedInv && ['paid', 'paid in full'].includes(String(linkedInv.status || '').toLowerCase().trim())) return 'paid';
    // Check if cumulative payment total covers this milestone
    if (totalPaid >= budget * m.cumPct - 0.01) return 'paid';
    // Determine if this milestone has been triggered (stage reached OR invoice activated by admin)
    const trigger = MILESTONE_TRIGGERS[m.key];
    const workflowGateReached = m.key === 'initial-deposit'
      ? project.contractAccepted === true
      : m.key === 'pre-installation-balance'
        ? project.goodsArrivedInGhana === true
        : true;
    const stageReached = workflowGateReached && (!trigger || (project.stageId || 1) >= trigger.stage);
    const invoiceActivated = linkedInv && (linkedInv.due || ['Sent', 'Overdue'].includes(linkedInv.status));
    if (stageReached || invoiceActivated) {
      // Only show as "due" if previous milestones are settled
      if (totalPaid >= budget * (m.cumPct - m.pct) - 0.01) return 'due';
    }
    return 'upcoming';
  };
  const currentDueMilestone = activeMilestones.find(m => getMilestoneStatus(m) === 'due');
  const currentDueMilestoneInv = currentDueMilestone
    ? (allInvoices.find(i => i.milestoneKey === currentDueMilestone.key)
        || rawInvoices.find(i => i.milestoneKey === currentDueMilestone.key))
    : null;
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

      {/* ── Cost breakdown (if set by admin) ── */}
      <CostBreakdownCard project={project} fmt={fmt} card={card} pad={pad} isMobile={isMobile} />

      {/* ── A. Payment schedule ── */}
      <div style={{ ...card, padding: pad, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={sectionTitle}>Payment Schedule</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: -10 }}>
              {scheduleConfig.label}
            </div>
          </div>
          <button
            onClick={() => setShowUSD(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 13px', borderRadius: 20,
              background: showUSD ? `var(--accent-secondary)` : `var(--bg-secondary)`,
              border: `1.5px solid ${showUSD ? `var(--accent-secondary)` : `var(--border-color)`}`,
              color: showUSD ? '#fff' : `var(--text-secondary)`,
              fontSize: 11, fontWeight: 800, cursor: 'pointer',
              touchAction: 'manipulation', transition: 'all .2s', flexShrink: 0,
            }}
          >
            {showUSD ? '🇬🇭 GHS' : '🇺🇸 USD'}
          </button>
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
              const trigger = MILESTONE_TRIGGERS[m.key];
              const linkedInv = allInvoices.find(i => i.milestoneKey === m.key);
              const dueDateStr = linkedInv?.due
                ? new Date(linkedInv.due + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : null;
              return (
                <div key={m.key} style={{
                  borderRadius: 16,
                  background: '#FAFAF9',
                  border: '1.5px solid var(--border-color)',
                  overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 14, padding: isMobile ? '13px 14px' : '15px 18px' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isPaid ? '#16A34A' : isDue ? '#D1FAE5' : `var(--border-color)`,
                      border: isDue ? '2px solid #16A34A60' : 'none',
                    }}>
                      {isPaid
                        ? <Check size={14} color="#fff" />
                        : <span style={{ fontSize: 12, fontWeight: 900, color: isDue ? '#15803D' : `var(--text-secondary)` }}>{idx + 1}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{m.label}</div>
                      {budget > 0 && (
                        <div style={{ fontSize: 14, fontWeight: 900, color: isPaid ? '#16A34A' : isDue ? '#15803D' : `var(--text-secondary)`, marginTop: 1 }}>
                          {fmt(budget * m.pct)}
                        </div>
                      )}
                      {trigger && (
                        <div style={{ fontSize: 10, color: `var(--text-secondary)`, fontWeight: 600, marginTop: 2 }}>
                          {trigger.label} · {trigger.stageLabel}
                        </div>
                      )}
                      {isDue && dueDateStr && (
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#B45309', marginTop: 3 }}>⏰ Due by {dueDateStr}</div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {isPaid && <span style={{ fontSize: 10, fontWeight: 800, color: '#065F46', background: '#D1FAE5', padding: '4px 10px', borderRadius: 20 }}>Paid ✓</span>}
                      {isDue && <span style={{ fontSize: 10, fontWeight: 800, color: '#14532D', background: '#BBFAD5', padding: '4px 10px', borderRadius: 20 }}>Due Now</span>}
                      {status === 'upcoming' && <span style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, background: `var(--border-color)`, padding: '4px 10px', borderRadius: 20 }}>Upcoming</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            {currentDueMilestone && budget > 0 && (
              <div style={{ marginTop: 10, padding: '18px 20px', borderRadius: 16, background: '#FAFAF9', border: '1.5px solid var(--border-color)' }}>
                {paySuccess ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 0', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={28} color="#16A34A" />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#14532D' }}>Payment Confirmed!</div>
                    <div style={{ fontSize: 13, color: '#15803D' }}>Your payment has been received. The team has been notified and your project will advance shortly.</div>
                  </div>
                ) : offlineSubmitted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={24} color="#3B82F6" />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1D4ED8' }}>Payment Notified</div>
                    <div style={{ fontSize: 12, color: '#3B82F6', lineHeight: 1.5 }}>The team will verify your {offlineMethod === 'bank' ? 'bank transfer' : 'cash payment'} and confirm within 1 business day.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CreditCard size={18} color="#15803D" />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#14532D' }}>Payment Due</div>
                        <div style={{ fontSize: 13, color: '#15803D', fontWeight: 700, marginTop: 2 }}>{currentDueMilestone.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#14532D', marginTop: 4 }}>{fmt(budget * currentDueMilestone.pct)}</div>
                        {currentDueMilestoneInv?.due && (
                          <div style={{ fontSize: 11, color: '#B45309', fontWeight: 700, marginTop: 3 }}>
                            ⏰ Due by {new Date(currentDueMilestoneInv.due + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>

                    {!offlineMethod ? (
                      <>
                        <UnifiedPaymentGateway
                          label={`Pay ${fmt(budget * currentDueMilestone.pct)} Now`}
                          amountGHS={budget * currentDueMilestone.pct}
                          email={email}
                          projectId={project?.id}
                          invoiceId={currentDueMilestoneInv?.id}
                          paymentType={isInitialProjectDepositInvoice(currentDueMilestoneInv) ? 'deposit' : 'milestone'}
                          onSuccess={async () => { setPaySuccess(true); }}
                        />
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => setOfflineMethod('bank')} style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            🏦 Bank Transfer
                          </button>
                          <button onClick={() => setOfflineMethod('cash')} style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            💵 Cash / In-Person
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button onClick={() => setOfflineMethod(null)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}>← Back to payment options</button>
                        {offlineMethod === 'bank' ? (
                          <div style={{ padding: '16px 18px', background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#15803D', marginBottom: 8 }}>🏦 Bank Account Details</div>
                            {finSettings.bankDetails ? (
                              <div style={{ fontSize: 13, color: '#166534', lineHeight: 2, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{finSettings.bankDetails}</div>
                            ) : (
                              <div style={{ fontSize: 13, color: '#166534' }}>Contact the team for bank account details.</div>
                            )}
                            <div style={{ marginTop: 10, padding: '8px 12px', background: '#DCFCE7', borderRadius: 8, fontSize: 11, color: '#166534', fontWeight: 700 }}>
                              Reference: {currentDueMilestoneInv?.invoiceNumber || currentDueMilestone.label} / {project.title}
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '16px 18px', background: '#FAF5FF', border: '1.5px solid #E9D5FF', borderRadius: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#6D28D9', marginBottom: 8 }}>💵 In-Person Payment</div>
                            <div style={{ fontSize: 13, color: '#5B21B6', lineHeight: 1.6 }}>Visit our office or arrange a courier. Reference your invoice when paying.</div>
                            {finSettings.officeAddress && <div style={{ marginTop: 8, fontSize: 12, color: '#7C3AED', fontWeight: 700 }}>📍 {finSettings.officeAddress}</div>}
                          </div>
                        )}
                        <button
                          disabled={offlineSubmitting}
                          onClick={async () => {
                            if (offlineSubmitting) return;
                            setOfflineSubmitting(true);
                            try {
                              const submitOfflinePayment = httpsCallable(functions, 'submitOfflinePayment');
                              await submitOfflinePayment({
                                projectId: project.id,
                                invoiceId: currentDueMilestoneInv?.id || null,
                                amount: currentDueMilestoneInv
                                  ? parseAmount(currentDueMilestoneInv.amount || currentDueMilestoneInv.total)
                                  : budget * currentDueMilestone.pct,
                                method: offlineMethod === 'bank' ? 'bank' : 'cash',
                                reference: '',
                              });
                              setOfflineSubmitted(true);
                            } catch (e) { console.error(e); } finally { setOfflineSubmitting(false); }
                          }}
                          style={{ width: '100%', padding: '13px 18px', borderRadius: 12, border: 'none', background: offlineMethod === 'bank' ? '#16A34A' : '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 800, cursor: offlineSubmitting ? 'default' : 'pointer', opacity: offlineSubmitting ? 0.7 : 1 }}
                        >
                          {offlineSubmitting ? 'Submitting…' : offlineMethod === 'bank' ? "I've Made the Transfer" : "Notify Team — Paying In Person"}
                        </button>
                      </div>
                    )}
                  </>
                )}
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
                      {inv.title || `Invoice #${inv.invoiceNumber || (inv.id || '').slice(0, 8).toUpperCase()}`}
                    </div>
                    <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginBottom: 6 }}>
                      {inv.invoiceNumber ? `#${inv.invoiceNumber} · ` : ''}{fmtDate(inv.createdAt || inv.date)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)` }}>{fmt(parseAmount(inv.amount || inv.total))}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                        background: inv.status === 'Paid' ? '#D1FAE5' : inv.status === 'Overdue' ? '#FEE2E2' : '#FEF3C7',
                        color: inv.status === 'Paid' ? '#065F46' : inv.status === 'Overdue' ? '#991B1B' : '#92400E',
                      }}>
                        {inv.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', padding: isMobile ? '9px 14px' : '9px 18px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setViewInvoice(inv)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 10, background: `var(--accent-secondary)`, border: 'none', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', touchAction: 'manipulation', minHeight: 34 }}
                  >
                    <FileText size={12} /> View Invoice
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Invoice Viewer Modal (same design as admin) ── */}
      {viewInvoice && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: isMobile ? '16px 0 0' : '32px 20px', overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setViewInvoice(null); }}
        >
          <div style={{ background: '#fff', borderRadius: isMobile ? '24px 24px 0 0' : 20, width: '100%', maxWidth: 860, boxShadow: '0 40px 100px rgba(0,0,0,0.3)', overflow: 'hidden', marginBottom: isMobile ? 0 : 32 }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border-color)', background: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)` }}>
                  {viewInvoice.title || `Invoice #${viewInvoice.invoiceNumber || (viewInvoice.id || '').slice(0, 8).toUpperCase()}`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {fmtDate(viewInvoice.createdAt || viewInvoice.date)} · {viewInvoice.status || 'Pending'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => {
                    const el = document.getElementById('client-invoice-doc');
                    if (!el) return;
                    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${viewInvoice.title || 'Invoice'}</title><style>@page{size:A4;margin:0}body{margin:0;background:#fff;font-family:sans-serif}#client-invoice-doc{width:210mm;min-height:297mm;margin:0 auto}@media print{button{display:none!important}}</style></head><body><div id="client-invoice-doc">${el.innerHTML}</div><script>window.onload=()=>{setTimeout(()=>{window.print();},500);};</script></body></html>`;
                    const win = window.open('', '_blank');
                    if (!win) return;
                    win.document.open();
                    win.document.write(html);
                    win.document.close();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: `var(--accent-secondary)`, border: 'none', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
                >
                  <Printer size={13} /> Print / Download PDF
                </button>
                <button
                  onClick={() => setViewInvoice(null)}
                  style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Invoice document — same InvoiceDocument component as admin portal */}
            <div style={{ overflowY: 'auto', maxHeight: isMobile ? '75vh' : '72vh', padding: isMobile ? '16px' : '24px', background: '#e8e4de' }}>
              <div id="client-invoice-doc" style={{ background: '#fff', boxShadow: '0 4px 32px rgba(0,0,0,0.12)', borderRadius: 4 }}>
                <InvoiceDocument
                  inv={{
                    ...viewInvoice,
                    projectBudget: Number(project.budget || project.projectTotal || 0),
                    projectPaidAmount: Number(project.paidAmount || 0),
                    paymentSchedule: project.paymentSchedule || 'standard',
                    projectTitle: project.title || project.name,
                  }}
                  isQuote={viewInvoice.type === 'Quotation' || viewInvoice.documentKind === 'quotation'}
                  finSettings={brand?.finSettings || {}}
                  brand={brand}
                />
              </div>
            </div>

            {/* Pay button at bottom if unpaid */}
            {!isPaidStatus(viewInvoice.status) && parseAmount(viewInvoice.amount || viewInvoice.total) > 0 && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: '#fff' }}>
                <UnifiedPaymentGateway
                  label={`Pay ${fmt(parseAmount(viewInvoice.amount || viewInvoice.total))}`}
                  amountGHS={parseAmount(viewInvoice.amount || viewInvoice.total)}
                  email={email}
                  projectId={project.id}
                  invoiceId={viewInvoice.id}
                  paymentType={viewInvoice.documentKind === 'receipt' ? 'receipt' : (
                    ((viewInvoice.type || '').toLowerCase().includes('deposit') || (viewInvoice.title || '').toLowerCase().includes('deposit')) ? 'deposit' : 'invoice'
                  )}
                  onSuccess={() => window.location.reload()}
                  onError={(err) => alert("Verification Error: " + err)}
                />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

function StageTimeline({ project, onRequestChange, isMobile, onStageClick }) {
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

  // Use calculateTimeline to respect admin-set duration overrides
  const computedTimeline = calculateTimeline(project.createdAt, project.timeline || {}, applicableStages);
  const totalDays = Object.values(computedTimeline).reduce((sum, s) => sum + (s.durationDays || 0), 0);

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
            <div style={{ fontSize: 12, fontWeight: 800, color: ac }}>~{totalDays} days</div>
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
        /* ── Mobile: vertical stage trail — past stages collapsed ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Past stages: compact row of checkmarks */}
          {applicableStages.filter(s => (project.stageId || 1) > s.id).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0 12px 0', marginBottom: 4, borderBottom: '1px solid var(--border-color)' }}>
              {applicableStages.filter(s => (project.stageId || 1) > s.id).map(s => (
                <div key={s.id} title={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={11} color="#fff" />
                  </div>
                </div>
              ))}
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700 }}>
                {applicableStages.filter(s => (project.stageId || 1) > s.id).length} stage{applicableStages.filter(s => (project.stageId || 1) > s.id).length !== 1 ? 's' : ''} completed ✓
              </span>
            </div>
          )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {applicableStages.filter(s => s.id >= (project.stageId || 1)).map((s, idx) => {
            const isCurrent = s.id === project.stageId;
            const isPast = (project.stageId || 1) > s.id;
            const histEntry = (project.stageHistory || []).find(h => h.stageId === s.id);
            const enteredDate = histEntry?.timestamp ? fmtShort(histEntry.timestamp) : null;
            const isLast = idx === applicableStages.length - 1;
            const dotColor = isPast ? s.color : isCurrent ? s.color : '#DFD9D1';
            const dotBg = isPast ? s.color : isCurrent ? '#fff' : '#F5F3F0';
            const dotBorder = isPast ? s.color : isCurrent ? s.color : `var(--border-color)`;
            return (
              <div key={s.id} data-current={isCurrent ? 'true' : 'false'} onClick={() => onStageClick && onStageClick(s)} style={{ cursor: onStageClick ? 'pointer' : 'default', display: 'flex', gap: 14, alignItems: 'stretch', minHeight: isCurrent ? 64 : 48 }}>
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
                  {computedTimeline[s.id] && (
                    <div style={{ fontSize: 10, color: isCurrent ? s.color : `var(--text-secondary)`, fontWeight: isCurrent ? 800 : 600, marginTop: 1 }}>
                      ~{computedTimeline[s.id].durationDays} day{computedTimeline[s.id].durationDays !== 1 ? 's' : ''}
                    </div>
                  )}
                  {computedTimeline[s.id] && !isPast && (
                    <div style={{ fontSize: 10, color: `var(--text-secondary)`, marginTop: 1, lineHeight: 1.4 }}>
                      {new Date(computedTimeline[s.id].startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {' → '}
                      {new Date(computedTimeline[s.id].endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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
                {computedTimeline[s.id] && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: isCurrent ? s.color : '#C4B9AE', textAlign: 'center', background: isCurrent ? `${s.color}10` : 'transparent', padding: isCurrent ? '1px 6px' : 0, borderRadius: 20 }}>
                    ~{computedTimeline[s.id].durationDays}d
                  </div>
                )}
                {computedTimeline[s.id] && !isPast && (
                  <div style={{ fontSize: 8, color: `var(--text-secondary)`, textAlign: 'center', lineHeight: 1.3 }}>
                    {new Date(computedTimeline[s.id].startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {' – '}
                    {new Date(computedTimeline[s.id].endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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

// ─── Project Roadmap ──────────────────────────────────────────────────────────
// A full-journey vertical timeline that guides the client step-by-step through
// the entire project lifecycle, highlighting what they need to do next.
function ProjectRoadmap({ project, invoices = [], renderingPackages = [], setActiveTab, isMobile, onStageGuide }) {
  const applicableStages = CLIENT_PROJECT_STAGES.filter(s => {
    const typeStages = PROJECT_TYPES[project.projectType]?.stages || CLIENT_PROJECT_STAGES.map(s => s.id);
    return typeStages.includes(s.id);
  });
  const projectInvoices = invoices.filter(i => i.projectId === project.id || i.parentId === project.id);
  const currentStageId = Math.max(
    Number(project.stageId || 1),
    Number(workflowProgress(project, {
      invoices: projectInvoices,
      renderingPackages,
    }).meta?.stageId || 1)
  );
  const hasUnpaidInvoice = projectInvoices.some(i =>
    !['paid','paid in full'].includes(String(i.status || '').toLowerCase()) &&
    i.type !== 'Quotation' && i.documentKind !== 'quotation' &&
    (i.status === 'Overdue' || i.status === 'Sent' || (i.due != null && i.due !== ''))
  );
  const quotationRecords = projectInvoices
    .filter(i => ['Quotation','quote','quotation'].includes(i.type || i.documentKind))
    .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
  const activeQuotation = quotationRecords.find(quote => quote.id === project.activeQuoteId) ||
    quotationRecords.find(quote => !['superseded', 'cancelled'].includes(String(quote.status || '').toLowerCase()));
  const hasUnpaidQuote = Boolean(activeQuotation && String(activeQuotation.status || '').toLowerCase() !== 'approved');
  const quoteRevisionPending = String(activeQuotation?.status || '').toLowerCase() === 'changes requested' ||
    project.quoteChangeRequested === true;
  const contractSigned = !!project.contractAccepted;
  const briefSigned = project.productionAuthorized === true || project.specDoc?.status === 'signed';
  const renderingPkg = (renderingPackages || []).find(p => p.projectId === project.id);
  const renderingUnlocked = renderingPkg?.unlocked || renderingPkg?.status === 'Paid / Unlocked' || !!project.renderingFeePaid;
  const renderingApproved = !!project.renderingApproved;

  // Per-stage client guidance
  const siteVisitScheduled = project.siteVisit?.status === 'scheduled';
  const siteVisitCompleted = project.siteVisit?.status === 'completed' || project.siteSurveyCompleted === true;
  const stageGuidance = {
    1: { who: !project.renderingFeePaid ? 'client' : !siteVisitScheduled && !siteVisitCompleted ? 'client' : siteVisitCompleted ? 'done' : 'westline',
         msg: !project.renderingFeePaid
           ? 'Pay the rendering fee to begin the measured design journey.'
           : !siteVisitScheduled && !siteVisitCompleted
             ? 'Choose a date and time for our technical team to visit your site.'
             : !siteVisitCompleted
               ? 'Your technical site visit is scheduled. Please ensure the team can access the project area.'
               : 'The technical survey and measurements are complete.' },
    2: { who: renderingApproved ? 'done' : 'client',
         msg: !renderingUnlocked
           ? 'The design team is preparing your rendering from the completed site measurements.'
           : !renderingApproved
             ? 'Review the rendering, request revisions if needed, or approve the final version.'
             : 'Your final rendering is approved and the quotation can now be negotiated.',
         action: renderingUnlocked && !renderingApproved ? { label: 'Review Design →', tab: 'designs' } : null,
    },
    3: { who: briefSigned ? 'done' : 'client',
         msg: briefSigned
           ? 'The quotation, contract, initial payment, and final deliverables are approved. Production is authorised.'
           : quoteRevisionPending
             ? 'Your quotation feedback was sent. The project manager is preparing a revised version.'
             : !project.quoteApproved && hasUnpaidQuote
               ? 'Review the quotation. Approve the agreed cost or request a revised version.'
             : project.quoteApproved && !contractSigned
               ? 'The quotation is approved. Review and sign the project contract and terms.'
               : contractSigned && !project.depositPaid && !project.initialDepositPaid
                 ? 'Your contract is signed. Complete the initial project payment.'
                 : (project.depositPaid || project.initialDepositPaid) && !project.specDoc?.url
                   ? 'Westline Future is preparing your final drawings, bill of materials, scope, and deliverables.'
                   : project.specDoc?.url && !briefSigned
                     ? 'Review and sign the final deliverables document to authorise production.'
           : hasUnpaidQuote
             ? 'Your quotation is ready for review.'
             : 'We are preparing your quotation for cost negotiation.',
         action: hasUnpaidQuote ? { label: quoteRevisionPending ? 'View Negotiation →' : 'Review Quote →', tab: 'vault' } : null,
    },
    4: { who: 'westline', msg: 'We are procuring your materials and fabricating your custom furniture and fixtures at our production facility.' },
    5: { who: project.goodsArrivedInGhana && !project.goodsBalancePaid ? 'client' : 'westline',
         msg: !project.goodsArrivedInGhana
           ? 'Your goods are in transit to Ghana. Shipping details and ETA remain available during the journey.'
           : !project.goodsBalancePaid
             ? 'Your goods have arrived in Ghana. Pay the final goods balance before delivery to site.'
             : !project.installationFeePaid && project.projectType !== 'buy-only'
               ? 'The goods balance is cleared. Approve and pay the separate installation-service invoice.'
               : 'All pre-installation payments are complete. Westline Future is scheduling the field crew.',
         action: project.goodsArrivedInGhana && (!project.goodsBalancePaid || !project.installationFeePaid) ? { label: 'Open Payments →', tab: 'financials' } : null,
    },
    6: { who: 'westline', msg: 'The final goods balance and separate installation service are paid. Our crew is on-site completing installation.' },
    7: { who: 'client', msg: 'Installation is complete! Please inspect the finished work carefully. If you are happy, please sign off so we can close the project.',
         action: { label: 'Inspect & Sign Off →', tab: 'documents' },
    },
    8: { who: 'done',
         msg: 'Your project is complete. Handover documents and warranty information remain available in your portal.',
         action: null,
    },
  };

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: isMobile ? '16px 20px 14px' : '18px 26px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MapIcon size={16} color="var(--accent-primary)" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-secondary)' }}>Your Project Journey</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>Step-by-step guide from start to handover</div>
        </div>
      </div>

      {/* Stage List */}
      <div style={{ padding: isMobile ? '12px 16px' : '16px 26px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {applicableStages.map((stage, idx) => {
          const isPast = currentStageId > stage.id;
          const isCurrent = currentStageId === stage.id;
          const isFuture = currentStageId < stage.id;
          const isLast = idx === applicableStages.length - 1;
          const guidance = stageGuidance[stage.id] || { who: 'westline', msg: stage.clientMsg };
          const needsAction = isCurrent && guidance.who === 'client';
          const isDone = isPast || (isCurrent && guidance.who === 'done');

          const dotColor = isDone ? '#16A34A' : isCurrent ? (needsAction ? '#D97706' : 'var(--accent-primary)') : 'var(--border-color)';
          const dotBg = isDone ? '#F0FDF4' : isCurrent ? (needsAction ? '#FFF7ED' : '#FDFAF6') : 'var(--bg-secondary)';

          return (
            <div key={stage.id} onClick={() => onStageGuide?.(stage)} style={{ cursor: 'pointer', display: 'flex', gap: 14, position: 'relative', transition: 'all 0.2s', padding: '8px 0' }}>
              {/* Connector line */}
              {!isLast && (
                <div style={{
                  position: 'absolute', left: isMobile ? 19 : 21, top: 40, bottom: 0,
                  width: 2, background: isDone ? '#16A34A40' : 'var(--border-color)',
                  zIndex: 0,
                }} />
              )}
              {/* Dot */}
              <div style={{ flexShrink: 0, zIndex: 1 }}>
                <div style={{
                  width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius: '50%',
                  background: dotBg, border: `2px solid ${dotColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, transition: 'all .2s',
                }}>
                  {isDone ? <CheckCircle2 size={18} color="#16A34A" /> : <span>{stage.emoji}</span>}
                </div>
              </div>
              {/* Content */}
              <div style={{
                flex: 1, paddingBottom: isLast ? 0 : 20,
                paddingTop: 8,
                opacity: isFuture ? 0.45 : 1,
                transition: 'opacity .2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: isCurrent ? 'var(--accent-secondary)' : 'var(--text-primary, #1a1a1a)' }}>
                    {stage.name}
                  </div>
                  {isCurrent && (
                    <div style={{
                      fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em',
                      padding: '2px 8px', borderRadius: 20,
                      background: needsAction ? '#D9770618' : '#16A34A18',
                      color: needsAction ? '#D97706' : '#16A34A',
                      border: `1px solid ${needsAction ? '#D9770630' : '#16A34A30'}`,
                    }}>
                      {needsAction ? '⚡ Action Required' : '● In Progress'}
                    </div>
                  )}
                  {isPast && (
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '.05em' }}>✓ Done</div>
                  )}
                </div>
                {(isCurrent || isPast) && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: guidance.action ? 10 : 0 }}>
                    {guidance.msg}
                  </div>
                )}
                {isFuture && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {stage.clientMsg}
                  </div>
                )}
                {guidance.action && isCurrent && (
                  <button
                    onClick={() => setActiveTab(guidance.action.tab)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 10, border: 'none',
                      background: '#D97706', color: '#fff',
                      fontSize: 12, fontWeight: 800, cursor: 'pointer',
                      transition: 'all .2s',
                    }}
                  >
                    {guidance.action.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div style={{ padding: isMobile ? '12px 20px' : '12px 26px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          💬 Have questions? Tap <strong>Messages</strong> to reach your project manager directly.
        </div>
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
  const bellRef = useRef(null);
  const unread = notifications.filter(n => !n.read);

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    document.addEventListener('touchstart', handle);
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('touchstart', handle); };
  }, [open]);

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Bell size={18} color={unread.length > 0 ? ac : `var(--text-secondary)`} fill={unread.length > 0 ? ac : 'none'} />
        {unread.length > 0 && (
          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread.length > 9 ? '9+' : unread.length}
          </div>
        )}
      </button>
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            // Fixed positioning keeps the panel inside the viewport on all screen sizes.
            // Using right: 12px ensures it never overflows the right edge.
            // Width is capped at 340px but shrinks on narrow screens.
            position: 'fixed',
            top: 70,
            right: 12,
            width: 'min(340px, calc(100vw - 24px))',
            maxHeight: '70vh',
            overflowY: 'auto',
            background: '#fff',
            borderRadius: 18,
            border: '1.5px solid var(--border-color)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            zIndex: 9900,
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', borderRadius: '18px 18px 0 0', zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Notifications</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {unread.length > 0 && (
                <button onClick={() => { notifications.forEach(n => !n.read && onMarkRead?.(n.id)); }} style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: ac, cursor: 'pointer' }}>
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: `var(--text-secondary)`, fontSize: 13 }}>No notifications yet</div>
          ) : (
            notifications.slice(0, 20).map(n => (
              <div key={n.id} onClick={() => { onMarkRead?.(n.id); }} style={{ padding: '14px 20px', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', gap: 12, alignItems: 'flex-start', background: n.read ? '#fff' : '#FAFAF7', cursor: 'pointer', transition: 'background .15s' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? `var(--border-color)` : ac, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: `var(--accent-secondary)`, lineHeight: 1.45, fontWeight: n.read ? 500 : 700, wordBreak: 'break-word' }}>{n.msg || n.message}</div>
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

  const waPhone = (brand?.phone || '').replace(/\D/g, '') || '233247319778';
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
          <div style={{ height: 6, background: `var(--border-color)`, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg, ${ac}, ${ac}CC)`, borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
          {(() => {
            const stg = CLIENT_PROJECT_STAGES.find(s => s.id === (project.stageId || 1));
            return stg?.clientMsg ? (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {stg.clientMsg}
              </div>
            ) : null;
          })()}
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

// ─── Stage Explainer Modal ─────────────────────────────────────────────────
function StageExplainerModal({ stage, onDismiss, ac }) {
  if (!stage) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '20px 0 0 0',
        animation: 'fadeIn .3s ease'
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          width: '100%', maxWidth: 500, background: '#fff',
          borderRadius: '32px 32px 0 0', padding: '32px 24px 40px',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
          animation: 'slideUp .4s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute', top: 20, right: 24, background: 'var(--bg-secondary)',
            border: 'none', width: 32, height: 32, borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)'
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: `${stage.color}15`, color: stage.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            {stage.emoji || '📌'}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Project Stage</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent-secondary)' }}>{stage.name}</div>
          </div>
        </div>

        <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border-color)', marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--accent-secondary)', lineHeight: 1.6, fontWeight: 500 }}>
            {stage.clientMsg}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, padding: '12px 16px', background: '#fff', borderRadius: 14, border: '1.5px solid var(--border-color)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Est. Duration</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent-secondary)' }}>{stage.days} Days</div>
          </div>
          <div style={{ flex: 1, padding: '12px 16px', background: stage.whoActs === 'client' ? '#FFFBEB' : '#F0FDF4', borderRadius: 14, border: `1.5px solid ${stage.whoActs === 'client' ? '#FDE68A' : '#BBF7D0'}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: stage.whoActs === 'client' ? '#B45309' : '#16A34A', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Action Required By</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: stage.whoActs === 'client' ? '#92400E' : '#15803D' }}>{stage.whoActs === 'client' ? 'You (Client)' : 'Westline Team'}</div>
          </div>
        </div>

        <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 800, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Key Tasks During This Stage</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(stage.tasks || []).map((t, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ marginTop: 2 }}><CheckCircle2 size={14} color={stage.color || ac} /></div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4, fontWeight: 500 }}>{t}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onDismiss}
          style={{
            width: '100%', height: 50, borderRadius: 16, background: stage.color || ac,
            color: '#fff', fontSize: 15, fontWeight: 800, border: 'none',
            marginTop: 32, cursor: 'pointer', boxShadow: `0 8px 24px ${stage.color || ac}40`
          }}
        >
          Understood
        </button>
      </div>
    </div>
  );
}

// ─── Portal Guide Modal ──────────────────────────────────────────────────
function PortalGuideModal({ onDismiss, ac }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
      }}
      onClick={onDismiss}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 500, borderRadius: 24,
          maxHeight: '85vh', overflowY: 'auto', padding: '24px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,.3)', position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HelpCircle size={20} color={ac} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)' }}>Welcome to your Portal</div>
          </div>
          <button onClick={onDismiss} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          This portal is your single source of truth for your Westline Future project. Here's a quick guide on how to navigate:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 16, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8', fontWeight: 800 }}>1</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>Track Your Progress</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>The <strong>Overview</strong> tab shows your project journey. Stages unlock automatically as tasks are completed.</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 16, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803D', fontWeight: 800 }}>2</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>Make Payments</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>Go to the <strong>Financials</strong> tab to view and pay invoices securely. Payments automatically unlock next steps.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 16, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', fontWeight: 800 }}>3</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>Approve Designs & Docs</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>The <strong>Designs</strong> and <strong>Documents</strong> tabs let you review 3D renders, contracts, and scope specifications.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 16, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C2410C', fontWeight: 800 }}>4</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>Message Your Team</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>Need help? Use the <strong>Messages</strong> tab to chat directly with your dedicated project manager.</div>
            </div>
          </div>
        </div>

        <button onClick={onDismiss} style={{ width: '100%', marginTop: 32, padding: '14px 0', background: ac, color: '#fff', fontSize: 14, fontWeight: 800, borderRadius: 14, border: 'none', cursor: 'pointer' }}>
          Got it, let's go!
        </button>
      </div>
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

// ─── KickoffGate ─────────────────────────────────────────────────────────────
function KickoffGate({ project, user, brand, isMobile, invoices = [], hasUnlockedDesign, onGateCleared, onPaymentSuccess, updateProjectStage }) {
  const ac = brand?.color || AC;
  const [showContract, setShowContract] = useState(false);
  // Optimistic local state — set immediately when Paystack confirms payment,
  // before the server Cloud Function writes to Firestore.
  const [paidLocally, setPaidLocally] = useState(false);
  // Pending verification state — payment went through Paystack but CF hasn't confirmed yet
  const [pendingRef, setPendingRef] = useState(null);
  // Optimistic contract signed — set immediately on onSigned so the gate
  // clears without waiting for the Firestore snapshot to propagate.
  const [contractJustSigned, setContractJustSigned] = useState(false);

  const requiresRendering = project.kickoffMode === 'rendering-first';
  const contractSigned = !!project.contractAccepted || contractJustSigned;
  const renderingApproved = project.renderingApproved === true ||
    project.designApproved === true ||
    String(project.renderingStatus || '').toLowerCase() === 'approved';

  // Check rendering paid: either the flag is set, the linked invoice is "Paid", OR Paystack just confirmed it locally
  const renderingInvoiceObj = invoices.find(inv =>
    inv.id === project.renderingFeeInvoiceId ||
    (inv.projectId === project.id && ['rendering', 'design', 'rendering fee', 'renderingfee'].includes((inv.type || '').toLowerCase()))
  );

  // ── Check localStorage AND Firestore for a pending/already-paid payment ─────
  // Prevents double payment if client refreshes after paying but before CF verified.
  useEffect(() => {
    if (!renderingInvoiceObj?.id || renderingPaid) return;
    const invoiceId = renderingInvoiceObj.id;

    // 1. Check localStorage first (same device, instant)
    try {
      const stored = localStorage.getItem(`wl_pending_ref_${invoiceId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.ref && Date.now() - (parsed.ts || 0) < 86400000) {
          setPendingRef(parsed.ref);
          return; // Don't need Firestore check if localStorage has it
        } else {
          localStorage.removeItem(`wl_pending_ref_${invoiceId}`);
        }
      }
    } catch (_) {}

    // 2. Check Firestore pendingPayments (cross-device protection)
    import('firebase/firestore').then(({ getDoc, doc: fsDoc }) => {
      getDoc(fsDoc(db, 'pendingPayments', invoiceId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          // If Paystack received it but CF hasn't fully verified yet
          if (data.reference && !data.verified) {
            setPendingRef(data.reference);
          }
          // If already verified but Firestore listener hasn't updated yet → show as paid
          if (data.verified) {
            setPaidLocally(true);
          }
        }
      }).catch(() => {});
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderingInvoiceObj?.id]);

  const renderingPaid = !!project.renderingFeePaid || paidLocally || (renderingInvoiceObj && renderingInvoiceObj.status === 'Paid') || hasUnlockedDesign;

  const needsRenderingPayment = requiresRendering && !renderingPaid;
  const needsContract = project.quoteApproved === true && !contractSigned;
  const renderingInvoice = renderingInvoiceObj;

  // Rendering review happens between these gates. Contract signing is exposed
  // only after the final rendering is approved.
  const step = needsRenderingPayment ? 1 : needsContract ? 2 : null;

  // Notify parent when gate clears — must be in an effect, not the render body,
  // to avoid calling setState on parent during KickoffGate's own render.
  useEffect(() => {
    if (step === null) onGateCleared?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step === null) return null;

  const stepLabel = step === 1 ? 'Rendering fee payment' : 'Contract signature after quote approval';
  const totalSteps = 1;
  const currentStep = 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Gate header */}
      <div style={{
        padding: isMobile ? '24px 20px' : '28px 32px',
        background: 'linear-gradient(135deg, var(--accent-secondary), #4A3B32)',
        borderRadius: 20, color: '#fff',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', opacity: .6, marginBottom: 8 }}>
          {project.title}
        </div>
        <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, marginBottom: 6 }}>
          {step === 1 ? '3D Rendering Fee' : 'Sign Approved Project Contract'}
        </div>
        <div style={{ fontSize: 13, opacity: .75, lineHeight: 1.5 }}>
          {step === 1
            ? 'Pay the rendering fee, then schedule the technical site visit. Your rendering will be produced from the verified measurements.'
            : 'Your negotiated quotation is approved. Read and sign the project contract to activate the initial project payment.'}
        </div>
        {/* Step progress dots */}
        {totalSteps > 1 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} style={{ height: 4, borderRadius: 2, flex: 1, background: (i + 1) <= (currentStep || 1) ? '#fff' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, opacity: .55, marginTop: 6 }}>{stepLabel}</div>
      </div>

      {/* Step content */}
      {step === 1 && (
        <div style={{
          padding: isMobile ? '24px 20px' : '28px 32px',
          background: '#fff', borderRadius: 20,
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0,0,0,.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PenTool size={22} color={ac} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>3D Interior Design Rendering</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Fee: {renderingInvoice
                  ? `GH₵ ${Number(renderingInvoice.amount || project.renderingFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : project.renderingFee
                    ? `GH₵ ${Number(project.renderingFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : 'Contact team for amount'}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--accent-secondary)', display: 'block', marginBottom: 6 }}>What you'll receive:</strong>
            Photorealistic 3D renders of your interior design, allowing you to visualise exactly how your space will look before any fabrication begins. Revisions are included based on your package.
          </div>

          {/* Completed step 1 badge — shown when rendering paid and now on step 2 */}
          {requiresRendering && renderingPaid && step === 2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', marginBottom: 16 }}>
              <CheckCircle2 size={15} color="#16A34A" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#15803D' }}>3D Rendering fee paid ✓</span>
            </div>
          )}

          {renderingInvoice ? (
            <>
              {/* Show "Already Paid" state if invoice is paid */}
              {renderingInvoice.status === 'Paid' || renderingPaid ? (
                <div style={{
                  padding: isMobile ? '16px 18px' : '18px 24px',
                  background: '#F0FDF4',
                  borderRadius: 12,
                  border: '1.5px solid #86EFAC',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: '#15803D',
                  fontSize: 14,
                  fontWeight: 700,
                }}>
                  <CheckCircle2 size={20} color="#22C55E" style={{ flexShrink: 0 }} />
                  <div>
                    <div>Payment Confirmed ✓</div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                      GH₵ {Number(renderingInvoice.amount || renderingInvoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} was processed successfully
                    </div>
                  </div>
                </div>
              ) : pendingRef ? (
                /* ── Payment sent to Paystack but CF verification is still pending ── */
                <div style={{ padding: '16px 20px', borderRadius: 14, background: '#FFFBEB', border: '1.5px solid #FCD34D', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Loader2 size={18} color="#D97706" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>Payment received — verifying with our system</div>
                      <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>Your payment went through. Please wait while we confirm it, or contact us if this message persists.</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#B45309', background: '#FEF3C7', borderRadius: 8, padding: '8px 12px' }}>
                    Reference: <strong>{pendingRef}</strong> — keep this for your records
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const { httpsCallable } = await import('firebase/functions');
                        const { functions: fns } = await import('../lib/firebase');
                        const verify = httpsCallable(fns, 'verifyPaystackPayment');
                        await verify({ reference: pendingRef, projectId: project.id, invoiceId: renderingInvoice.id, type: 'rendering' });
                        try { localStorage.removeItem(`wl_pending_ref_${renderingInvoice.id}`); } catch (_) {}
                        setPendingRef(null);
                        setPaidLocally(true);
                        onPaymentSuccess?.();
                      } catch (e) {
                        alert('Still verifying — please try again in a moment or contact support with your reference number.');
                      }
                    }}
                    style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 10, background: '#D97706', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Retry Verification
                  </button>
                </div>
              ) : (
                <UnifiedPaymentGateway
                  label={`Pay Rendering Fee — GH₵ ${Number(renderingInvoice.amount || renderingInvoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  amountGHS={Number(renderingInvoice.amount || renderingInvoice.total || 0)}
                  email={user?.proxyEmail || (user?.phone ? `${user.phone}@clients.westlinefuture.com` : 'client@clients.westlinefuture.com')}
                  projectId={project.id}
                  invoiceId={renderingInvoice.id}
                  paymentType="rendering"
                  allowPartial={false}
                  onSuccess={() => {
                    // Immediately advance the gate — Paystack has confirmed payment client-side.
                    // Server verification runs in the background and will update Firestore.
                    setPaidLocally(true);
                    setPendingRef(null);
                    onPaymentSuccess?.();
                  }}
                />
              )}
            </>
          ) : (
            <div style={{ padding: '16px 20px', background: '#FEF3C7', borderRadius: 12, border: '1px solid #FDE68A', fontSize: 13, color: '#92400E' }}>
              <strong>No invoice created yet.</strong> Your account manager will create the rendering fee invoice shortly. You'll be notified when it's ready.
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Contract Signing ── */}
      {step === 2 && (
        <div style={{
          padding: isMobile ? '24px 20px' : '28px 32px',
          background: '#fff', borderRadius: 20,
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px rgba(0,0,0,.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileCheck size={22} color={ac} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>Project Agreement</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Read and sign electronically — takes about 2 minutes</div>
            </div>
          </div>

          {/* What you're agreeing to */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {[
              { icon: '📐', text: 'Scope of work and design specifications' },
              { icon: '💳', text: 'Payment schedule and milestone amounts' },
              { icon: '📅', text: 'Project timeline and delivery expectations' },
              { icon: '🔒', text: 'Confidentiality and intellectual property terms' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-secondary)' }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 16px', borderRadius: 12, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', marginBottom: 20 }}>
            <strong>After signing:</strong> The initial project payment becomes the next required action. Once payment is verified, Westline will issue the final deliverables document for your production authorisation.
          </div>

          <button
            onClick={() => setShowContract(true)}
            style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none',
              background: `var(--accent-secondary)`, color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <PenLine size={18} /> Read & Sign Project Agreement
          </button>
        </div>
      )}

      {showContract && (
        <ContractAgreementModal
          project={project}
          user={user}
          brand={brand}
          isMobile={isMobile}
          onClose={() => setShowContract(false)}
          onSigned={() => { setContractJustSigned(true); setShowContract(false); onGateCleared?.(); }}
        />
      )}
    </div>
  );
}

// ─── Contract Gate ────────────────────────────────────────────────────────
function ContractGate({ project, user, brand, isMobile }) {
  const [showContract, setShowContract] = useState(false);
  const [signed, setSigned] = useState(false);
  const ac = brand?.color || AC;

  if (signed) return (
    <div style={{ padding: '24px 32px', background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: '#15803D' }}>Contract Signed!</div>
      <div style={{ fontSize: 13, color: '#166534', marginTop: 4 }}>Your project agreement has been recorded. The team will be in touch shortly.</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Gate header */}
      <div style={{
        padding: isMobile ? '24px 20px' : '28px 32px',
        background: 'linear-gradient(135deg, var(--accent-secondary), #4A3B32)',
        borderRadius: 20, color: '#fff',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', opacity: .6, marginBottom: 8 }}>
          {project.title}
        </div>
        <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, marginBottom: 6 }}>
          Sign Your Contract
        </div>
        <div style={{ fontSize: 13, opacity: .75, lineHeight: 1.5 }}>
          Your negotiated quotation is approved. Please read and sign the project contract and terms to activate the initial project payment.
        </div>
      </div>

      {/* Step content */}
      <div style={{
        padding: isMobile ? '24px 20px' : '28px 32px',
        background: '#fff', borderRadius: 20,
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 20px rgba(0,0,0,.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ac}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileCheck size={22} color={ac} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>Project Agreement</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Sign electronically with your full name
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          By signing this agreement you accept the legal and commercial terms attached to the approved quotation. Your signature activates the initial project payment; the final drawings, bill of materials, scope, and deliverables are signed separately before production begins.
        </div>

        <button
          onClick={() => setShowContract(true)}
          style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none',
            background: `var(--accent-secondary)`, color: '#fff',
            fontSize: 15, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <PenLine size={18} /> Read & Sign Contract
        </button>
      </div>

      {showContract && (
        <ContractAgreementModal
          project={project}
          user={user}
          brand={brand}
          isMobile={isMobile}
          onClose={() => setShowContract(false)}
          onSigned={() => { setSigned(true); setShowContract(false); }}
        />
      )}
    </div>
  );
}

// ─── Main ClientPortal ────────────────────────────────────────────────────────
export default function ClientPortal({ client, onLogout, updateClientProfile, ...props }) {
  const user = props.user || client;
  const ac = props.brand?.color || AC;

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedId, setSelectedId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('projectId') || null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    return ['overview', 'designs', 'financials', 'documents', 'vault', 'uploads', 'messages'].includes(requestedTab)
      ? requestedTab
      : 'overview';
  });

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

  // Kickoff gate: track which project IDs the client has cleared in this session
  const [gateCleared, setGateCleared] = useState({});

  // Welcome card dismissal (keyed per user+project, persisted in localStorage)
  const [portalWelcomeDismissed, setPortalWelcomeDismissed] = useState(false);

  // App Install Guide Modal logic
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showPortalGuide, setShowPortalGuide] = useState(false);
  const [activeStageGuide, setActiveStageGuide] = useState(null);

  // Automatically show portal guide to completely new users
  useEffect(() => {
    if (user && projects.length > 0) {
      const hasSeenPortalGuide = localStorage.getItem('hasSeenPortalGuide');
      if (!hasSeenPortalGuide) {
        setShowPortalGuide(true);
        localStorage.setItem('hasSeenPortalGuide', 'true');
      }
    }
  }, [user, projects.length]);
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

  // ── Language translation (DOM-walker, same pattern as admin portal) ──────────
  useEffect(() => {
    const lang = props.lang || 'en';
    const apply = () => translateClientDom(lang);
    apply();
    const observer = new MutationObserver(() => requestAnimationFrame(apply));
    const root = document.querySelector('.lx-portal');
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [props.lang, selectedId, activeTab]);

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

  // Intercept Hubtel Payment Returns
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientRef = params.get('verifyHubtel');
    const checkoutId = params.get('checkoutId'); // From Hubtel
    const pId = params.get('projectId');
    const invId = params.get('invoiceId');
    const pType = params.get('type');
    const pAmt = params.get('amount');

    if (clientRef && pId && !verifyingPayment) {
      setVerifyingPayment(true);
      setNotifToast('Verifying payment... Please wait.');
      const verify = httpsCallable(functions, 'verifyHubtelPayment');
      verify({
        clientReference: clientRef,
        checkoutId: checkoutId,
        projectId: pId,
        invoiceId: invId === 'undefined' ? null : invId,
        type: pType || 'payment',
        expectedAmountGHS: Number(pAmt)
      }).then(() => {
        setNotifToast('Payment verified successfully!');
        window.history.replaceState({}, document.title, window.location.pathname);
        setVerifyingPayment(false);
      }).catch(err => {
        console.error('Verify failed:', err);
        setNotifToast('Payment received but verification failed. Ref: ' + clientRef);
        window.history.replaceState({}, document.title, window.location.pathname);
        setVerifyingPayment(false);
      });
    }
  }, [verifyingPayment]);

  // Subscribe only to exact project documents indexed on the client profile.
  // Firestore cannot safely prove ownership for a collection list query that
  // derives phone variants in rules. Exact document reads remain fully scoped.
  useEffect(() => {
    if (!db || !user) { setLoadingProjects(false); return; }

    const projectIds = [...new Set(
      (Array.isArray(user.projectIds) ? user.projectIds : [])
        .map(id => String(id || '').trim())
        .filter(Boolean)
    )].slice(0, 50);

    if (projectIds.length === 0) {
      setProjects([]);
      setProjectsError(null);
      setLoadingProjects(false);
      return;
    }

    const projectMap = new Map();
    const publish = () => {
      const mine = Array.from(projectMap.values()).sort((a, b) => {
        const ta = a.createdAt?.seconds ?? (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
        const tb = b.createdAt?.seconds ?? (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
        return tb - ta;
      });
        setProjects(mine);
        setProjectsError(null);
        setSelectedId(prev => {
          if (!prev && mine.length > 0) return mine[0].id;
          if (prev && mine.length > 0 && !mine.find(p => p.id === prev)) return mine[0].id;
          return prev;
        });
        setLoadingProjects(false);
    };

    const unsubs = projectIds.map(projectId => onSnapshot(
      doc(db, 'projects', projectId),
      snap => {
        if (snap.exists()) projectMap.set(projectId, { id: snap.id, ...snap.data() });
        else projectMap.delete(projectId);
        publish();
      },
      err => {
        console.error('[ClientPortal] projects query failed:', err.code, err.message);
        setProjectsError(err.code || 'query-failed');
        setLoadingProjects(false);
      }
    ));

    return () => unsubs.forEach(unsub => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.uid, JSON.stringify(user?.projectIds || [])]);

  const selected = projects.find(p => p.id === selectedId);
  const activeCount = projects.filter(p => p.status !== 'Completed').length;
  const completedCount = projects.filter(p => p.status === 'Completed').length;

  // ── Live invoices for selected project (needed by KickoffGate) ──────────────
  // The global props.invoices filters by clientId==user.id which may not match
  // phone-auth clients. This queries by projectId so KickoffGate always finds
  // the rendering invoice.
  const [gateInvoices, setGateInvoices] = useState([]);
  useEffect(() => {
    if (!db || !selectedId) { setGateInvoices([]); return; }
    const q = query(collection(db, 'invoices'), where('projectId', '==', selectedId));
    const unsub = onSnapshot(q,
      snap => setGateInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setGateInvoices([])
    );
    return unsub;
  }, [selectedId]);

  // Track unread messages for the client
  const [totalUnread, setTotalUnread] = useState(0);
  useEffect(() => {
    if (!db || !user?.id) return;
    const unsub = onSnapshot(collection(db, 'clients', user.id, 'messages'), snap => {
      const unread = snap.docs.filter(d => {
        const m = d.data();
        return !m.isInternal && m.senderRole !== 'client' && !m.readByClient;
      }).length;
      setTotalUnread(unread);
    });
    return unsub;
  }, [user?.id]);

  const prevUnreadRef = useRef(0);
  useEffect(() => {
    if (totalUnread > prevUnreadRef.current) {
      if (props.playNotificationSound) props.playNotificationSound();
      if (props.notify) props.notify('info', 'You have a new message', 'persistent');
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread, props.playNotificationSound, props.notify]);

  // Auto-show review modal for completed projects
  const showReviewModal =
    selected &&
    selected.stageId === 8 &&
    !reviewDismissed &&
    !reviewSubmitted &&
    !selected.reviewDismissed &&
    !selected.reviewSubmitted;

  // ── Tab availability rules — locked tabs show padlock + explanation ──────
  const hasUnlockedDesign = (props.renderingPackages || []).some(pkg => pkg.projectId === selected?.id && (pkg.unlocked || pkg.status === 'Paid / Unlocked'));
  const renderingPaidByFlag = !!selected?.renderingFeePaid;
  const renderingPaidByInvoice = gateInvoices.some(inv => (inv.id === selected?.renderingFeeInvoiceId || ['rendering','design','rendering fee','renderingfee'].includes((inv.type||'').toLowerCase())) && inv.status === 'Paid');
  const renderingPaid = renderingPaidByFlag || renderingPaidByInvoice || hasUnlockedDesign;
  const kickoffComplete = selected?.kickoffGateCleared || (selected?.kickoffMode === 'rendering-first' && renderingPaid);
  const stageId = selected?.stageId || 1;
  const photosAvailable = stageId >= 6; // Installation stage onwards
  const portalGate = selected
    ? clientPortalGateState(selected, {
        renderingPaid,
        renderingPaymentConfirmedLocally: !!gateCleared[selected.id],
      })
    : { active: false, needsRenderingPayment: false, needsContractSignature: false };
  const showProjectsLoading = loadingProjects && projects.length === 0;

  const tabs = [
    { id: 'overview',  label: 'Overview',  icon: <Home size={14} /> },
    ...(selected?.kickoffMode !== 'direct-kickoff' || photosAvailable
      ? [{ id: 'designs', label: 'Designs', icon: <Palette size={14} />, locked: !kickoffComplete, lockReason: stageId <= 1 ? 'Available after your rendering fee payment and site visit' : 'Sign your contract to unlock' }]
      : []),
    { id: 'financials', label: 'Financials', icon: <CreditCard size={14} /> },
    { id: 'vault', label: 'Vault', icon: <ShieldCheck size={14} /> },
    { id: 'uploads', label: 'Uploads', icon: <Camera size={14} /> }
  ];

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  return (
    <div className="lx-portal" style={{ minHeight: '100dvh', background: isMobile ? '#EDEAE6' : '#F8F6F3', fontFamily: 'Inter, Satoshi, sans-serif', overscrollBehavior: 'contain' }}>

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

      {/* ── PORTAL GUIDE MODAL ── */}
      {showPortalGuide && <PortalGuideModal onDismiss={() => setShowPortalGuide(false)} ac={ac} />}

      {/* ── STAGE EXPLAINER MODAL ── */}
      {activeStageGuide && <StageExplainerModal stage={activeStageGuide} onDismiss={() => setActiveStageGuide(null)} ac={ac} />}

      {/* ── FLOATING HELP BUTTON ── */}
      {!showPortalGuide && selected && (
        <button
          onClick={() => setShowPortalGuide(true)}
          style={{
            position: 'fixed', right: isMobile ? 20 : 32, bottom: isMobile ? 104 : 32, zIndex: 990,
            width: 48, height: 48, borderRadius: 24, background: ac, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,.3)', border: 'none', cursor: 'pointer',
            transition: 'transform .2s'
          }}
        >
          <HelpCircle size={24} />
        </button>
      )}

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
              {/* Language toggle — mobile */}
              <button
                data-no-portal-translate
                onClick={() => props.setLang?.(props.lang === 'zh' ? 'en' : 'zh')}
                title={props.lang === 'zh' ? 'Switch to English' : '切换为中文'}
                style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.1)', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 20, touchAction: 'manipulation', flexShrink: 0 }}
              >
                {props.lang === 'zh' ? '🇬🇧' : '🇨🇳'}
              </button>
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
              {showProjectsLoading ? 'Loading your projects…' : projects.length === 0
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
            
            <div style={{ marginLeft: 32, display: 'flex', gap: 24, alignItems: 'center' }}>
              <button onClick={() => setActiveTab('dashboard')} style={{ background: 'none', border: 'none', color: activeTab !== 'messages' ? '#fff' : 'rgba(255,255,255,.6)', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>Dashboard</button>
              <button onClick={() => setActiveTab('messages')} style={{ position: 'relative', background: 'none', border: 'none', color: activeTab === 'messages' ? '#fff' : 'rgba(255,255,255,.6)', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                Messages
                {totalUnread > 0 && <span style={{ position: 'absolute', top: -6, right: -16, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 10 }}>{totalUnread}</span>}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ClientNotificationBell notifications={props.userNotifications || []} onMarkRead={props.markNotificationRead} ac={ac} />
            <PushNotificationBell ac={ac} />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{user?.name || 'Client'}</div>
            {/* Language toggle — desktop */}
            <button
              data-no-portal-translate
              onClick={() => props.setLang?.(props.lang === 'zh' ? 'en' : 'zh')}
              title={props.lang === 'zh' ? 'Switch to English' : '切换为中文'}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', background: 'rgba(255,255,255,.1)', border: 'none', cursor: 'pointer', padding: '5px 10px', borderRadius: 8 }}
            >
              <span style={{ fontSize: 16 }}>{props.lang === 'zh' ? '🇬🇧' : '🇨🇳'}</span>
              <span>{props.lang === 'zh' ? 'EN' : '中文'}</span>
            </button>
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
              {showProjectsLoading ? 'Loading your projects...' : projects.length === 0
                ? 'You have no active projects yet. Speak to our team to get started.'
                : `${activeCount} active project${activeCount !== 1 ? 's' : ''}${completedCount > 0 ? ` · ${completedCount} completed` : ''}`}
            </div>
            {/* Referral Card moved to Financials tab */}
          </div>
        )}

        {/* ── MOBILE REFERRAL CARD ── */}
        {/* Moved to Financials tab */}

        {activeTab === 'messages' ? (
          <div style={{
            padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff',
            borderRadius: isMobile ? 24 : 20,
            border: isMobile ? 'none' : '1px solid var(--border-color)',
            boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)',
            height: isMobile ? 'calc(100dvh - 220px)' : 'calc(100vh - 220px)',
            minHeight: isMobile ? 320 : 500,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 16, flexShrink: 0 }}>Messages</div>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <WorldClassChat
                clientId={user.id}
                user={user}
                accentColor={ac}
                addClientMessage={props.addClientMessage}
                isAdmin={false}
                height="100%"
                projects={projects.map(p => ({ id: p.id, title: p.title }))}
                viewerLanguage={props.lang || 'en'}
              />
            </div>
          </div>
        ) : showProjectsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: isMobile ? 16 : 0 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: i === 1 ? 140 : 80, borderRadius: isMobile ? 24 : 20, background: '#fff', animation: 'pulse 1.5s infinite', animationDelay: `${i * 0.15}s`, boxShadow: isMobile ? '0 2px 12px rgba(0,0,0,.06)' : 'none' }} />
            ))}
          </div>
        ) : projectsError && projects.length === 0 ? (
          <div style={{ padding: isMobile ? '48px 24px' : '80px 40px', textAlign: 'center', background: '#fff', borderRadius: 24, boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : 'none', marginTop: isMobile ? 8 : 0 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 8 }}>Couldn't load your projects</div>
            <div style={{ fontSize: 13, color: `var(--text-secondary)`, marginBottom: 24, lineHeight: 1.6 }}>
              {projectsError === 'permission-denied'
                ? 'Your account is signed in, but project access could not be verified. Please retry, then contact our team if this continues.'
                : 'There was a connection issue. Please refresh the page or contact our team.'}
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
              Contact us: {props.brand?.phone || '+233 24 731 9778'}
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
                      onClick={() => { setSelectedId(p.id); setActiveTab('overview'); }}
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
                      onClick={() => { setSelectedId(p.id); setActiveTab('overview'); }}
                    />
                  ))}
                </div>
              )
            )}

            {/* RIGHT — Selected Project Detail */}
            {selected && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Minimal Global Header */}
                <div style={{ padding: isMobile ? '10px 0 0 0' : '0' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: ac, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
                    {PROJECT_TYPES[selected.projectType]?.label || 'Full Service'} Project
                  </div>
                  <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 900, color: 'var(--accent-secondary)' }}>
                    {selected.title}
                  </div>
                </div>

                {/* ── KICKOFF GATE ── */}
                {(() => {
                  if (!portalGate.active) return null;
                  const hasUnlockedDesignLocal = (props.renderingPackages || []).some(pkg => pkg.projectId === selected.id && (pkg.unlocked || pkg.status === 'Paid / Unlocked'));
                  return (
                    <KickoffGate
                      project={selected}
                      user={user}
                      brand={props.brand}
                      isMobile={isMobile}
                      hasUnlockedDesign={hasUnlockedDesignLocal}
                      invoices={gateInvoices.length > 0 ? gateInvoices : (props.invoices || [])}
                      updateProjectStage={props.updateProjectStage}
                      onGateCleared={() => setGateCleared(prev => ({ ...prev, [selected.id]: true }))}
                      onPaymentSuccess={() => {
                        // Force refresh of project data after payment
                        // The onSnapshot listener should pick up renderingFeePaid, but as a safety net
                        // we force a manual read after a short delay and update state directly.
                        const projectId = selected.id;
                        const tryRefresh = (attempt = 1) => {
                          import('firebase/firestore').then(({ getDoc, doc: docRef }) => {
                            import('../lib/firebase').then(({ db: fbDb }) => {
                              getDoc(docRef(fbDb, 'projects', projectId)).then(snapshot => {
                                if (snapshot.exists()) {
                                  const freshData = { id: snapshot.id, ...snapshot.data() };
                                  if (freshData.renderingFeePaid) {
                                    console.log('[ClientPortal] Payment confirmed — updating project state');
                                    setProjects(prev => prev.map(p => p.id === projectId ? freshData : p));
                                  } else if (attempt < 5) {
                                    // Cloud Function may not have written yet — retry
                                    setTimeout(() => tryRefresh(attempt + 1), 2000);
                                  }
                                }
                              });
                            });
                          });
                        };
                        setTimeout(() => tryRefresh(), 1500);
                      }}
                    />
                  );
                })()}

                {/* Hide tabs and content while kickoff gate is active */}
                {!portalGate.active && (
                <>



                {/* Tabs — desktop only; mobile uses bottom dock */}
                {!isMobile && (
                  <div style={{ display: 'flex', gap: 4, background: '#fff', padding: 5, borderRadius: 16, border: '1px solid var(--border-color)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {tabs.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { if (!t.locked) setActiveTab(t.id); }}
                        title={t.locked ? t.lockReason : ''}
                        style={{
                          height: 38, padding: '0 16px', borderRadius: 12, border: 'none',
                          background: activeTab === t.id ? `var(--accent-secondary)` : 'transparent',
                          color: activeTab === t.id ? '#fff' : t.locked ? 'var(--border-color)' : `var(--text-secondary)`,
                          fontSize: 13, fontWeight: 700, cursor: t.locked ? 'not-allowed' : 'pointer',
                          opacity: t.locked ? 0.55 : 1,
                          display: 'flex', alignItems: 'center', gap: 7,
                          transition: 'all .2s', flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.locked ? <Lock size={12} /> : t.icon}{t.label}
                        {t.id === 'messages' && totalUnread > 0 && (
                          <div style={{
                            background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800,
                            height: 18, minWidth: 18, borderRadius: 9, padding: '0 4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {totalUnread}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── OVERVIEW TAB ── */}
                {activeTab === 'overview' && (() => {
                  const pendingInvoices = (props.invoices || []).filter(i => i.projectId === selected?.id && ['Sent', 'Partially Paid'].includes(i.status) && i.type !== 'Quotation');
                  const projectQuotes = (props.invoices || [])
                    .filter(invoice =>
                      (invoice.projectId === selected?.id || invoice.parentId === selected?.id) &&
                      ['Quotation', 'quotation', 'quote'].includes(invoice.type || invoice.documentKind)
                    )
                    .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
                  const unsignedQuote = projectQuotes.find(quote => quote.id === selected?.activeQuoteId) ||
                    projectQuotes.find(quote => !['approved', 'superseded', 'cancelled'].includes(String(quote.status || '').toLowerCase()));
                  const specNeedsReview = selected?.specDoc?.url && !['signed', 'rejected'].includes(selected?.specDoc?.status);
                  const initialPaymentCleared = selected?.depositPaid === true || selected?.initialDepositPaid === true;
                  const actionReq = specNeedsReview && initialPaymentCleared ? { title: 'Final Deliverables Signature Required', desc: 'Review and sign the final drawings, bill of materials, scope, and deliverables to authorise production.', tab: 'documents', btn: 'Review & Sign', icon: <FileCheck size={18} color="#D97706" /> }
                    : unsignedQuote && !selected?.quoteApproved && String(unsignedQuote.status || '').toLowerCase() === 'changes requested' ? { title: 'Quotation Revision Requested', desc: 'Your feedback was sent. The project manager is preparing the next quotation version.', tab: 'vault', btn: 'View Negotiation', icon: <Clock size={18} color="#D97706" /> }
                    : unsignedQuote && !selected?.quoteApproved ? { title: 'Quotation Ready', desc: 'Review the negotiated project cost. Approve it or request a revised version.', tab: 'vault', btn: 'Review Quote', icon: <PenTool size={18} color="#DC2626" /> }
                    : pendingInvoices.length > 0 ? { title: 'Pending Invoice', desc: `You have ${pendingInvoices.length} unpaid invoice(s) on your account.`, tab: 'financials', btn: 'View Invoices', icon: <CreditCard size={18} color="#D97706" /> }
                    : null;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {actionReq ? (
                        <div style={{ padding: '16px 20px', borderRadius: 16, background: '#FEF2F2', border: '1.5px solid #FECACA', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                            <div style={{ marginTop: 2 }}>{actionReq.icon}</div>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 900, color: '#991B1B', marginBottom: 4 }}>Action Required: {actionReq.title}</div>
                              <div style={{ fontSize: 13, color: '#7F1D1D', maxWidth: 400 }}>{actionReq.desc}</div>
                            </div>
                          </div>
                          <button onClick={() => setActiveTab(actionReq.tab)} style={{ padding: '10px 20px', borderRadius: 10, background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            {actionReq.btn} →
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '16px 20px', borderRadius: 16, background: '#F0FDF4', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 14 }}>
                          <CheckCircle2 size={20} color="#16A34A" />
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#15803D' }}>You're all caught up!</div>
                            <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>No action is required from you at this time. The team is hard at work on your project.</div>
                          </div>
                        </div>
                      )}

                      <ProjectHeaderCard project={selected} isMobile={isMobile} ac={ac} brand={props.brand} />

                      {/* ── Onboarding Setup Checklist — shown until all setup steps done ── */}
                      {(() => {
                        const requiresRend = selected.kickoffMode === 'rendering-first';
                        const rendPaid = !!selected.renderingFeePaid || (props.renderingPackages || []).some(pkg => pkg.projectId === selected.id && (pkg.unlocked || pkg.status === 'Paid / Unlocked'));
                        const siteVisitComplete = selected.kickoffMode === 'direct-kickoff' || selected.siteVisit?.status === 'completed' || selected.siteSurveyCompleted === true;
                        const renderingApproved = selected.kickoffMode === 'direct-kickoff' || selected.renderingApproved === true || selected.designApproved === true || String(selected.renderingStatus || '').toLowerCase() === 'approved';
                        const quoteApproved = selected.quoteApproved === true || Boolean(selected.approvedQuoteId);
                        const contSigned = !!selected.contractAccepted;
                        const specUploaded = !!selected.specDoc?.url;
                        const specApproved = ['signed', 'approved'].includes(selected.specDoc?.status);
                        const depositInv = (props.invoices || []).find(i =>
                          (i.projectId === selected.id || i.parentId === selected.id) &&
                          isInitialProjectDepositInvoice(i)
                        );
                        const depositPaid = !!selected.depositPaid || (depositInv && isPaidStatus(depositInv.status));
                        const allDone = (!requiresRend || rendPaid) && siteVisitComplete && renderingApproved && quoteApproved && contSigned && depositPaid && specApproved;
                        const welcomeKey = `portal_welcomed_${user?.id}_${selected?.id}`;
                        const alreadyDismissed = portalWelcomeDismissed || !!localStorage.getItem(welcomeKey);
                        if (allDone && alreadyDismissed) return null;

                        const steps = [
                          ...(requiresRend ? [{ label: 'Rendering fee paid', done: rendPaid, action: null }] : []),
                          { label: 'Technical site visit completed', done: siteVisitComplete, action: null, waiting: requiresRend && !rendPaid },
                          { label: 'Final 3D rendering approved', done: renderingApproved, action: siteVisitComplete && !renderingApproved ? () => setActiveTab('designs') : null, actionLabel: 'Review Design →', waiting: !siteVisitComplete },
                          { label: 'Negotiated quotation approved', done: quoteApproved, action: renderingApproved && !quoteApproved ? () => setActiveTab('vault') : null, actionLabel: 'Review Quote →', waiting: !renderingApproved },
                          { label: 'Project contract signed', done: contSigned, action: quoteApproved && !contSigned ? () => setActiveTab('overview') : null, actionLabel: 'Sign Contract →', waiting: !quoteApproved },
                          { label: 'Initial project payment verified', done: depositPaid, action: contSigned && !depositPaid ? () => setActiveTab('financials') : null, actionLabel: 'Open Payments →', waiting: !contSigned },
                          { label: 'Final deliverables issued by team', done: specUploaded, action: null, waiting: !depositPaid },
                          { label: 'Production authorised', done: specApproved, action: specUploaded && !specApproved ? () => setActiveTab('documents') : null, actionLabel: 'Review & Sign →', waiting: !specUploaded },
                        ];
                        const nextStep = steps.find(s => !s.done && !s.waiting);
                        const setupPct = Math.round((steps.filter(s => s.done).length / steps.length) * 100);

                        return (
                          <div style={{ padding: isMobile ? '18px 20px' : '22px 26px', borderRadius: 18, background: 'linear-gradient(135deg, #F4EFE6, #EDE4D8)', border: `1.5px solid var(--accent-secondary)30` }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Project Setup</div>
                                <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--accent-secondary)' }}>
                                  {allDone ? '🎉 You\'re all set!' : nextStep ? `Next: ${nextStep.label}` : 'Waiting on the team'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent-secondary)' }}>{setupPct}%</div>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700 }}>complete</div>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div style={{ height: 5, borderRadius: 3, background: 'rgba(200,169,110,0.2)', marginBottom: 16, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent-secondary)', width: `${setupPct}%`, transition: 'width .5s' }} />
                            </div>
                            {/* Steps */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {steps.map((s, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: s.done ? 'rgba(255,255,255,0.5)' : s.waiting ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)' }}>
                                  <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.done ? '#22C55E' : s.waiting ? '#94A3B8' : 'var(--accent-secondary)', color: '#fff', fontSize: 11, fontWeight: 900 }}>
                                    {s.done ? '✓' : s.waiting ? '⏳' : i + 1}
                                  </div>
                                  <span style={{ flex: 1, fontSize: 12, fontWeight: s.done ? 600 : 700, color: s.done ? 'var(--text-secondary)' : s.waiting ? '#94A3B8' : 'var(--accent-secondary)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</span>
                                  {s.action && (
                                    <button onClick={s.action} style={{ padding: '4px 10px', borderRadius: 8, background: 'var(--accent-secondary)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                      {s.actionLabel}
                                    </button>
                                  )}
                                  {s.waiting && !s.done && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                                      <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, whiteSpace: 'nowrap' }}>Waiting on team</span>
                                      <span style={{ fontSize: 9, color: '#CBD5E1', fontWeight: 600, whiteSpace: 'nowrap' }}>~2–3 business days</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            {allDone && !alreadyDismissed && (
                              <button onClick={() => { localStorage.setItem(welcomeKey, '1'); setPortalWelcomeDismissed(true); }} style={{ marginTop: 14, alignSelf: 'flex-end', padding: '8px 18px', borderRadius: 10, border: 'none', background: 'var(--accent-secondary)', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'block', marginLeft: 'auto' }}>
                                Got it — dismiss ✕
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* ── Spec Doc Review Banner — shown when admin uploads spec but client hasn't approved ── */}
                      {Number(selected?.stageId || 1) >= 2 &&
                        selected?.specDoc?.url &&
                        !['signed', 'approved'].includes(selected.specDoc?.status) && (
                        <div style={{ padding: '16px 20px', borderRadius: 16, background: '#FFFBEB', border: '1.5px solid #FDE68A', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <span style={{ fontSize: 20, marginTop: 2 }}>📋</span>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 900, color: '#92400E', marginBottom: 3 }}>Authorise Procurement &amp; Production</div>
                              <div style={{ fontSize: 12, color: '#B45309', lineHeight: 1.5 }}>Your initial payment is confirmed. Review and sign the final deliverables document before production begins.</div>
                            </div>
                          </div>
                          <button onClick={() => setActiveTab('documents')} style={{ padding: '10px 20px', borderRadius: 10, background: '#D97706', color: '#fff', fontSize: 13, fontWeight: 800, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Review & Authorise →
                          </button>
                        </div>
                      )}

                    <ClientNextActionCard
                      project={selected}
                      invoices={props.invoices || []}
                      renderingPackages={props.renderingPackages || []}
                      addOns={props.addOns || []}
                      setActiveTab={setActiveTab}
                      isMobile={isMobile}
                    />
                    <ClientSiteVisitScheduler project={selected} isMobile={isMobile} />

                    <ProjectRoadmap
                      project={selected}
                      invoices={props.invoices || []}
                      renderingPackages={props.renderingPackages || []}
                      setActiveTab={setActiveTab}
                      isMobile={isMobile}
                      onStageGuide={setActiveStageGuide}
                    />
                    {(() => {
                      const contractSigned = !!selected.contractAccepted;
                      const renderingApproved = selected.renderingApproved === true ||
                        selected.designApproved === true ||
                        String(selected.renderingStatus || '').toLowerCase() === 'approved';
                      const showContractGate = !contractSigned && selected.quoteApproved === true;

                      if (showContractGate) {
                        return (
                          <ContractGate
                            project={selected}
                            user={user}
                            brand={props.brand}
                            isMobile={isMobile}
                          />
                        );
                      }

                      const projectInvoices = (props.invoices || []).filter(i => i.projectId === selected.id || i.parentId === selected.id);
                      const totalValue = projectInvoices
                        .filter(i => i.type !== 'Quotation' && i.documentKind !== 'quotation')
                        .reduce((sum, i) => sum + parseFloat(i.amount || i.total || 0), 0);
                      const totalPaid = projectInvoices.reduce((sum, i) => sum + parseFloat(i.amountPaid || 0), 0);
                      const balance = Math.max(0, totalValue - totalPaid);
                      const progressPct = totalValue > 0 ? Math.min(100, Math.round((totalPaid / totalValue) * 100)) : 0;
                      const currentStage = CLIENT_PROJECT_STAGES.find(s => s.id === selected.stageId);
                      const estCompletion = selected.estimatedCompletion
                        ? (() => {
                            const d = selected.estimatedCompletion?.toDate ? selected.estimatedCompletion.toDate() : new Date(selected.estimatedCompletion);
                            return isNaN(d) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                          })()
                        : null;
                      const projectTypeLabel = PROJECT_TYPES[selected.projectType]?.label || 'Custom Project';

                      return (
                        <div style={{
                          borderRadius: 20,
                          background: '#fff',
                          border: '1.5px solid var(--border-color)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                          overflow: 'hidden',
                        }}>
                          {/* Stage progress bar — "You are here" */}
                          {currentStage && (
                            <div style={{
                              background: `linear-gradient(135deg, var(--accent-secondary), #4A3B32)`,
                              padding: isMobile ? '16px 20px' : '18px 28px',
                              color: '#fff',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, opacity: .65 }}>YOU ARE HERE</div>
                                <div style={{ fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20 }}>
                                  Stage {selected.stageId} of {CLIENT_PROJECT_STAGES.length}
                                </div>
                              </div>
                              <div style={{ fontSize: isMobile ? 16 : 19, fontWeight: 900, marginBottom: 8 }}>
                                {currentStage.emoji} {currentStage.name}
                              </div>
                              {/* Mini stage dots */}
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                {CLIENT_PROJECT_STAGES.map((s, i) => (
                                  <div key={s.id} style={{
                                    flex: s.id === selected.stageId ? 3 : 1,
                                    height: 4,
                                    borderRadius: 2,
                                    background: s.id < selected.stageId ? 'rgba(255,255,255,0.8)' : s.id === selected.stageId ? '#fff' : 'rgba(255,255,255,0.2)',
                                    transition: 'flex .3s ease',
                                  }} />
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ padding: isMobile ? '20px 22px' : '20px 28px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
                                {projectTypeLabel}
                              </div>
                              <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 900, color: 'var(--accent-secondary)', lineHeight: 1.2, marginBottom: 4 }}>
                                {selected.title}
                              </div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          {totalValue > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontWeight: 700 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Payment Progress</span>
                                <span style={{ color: 'var(--accent-secondary)' }}>{progressPct}%</span>
                              </div>
                              <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${progressPct}%`,
                                  background: progressPct === 100 ? '#16A34A' : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                                  borderRadius: 4,
                                  transition: 'width .4s ease',
                                }} />
                              </div>
                            </div>
                          )}

                          {/* Key facts grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 10 }}>
                            {totalValue > 0 && (
                              <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Total Value</div>
                                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-secondary)' }}>GH₵ {totalValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                              </div>
                            )}
                            {balance > 0 && (
                              <div style={{ padding: '12px 14px', background: '#FEF3C7', borderRadius: 12 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Balance Due</div>
                                <div style={{ fontSize: 14, fontWeight: 900, color: '#92400E' }}>GH₵ {balance.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                              </div>
                            )}
                            {totalPaid > 0 && (
                              <div style={{ padding: '12px 14px', background: '#F0FDF4', borderRadius: 12 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Paid To Date</div>
                                <div style={{ fontSize: 14, fontWeight: 900, color: '#15803D' }}>GH₵ {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                              </div>
                            )}
                            {estCompletion && (
                              <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Est. Completion</div>
                                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-secondary)' }}>{estCompletion}</div>
                              </div>
                            )}
                          </div>
                          </div>{/* close padding wrapper */}
                        </div>
                      );
                    })()}

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
                    {(selected.stageId || 0) >= 8 ? (
                      <div style={{ padding: '24px 28px', borderRadius: 20, background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1.5px solid #86EFAC', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                          <span style={{ fontSize: 28 }}>🎉</span>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.06em' }}>Project Complete</div>
                            <div style={{ fontSize: 19, fontWeight: 900, color: '#14532D' }}>Handover Complete!</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                          Your project has been successfully completed and handed over. Thank you for choosing Westline Future — we hope to work with you again soon!
                        </div>
                        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.5)', borderRadius: 12, fontSize: 12, color: '#15803D', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>📄</span> Your handover certificate is available in the <strong>Documents</strong> tab.
                        </div>
                      </div>
                    ) : (
                      <StageActionCard
                        project={selected}
                        user={user}
                        approveQuote={props.approveQuote}
                        approveSignoff={props.approveSignoff}
                        payInvoice={props.payInvoice}
                        updateProjectStage={props.updateProjectStage}
                        setActiveTab={setActiveTab}
                      />
                    )}
                    <InstallationStatusCard project={selected} />
                    <ShippingTrackerCard project={selected} invoices={gateInvoices} />
                  </div>
                )})()}

                {/* ── DESIGNS TAB ── */}
                {activeTab === 'designs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <ClientRenderingVault
                      project={selected}
                      brand={props.brand}
                      renderingPackages={props.renderingPackages || []}
                      invoices={props.invoices || []}
                      finSettings={props.brand?.finSettings || {}}
                    />
                    {photosAvailable && (
                      <div style={{ padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 20 }}>Site Photos</div>
                        <PhotoFeed projectId={selected.id} />
                      </div>
                    )}
                  </div>
                )}

                {/* ── FINANCIALS TAB ── */}
                {activeTab === 'financials' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <PaymentsTab
                      project={selected}
                      user={user}
                      transactions={props.transactions}
                      invoices={props.invoices}
                      formatPrice={props.formatPrice}
                      brand={props.brand}
                      isMobile={isMobile}
                      finSettings={props.brand?.finSettings || {}}
                    />
                    <ClientAddOnsTab
                      project={selected}
                      addOns={props.addOns || []}
                      invoices={props.invoices || []}
                      user={user}
                      isMobile={isMobile}
                    />
                    {user && <ReferralCard user={user} ac={ac} />}
                  </div>
                )}

                {/* ── DOCUMENTS TAB ── */}
                {activeTab === 'documents' && (
                  <DocumentsTab
                    projectId={selected.id}
                    project={selected}
                    user={user}
                    brand={props.brand}
                    isMobile={isMobile}
                    invoices={props.invoices || []}
                  />
                )}

                {/* ── VAULT TAB ── */}
                {activeTab === 'vault' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <ClientApprovalsTab
                      project={selected}
                      invoices={props.invoices || []}
                      approvals={props.approvals || []}
                      approveQuote={props.approveQuote}
                      approveSignoff={props.approveSignoff}
                      updateApproval={props.updateApproval}
                      brand={props.brand}
                      user={user}
                      isMobile={isMobile}
                      setActiveTab={setActiveTab}
                      updateProjectStage={props.updateProjectStage}
                    />
                    <div style={{ padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <ShieldCheck size={20} color={`var(--accent-secondary)`} />
                        <div style={{ fontSize: 15, fontWeight: 800, color: `var(--accent-secondary)` }}>Secure Document Vault</div>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                        Access and electronically sign your legally binding contracts, formal approvals, and project blueprints here.
                      </p>
                      <SecureVault projectId={selected.id} user={user} />
                    </div>
                  </div>
                )}

                {/* ── UPLOADS TAB ── */}
                {activeTab === 'uploads' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid var(--border-color)', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' }}>
                      <ClientUploadsTab projectId={selected.id} user={user} brand={props.brand} />
                    </div>
                  </div>
                )}

                </>
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
            { id: 'overview',  label: 'Overview',  icon: Home },
            ...(selected?.kickoffMode !== 'direct-kickoff' || photosAvailable
              ? [{ id: 'designs', label: 'Designs', icon: Palette, locked: !kickoffComplete }]
              : []),
            { id: 'financials',label: 'Financials',icon: CreditCard },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'uploads', label: 'Uploads', icon: Camera },
            { id: 'messages',  label: 'Messages',  icon: MessageSquare },
          ].map(t => {
            const active = activeTab === t.id;
            const Icon = t.locked ? Lock : t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { if (selected && !t.locked) setActiveTab(t.id); }}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: t.locked ? 'not-allowed' : 'pointer',
                  padding: '2px 4px 0', touchAction: 'manipulation', minHeight: 48,
                  opacity: !selected ? 0.4 : t.locked ? 0.4 : 1,
                  position: 'relative',
                }}
              >
                {/* Unread badge — anchored to the icon */}
                {t.id === 'messages' && totalUnread > 0 && (
                  <div style={{
                    position: 'absolute', top: 0, right: 'calc(50% - 28px)',
                    background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 900,
                    height: 16, minWidth: 16, borderRadius: 8, padding: '0 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 0 2px rgba(250,248,245,0.88)',
                    zIndex: 2,
                  }}>
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </div>
                )}
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
                }}>
                  {t.label}
                </span>
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
            // Persist so modal never shows again even after refresh
            try { await updateDoc(doc(db, 'projects', selected.id), { reviewSubmitted: true, reviewSubmittedAt: serverTimestamp() }); } catch (_) {}
            setReviewSubmitted(true);
          }}
          onDismiss={async () => {
            // Persist dismiss so it survives page refreshes
            try { await updateDoc(doc(db, 'projects', selected.id), { reviewDismissed: true, reviewDismissedAt: serverTimestamp() }); } catch (_) {}
            setReviewDismissed(true);
          }}
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
      <PortalRefreshButton bottomOffset={isMobile ? 100 : 24} align={isMobile ? 'left' : 'right'} />
    </div>
  );
}
