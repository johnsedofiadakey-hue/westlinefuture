import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LogOut, ChevronRight, Send, MessageSquare, FileText,
  DollarSign, CheckCircle2, Circle, Clock, Loader2,
  Star, AlertCircle, Bell, BellOff, User, Briefcase, Home,
  Search, Palette, CreditCard, Factory, Anchor, Globe,
  Truck, Wrench, ShoppingCart, ArrowRight, Lock,
  Download, File, Image, Archive, Package, Camera,
  X, Copy, Check, RefreshCw, Gift, Edit3, ChevronDown,
  ZoomIn, ScanSearch, Languages, Mic, Square, Save
} from 'lucide-react';
import { CLIENT_PROJECT_STAGES, PROJECT_TYPES } from '../data';
import { db, functions, uploadFile } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  collection, onSnapshot, query, where, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, arrayUnion
} from 'firebase/firestore';
import { createPaystackPayment } from '../lib/paystack';

const AC = '#0F766E';

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
  const ac = brand?.color || '#0F766E';
  const co = brand?.name || 'Westline Future Ltd.';
  const addr = brand?.address || 'International';
  const phone = brand?.phone || '';
  const email = brand?.email || 'info@westlinefuture.com';
  const web = brand?.website || 'www.westlinefuture.com';
  const logoUrl = brand?.logo || '';
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="height:52px;object-fit:contain;display:block;" alt="${co}" />`
    : `<div style="font-size:26px;font-weight:900;color:${ac};letter-spacing:-1px;">${co.split(' ').map(w => w[0]).join('').slice(0, 3)}</div>`;

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
    totalLabel = 'TOTAL DUE',
    statusBadge = '',               // e.g. 'PAID', 'PENDING'
    statusColor = '#16A34A',
    notes = '',
    bankDetails = '',
    terms = '',
    footerNote = '',
  } = opts;

  const isReceipt = docType === 'PAYMENT RECEIPT';
  const accentBar = `<div style="height:6px;background:linear-gradient(90deg,${ac},${ac}aa);margin:-72px -72px 0 -72px;"></div>`;

  const lineItemsHtml = lineItems.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;font-size:13px;">
      <thead>
        <tr style="background:#111827;color:#fff;">
          <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Description</th>
          <th style="padding:12px 16px;text-align:center;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Qty</th>
          <th style="padding:12px 16px;text-align:center;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Unit</th>
          <th style="padding:12px 16px;text-align:right;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Rate</th>
          <th style="padding:12px 16px;text-align:right;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map((item, i) => `
          <tr style="background:${i % 2 === 0 ? '#FAFAF9' : '#fff'};">
            <td style="padding:14px 16px;font-weight:600;color:#111827;">${item.desc || item.description || '—'}</td>
            <td style="padding:14px 16px;text-align:center;color:#4B5563;">${item.qty ?? 1}</td>
            <td style="padding:14px 16px;text-align:center;color:#4B5563;">${item.unit || 'job'}</td>
            <td style="padding:14px 16px;text-align:right;color:#4B5563;">${item.rate ? `GH₵ ${Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
            <td style="padding:14px 16px;text-align:right;font-weight:700;color:#111827;">${item.total || item.amount ? `GH₵ ${Number(item.total || item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : '';

  const rowsHtml = rows.length > 0 ? `
    <div style="margin-bottom:32px;">
      ${rows.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:13px 0;border-bottom:1px solid #E5E7EB;gap:20px;">
          <span style="font-size:12px;color:#6B7280;font-weight:600;white-space:nowrap;">${r.label}</span>
          <span style="font-size:13px;font-weight:700;color:#111827;text-align:right;">${r.value}</span>
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
    html, body { background: #fff; font-family: 'Inter', -apple-system, sans-serif; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { padding: 0; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 72px; position: relative; overflow: hidden; background: #fff; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-40deg); font-size: 100px; font-weight: 900; opacity: 0.025; white-space: nowrap; pointer-events: none; color: #111827; z-index: 0; }
    .content { position: relative; z-index: 1; }
    @page { size: A4; margin: 0; }
    @media print { html, body { width: 210mm; } .page { box-shadow: none !important; } button { display: none !important; } }
    @media screen { .page { box-shadow: 0 0 60px rgba(0,0,0,0.12); margin: 40px auto; border-radius: 4px; } body { background: #E5E7EB; } }
  </style>
</head>
<body>
<div class="page">
  ${accentBar}
  <div class="watermark">${docType}</div>
  <div class="content">

    <!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:40px;margin-bottom:48px;padding-bottom:32px;border-bottom:1.5px solid #E5E7EB;">
      <div style="display:flex;align-items:center;gap:18px;">
        ${logoHtml}
        <div>
          <div style="font-size:15px;font-weight:800;color:#111827;letter-spacing:-.3px;">${co}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px;">${addr}</div>
          ${phone ? `<div style="font-size:11px;color:#6B7280;">${phone}${email ? ' · ' + email : ''}</div>` : ''}
          ${web ? `<div style="font-size:11px;color:${ac};">${web}</div>` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${ac};margin-bottom:6px;">${docType}</div>
        <div style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#111827;">#${docNumber || 'DRAFT'}</div>
        ${statusBadge ? `<div style="display:inline-block;margin-top:10px;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:800;background:${statusColor}18;color:${statusColor};border:1px solid ${statusColor}40;">${statusBadge}</div>` : ''}
      </div>
    </div>

    <!-- META ROW -->
    <div style="display:grid;grid-template-columns:repeat(${dueStr ? 3 : 2},1fr);gap:20px;margin-bottom:36px;">
      <div style="padding:16px 20px;background:#F9FAFB;border-radius:12px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:6px;">Date Issued</div>
        <div style="font-size:14px;font-weight:700;">${dateStr}</div>
      </div>
      ${dueStr ? `<div style="padding:16px 20px;background:#F9FAFB;border-radius:12px;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:6px;">Due Date</div><div style="font-size:14px;font-weight:700;">${dueStr}</div></div>` : ''}
      <div style="padding:16px 20px;background:#111827;border-radius:12px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:6px;">Reference</div>
        <div style="font-size:13px;font-weight:700;color:#fff;font-family:monospace;">${docNumber || 'GT-DRAFT'}</div>
      </div>
    </div>

    <!-- BILL TO / FROM -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:36px;">
      <div style="padding:20px 24px;border:1.5px solid #E5E7EB;border-radius:14px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:10px;">${isReceipt ? 'Received From' : 'Bill To'}</div>
        <div style="font-size:15px;font-weight:800;color:#111827;margin-bottom:4px;">${clientName}</div>
        ${clientPhone ? `<div style="font-size:12px;color:#4B5563;margin-bottom:2px;">${clientPhone}</div>` : ''}
        ${clientEmail ? `<div style="font-size:12px;color:#4B5563;margin-bottom:2px;">${clientEmail}</div>` : ''}
        ${clientAddress ? `<div style="font-size:12px;color:#4B5563;">${clientAddress}</div>` : ''}
      </div>
      <div style="padding:20px 24px;border:1.5px solid #E5E7EB;border-radius:14px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:10px;">From</div>
        <div style="font-size:15px;font-weight:800;color:#111827;margin-bottom:4px;">${co}</div>
        <div style="font-size:12px;color:#4B5563;margin-bottom:2px;">${addr}</div>
        ${phone ? `<div style="font-size:12px;color:#4B5563;margin-bottom:2px;">${phone}</div>` : ''}
        ${email ? `<div style="font-size:12px;color:#4B5563;">${email}</div>` : ''}
      </div>
    </div>

    ${projectTitle ? `<div style="margin-bottom:24px;padding:14px 20px;background:${ac}0f;border-left:4px solid ${ac};border-radius:0 10px 10px 0;"><span style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:${ac};font-weight:800;">Project / Subject: </span><span style="font-size:14px;font-weight:700;">${projectTitle}</span></div>` : ''}

    ${lineItemsHtml}
    ${rowsHtml}

    <!-- TOTAL BOX -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
      <div style="min-width:280px;background:#111827;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.5);">${totalLabel}</span>
          <span style="font-size:24px;font-weight:900;color:${ac};letter-spacing:-0.5px;">${totalAmount}</span>
        </div>
      </div>
    </div>

    ${bankDetails ? `<div style="margin-bottom:24px;padding:16px 20px;background:#F9FAFB;border-radius:12px;border:1px solid #E5E7EB;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:8px;">Payment Details</div><div style="font-size:12px;color:#4B5563;line-height:1.7;">${bankDetails.replace(/\n/g, '<br/>')}</div></div>` : ''}
    ${notes ? `<div style="margin-bottom:24px;padding:16px 20px;background:#F9FAFB;border-radius:12px;border:1px solid #E5E7EB;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:8px;">Notes</div><div style="font-size:12px;color:#4B5563;line-height:1.7;">${notes}</div></div>` : ''}
    ${terms ? `<div style="margin-bottom:24px;padding:16px 20px;background:#F9FAFB;border-radius:12px;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:#6B7280;font-weight:800;margin-bottom:8px;">Terms & Conditions</div><div style="font-size:11px;color:#6B7280;line-height:1.7;">${terms.replace(/\n/g, '<br/>')}</div></div>` : ''}

    <!-- FOOTER -->
    <div style="margin-top:40px;padding-top:20px;border-top:1.5px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:11px;color:#6B7280;line-height:1.7;">${footerNote || `This is an official document from ${co}.<br/>For queries contact ${email} or ${phone}`}</div>
      <div style="text-align:right;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:#6B7280;font-weight:700;margin-bottom:4px;">Authorised by</div>
        <div style="width:120px;height:1px;background:#6B7280;margin-left:auto;margin-top:28px;"></div>
        <div style="font-size:10px;color:#6B7280;margin-top:4px;">${co}</div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
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
  2: <Lock size={16} />,
  3: <ScanSearch size={16} />,
  4: <FileText size={16} />,
  5: <CreditCard size={16} />,
  6: <ScanSearch size={16} />,
  7: <Star size={16} />,
};

// ─── Payment Schedule Configs ─────────────────────────────────────────────────
const SCHEDULE_CONFIGS = {
  standard: {
    label: 'Standard (50/50)',
    milestones: [
      { key: 'deposit', label: '50% Project Deposit', pct: 0.50, cumPct: 0.50, stageId: 2 },
      { key: 'final', label: '50% Final Settlement', pct: 0.50, cumPct: 1.00, stageId: 7 },
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
    totalLabel: isPaid ? 'TOTAL PAID' : isQuote ? 'QUOTED AMOUNT' : 'TOTAL DUE',
    statusBadge: isPaid ? 'PAID' : isQuote ? 'PENDING APPROVAL' : 'PAYMENT DUE',
    statusColor: isPaid ? '#16A34A' : isQuote ? '#D97706' : '#0F766E',
    notes: invoice.notes || '',
    bankDetails: brand?.bankDetails || 'Bank Name | Account Number | Branch',
    terms: '1. Payments are due within 14 days of invoice date.\n2. Late payments attract 2% monthly interest.\n3. All glass fabrication works are subject to our standard warranty policy.',
    footerNote: `Thank you for your business. — ${brand?.name || 'Westline Future Ltd.'} | ${brand?.website || 'www.westlinefuture.com'}`,
  }, brand);
}

// ─── FileType Icon Helper ─────────────────────────────────────────────────────
function FileTypeIcon({ fileType }) {
  const ft = (fileType || '').toLowerCase();
  if (ft.includes('image') || ft.includes('jpg') || ft.includes('jpeg') || ft.includes('png') || ft.includes('webp')) {
    return <Image size={18} color="#0F766E" />;
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

  const initializePayment = createPaystackPayment(config);

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
            await verify({ reference, projectId, invoiceId, expectedAmountGHS: amountGHS, type: paymentType || 'payment' });
          } catch (err) {
            if (import.meta.env.DEV) console.error('[Paystack] Verify failed:', err.message);
            setVerifyError('Payment received but server verification failed. Contact support with ref: ' + reference);
            setProcessing(false);
            return;
          }
        }
        setProcessing(false);
        if (onSuccess) onSuccess(ref);
      },
      onClose: () => {
        setProcessing(false);
        if (onClose) onClose();
      },
    }).catch((err) => {
      setProcessing(false);
      setVerifyError(err.message || 'Unable to open Paystack checkout.');
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
          background: disabled ? '#E5E7EB' : 'linear-gradient(135deg, #16A34A, #15803D)',
          color: disabled ? '#6B7280' : '#fff',
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
function StageActionCard({ project, user, approveQuote, payInvoice, updateProjectStage, approveRenderingPackage }) {
  const applicableStages = CLIENT_PROJECT_STAGES.filter(s => {
    const typeStages = PROJECT_TYPES[project.projectType]?.stages || CLIENT_PROJECT_STAGES.map(x => x.id);
    return typeStages.includes(s.id);
  });
  const currentStage = applicableStages.find(s => s.id === project.stageId);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState(false);

  if (!currentStage || !['client', 'both'].includes(currentStage.whoActs)) return null;

  const email = user?.proxyEmail || (user?.phone ? user.phone + '@clients.westlinefuture.com' : 'client@clients.westlinefuture.com');
  const budget = Number(String(project.projectTotal || project.budget || 0).replace(/[^0-9.]/g, '')) || 0;
  const halfBudget = budget * 0.5;

  if (currentStage.id === 2) {
    if (project.depositPaid) {
      return (
        <div style={{ padding: '24px 28px', borderRadius: 20, background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1.5px solid #16A34A40', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <CheckCircle2 size={24} color="#16A34A" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Quote Approved & Deposit Verified</div>
              <div style={{ fontSize: 14, color: '#4B7A62', lineHeight: 1.5 }}>
                Your project deposit has been verified. Procurement and production can proceed.
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div style={{ padding: '24px 28px', borderRadius: 20, background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', border: '1.5px solid #0F766E30', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <AlertCircle size={18} color="#0F766E" />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '.06em' }}>Quote Approval & Deposit</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#111827', marginBottom: 6 }}>Your final project quote is ready</div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
          Review the final quote with your account manager, then pay the project deposit so procurement can begin.
        </div>
        <PaymentButton
          label={`Pay Deposit - GHS ${Number(halfBudget).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          amountGHS={halfBudget}
          email={email}
          projectId={project.id}
          invoiceId={project.depositInvoiceId}
          paymentType="deposit"
          onSuccess={async (ref) => {
            await approveQuote?.(project.id);
            await payInvoice(project.depositInvoiceId || ref?.reference || ref?.trans || 'deposit', project.id, 'Paystack');
            await updateProjectStage(project.id, 3, 'Quote approved and deposit paid by client via Paystack');
          }}
        />
      </div>
    );
  }

  if (currentStage.id === 6) {
    if (done) {
      return (
        <div style={{
          padding: '20px 24px', borderRadius: 20,
          background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
          border: '1.5px solid #0F766E40', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4,
        }}>
          <CheckCircle2 size={24} color="#0F766E" />
        <div style={{ fontSize: 14, fontWeight: 700, color: '#4C1D95' }}>Inspection sign-off submitted. Our team will prepare handover.</div>
        </div>
      );
    }
    return (
      <div style={{
        padding: '24px 28px', borderRadius: 20,
        background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
        border: '1.5px solid #0F766E30', marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <AlertCircle size={18} color="#0F766E" />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '.06em' }}>Inspection Sign-Off</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#111827', marginBottom: 6 }}>Please review and sign off the inspection</div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
          Our team has completed quality checks and any open snag items. Review the latest documents and photos, then confirm your sign-off below.
        </div>
        <button
          onClick={async () => {
            if (acting) return;
            setActing(true);
            await updateProjectStage(project.id, 7, 'Inspection signed off by client');
            setActing(false);
            setDone(true);
          }}
          disabled={acting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 32px', borderRadius: 14, border: 'none',
            background: acting ? '#E5E7EB' : '#0F766E',
            color: acting ? '#6B7280' : '#fff',
            fontSize: 15, fontWeight: 800, cursor: acting ? 'default' : 'pointer',
            boxShadow: acting ? 'none' : '0 4px 16px rgba(124,58,237,.35)',
            transition: 'all .2s',
          }}
        >
          {acting
            ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
            : <>Confirm Inspection Sign-Off <ArrowRight size={18} /></>
          }
        </button>
      </div>
    );
  }

  if (currentStage.id === 7) {
    return (
      <div style={{
        padding: '24px 28px', borderRadius: 20,
        background: 'linear-gradient(135deg, #F0F9FF, #E0F2FE)',
        border: '1.5px solid #0EA5E930', marginBottom: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <AlertCircle size={18} color="#0EA5E9" />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: '.06em' }}>Final Payment</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Your final balance payment is due</div>
        {budget > 0 && (
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0EA5E9', marginBottom: 6 }}>
            Amount: GHS {Number(halfBudget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
          Your project is nearly complete. Please settle the remaining 50% balance to proceed to handover.
        </div>
        <PaymentButton
          label={`Pay Final Balance — GHS ${Number(halfBudget).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          amountGHS={halfBudget}
          email={email}
          projectId={project.id}
          paymentType="final_balance"
          onSuccess={async (ref) => {
            await payInvoice(ref?.reference || ref?.trans || 'final', project.id);
            await updateProjectStage(project.id, 7, 'Final payment received via Paystack');
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

// ─── Shipping Tracker Card ────────────────────────────────────────────────────
// ─── Installation Status Card ─────────────────────────────────────────────────
function InstallationStatusCard({ project }) {
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    if (!db || project.stageId !== 5) return;
    const q = query(
      collection(db, 'projects', project.id, 'documents'),
      where('docType', '==', 'progress_photo'),
      orderBy('createdAt', 'desc'),
      limit(6)
    );
    return onSnapshot(q, snap => setRecentPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setRecentPhotos([]));
  }, [project.id, project.stageId]);

  if (project.stageId !== 5) return null;

  const installEntry = (project.stageHistory || []).find(h => h.stageId === 5);
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
          <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>Our crew is on-site</div>
          {startDate && <div style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>Started {startDate}</div>}
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
                style={{ aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#E5E7EB', cursor: 'pointer', position: 'relative' }}
              >
                {photo.url ? (
                  <img src={photo.url} alt={photo.name || 'Site photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={18} color="#6B7280" />
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
          <Camera size={16} color="#6B7280" />
          <span style={{ fontSize: 12, color: '#4B5563' }}>Progress photos will appear here as our crew completes each section.</span>
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
  if (!sd?.vesselName || (project.stageId || 0) < 7) return null;

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
        <div style={{ padding: '14px 20px', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isImage ? <Image size={16} color="#0F766E" /> : <FileText size={16} color="#0F766E" />}
            <span className="lxf" style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{doc.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#0F766E', color: '#111827', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>
              <Download size={13} /> Download
            </a>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✕</button>
          </div>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
          {isImage && <img src={doc.url} alt={doc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 16 }} />}
          {isPDF && <iframe src={doc.url} title={doc.name} style={{ width: '100%', height: '100%', border: 'none' }} />}
          {!isImage && !isPDF && (
            <div style={{ textAlign: 'center', color: '#4B5563' }}>
              <FileText size={48} color="#6B7280" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Preview not available</div>
              <a href={doc.url} download={doc.name} style={{ color: '#0F766E', fontWeight: 700 }}>Download the file instead</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────
function DocumentsTab({ projectId, project }) {
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

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 72, borderRadius: 14, background: '#E5E7EB', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>📂</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>No documents yet</div>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
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
          const isRenderingDoc = doc.documentType === 'rendering' || doc.category === 'rendering' || doc.stageId === 3 || /render|cad|3d|drawing/i.test(doc.name || '');
          const isLockedRendering = isRenderingDoc && !project?.renderingFeePaid && !project?.renderingUnlocked;
          const uploadedDate = doc.createdAt?.seconds
            ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
          const sizeMB = doc.size ? (doc.size / (1024 * 1024)).toFixed(1) : null;

          return (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', background: '#FAFAF9', borderRadius: 16,
              border: '1.5px solid #E5E7EB', transition: 'border-color .2s',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileTypeIcon fileType={doc.fileType} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {stageInfo && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: stageInfo.color, background: `${stageInfo.color}15`, padding: '2px 8px', borderRadius: 10 }}>
                      {stageInfo.short}
                    </span>
                  )}
                  {uploadedDate && <span style={{ fontSize: 11, color: '#6B7280' }}>{uploadedDate}</span>}
                  {sizeMB && <span style={{ fontSize: 11, color: '#6B7280' }}>{sizeMB} MB</span>}
                  {doc.uploadedBy && <span style={{ fontSize: 11, color: '#6B7280' }}>by {doc.uploadedBy}</span>}
                </div>
              </div>
              {isLockedRendering ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: '#F9FAFB', color: '#6B7280', fontSize: 12, fontWeight: 800, border: '1px solid #E5E7EB' }}>
                  <Lock size={13} /> Locked
                </div>
              ) : doc.url && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setViewingDoc(doc)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 10,
                      background: '#E5E7EB', color: '#111827',
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
                      background: '#111827', color: '#fff',
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
          <div key={i} style={{ aspectRatio: '1', borderRadius: 14, background: '#E5E7EB', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>📸</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>No site photos yet</div>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
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
                background: '#E5E7EB',
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
                background: 'linear-gradient(to top, rgba(17,24,39,.85) 0%, transparent 100%)',
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
                background: 'rgba(17,24,39,.5)', backdropFilter: 'blur(4px)',
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
    { key: 'product',      label: 'Product / Materials',  color: '#0F766E' },
    { key: 'shipping',     label: 'Shipping & Freight',   color: '#0284C7' },
    { key: 'installation', label: 'Installation Labour',  color: '#D97706' },
  ].filter(r => breakdown[r.key]?.enabled && breakdown[r.key]?.amount > 0);

  const extraRows = (breakdown.extras || []).filter(e => e.amount > 0);
  const bdSubtotal = BD_ROWS.reduce((s, r) => s + (breakdown[r.key]?.amount || 0), 0)
    + extraRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const scTotal = surcharges.reduce((s, sc) => s + (Number(sc.amount) || 0), 0);
  const grandTotal = bdSubtotal + scTotal;

  return (
    <div style={{ ...card, padding: pad }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Project Cost Breakdown</div>
      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 18 }}>Itemised summary of your project cost</div>

      {/* Line items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {BD_ROWS.map((r, i) => (
          <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid #E5E7EB` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#3D3530', fontWeight: 600 }}>{r.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{fmt(breakdown[r.key].amount)}</span>
          </div>
        ))}
        {extraRows.map(e => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6B7280', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#3D3530', fontWeight: 600 }}>{e.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{fmt(e.amount)}</span>
          </div>
        ))}

        {/* Surcharges */}
        {surcharges.map(sc => (
          <div key={sc.id} style={{ padding: '12px 0', borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#3D3530', fontWeight: 700 }}>{sc.label}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#DC2626', whiteSpace: 'nowrap', marginLeft: 12 }}>+{fmt(sc.amount)}</span>
            </div>
            <div style={{ marginLeft: 18, padding: '10px 14px', background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA30' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Reason for adjustment</div>
              <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.6 }}>{sc.reason}</div>
              <div style={{ fontSize: 10, color: '#6B7280', marginTop: 6, fontWeight: 600 }}>Effective {sc.date}</div>
            </div>
          </div>
        ))}

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>Total Project Value</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>{fmt(grandTotal)}</span>
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
    ?? (propTxns || []).filter(t => t.projectId === project.id || t.clientId === uid);
  const allInvoices = liveInvoices
    ?? (propInvs || []).filter(i => i.projectId === project.id || i.clientId === uid);

  const totalPaid = allPayments.reduce((s, t) => s + (Number(t.amount) || 0), 0);
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
    border: isMobile ? 'none' : '1px solid #E5E7EB',
    boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)',
  };
  const pad = isMobile ? '20px 18px' : '24px 28px';
  const sectionTitle = { fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 16 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20 }}>

      {/* Currency toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 2px' : 0 }}>
        <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
          Base currency: <strong style={{ color: '#111827' }}>GHS</strong>
        </div>
        <button
          onClick={() => setShowUSD(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 22,
            background: showUSD ? '#111827' : '#F9FAFB',
            border: `2px solid ${showUSD ? '#111827' : '#E5E7EB'}`,
            color: showUSD ? '#0F766E' : '#4B5563',
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
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: -10 }}>
              {scheduleConfig.label}
            </div>
          </div>
          {budget > 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#16A34A' }}>{fmt(totalPaid)}</div>
              <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>paid so far</div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {budget > 0 && (
          <div style={{ marginBottom: isCustom ? 16 : 20 }}>
            <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${paidPct}%`, background: 'linear-gradient(90deg, #16A34A80, #16A34A)', borderRadius: 5, transition: 'width 1.2s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280' }}>
              <span style={{ fontWeight: 700, color: paidPct >= 100 ? '#16A34A' : '#111827' }}>{paidPct.toFixed(1)}% paid</span>
              <span>{fmt(budget - totalPaid)} remaining · Total {fmt(budget)}</span>
            </div>
          </div>
        )}

        {/* ── Custom schedule: simple ledger summary ── */}
        {isCustom ? (
          <div>
            {budget <= 0 ? (
              <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '12px 0' }}>
                No project budget set yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: 14, border: '1.5px solid #16A34A20' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Amount Paid</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#16A34A' }}>{fmt(totalPaid)}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{allPayments.length} payment{allPayments.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ padding: '14px 16px', background: '#FFFBEB', borderRadius: 14, border: '1.5px solid #D9770620' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Balance Due</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: totalPaid >= budget ? '#16A34A' : '#D97706' }}>
                    {totalPaid >= budget ? 'Cleared ✓' : fmt(budget - totalPaid)}
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{paidPct.toFixed(0)}% of {fmt(budget)}</div>
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
                  border: `1.5px solid ${isDue ? '#16A34A40' : isPaid ? '#16A34A20' : '#E5E7EB'}`,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isPaid ? '#16A34A' : isDue ? '#F0FDF4' : '#E5E7EB',
                    border: isDue ? '2px solid #16A34A' : 'none',
                  }}>
                    {isPaid
                      ? <Check size={14} color="#fff" />
                      : <span style={{ fontSize: 11, fontWeight: 900, color: isDue ? '#16A34A' : '#6B7280' }}>{idx + 1}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{m.label}</div>
                    {budget > 0 && (
                      <div style={{ fontSize: 13, fontWeight: 800, color: isPaid ? '#16A34A' : isDue ? '#16A34A' : '#6B7280', marginTop: 2 }}>
                        {fmt(budget * m.pct)}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isPaid && <span style={{ fontSize: 10, fontWeight: 800, color: '#065F46', background: '#D1FAE5', padding: '4px 10px', borderRadius: 20 }}>Paid ✓</span>}
                    {isDue && <span style={{ fontSize: 10, fontWeight: 800, color: '#92400E', background: '#FEF3C7', padding: '4px 10px', borderRadius: 20 }}>Due Now</span>}
                    {status === 'upcoming' && <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', background: '#E5E7EB', padding: '4px 10px', borderRadius: 20 }}>Upcoming</span>}
                  </div>
                </div>
              );
            })}

            {currentDueMilestone && budget > 0 && (
              <div style={{ marginTop: 10, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 12 }}>
                  Ready to pay your <strong>{currentDueMilestone.label}</strong>?
                </div>
                <PaymentButton
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
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>No payments yet</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>Your payment records will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allPayments.map(t => (
              <div key={t.id} style={{ background: '#FAFAF9', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: isMobile ? '14px 14px 10px' : '16px 18px 10px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Check size={16} color="#16A34A" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                      {t.description || t.title || 'Payment received'}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>
                      {fmtDate(t.date || t.createdAt, true)}
                    </div>
                    {t.reference && (
                      <div style={{ display: 'inline-block', fontSize: 10, color: '#4B5563', fontFamily: 'monospace', background: '#E5E7EB', padding: '2px 8px', borderRadius: 6 }}>
                        {t.reference}
                      </div>
                    )}
                    {t.method && (
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>via {t.method}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#16A34A' }}>{fmt(t.amount)}</div>
                    {showUSD && (
                      <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                        ≈ GHS {Number(t.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #E5E7EB', padding: isMobile ? '9px 14px' : '9px 18px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => downloadPaymentReceipt(t, project, user, brand)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#E5E7EB', border: 'none', fontSize: 11, fontWeight: 700, color: '#111827', cursor: 'pointer', touchAction: 'manipulation', minHeight: 34 }}
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
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>No invoices yet</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>Invoices will appear here as they are issued.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allInvoices.map(inv => (
              <div key={inv.id} style={{ background: '#FAFAF9', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: isMobile ? '14px 14px 10px' : '16px 18px 10px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <FileText size={16} color="#D97706" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                      Invoice #{inv.invoiceNumber || (inv.id || '').slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>
                      {fmtDate(inv.createdAt || inv.date)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{fmt(inv.amount || 0)}</span>
                      {showUSD && inv.amount && (
                        <span style={{ fontSize: 10, color: '#6B7280' }}>≈ GHS {Number(inv.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                        background: inv.status === 'Paid' ? '#D1FAE5' : inv.status === 'Overdue' ? '#FEE2E2' : '#FEF3C7',
                        color: inv.status === 'Paid' ? '#065F46' : inv.status === 'Overdue' ? '#991B1B' : '#92400E',
                      }}>
                        {inv.status || 'Pending'}
                      </span>
                    </div>
                    {inv.title && <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>{inv.title}</div>}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #E5E7EB', padding: isMobile ? '9px 14px' : '9px 18px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => downloadInvoicePDF(inv, project, user, brand)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#111827', border: 'none', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', touchAction: 'manipulation', minHeight: 34 }}
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

// ─── Project Chat ─────────────────────────────────────────────────────────────
function ProjectChat({ project, user, addProjectMessage }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [translatingId, setTranslatingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);
  const [voiceSaving, setVoiceSaving] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingStartedAtRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!db || !project?.id) { setMessages([]); return; }
    const q = query(
      collection(db, 'projects', project.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      const visible = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => !m.isInternal);
      setMessages(visible);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    });
    return unsub;
  }, [project?.id]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await addProjectMessage(project.id, text.trim(), 'client', false);
    setText('');
    setSending(false);
  };

  const translate = async (messageId) => {
    if (!functions || translatingId) return;
    setTranslatingId(messageId);
    try {
      const fn = httpsCallable(functions, 'translateProjectMessage');
      await fn({ projectId: project.id, messageId, targetLanguage: 'en' });
    } catch (err) {
      alert(err.message || 'Translation failed');
    } finally {
      setTranslatingId(null);
    }
  };

  const startEdit = (message) => {
    setEditingId(message.id);
    setEditText(message.text || '');
  };

  const saveEdit = async (message) => {
    if (!db || !editText.trim()) return;
    await updateDoc(doc(db, 'projects', project.id, 'messages', message.id), {
      text: editText.trim(),
      editedAt: serverTimestamp(),
      editedBy: user?.uid || user?.id || 'client',
      updatedAt: serverTimestamp(),
      editHistory: arrayUnion({
        text: message.text || '',
        editedAt: new Date().toISOString(),
        editedBy: user?.uid || user?.id || 'client',
      }),
    });
    setEditingId(null);
    setEditText('');
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || recording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = event => {
      if (event.data?.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      setVoiceSaving(true);
      try {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const duration = recordingStartedAtRef.current ? Math.round((Date.now() - recordingStartedAtRef.current) / 1000) : null;
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        const audioUrl = await uploadFile('project-voice-notes', `${project.id}/${Date.now()}-client.webm`, file);
        await addProjectMessage(project.id, 'Voice note', 'client', false, {
          type: 'voice',
          audioUrl,
          duration,
        });
      } finally {
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
        recordingStartedAtRef.current = null;
        setRecordingStartedAt(null);
        setVoiceSaving(false);
      }
    };
    mediaRecorderRef.current = recorder;
    recordingStartedAtRef.current = Date.now();
    setRecordingStartedAt(Date.now());
    setRecording(true);
    recorder.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2, marginBottom: 16 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Start a conversation</div>
            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>Have a question about your project? Send us a message and our team will respond shortly.</div>
          </div>
        )}
        {messages.map(m => {
          const isMe = m.senderRole === 'client';
          const isSystem = m.senderRole === 'system';
          const translated = m.translations?.en?.text;
          const canEdit = isMe && !isSystem && m.type !== 'voice';
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {!isSystem && (
                <div style={{ fontSize: 10, fontWeight: 700, color: isMe ? AC : '#0F766E', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {isMe ? 'You' : 'Westline Future Team'}
                </div>
              )}
              <div style={{
                maxWidth: '80%', padding: isSystem ? '10px 16px' : '13px 18px',
                borderRadius: isMe ? '18px 18px 4px 18px' : isSystem ? 12 : '18px 18px 18px 4px',
                background: isMe ? '#111827' : isSystem ? '#F9FAFB' : '#fff',
                color: isMe ? '#fff' : isSystem ? '#6B7280' : '#111827',
                fontSize: isSystem ? 12 : 14, fontStyle: isSystem ? 'italic' : 'normal',
                border: isSystem ? '1px dashed #E5E7EB' : isMe ? 'none' : '1px solid #E5E7EB',
                lineHeight: 1.5,
              }}>
                {editingId === m.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} style={{ width: 260, border: '1px solid #E5E7EB', borderRadius: 10, padding: 10, fontFamily: 'inherit', fontSize: 13 }} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingId(null)} style={{ border: 'none', background: '#F9FAFB', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                      <button onClick={() => saveEdit(m)} style={{ border: 'none', background: '#16A34A', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Save size={12} /> Save</button>
                    </div>
                  </div>
                ) : m.type === 'voice' && m.audioUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontWeight: 800 }}>{m.text || 'Voice note'}{m.duration ? ` · ${m.duration}s` : ''}</div>
                    <audio controls src={m.audioUrl} style={{ width: 260, maxWidth: '100%' }} />
                    {m.transcript && <div style={{ fontSize: 12, opacity: .8 }}>{m.transcript}</div>}
                  </div>
                ) : (
                  m.text
                )}
                {m.editedAt && <span style={{ display: 'block', fontSize: 10, opacity: .55, marginTop: 6 }}>Edited</span>}
                {translated && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${isMe ? 'rgba(255,255,255,.18)' : '#E5E7EB'}`, fontSize: 12, opacity: .9 }}>
                    <strong>English:</strong> {translated}
                  </div>
                )}
              </div>
              {!isSystem && (
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => translate(m.id)} disabled={translatingId === m.id} style={{ border: 'none', background: 'transparent', color: '#6B7280', fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Languages size={11} /> {translatingId === m.id ? 'Translating...' : 'Translate English'}
                  </button>
                  {canEdit && (
                    <button onClick={() => startEdit(m)} style={{ border: 'none', background: 'transparent', color: '#6B7280', fontSize: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Edit3 size={11} /> Edit
                    </button>
                  )}
                </div>
              )}
              <div style={{ fontSize: 10, color: '#DFD9D1', marginTop: 4 }}>
                {m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ flexShrink: 0, display: 'flex', gap: 10, borderTop: '1px solid #E5E7EB', paddingTop: 14 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Send a message to our team..."
          rows={2}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 14, border: '1.5px solid #E5E7EB', fontSize: 16, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={voiceSaving}
          style={{ width: 48, height: 48, borderRadius: 14, background: recording ? '#EF4444' : '#F9FAFB', color: recording ? '#fff' : '#4B5563', border: '1px solid #E5E7EB', cursor: voiceSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', flexShrink: 0 }}
          title={recording ? 'Stop recording' : 'Record voice note'}
        >
          {voiceSaving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : recording ? <Square size={15} /> : <Mic size={18} />}
        </button>
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{ width: 48, height: 48, borderRadius: 14, background: text.trim() ? '#111827' : '#E5E7EB', color: '#fff', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', flexShrink: 0, transition: 'background .2s' }}
        >
          {sending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}

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
      <div style={{ marginBottom: 24, padding: '16px 20px', background: '#F9FAFB', borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 2 }}>Overall Progress</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{progressPct}%</div>
          </div>
          {estCompletion && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Est. Completion</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: ac }}>{estCompletion}</div>
            </div>
          )}
        </div>
        <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, overflow: 'hidden' }}>
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
            const dotBorder = isPast ? s.color : isCurrent ? s.color : '#E5E7EB';
            return (
              <div key={s.id} data-current={isCurrent ? 'true' : 'false'} style={{ display: 'flex', gap: 14, alignItems: 'stretch', minHeight: isCurrent ? 64 : 44 }}>
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
                      color: isCurrent ? s.color : isPast ? '#111827' : '#6B7280',
                      lineHeight: 1.3,
                    }}>
                      {s.short || s.name}
                    </div>
                    {isCurrent && (
                      <div style={{ fontSize: 10, fontWeight: 800, color: s.color, background: `${s.color}12`, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                        Active
                      </div>
                    )}
                  </div>
                  {enteredDate && (isPast || isCurrent) && (
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{enteredDate}</div>
                  )}
                  {isCurrent && s.clientMsg && (
                    <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>
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
                style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 68 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', position: 'relative' }}>
                  {/* connector before */}
                  {idx > 0 && (
                    <div style={{ position: 'absolute', right: '50%', top: 20, marginRight: 14, height: 2, left: 0, background: isPast ? s.color : '#E5E7EB' }} />
                  )}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', zIndex: 1, flexShrink: 0,
                    background: isPast ? s.color : isCurrent ? '#fff' : '#E5E7EB',
                    border: isPast ? `2px solid ${s.color}` : isCurrent ? `2.5px solid ${s.color}` : '2px solid #E5E7EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isPast ? '#fff' : isCurrent ? s.color : '#6B7280',
                    boxShadow: isCurrent ? `0 0 0 4px ${s.color}20` : 'none',
                    transition: 'all .3s',
                  }}>
                    {isPast ? <CheckCircle2 size={15} /> : STAGE_ICONS[s.id]}
                  </div>
                  {/* connector after */}
                  {!isLast && (
                    <div style={{ position: 'absolute', left: '50%', top: 20, marginLeft: 14, height: 2, right: 0, background: isPast ? s.color : '#E5E7EB' }} />
                  )}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: isPast ? '#4B5563' : isCurrent ? s.color : '#DFD9D1', textAlign: 'center', lineHeight: 1.2, maxWidth: 68, marginTop: 2 }}>
                  {s.short}
                </div>
                {enteredDate && (isPast || isCurrent) && (
                  <div style={{ fontSize: 9, color: '#6B7280', textAlign: 'center', lineHeight: 1.2 }}>{enteredDate}</div>
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
              <div style={{ fontSize: 18, fontWeight: 900, color: '#111827', marginBottom: 6 }}>{currentStage.name}</div>
              <div style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, marginBottom: 10 }}>{currentStage.clientMsg}</div>
              {(() => {
                const entry = (project.stageHistory || []).find(h => h.stageId === currentStage.id);
                const date = entry?.timestamp ? fmtShort(entry.timestamp) : null;
                const days = entry?.timestamp ? daysSince(entry.timestamp) : null;
                return date ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
                    <Clock size={11} /> Entered {date}
                    {days !== null && <span style={{ fontWeight: 700, color: '#4B5563' }}>· {days} day{days !== 1 ? 's' : ''} in this stage</span>}
                  </div>
                ) : null;
              })()}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                {currentStage.whoActs === 'client' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0F766E', background: '#ECFDF5', padding: '6px 14px', borderRadius: 20, border: '1px solid #A7F3D0' }}>
                    <AlertCircle size={13} /> Action required from you
                  </div>
                )}
                {onRequestChange && (
                  <button
                    onClick={onRequestChange}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 12, fontWeight: 700, color: '#4B5563',
                      background: '#F9FAFB', padding: '6px 14px', borderRadius: 20,
                      border: '1px solid #E5E7EB', cursor: 'pointer',
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
          <div style={{ fontSize: 13, fontWeight: 900, color: '#111827', marginBottom: 6 }}>
            {currentStage.name}
          </div>
          {(() => {
            const entry = (project.stageHistory || []).find(h => h.stageId === currentStage.id);
            const days = entry?.timestamp ? daysSince(entry.timestamp) : null;
            return days !== null ? (
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>
                <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                {days} day{days !== 1 ? 's' : ''} in this stage
              </div>
            ) : null;
          })()}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {currentStage.whoActs === 'client' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#0F766E', background: '#ECFDF5', padding: '7px 14px', borderRadius: 20, border: '1px solid #A7F3D0' }}>
                <AlertCircle size={12} /> Action needed
              </div>
            )}
            {onRequestChange && (
              <button
                onClick={onRequestChange}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 700, color: '#4B5563',
                  background: '#F9FAFB', padding: '7px 14px', borderRadius: 20,
                  border: '1px solid #E5E7EB', cursor: 'pointer',
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
        background: 'rgba(17,24,39,.6)', backdropFilter: 'blur(6px)',
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
            <div style={{ fontSize: 13, color: '#6B7280' }}>Our team will review your change request and get back to you shortly.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Project Change</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>Request a Change</div>
              </div>
              <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#E5E7EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#4B5563" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 8 }}>Change Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#111827', appearance: 'none', boxSizing: 'border-box' }}
                >
                  {changeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 8 }}>Description <span style={{ color: '#DC2626' }}>*</span></label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  placeholder="Describe the change you'd like to request..."
                  rows={4}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5563', marginBottom: 8 }}>Urgency</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {urgencies.map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: 13, transition: 'all .15s',
                        background: urgency === u ? (u === 'Urgent' ? '#FEE2E2' : '#111827') : '#E5E7EB',
                        color: urgency === u ? (u === 'Urgent' ? '#991B1B' : '#fff') : '#4B5563',
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
                  background: !description.trim() || submitting ? '#E5E7EB' : '#111827',
                  color: !description.trim() || submitting ? '#6B7280' : '#fff',
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
        background: 'rgba(17,24,39,.7)', backdropFilter: 'blur(8px)',
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
            <div style={{ fontSize: 14, color: '#6B7280' }}>Your review helps us improve. We appreciate your trust.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🌟</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 8 }}>Your Project is Complete!</div>
            <div style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, marginBottom: 28 }}>
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
                    background: (hovered || rating) >= s ? '#FEF3C7' : '#E5E7EB',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s',
                    transform: (hovered || rating) >= s ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <Star size={24} fill={(hovered || rating) >= s ? '#F59E0B' : 'none'} color={(hovered || rating) >= s ? '#F59E0B' : '#6B7280'} />
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
              style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1.5px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', marginBottom: 20 }}
            />

            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              style={{
                width: '100%', height: 48, borderRadius: 14, border: 'none',
                background: rating === 0 ? '#E5E7EB' : '#111827',
                color: rating === 0 ? '#6B7280' : '#fff',
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
              style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: '#6B7280', cursor: 'pointer', padding: '4px 0' }}
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
        <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 2 }}>Refer a client, earn a discount</div>
        <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>Share your code and get a discount on your next project when they sign on.</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          padding: '8px 16px', borderRadius: 20,
          background: '#111827', color: ac,
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
            background: copied ? '#D1FAE5' : '#E5E7EB',
            color: copied ? '#065F46' : '#4B5563',
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
        <Bell size={18} color={unread.length > 0 ? ac : '#4B5563'} fill={unread.length > 0 ? ac : 'none'} />
        {unread.length > 0 && (
          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread.length > 9 ? '9+' : unread.length}
          </div>
        )}
      </button>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 48, width: 340, maxHeight: 400, overflowY: 'auto', background: '#fff', borderRadius: 18, border: '1.5px solid #E5E7EB', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 1000 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>Notifications</div>
            {unread.length > 0 && <button onClick={() => { notifications.forEach(n => !n.read && onMarkRead?.(n.id)); setOpen(false); }} style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: ac, cursor: 'pointer' }}>Mark all read</button>}
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>No notifications yet</div>
          ) : (
            notifications.slice(0, 20).map(n => (
              <div key={n.id} onClick={() => onMarkRead?.(n.id)} style={{ padding: '14px 20px', borderBottom: '1px solid #F9FAFB', display: 'flex', gap: 12, alignItems: 'flex-start', background: n.read ? '#fff' : '#FAFAF7', cursor: 'pointer', transition: 'background .15s' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? '#E5E7EB' : ac, marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, color: '#111827', lineHeight: 1.4, fontWeight: n.read ? 500 : 700 }}>{n.msg}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
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
          background: '#111827', color: '#fff', fontSize: 11, fontWeight: 600,
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
        borderRadius: 20, border: `2px solid ${isSelected ? AC : '#E5E7EB'}`,
        background: isSelected ? `${AC}08` : '#fff',
        cursor: 'pointer', transition: 'all .25s',
        boxShadow: isSelected ? `0 8px 24px ${AC}18` : '0 2px 8px rgba(0,0,0,.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, marginRight: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', lineHeight: 1.3, marginBottom: 4 }}>{project.title}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>{pt?.label || 'Full Service'}</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: stg?.color || AC, background: `${stg?.color || AC}15`, padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {stg?.short || 'Stage 1'}
        </div>
      </div>
      <div style={{ height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${stg?.pct || 5}%`, background: stg?.color || AC, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280', fontWeight: 600 }}>
        <span>{stg?.pct || 5}% complete</span>
        {project.budget && <span>Budget: GHS {Number(project.budget).toLocaleString()}</span>}
      </div>
    </button>
  );
}

// ─── Project Header Card ──────────────────────────────────────────────────────
function ProjectHeaderCard({ project, isMobile, ac, brand }) {
  const budget = Number(project.budget) || 0;

  // Use paidAmount from project doc if set (logged by admin), else fall back to stage-based estimate
  const paid = budget > 0 ? Math.min(budget, Number(project.paidAmount) || (() => {
    if (project.stageId >= 7) return budget;
    if (project.stageId >= 3) return budget * 0.50;
    return 0;
  })()) : 0;
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
    <div style={{ background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid #E5E7EB', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)', overflow: 'hidden' }}>

      {/* Header row */}
      <div style={{ padding: isMobile ? '20px 18px 16px' : '24px 28px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: ac, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
              {PROJECT_TYPES[project.projectType]?.label || 'Full Service'} Project
            </div>
            <div style={{ fontSize: isMobile ? 19 : 23, fontWeight: 900, color: '#111827', lineHeight: 1.25 }}>{project.title}</div>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 800, flexShrink: 0,
            color: project.status === 'Completed' ? '#16A34A' : project.status === 'On Hold' ? '#D97706' : '#0F766E',
            background: project.status === 'Completed' ? '#F0FDF4' : project.status === 'On Hold' ? '#FFFBEB' : '#ECFDF5',
            padding: '5px 12px', borderRadius: 20,
            border: `1px solid ${project.status === 'Completed' ? '#DCFCE7' : project.status === 'On Hold' ? '#FDE68A' : '#D1FAE5'}`,
            letterSpacing: '.04em',
          }}>
            {project.status || 'Active'}
          </div>
        </div>

        {project.description && (
          <div style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, marginBottom: 14 }}>
            {project.description}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 6 }}>
            <span>Stage {project.stageId || 1} of {stageTotal}</span>
            <span>{progressPct}% complete</span>
          </div>
          <div style={{ height: 6, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg, ${ac}, ${ac}CC)`, borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
        </div>

        {/* Key stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 10 : 16 }}>
          <div style={{ background: '#F9FAFB', borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, marginBottom: 4 }}>Started</div>
            <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827' }}>{startDate}</div>
          </div>
          {budget > 0 ? (
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, marginBottom: 4 }}>Project Value</div>
              <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827' }}>GHS {Number(budget).toLocaleString()}</div>
            </div>
          ) : (
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 16px' }}>
              <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, marginBottom: 4 }}>Type</div>
              <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827' }}>{PROJECT_TYPES[project.projectType]?.label || 'Full Service'}</div>
            </div>
          )}
          <div style={{ background: '#F9FAFB', borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, marginBottom: 4 }}>Days In</div>
            <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#111827' }}>
              {project.createdAt
                ? `${Math.max(1, daysSince(project.createdAt))} days`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Payment summary strip — only when budget is known */}
      {budget > 0 && (
        <div style={{ borderTop: '1px solid #E5E7EB', padding: isMobile ? '14px 18px' : '16px 28px', background: '#FAFAF9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4B5563' }}>Payment progress</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>{paidPct}% paid</span>
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

      {/* WhatsApp contact button */}
      <div style={{ borderTop: '1px solid #E5E7EB', padding: isMobile ? '14px 18px' : '16px 28px' }}>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '13px 20px', borderRadius: 14,
            background: '#25D366', color: '#fff',
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 2px 12px rgba(37,211,102,.3)',
            touchAction: 'manipulation',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Chat with our team on WhatsApp
        </a>
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
  // Projects are assigned by clientIds. Portfolio-level inheritance should be materialized onto each project.
  useEffect(() => {
    if (!db || !user) { setLoadingProjects(false); return; }

    const clientAccessId = user.id || user.uid;
    if (!clientAccessId) { setLoadingProjects(false); return; }

    const q = query(
      collection(db, 'projects'),
      where('clientIds', 'array-contains', clientAccessId),
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
    selected.stageId === 7 &&
    !reviewDismissed &&
    !reviewSubmitted;

  const tabs = [
    { id: 'timeline',  label: 'Progress',  icon: <CheckCircle2 size={14} /> },
    { id: 'photos',    label: 'Photos',    icon: <Camera size={14} /> },
    { id: 'payments',  label: 'Payments',  icon: <CreditCard size={14} /> },
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
          background: '#111827', color: '#fff', padding: '14px 20px',
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

      {isMobile ? (
        /* ── MOBILE: HERO APP HEADER (dark banner + greeting, non-sticky so it scrolls away) ── */
        <div style={{ background: '#111827', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div style={{ height: 52, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {props.brand?.logo && (
                <img src={props.brand.logo} style={{ height: 24, objectFit: 'contain' }} alt="" onError={e => { e.target.style.display = 'none'; }} />
              )}
              <span style={{ fontSize: 16, fontWeight: 800, color: ac }}>{props.brand?.name || 'Westline Future'}</span>
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
          background: '#111827', padding: '0 24px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {props.brand?.logo && (
              <img src={props.brand.logo} style={{ height: 26, objectFit: 'contain' }} alt="Logo" onError={e => { e.target.style.display = 'none'; }} />
            )}
            <span style={{ fontSize: 13, fontWeight: 800, color: ac, letterSpacing: '.02em' }}>{props.brand?.name || 'Westline Future'}</span>
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
            <div style={{ fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 6 }}>
              Welcome back, {(user?.name || 'there').split(' ')[0]} 👋
            </div>
            <div style={{ fontSize: 15, color: '#4B5563', marginBottom: 20 }}>
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
            <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Couldn't load your projects</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
              There was a connection issue. Please refresh the page or contact our team.
            </div>
            <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#111827', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ padding: isMobile ? '60px 28px' : '80px 40px', textAlign: 'center', background: '#fff', borderRadius: isMobile ? 24 : 24, border: isMobile ? 'none' : '1.5px dashed #E5E7EB', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : 'none', marginTop: isMobile ? 8 : 0 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>No projects yet</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 24px' }}>
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
                        border: `2px solid ${p.id === selectedId ? ac : '#E5E7EB'}`,
                        background: p.id === selectedId ? `${ac}15` : '#fff',
                        color: p.id === selectedId ? '#111827' : '#4B5563',
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
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Your Projects</div>
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

                {/* Tabs — desktop only; mobile uses bottom dock */}
                {!isMobile && (
                  <div style={{ display: 'flex', gap: 4, background: '#fff', padding: 5, borderRadius: 16, border: '1px solid #E5E7EB', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {tabs.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                          height: 38, padding: '0 16px', borderRadius: 12, border: 'none',
                          background: activeTab === t.id ? '#111827' : 'transparent',
                          color: activeTab === t.id ? '#fff' : '#4B5563',
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
                    <StageActionCard
                      project={selected}
                      user={user}
                      approveQuote={props.approveQuote}
                      payInvoice={props.payInvoice}
                      updateProjectStage={props.updateProjectStage}
                      approveRenderingPackage={props.approveRenderingPackage}
                    />
                    <InstallationStatusCard project={selected} />
                    <ShippingTrackerCard project={selected} />
                    <div style={{ padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid #E5E7EB', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Project Timeline</div>
                      <StageTimeline
                        project={selected}
                        onRequestChange={() => setShowChangeRequest(true)}
                        isMobile={isMobile}
                      />

                      {/* Activity log */}
                      {(selected.stageHistory || []).length > 1 && (
                        <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #E5E7EB' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 16 }}>Activity Log</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[...(selected.stageHistory || [])].reverse().map((h, idx) => {
                              const s = CLIENT_PROJECT_STAGES.find(st => st.id === h.stageId);
                              return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#F9FAFB', borderRadius: 12 }}>
                                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${s?.color || AC}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s?.color || AC, flexShrink: 0 }}>
                                    {STAGE_ICONS[h.stageId] || <CheckCircle2 size={14} />}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{s?.name || `Stage ${h.stageId}`}</div>
                                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                                      {h.timestamp
                                        ? (() => {
                                            const d = h.timestamp?.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
                                            return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                          })()
                                        : ''}
                                    </div>
                                    {h.note && <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2, fontStyle: 'italic' }}>{h.note}</div>}
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

                {/* ── PHOTOS TAB ── */}
                {activeTab === 'photos' && (
                  <div style={{ padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid #E5E7EB', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Site Photos</div>
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

                {/* ── DOCUMENTS TAB ── */}
                {activeTab === 'documents' && (
                  <div style={{ padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff', borderRadius: isMobile ? 24 : 20, border: isMobile ? 'none' : '1px solid #E5E7EB', boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Project Documents</div>
                    <DocumentsTab projectId={selected.id} project={selected} />
                  </div>
                )}

                {/* ── MESSAGES TAB ── */}
                {activeTab === 'messages' && (
                  <div style={{
                    padding: isMobile ? '20px 18px' : '24px 28px', background: '#fff',
                    borderRadius: isMobile ? 24 : 20,
                    border: isMobile ? 'none' : '1px solid #E5E7EB',
                    boxShadow: isMobile ? '0 2px 16px rgba(0,0,0,.08)' : '0 4px 20px rgba(0,0,0,.05)',
                    height: isMobile ? 'calc(100dvh - 320px)' : 560,
                    minHeight: isMobile ? 320 : undefined,
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 16, flexShrink: 0 }}>Messages</div>
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <ProjectChat
                        project={selected}
                        user={user}
                        addProjectMessage={props.addProjectMessage}
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
            { id: 'photos',    label: 'Photos',    icon: Camera },
            { id: 'payments',  label: 'Payments',  icon: CreditCard },
            { id: 'documents', label: 'Docs',      icon: FileText },
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
