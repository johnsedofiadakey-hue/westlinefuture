import React from 'react';
import { Landmark, Globe, QrCode } from 'lucide-react';

const lineTotal = (item = {}) => {
  const qty = parseFloat(item.qty) || 0;
  const rate = parseFloat(item.rate) || 0;
  const discount = parseFloat(item.discount) || 0;
  return Math.max(0, (qty * rate) - discount);
};

const calculateTotal = (items = []) =>
  items.reduce((a, b) => a + lineTotal(b), 0);

const formatMoney = (val, currency = 'USD') => {
  const symbol = currency === 'GHS' ? 'GH₵' : currency === 'EUR' ? '€' : currency === 'CNY' ? '¥' : '$';
  return `${symbol}${parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};

export default function InvoiceDocument({ inv, isQuote = false, finSettings, brand }) {
  const total = calculateTotal(inv.items || []);
  const isReceipt = inv.documentKind === 'receipt' || inv.invoiceType === 'receipt' || inv.type === 'Receipt' || inv.status === 'Paid';
  const documentLabel = isReceipt ? 'Sales Receipt' : isQuote ? 'Quotation' : 'Invoice';

  const isMinimal = finSettings.invoiceTheme === 'minimal';
  const isCorporate = finSettings.invoiceTheme === 'corporate';

  // Rich Beige / Cream / Brown Palette for PDFs
  const theme = {
    primary: '#4A3B32',     // Dark espresso brown
    secondary: '#8C6C52',   // Mid-tone warm brown
    accent: '#C5A880',      // Rich beige gold
    bg: '#FDFBF7',          // Pristine cream base
    surface: '#F4EFE6',     // Light beige for table headers / blocks
    textMuted: '#716259'    // Muted brown for subtext
  };

  return (
    <div id="printable-financial" style={{
      width: '100%', minHeight: '1120px', background: theme.bg,
      padding: isMinimal ? '40px' : '80px', color: theme.primary,
      fontFamily: isMinimal ? 'sans-serif' : 'serif',
      position: 'relative', overflow: 'hidden',
      border: isCorporate ? `12px solid ${theme.accent}` : 'none'
    }}>
      {/* WATERMARK */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)',
        fontSize: '100px', fontWeight: 900, opacity: 0.02, pointerEvents: 'none', whiteSpace: 'nowrap', color: theme.primary
      }}>
        {isReceipt ? 'OFFICIAL RECEIPT' : isQuote ? 'OFFICIAL QUOTATION' : 'PAYMENT REQUEST'}
      </div>

      {/* TOP BAR (Corporate Theme) */}
      {isCorporate && <div style={{ height: 24, background: theme.primary, margin: '-80px -80px 60px -80px' }} />}

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 50, borderBottom: isMinimal ? 'none' : `2px solid ${theme.accent}`, paddingBottom: 40 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {brand.logo ? <img src={brand.logo} style={{ height: 72, objectFit: 'contain' }} alt="logo" /> : <div style={{ fontSize: 36, fontWeight: 900, color: theme.primary }}>W</div>}
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 4px 0', color: theme.primary }}>{brand.name || 'WESTLINE FUTURE'}</h1>
            <p style={{ fontSize: 11, color: theme.secondary, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>{brand.tagline}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: isMinimal ? 32 : 42, fontWeight: 400, margin: '0 0 12px 0', textTransform: 'uppercase', color: theme.primary, letterSpacing: 1 }}>{documentLabel}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 13, background: theme.primary, color: theme.bg, padding: '4px 12px', borderRadius: 4, fontWeight: 600, letterSpacing: 1 }}>Ref: {inv.id || 'DRAFT-001'}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: theme.textMuted }}>Date: {inv.date}</span>
          </div>
        </div>
      </div>

      {/* CLIENT & VENDOR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 60, marginBottom: 50 }}>
        <div style={{ padding: isMinimal ? '24px' : '0', background: isMinimal ? theme.surface : 'none', borderRadius: 12 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: theme.accent, fontWeight: 900, marginBottom: 12, letterSpacing: 2 }}>Prepared For</div>
          <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px 0', color: theme.primary }}>{inv.clientName || 'Valued Client'}</p>
          {inv.clientCompany && <div style={{ fontSize: 13, fontWeight: 700, color: theme.secondary, marginBottom: 4 }}>{inv.clientCompany}</div>}
          <div style={{ fontSize: 13, lineHeight: 1.7, color: theme.textMuted }}>
            {inv.clientEmail}<br />
            {inv.clientPhone || 'Commercial Division'}<br />
            {inv.clientAddress || 'International Client'}
            {inv.clientTaxId && <><br />Tax ID: {inv.clientTaxId}</>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', color: theme.accent, fontWeight: 900, marginBottom: 12, letterSpacing: 2 }}>Issued By</div>
          <p style={{ fontSize: 15, fontWeight: 800, margin: '0 0 6px 0', color: theme.primary }}>{brand.name}</p>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: theme.textMuted }}>
            {brand.location}<br />
            Tel: {brand.phone}<br />
            Email: {brand.email}<br />
            {brand.website && <span>Web: {brand.website}</span>}
          </div>
        </div>
      </div>

      {/* PROJECT INFO */}
      <div style={{ marginBottom: 40, padding: '20px 28px', border: `1px solid ${theme.accent}`, borderRadius: 8, background: theme.surface }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: theme.secondary, fontWeight: 800, marginBottom: 6, letterSpacing: 1 }}>Subject / Project</div>
            <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', color: theme.primary }}>{inv.title || 'General Finishing Works'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: theme.secondary, fontWeight: 800, marginBottom: 6, letterSpacing: 1 }}>Billable Type</div>
            <div style={{ fontSize: 12, fontWeight: 800, background: theme.secondary, color: theme.bg, padding: '4px 12px', borderRadius: 20 }}>
              {inv.invoiceType === 'unit' ? 'UNIT-ITEM BILLING' : 'PROJECT-BASED MILESTONE'}
            </div>
          </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
        <thead>
          <tr style={{ background: theme.primary, color: theme.bg }}>
            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>Service Description</th>
            <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: 11, textTransform: 'uppercase', width: 100, letterSpacing: 1.5, fontWeight: 600 }}>{inv.invoiceType === 'unit' ? 'Qty' : 'Phase'}</th>
            <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', width: 160, letterSpacing: 1.5, fontWeight: 600 }}>Unit Price</th>
            <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', width: 130, letterSpacing: 1.5, fontWeight: 600 }}>Discount</th>
            <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 11, textTransform: 'uppercase', width: 160, letterSpacing: 1.5, fontWeight: 600 }}>Line Total</th>
          </tr>
        </thead>
        <tbody>
          {(inv.items || []).map((it) => (
            <tr key={it.id} style={{ borderBottom: `1px solid ${theme.accent}60` }}>
              <td style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {it.img && <img src={it.img} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', border: `1px solid ${theme.accent}40` }} alt="Item" />}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: theme.primary }}>{it.desc || 'Standard Work'}</div>
                    <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>Precision manufacturing & site installation</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '20px 24px', textAlign: 'center', fontSize: 15, fontWeight: 600, color: theme.primary }}>{it.qty} {inv.invoiceType === 'unit' ? (it.unit || 'pcs') : ''}</td>
              <td style={{ padding: '20px 24px', textAlign: 'right', fontSize: 15, color: theme.textMuted }}>{formatMoney(it.rate, inv.currency)}</td>
              <td style={{ padding: '20px 24px', textAlign: 'right', fontSize: 15, color: theme.textMuted }}>{it.discount ? formatMoney(it.discount, inv.currency) : '—'}</td>
              <td style={{ padding: '20px 24px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: theme.primary }}>{formatMoney(lineTotal(it), inv.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTALS */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: 60 }}>
        <div style={{ width: 360, background: theme.surface, padding: '24px 32px', borderRadius: 8, border: `1px solid ${theme.accent}60` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 16, borderBottom: `1px solid ${theme.accent}60` }}>
            <span style={{ fontSize: 15, color: theme.textMuted, fontWeight: 600 }}>Subtotal</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: theme.primary }}>{formatMoney(total, inv.currency)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, paddingBottom: (inv.amountPaid > 0) ? 16 : 0, borderBottom: (inv.amountPaid > 0) ? `1px solid ${theme.accent}60` : 'none' }}>
            <span style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', color: theme.primary }}>Grand Total</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: theme.secondary }}>{formatMoney(total, inv.currency)}</span>
          </div>
          {inv.amountPaid > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 16, borderBottom: `1px solid ${theme.accent}60` }}>
                <span style={{ fontSize: 15, color: theme.textMuted, fontWeight: 600 }}>Amount Paid</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#16A34A' }}>{formatMoney(inv.amountPaid, inv.currency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16 }}>
                <span style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', color: theme.primary }}>Balance Due</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#DC2626' }}>{formatMoney(Math.max(0, total - inv.amountPaid), inv.currency)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* BANKING & SIGNATURE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 60, borderTop: `2px solid ${theme.accent}`, paddingTop: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Landmark size={18} color={theme.secondary} />
            <span style={{ fontSize: 11, textTransform: 'uppercase', color: theme.secondary, fontWeight: 900, letterSpacing: 1.5 }}>Electronic Fund Transfer</span>
          </div>
          <div style={{ padding: 24, background: theme.surface, borderRadius: 8, border: `1px solid ${theme.accent}40` }}>
            <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.8, whiteSpace: 'pre-line', margin: 0, color: theme.primary }}>{inv.bankDetails || finSettings.bankDetails}</p>
          </div>
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: theme.secondary, fontWeight: 900, marginBottom: 8, letterSpacing: 1 }}>Contractual Conditions</div>
            <p style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>{inv.terms || finSettings.terms}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
          <div style={{ padding: 12, border: `1px solid ${theme.accent}40`, borderRadius: 8, marginBottom: 24, background: theme.surface }}>
            <QrCode size={90} color={theme.secondary} style={{ opacity: 0.6 }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: theme.textMuted, textTransform: 'uppercase', marginBottom: 24, letterSpacing: 1 }}>System Generated Verification Code: GS-992-LX</div>
            {finSettings.showStamp && (
              <div style={{
                width: 130, height: 130, borderRadius: '50%', border: `4px double ${theme.accent}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.secondary,
                transform: 'rotate(-15deg)', margin: '0 0 24px auto', background: theme.bg
              }}>
                <div style={{ textAlign: 'center', padding: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1 }}>WESTLINE FUTURE</div>
                  <div style={{ fontSize: 15, fontWeight: 900, borderTop: `2px solid ${theme.accent}`, borderBottom: `2px solid ${theme.accent}`, padding: '4px 0', margin: '4px 0', letterSpacing: 2 }}>CERTIFIED</div>
                  <div style={{ fontSize: 8, letterSpacing: 1 }}>OFFICIAL RELEASE</div>
                </div>
              </div>
            )}
            <div style={{ width: 200, borderBottom: `2px solid ${theme.primary}`, marginBottom: 12 }} />
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.primary }}>Finance Director</div>
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>Westline Future Ltd.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
