import React from 'react';
import { Landmark } from 'lucide-react';
import { getInvoiceTypeConfig } from '../lib/invoiceTypes'; // ✅ PHASE 3: Use invoice types registry

/* ─── helpers ──────────────────────────────────────────────────── */
const lineTotal = (item = {}) => {
  const qty  = parseFloat(item.qty)      || 0;
  const rate = parseFloat(item.rate)     || 0;
  const disc = parseFloat(item.discount) || 0;
  return Math.max(0, qty * rate - disc);
};

const fmtMoney = (val, currency = 'GHS') => {
  const symbols = { GHS: 'GH₵', USD: '$', EUR: '€', CNY: '¥', GBP: '£' };
  const sym = symbols[currency] || currency + ' ';
  return `${sym}${parseFloat(val || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
};

const PAYMENT_SCHEDULES = {
  standard: [
    { key: 'post-rendering', label: 'First instalment after rendering approval', pct: 0.60 },
    { key: 'post-production', label: 'Second instalment after production', pct: 0.30 },
    { key: 'post-shipping', label: 'Final settlement at delivery and handover', pct: 0.10 },
  ],
  '50-50': [
    { key: 'deposit', label: 'Project mobilisation deposit', pct: 0.50 },
    { key: 'completion', label: 'Final settlement at completion', pct: 0.50 },
  ],
  '70-30': [
    { key: 'pre-delivery', label: 'Pre-delivery instalment', pct: 0.70 },
    { key: 'completion', label: 'Final settlement at completion', pct: 0.30 },
  ],
};

/* ─── component ─────────────────────────────────────────────────── */
export default function InvoiceDocument({ inv = {}, isQuote = false, finSettings = {}, brand = {} }) {
  /* Document type */
  // ✅ PHASE 3: Determine document type using registry
  // Determine document type strictly from documentKind/invoiceType/type —
  // NOT from status, so a paid Invoice still reads "Invoice" not "Sales Receipt"
  const isReceipt   = inv.documentKind === 'receipt' || inv.invoiceType === 'receipt' || inv.type === 'Receipt';
  const isQuotation = isQuote || inv.documentKind === 'quotation' || inv.type === 'Quotation';

  // Get type config from registry (for future styling consistency)
  const typeConfig = getInvoiceTypeConfig(
    isReceipt ? 'RECEIPT' : isQuotation ? 'QUOTATION' : 'INVOICE'
  );
  const docLabel    = typeConfig?.name || (isReceipt ? 'Sales Receipt' : isQuotation ? 'Quotation' : 'Invoice');

  /* Palette */
  const accent  = brand?.color || '#C8A96E';
  const dark    = '#1A1410';
  const muted   = '#716259';
  const soft    = '#EDE8E0';
  const surface = '#F8F5F0';
  const white   = '#FFFFFF';

  /* Currency */
  const cur = inv.currency || finSettings.baseCurrency || 'GHS';

  /* Line items */
  const storedInvoiceTotal = parseFloat(inv.total || inv.amount || inv.amountDue || 0) || 0;
  const items = Array.isArray(inv.items) && inv.items.length > 0
    ? inv.items
    : storedInvoiceTotal > 0
      ? [{
          id: 'invoice-amount',
          desc: inv.title || 'Project payment',
          notes: inv.description || inv.paymentDescription || '',
          qty: 1,
          unit: inv.milestoneKey ? 'stage' : 'item',
          rate: storedInvoiceTotal,
          discount: 0,
        }]
      : [];
  const hasDisc  = items.some(i => parseFloat(i.discount) > 0);
  const subtotal = items.reduce((a, b) => a + lineTotal(b), 0);

  /* Tax */
  const taxEnabled   = finSettings.taxEnabled   ?? false;
  const taxRate      = parseFloat(inv.taxRate   ?? finSettings.taxRate ?? 0);
  const taxName      = finSettings.taxName      || 'Tax';
  const taxInclusive = finSettings.taxInclusive ?? false;
  const taxAmount    = taxEnabled
    ? taxInclusive
      ? subtotal - subtotal / (1 + taxRate / 100)
      : subtotal * taxRate / 100
    : 0;
  const grandTotal = taxEnabled && !taxInclusive ? subtotal + taxAmount : subtotal;

  /* Payment balance */
  const amountPaid = parseFloat(inv.amountPaid || inv.paidAmount || 0);
  const balanceDue  = Math.max(0, grandTotal - amountPaid);

  /* Project contract position and remaining payment plan */
  const projectTotal = parseFloat(inv.projectBudget || inv.projectTotal || inv.budget || 0) || 0;
  const projectPaid = parseFloat(inv.projectPaidAmount || inv.projectReceived || 0) || 0;
  const projectBalance = projectTotal > 0 ? Math.max(0, projectTotal - projectPaid) : 0;
  const scheduleType = inv.paymentSchedule || 'standard';
  const schedule = PAYMENT_SCHEDULES[scheduleType] || [];
  const scheduleRows = schedule.map((item, index) => {
    const cumulativePct = schedule
      .slice(0, index + 1)
      .reduce((sum, scheduleItem) => sum + scheduleItem.pct, 0);
    return {
      ...item,
      amount: projectTotal * item.pct,
      status:
        item.key === inv.milestoneKey
          ? (balanceDue <= 0 ? 'Paid' : amountPaid > 0 ? 'Partially Paid' : 'Due')
          : projectPaid >= projectTotal * cumulativePct
            ? 'Paid'
            : 'Upcoming',
    };
  });

  /* Text fields */
  const bankDetails  = inv.bankDetails  || finSettings.bankDetails  || '';
  const terms        = inv.terms        || finSettings.terms        || '';
  const paymentInstructions = inv.paymentInstructions || (
    bankDetails
      ? 'Pay securely through the Client Portal using Paystack, or transfer to the bank account below. For bank or in-person payments, submit payment confirmation in the Client Portal so the project manager can verify it.'
      : 'Pay securely through the Client Portal using Paystack. Bank transfer and in-person payments must be submitted in the Client Portal for project-manager verification.'
  );
  const footerNote   = finSettings.footerNote   || 'Thank you for your business.';
  const sigName      = finSettings.signatureName || 'Finance Director';
  const sigTitle     = finSettings.signatureTitle || brand?.name || 'Westline Future Ltd.';

  /* Company */
  const companyName    = brand?.name    || 'Westline Future';
  const companyTagline = brand?.tagline || finSettings.companyTagline || 'Global Trading Co, Ltd';
  const companyAddr    = brand?.location || '';
  const companyPhone   = brand?.phone   || '';
  const companyEmail   = brand?.email   || '';
  const companyWeb     = brand?.website || 'www.westlinefuture.com';

  /* Logo: prefer Firebase Storage URL, then local public asset */
  const logoSrc = brand?.logo || '/logo.png';

  /* ── shared cell style ── */
  const thStyle = (extra = {}) => ({
    padding: '11px 16px',
    textAlign: 'left',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: 700,
    ...extra,
  });
  const tdStyle = (extra = {}) => ({
    padding: '14px 16px',
    fontSize: 12,
    color: dark,
    verticalAlign: 'top',
    ...extra,
  });

  return (
    <div
      id="printable-financial"
      style={{
        width: '100%',
        minHeight: 1056,
        background: white,
        color: dark,
        fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '40px 48px 28px',
        borderBottom: `3px solid ${accent}`,
      }}>
        {/* Left — logo + company */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <img
            src={logoSrc}
            style={{ height: 60, maxWidth: 180, objectFit: 'contain', display: 'block', filter: 'brightness(0)' }}
            alt={companyName}
            onError={e => {
              // Two-stage fallback: try /logo.png, then hide
              if (!e.target.src.endsWith('/logo.png') && !e.target.src.endsWith('/logo.png?v=2')) {
                e.target.src = '/logo.png';
              } else {
                e.target.style.display = 'none';
              }
            }}
          />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: dark, letterSpacing: 0.2 }}>{companyName}</div>
            <div style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: 2, marginTop: 3 }}>{companyTagline}</div>
            {companyAddr && (
              <div style={{ fontSize: 10, color: muted, marginTop: 5, lineHeight: 1.5 }}>{companyAddr}</div>
            )}
            {(companyPhone || companyEmail) && (
              <div style={{ fontSize: 10, color: muted, marginTop: 3 }}>
                {companyPhone}{companyPhone && companyEmail ? '  ·  ' : ''}{companyEmail}
              </div>
            )}
          </div>
        </div>

        {/* Right — document type + meta */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 30,
            fontWeight: 900,
            textTransform: 'uppercase',
            color: dark,
            letterSpacing: 1.5,
            lineHeight: 1,
          }}>
            {docLabel}
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end' }}>
            {/* Reference number */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: 1 }}>Number</span>
              <span style={{
                fontSize: 11, fontWeight: 800,
                background: dark, color: white,
                padding: '3px 12px', borderRadius: 4,
              }}>
                {inv.id || 'DRAFT'}
              </span>
            </div>
            {/* Issue date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: 1 }}>Date Issued</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: dark }}>{fmtDate(inv.date)}</span>
            </div>
            {/* Due date */}
            {inv.due && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: 1 }}>Due Date</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: isReceipt ? '#16A34A' : '#C0392B' }}>
                  {fmtDate(inv.due)}
                </span>
              </div>
            )}
            {/* Status badge */}
            {inv.status && (
              <div style={{
                fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1,
                padding: '3px 10px', borderRadius: 20,
                background:
                  inv.status === 'Paid' ? 'rgba(22,163,74,0.12)' :
                  inv.status === 'Pending' ? `${accent}20` : '#F1F5F9',
                color:
                  inv.status === 'Paid' ? '#16A34A' :
                  inv.status === 'Pending' ? '#92632B' : muted,
              }}>
                {inv.status}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ BILL TO / ISSUED BY ═════════════════════════════════ */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        padding: '28px 48px',
        borderBottom: `1px solid ${soft}`,
        gap: 0,
      }}>
        {/* Bill To */}
        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: accent, fontWeight: 900, marginBottom: 10 }}>
            Bill To
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: dark, marginBottom: 3 }}>
            {inv.clientName || 'Valued Client'}
          </div>
          {inv.clientCompany && (
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 2 }}>{inv.clientCompany}</div>
          )}
          {inv.clientAddress && <div style={{ fontSize: 12, color: muted }}>{inv.clientAddress}</div>}
          {inv.clientEmail   && <div style={{ fontSize: 12, color: muted }}>{inv.clientEmail}</div>}
          {inv.clientPhone   && <div style={{ fontSize: 12, color: muted }}>{inv.clientPhone}</div>}
          {inv.clientTaxId   && (
            <div style={{ fontSize: 11, color: muted, marginTop: 5 }}>Tax / VAT ID: {inv.clientTaxId}</div>
          )}
        </div>

        {/* Issued By */}
        <div style={{ borderLeft: `1px solid ${soft}`, paddingLeft: 32 }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: accent, fontWeight: 900, marginBottom: 10 }}>
            Issued By
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: dark, marginBottom: 3 }}>{companyName}</div>
          {companyAddr  && <div style={{ fontSize: 12, color: muted }}>{companyAddr}</div>}
          {companyPhone && <div style={{ fontSize: 12, color: muted }}>T: {companyPhone}</div>}
          {companyEmail && <div style={{ fontSize: 12, color: muted }}>E: {companyEmail}</div>}
          {companyWeb   && <div style={{ fontSize: 12, color: muted }}>W: {companyWeb}</div>}
        </div>
      </div>

      {/* ══ SUBJECT ═════════════════════════════════════════════ */}
      {inv.title && (
        <div style={{
          padding: '14px 48px',
          background: surface,
          borderBottom: `1px solid ${soft}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: muted, fontWeight: 900 }}>
            Subject
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: dark }}>{inv.title}</span>
        </div>
      )}

      {/* ══ ITEMS TABLE ═════════════════════════════════════════ */}
      <div style={{ padding: '0 48px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 28 }}>
          <thead>
            <tr style={{ background: dark }}>
              <th style={thStyle({ width: 32, borderRadius: '6px 0 0 0' })}>#</th>
              <th style={thStyle()}>Description</th>
              <th style={thStyle({ textAlign: 'center', width: 70 })}>
                {inv.invoiceType === 'unit' ? 'Qty' : 'Phase'}
              </th>
              <th style={thStyle({ textAlign: 'right', width: 130 })}>Unit Price</th>
              {hasDisc && (
                <th style={thStyle({ textAlign: 'right', width: 110 })}>Discount</th>
              )}
              <th style={thStyle({ textAlign: 'right', width: 140, borderRadius: '0 6px 0 0' })}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr
                key={it.id || i}
                style={{
                  borderBottom: `1px solid ${soft}`,
                  background: i % 2 === 1 ? surface : white,
                }}
              >
                <td style={tdStyle({ color: muted, fontSize: 11 })}>{i + 1}</td>
                <td style={tdStyle()}>
                  <div style={{ fontWeight: 700 }}>{it.desc || 'Service Item'}</div>
                  {it.notes && (
                    <div style={{ fontSize: 11, color: muted, marginTop: 3 }}>{it.notes}</div>
                  )}
                </td>
                <td style={tdStyle({ textAlign: 'center' })}>
                  {it.qty}
                  {it.unit && it.unit !== 'pcs' ? ` ${it.unit}` : ''}
                </td>
                <td style={tdStyle({ textAlign: 'right', color: muted })}>{fmtMoney(it.rate, cur)}</td>
                {hasDisc && (
                  <td style={tdStyle({ textAlign: 'right', color: muted })}>
                    {parseFloat(it.discount) > 0 ? `−${fmtMoney(it.discount, cur)}` : '—'}
                  </td>
                )}
                <td style={tdStyle({ textAlign: 'right', fontWeight: 700 })}>
                  {fmtMoney(lineTotal(it), cur)}
                </td>
              </tr>
            ))}
            {/* empty-state placeholder */}
            {items.length === 0 && (
              <tr>
                <td colSpan={hasDisc ? 6 : 5} style={{ padding: '32px 16px', textAlign: 'center', color: muted, fontSize: 12 }}>
                  No line items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ══ TOTALS ══════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 48px', marginTop: 0 }}>
        <div style={{ width: 310, borderTop: `3px solid ${accent}` }}>
          {/* Subtotal */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '12px 0', borderBottom: `1px solid ${soft}`,
          }}>
            <span style={{ fontSize: 12, color: muted }}>Subtotal</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: dark }}>{fmtMoney(subtotal, cur)}</span>
          </div>

          {/* Tax row */}
          {taxEnabled && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: `1px solid ${soft}`,
            }}>
              <span style={{ fontSize: 12, color: muted }}>
                {taxName} ({taxRate}%){taxInclusive ? ' · inclusive' : ''}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: muted }}>{fmtMoney(taxAmount, cur)}</span>
            </div>
          )}

          {/* Grand total */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '16px 0',
            borderBottom: amountPaid > 0 ? `1px solid ${soft}` : 'none',
          }}>
            <span style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: dark }}>
              {isReceipt ? 'Total Paid' : 'Original Amount Due'}
            </span>
            <span style={{ fontSize: 19, fontWeight: 900, color: dark }}>
              {fmtMoney(grandTotal, cur)}
            </span>
          </div>

          {/* Partial payment */}
          {amountPaid > 0 && (
            <>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: `1px solid ${soft}`,
              }}>
                <span style={{ fontSize: 12, color: muted }}>Amount Paid</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>{fmtMoney(amountPaid, cur)}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '14px 0 0',
              }}>
                <span style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', color: dark }}>
                  Invoice Balance
                </span>
                <span style={{ fontSize: 17, fontWeight: 900, color: balanceDue > 0 ? '#C0392B' : '#16A34A' }}>
                  {fmtMoney(balanceDue, cur)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ PAYMENT INSTRUCTIONS + CONTRACT BALANCE ═════════════ */}
      {!isQuotation && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: projectTotal > 0 ? '1fr 1fr' : '1fr',
          gap: 20,
          margin: '30px 48px 0',
          padding: 20,
          border: `1px solid ${soft}`,
          borderRadius: 8,
          background: surface,
        }}>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 900, color: accent, marginBottom: 8 }}>
              How To Pay
            </div>
            <div style={{ fontSize: 11, color: muted, lineHeight: 1.75 }}>
              {paymentInstructions}
            </div>
            {inv.method && amountPaid > 0 && (
              <div style={{ fontSize: 11, color: '#166534', fontWeight: 700, marginTop: 8 }}>
                Payment recorded via {inv.method}.
              </div>
            )}
          </div>

          {projectTotal > 0 && (
            <div style={{ borderLeft: `1px solid ${soft}`, paddingLeft: 20 }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 900, color: accent, marginBottom: 8 }}>
                Project Payment Position
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted, marginBottom: 5 }}>
                <span>Contract total</span>
                <strong style={{ color: dark }}>{fmtMoney(projectTotal, cur)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted, marginBottom: 8 }}>
                <span>Total received</span>
                <strong style={{ color: '#16A34A' }}>{fmtMoney(projectPaid, cur)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: dark, paddingTop: 8, borderTop: `1px solid ${soft}` }}>
                <strong>Remaining contract balance</strong>
                <strong style={{ color: projectBalance > 0 ? '#C0392B' : '#16A34A' }}>{fmtMoney(projectBalance, cur)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {projectTotal > 0 && scheduleRows.length > 0 && (
        <div style={{ margin: '18px 48px 0' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 900, color: muted, marginBottom: 9 }}>
            Project Payment Schedule
          </div>
          <div style={{ border: `1px solid ${soft}`, borderRadius: 8, overflow: 'hidden' }}>
            {scheduleRows.map((item, index) => (
              <div
                key={item.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 70px 120px 80px',
                  gap: 10,
                  padding: '9px 12px',
                  borderBottom: index < scheduleRows.length - 1 ? `1px solid ${soft}` : 'none',
                  background: item.key === inv.milestoneKey ? '#FFFDF7' : white,
                  fontSize: 10.5,
                  color: muted,
                }}
              >
                <span style={{ color: dark, fontWeight: item.key === inv.milestoneKey ? 700 : 500 }}>{item.label}</span>
                <span style={{ textAlign: 'right' }}>{Math.round(item.pct * 100)}%</span>
                <strong style={{ textAlign: 'right', color: dark }}>{fmtMoney(item.amount, cur)}</strong>
                <strong style={{
                  textAlign: 'right',
                  color: item.status === 'Paid' ? '#16A34A' : item.status === 'Due' || item.status === 'Partially Paid' ? '#C0392B' : muted,
                }}>
                  {item.status}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ BANK DETAILS + TERMS ════════════════════════════════ */}
      {(bankDetails || terms) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: bankDetails && terms ? '1fr 1fr' : '1fr',
          gap: 0,
          margin: '44px 48px 0',
          paddingTop: 28,
          borderTop: `1px solid ${soft}`,
        }}>
          {bankDetails && (
            <div style={{ paddingRight: terms ? 32 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Landmark size={12} color={accent} />
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 900, color: muted }}>
                  Bank Details
                </span>
              </div>
              <div style={{
                fontSize: 12, color: dark, lineHeight: 1.9,
                whiteSpace: 'pre-line',
                background: surface,
                padding: '14px 18px',
                borderRadius: 8,
                border: `1px solid ${soft}`,
              }}>
                {bankDetails}
              </div>
            </div>
          )}

          {terms && (
            <div style={{
              borderLeft: bankDetails ? `1px solid ${soft}` : 'none',
              paddingLeft: bankDetails ? 32 : 0,
            }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 900, color: muted, marginBottom: 12 }}>
                Terms &amp; Conditions
              </div>
              <div style={{ fontSize: 11, color: muted, lineHeight: 1.85, whiteSpace: 'pre-line' }}>
                {terms}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ SIGNATURE ════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '36px 48px 0' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ width: 190, borderBottom: `1.5px solid ${dark}`, marginBottom: 10 }} />
          <div style={{ fontSize: 12, fontWeight: 800, color: dark }}>{sigName}</div>
          <div style={{ fontSize: 10, color: muted, marginTop: 3 }}>{sigTitle}</div>
        </div>
      </div>

      {/* ══ FOOTER ═══════════════════════════════════════════════ */}
      <div style={{
        marginTop: 44,
        background: dark,
        padding: '16px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
          {footerNote}
        </span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {companyWeb && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: 0.5 }}>
              {companyWeb}
            </span>
          )}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
            {inv.id || 'DRAFT'}
          </span>
        </div>
      </div>
    </div>
  );
}
