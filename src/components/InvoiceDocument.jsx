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
  const items    = inv.items || [];
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
  const amountPaid = parseFloat(inv.amountPaid || 0);
  const balanceDue  = Math.max(0, grandTotal - amountPaid);

  /* Text fields */
  const bankDetails  = inv.bankDetails  || finSettings.bankDetails  || '';
  const terms        = inv.terms        || finSettings.terms        || '';
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
              {isReceipt ? 'Total Paid' : 'Total Due'}
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
                  Balance Due
                </span>
                <span style={{ fontSize: 17, fontWeight: 900, color: balanceDue > 0 ? '#C0392B' : '#16A34A' }}>
                  {fmtMoney(balanceDue, cur)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

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
