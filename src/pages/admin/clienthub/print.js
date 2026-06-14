// Logo note: we use the URL directly in the <img> tag rather than base64.
// <img> tags are not subject to CORS restrictions for *display* — they always load.
// The dark header background makes a white logo visible without any processing.
// We just need to give the iframe enough time to load the image before print fires.

// ─── Professional milestone service descriptions ──────────────────────────────
// These describe what stage of the contract the payment covers.
// They are intentionally generic and do not reference internal workflow keys.
const MILESTONE_COPY = {
  'post-rendering': {
    title: 'First Contract Instalment',
    body:  'This payment constitutes the primary instalment under the contract for the above-referenced project. It covers the commencement of all agreed professional services including initial survey, design development, procurement of specified materials, and preparation works required to advance the project to the manufacturing stage.',
  },
  'post-production': {
    title: 'Second Contract Instalment',
    body:  'This payment constitutes the second instalment under the contract. It covers all manufacturing, custom fabrication, precision engineering, and quality assurance of the specified components and materials as detailed in the approved project scope.',
  },
  'post-shipping': {
    title: 'Final Contract Settlement',
    body:  'This payment constitutes the final settlement under the contract. It covers site delivery, professional installation, structural integration, finishing works, and formal project handover upon successful completion and client acceptance.',
  },
  'deposit': {
    title: 'Contract Mobilisation Deposit',
    body:  'This payment constitutes the mobilisation deposit required to formally execute the contract. It secures the project schedule, initiates procurement of specified materials and components, and authorises the team to commence all agreed works.',
  },
  'completion': {
    title: 'Final Contract Settlement',
    body:  'This payment constitutes the final balance due under the contract, payable upon successful completion of all project works, site installation, and formal client inspection and acceptance sign-off.',
  },
  'pre-delivery': {
    title: 'Pre-Delivery Contract Instalment',
    body:  'This payment covers all fabrication, manufacturing, and pre-delivery preparatory works under the contract. It is payable prior to the scheduled dispatch and delivery of all project components to site.',
  },
};

// ─── Helper Print Engine ─────────────────────────────────────────────────────
export async function printInvoiceOrReceipt(inv, brand) {
  const fs   = brand?.finSettings || {};
  const ac   = brand?.color || '#C8A96E';
  const dark = '#0F0C0A';
  const mid  = '#2C2420';
  const mut  = '#7A6A61';
  const soft = '#EDE8E1';
  const surf = '#F7F4EF';
  const acLight = `${ac}22`;

  // ── document type ──
  const isRcpt      = inv.documentKind === 'receipt' || inv.invoiceType === 'receipt' || inv.type === 'Receipt';
  const isQuo       = inv.documentKind === 'quotation' || inv.type === 'Quotation';
  const isDesign    = inv.type === 'Design' || /design.*fee|rendering.*fee/i.test(inv.title || '');
  const isMilestone = inv.type === 'Milestone';
  const lbl         = isRcpt ? 'RECEIPT' : isQuo ? 'QUOTATION' : 'INVOICE';
  const sublbl      = isDesign    ? 'Design & Rendering Fee'
                    : isMilestone ? 'Milestone Payment'
                    : inv.type === 'Surcharge' ? 'Surcharge'
                    : inv.type === 'Add-On'    ? 'Project Add-On'
                    : null;

  // ── company ──
  const co      = brand?.name     || 'Westline Future';
  const tagline = brand?.tagline  || fs.companyTagline || 'Global Trading Co, Ltd';
  const addr    = brand?.location || '';
  const phone   = brand?.phone    || '';
  const email   = brand?.email    || '';
  const web     = brand?.website  || 'www.westlinefuture.com';
  const logoSrc = brand?.logo     || '/logo.png';

  // ── logo: use URL directly in <img> — always works for display, dark header makes white logo visible ──
  // onerror hides the broken img and shows the text word-mark instead
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" style="height:72px;max-width:200px;object-fit:contain;display:block;"
          onerror="this.style.display='none';document.getElementById('logo-fallback').style.display='flex';" alt="${co}" />
       <div id="logo-fallback" style="display:none;flex-direction:column;line-height:1.1;gap:3px;">
         <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:2px;text-transform:uppercase;">${co.split(' ')[0]}</div>
         <div style="font-size:9px;font-weight:700;color:${ac};letter-spacing:5px;text-transform:uppercase;">${co.split(' ').slice(1).join(' ') || tagline}</div>
       </div>`
    : `<div style="display:flex;flex-direction:column;line-height:1.1;gap:3px;">
         <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:2px;text-transform:uppercase;">${co.split(' ')[0]}</div>
         <div style="font-size:9px;font-weight:700;color:${ac};letter-spacing:5px;text-transform:uppercase;">${co.split(' ').slice(1).join(' ') || tagline}</div>
       </div>`;

  // ── client ──
  const cn   = inv.clientName    || 'Valued Client';
  const cco  = inv.clientCompany || '';
  const cadr = inv.clientAddress || '';
  const cem  = inv.clientEmail   || '';
  const cph  = inv.clientPhone   || '';
  const ctax = inv.clientTaxId   || '';
  const proj = inv.projectTitle  || '';

  // ── currency + format helpers ──
  const cur  = inv.currency || fs.baseCurrency || 'GHS';
  const syms = { GHS: 'GH₵', USD: 'USD $', EUR: '€', CNY: 'CN¥', GBP: '£' };
  const sym  = syms[cur] || (cur + ' ');
  const fmt  = v => `${sym} ${parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtN = v => parseFloat(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtD = d => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return d; } };

  // ── project-level financial position (optional — passed from ledger) ──
  const projBudget   = parseFloat(inv.projectBudget   || 0);
  const projBilled   = parseFloat(inv.projectBilled   || 0);
  const projReceived = parseFloat(inv.projectReceived || 0);
  const showProjPos  = projBudget > 0;

  // ── line items — use professional milestone copy when applicable ──
  const rawAmt = parseFloat(inv.amount || inv.total || 0);
  let lineTitle = inv.title || sublbl || lbl;
  let lineBody  = inv.description || (proj ? `Project Reference: ${proj}` : '');

  if (isMilestone && inv.milestoneKey && MILESTONE_COPY[inv.milestoneKey]) {
    lineTitle = MILESTONE_COPY[inv.milestoneKey].title;
    lineBody  = MILESTONE_COPY[inv.milestoneKey].body;
    if (proj) lineBody += `\n\nProject Reference: ${proj}`;
  } else if (isDesign) {
    lineTitle = inv.title || 'Design & Rendering Services';
    lineBody  = inv.description || 'Professional design conceptualisation, 3D spatial modelling, and photorealistic rendering services.' + (proj ? `\n\nProject Reference: ${proj}` : '');
  }

  const items = inv.items?.length ? inv.items : rawAmt > 0 ? [{
    desc:     lineTitle,
    notes:    lineBody,
    qty:      1,
    rate:     rawAmt,
    discount: 0,
  }] : [];

  const hasDisc = items.some(i => parseFloat(i.discount) > 0);
  const lt      = it => Math.max(0, (parseFloat(it.qty)||1) * (parseFloat(it.rate)||0) - (parseFloat(it.discount)||0));
  const sub     = items.reduce((a, b) => a + lt(b), 0);

  // ── tax ──
  const taxOn  = fs.taxEnabled  ?? false;
  const txRate = parseFloat(inv.taxRate ?? fs.taxRate ?? 0);
  const txName = fs.taxName     || 'VAT';
  const txIncl = fs.taxInclusive ?? false;
  const txAmt  = taxOn ? (txIncl ? sub - sub/(1+txRate/100) : sub*txRate/100) : 0;
  const grand  = taxOn && !txIncl ? sub + txAmt : sub;

  const paid        = parseFloat(inv.paidAmount || inv.amountPaid || 0);
  const bal         = Math.max(0, grand - paid);
  const isPartPaid  = paid > 0 && paid < grand;
  const isFullyPaid = bal === 0 && grand > 0;

  // ── outstanding across project after this invoice ──
  const projOutstanding = showProjPos ? Math.max(0, projBudget - projReceived - (bal === 0 ? 0 : grand - paid)) : 0;
  const projAfterPay    = showProjPos ? Math.max(0, projBudget - projReceived - grand) : 0;

  // ── status badge ──
  const st    = inv.status || 'Pending';
  const stBg  = isFullyPaid ? '#D1FAE5' : isPartPaid ? '#FEF3C7' : '#F3F4F6';
  const stCol = isFullyPaid ? '#065F46' : isPartPaid ? '#92400E' : '#374151';

  // ── bank / terms / signature ──
  const bank  = inv.bankDetails || fs.bankDetails || '';
  const terms = inv.terms || inv.notes || fs.terms || '';
  const sigN  = fs.signatureName  || 'Authorised Signatory';
  const sigT  = fs.signatureTitle || co;
  const foot  = fs.footerNote     || `Thank you for choosing ${co}. We value your trust and partnership.`;

  // ── invoice ref ──
  const refNo = `WF-${(inv.id || 'DRAFT').slice(-8).toUpperCase()}`;

  // ── rows ──
  const rowsHtml = items.map((it, i) => `
    <tr style="background:${i % 2 === 1 ? surf : '#fff'};">
      <td style="padding:18px 20px;font-size:11px;color:${mut};vertical-align:top;border-bottom:1px solid ${soft};width:28px;">${i+1}</td>
      <td style="padding:18px 20px;vertical-align:top;border-bottom:1px solid ${soft};">
        <div style="font-size:13px;font-weight:700;color:${dark};margin-bottom:6px;">${it.desc || 'Professional Services'}</div>
        ${it.notes ? `<div style="font-size:11px;color:${mut};line-height:1.75;white-space:pre-line;">${it.notes}</div>` : ''}
      </td>
      <td style="padding:18px 20px;text-align:center;font-size:12px;color:${mut};vertical-align:top;border-bottom:1px solid ${soft};width:50px;">${it.qty}${it.unit && it.unit !== 'pcs' ? ` ${it.unit}` : ''}</td>
      <td style="padding:18px 20px;text-align:right;font-size:12px;color:${mut};vertical-align:top;border-bottom:1px solid ${soft};white-space:nowrap;width:140px;">${sym} ${fmtN(it.rate)}</td>
      ${hasDisc ? `<td style="padding:18px 20px;text-align:right;font-size:12px;color:${mut};vertical-align:top;border-bottom:1px solid ${soft};white-space:nowrap;width:110px;">${parseFloat(it.discount) > 0 ? `− ${sym} ${fmtN(it.discount)}` : '—'}</td>` : ''}
      <td style="padding:18px 20px;text-align:right;font-size:13px;font-weight:800;color:${dark};vertical-align:top;border-bottom:1px solid ${soft};white-space:nowrap;width:150px;">${sym} ${fmtN(lt(it))}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${lbl} ${refNo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Inter', -apple-system, Arial, sans-serif; background: #D8D3CB; color: ${dark}; }
  .page { width: 210mm; min-height: 297mm; margin: 32px auto; background: #fff; box-shadow: 0 8px 60px rgba(0,0,0,.18); }
  @page { size: A4; margin: 0; }
  @media print { body { background: #fff; } .page { margin: 0; box-shadow: none; } }
</style>
</head>
<body>
<div class="page">

<!-- ═══ HEADER BAND ═══════════════════════════════════════════════════════════ -->
<div style="background:${dark};padding:32px 48px 28px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">

    <!-- Logo + company name -->
    <div style="display:flex;align-items:center;gap:20px;">
      ${logoHtml}
      <div style="border-left:1.5px solid rgba(255,255,255,.15);padding-left:20px;">
        <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:.5px;line-height:1.1;">${co}</div>
        <div style="font-size:9px;font-weight:600;color:${ac};letter-spacing:3.5px;text-transform:uppercase;margin-top:5px;">${tagline}</div>
        ${addr ? `<div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:7px;">${addr}</div>` : ''}
        ${(phone || email) ? `<div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:2px;">${[phone, email].filter(Boolean).join('  ·  ')}</div>` : ''}
      </div>
    </div>

    <!-- Doc type + meta -->
    <div style="text-align:right;">
      <div style="font-size:36px;font-weight:900;color:#fff;letter-spacing:3px;line-height:1;">${lbl}</div>
      ${sublbl ? `<div style="margin-top:8px;display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${ac};border:1px solid ${ac}80;padding:3px 12px;border-radius:20px;">${sublbl}</div>` : ''}
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
        <div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:1px;">${refNo}</div>
        <div style="font-size:10px;color:rgba(255,255,255,.5);">Issued: ${fmtD(inv.date)}</div>
        ${inv.due ? `<div style="font-size:10px;color:${isRcpt ? '#6EE7B7' : '#FCA5A5'};">Due: ${fmtD(inv.due)}</div>` : ''}
        <div style="margin-top:4px;display:inline-block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;padding:3px 12px;border-radius:20px;background:${stBg};color:${stCol};">${st}</div>
      </div>
    </div>
  </div>
</div>

<!-- ═══ GOLD ACCENT LINE ══════════════════════════════════════════════════════ -->
<div style="height:4px;background:linear-gradient(90deg,${ac},${ac}88,transparent);"></div>

<!-- ═══ PARTIES ══════════════════════════════════════════════════════════════ -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid ${soft};">

  <!-- Bill To -->
  <div style="padding:28px 48px 28px 48px;border-right:1px solid ${soft};">
    <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:3px;color:${ac};font-weight:800;margin-bottom:12px;">Billed To</div>
    <div style="font-size:20px;font-weight:900;color:${dark};margin-bottom:5px;line-height:1.15;">${cn}</div>
    ${cco ? `<div style="font-size:12px;font-weight:700;color:${mut};margin-bottom:4px;">${cco}</div>` : ''}
    ${cadr ? `<div style="font-size:11.5px;color:${mut};margin-bottom:3px;line-height:1.5;">${cadr}</div>` : ''}
    <div style="margin-top:${(cadr) ? '4px' : '8px'};display:flex;flex-direction:column;gap:3px;">
      ${cph ? `<div style="font-size:11.5px;color:${mut};display:flex;gap:6px;align-items:center;"><span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:${ac};min-width:14px;">T</span>${cph}</div>` : ''}
      ${cem ? `<div style="font-size:11.5px;color:${mut};display:flex;gap:6px;align-items:center;"><span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:${ac};min-width:14px;">E</span>${cem}</div>` : ''}
    </div>
    ${ctax ? `<div style="font-size:11px;color:${mut};margin-top:8px;padding-top:8px;border-top:1px dashed ${soft};">VAT / Tax Reg: ${ctax}</div>` : ''}
    ${proj ? `
    <div style="margin-top:14px;padding:10px 14px;background:${surf};border-radius:7px;border-left:3px solid ${ac};">
      <div style="font-size:8px;text-transform:uppercase;letter-spacing:2px;color:${ac};font-weight:800;margin-bottom:4px;">Project</div>
      <div style="font-size:12.5px;font-weight:700;color:${dark};line-height:1.35;">${proj}</div>
    </div>` : ''}
  </div>

  <!-- Issued By -->
  <div style="padding:28px 48px 28px 36px;">
    <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:3px;color:${mut};font-weight:800;margin-bottom:10px;">Issued By</div>
    <div style="font-size:16px;font-weight:800;color:${dark};margin-bottom:3px;">${co}</div>
    <div style="font-size:10px;color:${ac};letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:8px;">${tagline}</div>
    ${addr ? `<div style="font-size:11.5px;color:${mut};margin-bottom:3px;">${addr}</div>` : ''}
    <div style="display:flex;flex-direction:column;gap:3px;margin-top:${addr ? '0' : '4px'};">
      ${phone ? `<div style="font-size:11.5px;color:${mut};display:flex;gap:6px;"><span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:${mut};min-width:14px;">T</span>${phone}</div>` : ''}
      ${email ? `<div style="font-size:11.5px;color:${mut};display:flex;gap:6px;"><span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:${mut};min-width:14px;">E</span>${email}</div>` : ''}
      ${web   ? `<div style="font-size:11.5px;color:${mut};display:flex;gap:6px;"><span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:${mut};min-width:14px;">W</span>${web}</div>`   : ''}
    </div>
  </div>

</div>

<!-- ═══ LINE ITEMS ════════════════════════════════════════════════════════════ -->
<div style="padding:32px 48px 0;">
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="border-bottom:2px solid ${dark};">
        <th style="padding:10px 20px 10px 20px;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:2px;color:${mut};font-weight:800;width:28px;">#</th>
        <th style="padding:10px 20px;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:2px;color:${mut};font-weight:800;">Description of Services</th>
        <th style="padding:10px 20px;text-align:center;font-size:8.5px;text-transform:uppercase;letter-spacing:2px;color:${mut};font-weight:800;width:50px;">Qty</th>
        <th style="padding:10px 20px;text-align:right;font-size:8.5px;text-transform:uppercase;letter-spacing:2px;color:${mut};font-weight:800;width:140px;">Unit Price</th>
        ${hasDisc ? `<th style="padding:10px 20px;text-align:right;font-size:8.5px;text-transform:uppercase;letter-spacing:2px;color:${mut};font-weight:800;width:110px;">Discount</th>` : ''}
        <th style="padding:10px 20px;text-align:right;font-size:8.5px;text-transform:uppercase;letter-spacing:2px;color:${mut};font-weight:800;width:150px;">Amount</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</div>

<!-- ═══ TOTALS + BANK SIDE BY SIDE ═══════════════════════════════════════════ -->
<div style="display:grid;grid-template-columns:1fr 280px;gap:0;margin:0 48px;padding-top:28px;border-top:1px solid ${soft};margin-top:0;">

  <!-- Left: bank + terms -->
  <div style="padding-right:36px;border-right:1px solid ${soft};">
    ${bank ? `
    <div style="margin-bottom:${terms ? '20px' : '0'};">
      <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:2.5px;font-weight:800;color:${mut};margin-bottom:10px;">Payment Instructions</div>
      <div style="font-size:11.5px;color:${dark};line-height:2;white-space:pre-line;background:${surf};padding:14px 18px;border-radius:8px;border:1px solid ${soft};">${bank}</div>
    </div>` : ''}
    ${terms ? `
    <div>
      <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:2.5px;font-weight:800;color:${mut};margin-bottom:10px;">Terms &amp; Conditions</div>
      <div style="font-size:11px;color:${mut};line-height:1.9;white-space:pre-line;">${terms}</div>
    </div>` : ''}
    ${!bank && !terms ? `<div style="color:${mut};font-size:11px;font-style:italic;">Please reference invoice number ${refNo} with all payments.</div>` : ''}
  </div>

  <!-- Right: totals -->
  <div style="padding-left:28px;">
    ${items.length > 1 ? `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid ${soft};">
      <span style="font-size:11.5px;color:${mut};">Subtotal</span>
      <span style="font-size:12px;font-weight:600;color:${dark};">${fmt(sub)}</span>
    </div>` : ''}
    ${taxOn ? `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid ${soft};">
      <span style="font-size:11.5px;color:${mut};">${txName} (${txRate}%)${txIncl ? ' incl.' : ''}</span>
      <span style="font-size:12px;font-weight:600;color:${mut};">${fmt(txAmt)}</span>
    </div>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid ${soft};">
      <span style="font-size:11.5px;font-weight:700;color:${dark};">Invoice Total</span>
      <span style="font-size:15px;font-weight:800;color:${dark};">${fmt(grand)}</span>
    </div>
    ${paid > 0 ? `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid ${soft};">
      <span style="font-size:11.5px;color:${mut};">Amount Received${isPartPaid ? '<br/><span style="font-size:10px;">(Part Payment)</span>' : ''}</span>
      <span style="font-size:12px;font-weight:700;color:#16A34A;">− ${fmt(paid)}</span>
    </div>` : ''}
    <!-- Balance due box -->
    <div style="margin-top:12px;padding:16px 18px;border-radius:10px;background:${isFullyPaid ? '#F0FDF4' : '#FFF7ED'};border:2px solid ${isFullyPaid ? '#A7F3D0' : ac};">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;font-weight:800;color:${isFullyPaid ? '#065F46' : mut};margin-bottom:6px;">${isRcpt ? 'Total Received' : isFullyPaid ? 'Settled in Full' : 'Balance Due'}</div>
      <div style="font-size:24px;font-weight:900;color:${isFullyPaid ? '#16A34A' : '#B45309'};">${fmt(isFullyPaid ? grand : bal)}</div>
      ${!isFullyPaid && inv.due ? `<div style="font-size:10px;color:#92400E;margin-top:6px;font-weight:600;">Due by ${fmtD(inv.due)}</div>` : ''}
      ${isFullyPaid ? `<div style="font-size:10px;color:#16A34A;margin-top:4px;font-weight:600;">✓ Payment complete — thank you</div>` : ''}
    </div>
  </div>

</div>

${showProjPos ? `
<!-- ═══ PROJECT FINANCIAL POSITION ══════════════════════════════════════════ -->
<div style="margin:28px 48px 0;padding:18px 24px;border-radius:10px;background:${surf};border:1px solid ${soft};">
  <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:2.5px;font-weight:800;color:${mut};margin-bottom:14px;">Project Financial Position</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;">
    <div style="padding-right:20px;border-right:1px solid ${soft};">
      <div style="font-size:9px;color:${mut};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Total Contract</div>
      <div style="font-size:14px;font-weight:800;color:${dark};">${fmt(projBudget)}</div>
    </div>
    <div style="padding:0 20px;border-right:1px solid ${soft};">
      <div style="font-size:9px;color:${mut};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Total Billed</div>
      <div style="font-size:14px;font-weight:800;color:${dark};">${fmt(projBilled)}</div>
    </div>
    <div style="padding:0 20px;border-right:1px solid ${soft};">
      <div style="font-size:9px;color:${mut};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Received to Date</div>
      <div style="font-size:14px;font-weight:800;color:#16A34A;">${fmt(projReceived)}</div>
    </div>
    <div style="padding-left:20px;">
      <div style="font-size:9px;color:${mut};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Remaining Balance</div>
      <div style="font-size:14px;font-weight:800;color:${Math.max(0, projBudget - projReceived) > 0 ? '#B45309' : '#16A34A'};">${fmt(Math.max(0, projBudget - projReceived))}</div>
    </div>
  </div>
  ${bal > 0 && projBudget > 0 ? `
  <div style="margin-top:12px;padding-top:12px;border-top:1px dashed ${soft};font-size:11px;color:${mut};font-style:italic;">
    Upon receipt of this payment (${fmt(bal)}), the remaining project balance will be <strong style="color:${dark};">${fmt(Math.max(0, projBudget - projReceived - bal))}</strong>.
  </div>` : ''}
</div>` : ''}

<!-- ═══ SIGNATURE ════════════════════════════════════════════════════════════ -->
<div style="display:flex;justify-content:flex-end;padding:28px 48px;">
  <div style="text-align:center;min-width:200px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,${dark},transparent);margin-bottom:10px;"></div>
    <div style="font-size:12px;font-weight:800;color:${dark};">${sigN}</div>
    <div style="font-size:10px;color:${mut};margin-top:2px;">${sigT}</div>
  </div>
</div>

<!-- ═══ FOOTER ════════════════════════════════════════════════════════════════ -->
<div style="background:${dark};padding:18px 48px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:10px;color:rgba(255,255,255,.35);font-style:italic;margin-bottom:2px;">${foot}</div>
    ${web ? `<div style="font-size:10px;color:${ac};font-weight:700;letter-spacing:.5px;">${web}</div>` : ''}
  </div>
  <div style="text-align:right;">
    <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.6);">${refNo}</div>
    <div style="font-size:9px;color:rgba(255,255,255,.25);margin-top:2px;">Generated by ${co} CRM</div>
  </div>
</div>

</div>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(html);
  iframe.contentWindow.document.close();

  // Wait 1.5 s — gives the iframe time to load the logo from Firebase Storage
  // before the print dialog opens (avoids blank logo on first open)
  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {}
    setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 2000);
  }, 1500);
}

export function printSignedContractDoc(project, user, brand) {
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
