import React from 'react';
import { Landmark, Globe, QrCode } from 'lucide-react';

const calculateTotal = (items = []) =>
  items.reduce((a, b) => a + (parseFloat(b.qty) * parseFloat(b.rate) || 0), 0);

const formatMoney = (val, currency) => {
  const symbol = currency === 'GHS' ? 'GH₵' : '$';
  return `${symbol}${parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};

const getSecondaryValue = (val, fromCurrency, exchangeRate) =>
  fromCurrency === 'USD' ? val * exchangeRate : val / exchangeRate;

export default function InvoiceDocument({ inv, isQuote = false, finSettings, ac, brand }) {
  const total = calculateTotal(inv.items || [], inv.currency);
  const secondaryTotal = getSecondaryValue(total, inv.currency, finSettings.exchangeRate);
  const secondaryCurrency = inv.currency === 'USD' ? 'GHS' : 'USD';

  const isMinimal = finSettings.invoiceTheme === 'minimal';
  const isCorporate = finSettings.invoiceTheme === 'corporate';

  return (
    <div id="printable-financial" style={{
      width: '100%', minHeight: '1120px', background: '#fff',
      padding: isMinimal ? '40px' : '80px', color: '#0D0B2E',
      fontFamily: isMinimal ? 'sans-serif' : 'serif',
      position: 'relative', overflow: 'hidden',
      border: isCorporate ? `10px solid ${ac}20` : 'none'
    }}>
      {/* WATERMARK */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)',
        fontSize: '120px', fontWeight: 900, opacity: 0.03, pointerEvents: 'none', whiteSpace: 'nowrap'
      }}>
        {inv.status === 'Paid' ? 'OFFICIAL RECEIPT' : isQuote ? 'OFFICIAL QUOTATION' : 'PAYMENT REQUEST'}
      </div>

      {/* TOP BAR (Corporate Theme) */}
      {isCorporate && <div style={{ height: 20, background: ac, margin: '-80px -80px 60px -80px' }} />}

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 60, borderBottom: isMinimal ? 'none' : '2px solid #0D0B2E', paddingBottom: 40 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {brand.logo ? <img src={brand.logo} style={{ height: isMinimal ? 40 : 64, objectFit: 'contain' }} alt="logo" /> : <div style={{ fontSize: 32, fontWeight: 900, color: ac }}>G</div>}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2 }}>{brand.name || 'WESTLINE FUTURE'}</h1>
            <p style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>{brand.tagline}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: isMinimal ? 32 : 48, fontWeight: 300, margin: 0, textTransform: 'uppercase', color: isCorporate ? ac : 'inherit' }}>{isQuote ? 'Quotation' : 'Invoice'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginTop: 8 }}>
            <span style={{ fontSize: 12, background: '#0D0B2E', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>Ref: {inv.id || 'DRAFT-001'}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Date: {inv.date}</span>
          </div>
        </div>
      </div>

      {/* CLIENT & VENDOR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 60, marginBottom: 60 }}>
        <div style={{ padding: isMinimal ? '20px' : '0', background: isMinimal ? '#F4F4FA' : 'none', borderRadius: 12 }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', color: ac, fontWeight: 900, marginBottom: 12, letterSpacing: 1.5 }}>PREPARED FOR</div>
          <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{inv.clientName || 'Valued Client'}</p>
          <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.7 }}>
            {inv.clientEmail}<br />
            {inv.clientPhone || 'Commercial Division'}<br />
            {inv.clientAddress || 'Accra, Ghana'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', color: ac, fontWeight: 900, marginBottom: 12, letterSpacing: 1.5 }}>ISSUED BY</div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{brand.name}</p>
          <div style={{ fontSize: 11, lineHeight: 1.6, opacity: 0.6 }}>
            {brand.location}<br />
            Tel: {brand.phone}<br />
            Email: {brand.email}
          </div>
        </div>
      </div>

      {/* PROJECT INFO */}
      <div style={{ marginBottom: 40, padding: '16px 24px', border: `1px solid ${ac}30`, borderRadius: 12, background: `${ac}05` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', color: ac, fontWeight: 800, marginBottom: 4 }}>Subject / Project</div>
            <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>{inv.title || 'General Finishing Works'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', color: ac, fontWeight: 800, marginBottom: 4 }}>Billable Type</div>
            <div style={{ fontSize: 12, fontWeight: 800, background: '#0D0B2E', color: '#fff', padding: '4px 12px', borderRadius: 20 }}>
              {inv.invoiceType === 'unit' ? 'UNIT-ITEM BILLING' : 'PROJECT-BASED MILESTONE'}
            </div>
          </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
        <thead>
          <tr style={{ background: isCorporate ? ac : '#0D0B2E', color: '#fff' }}>
            <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Service Description</th>
            <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 10, textTransform: 'uppercase', width: 100 }}>{inv.invoiceType === 'unit' ? 'Quantity' : 'Phase'}</th>
            <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: 10, textTransform: 'uppercase', width: 150 }}>Unit Price</th>
            <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: 10, textTransform: 'uppercase', width: 150 }}>Line Total</th>
          </tr>
        </thead>
        <tbody>
          {(inv.items || []).map((it) => (
            <tr key={it.id} style={{ borderBottom: '1px solid #F0EBE5' }}>
              <td style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {it.img && <img src={it.img} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: '#f9f7f4' }} alt="it" />}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{it.desc || 'Standard Glazing Work'}</div>
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>Precision manufacturing & site installation</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '18px 20px', textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{it.qty} {inv.invoiceType === 'unit' ? (it.unit || 'pcs') : ''}</td>
              <td style={{ padding: '18px 20px', textAlign: 'right', fontSize: 14 }}>{formatMoney(it.rate, inv.currency)}</td>
              <td style={{ padding: '18px 20px', textAlign: 'right', fontSize: 14, fontWeight: 800 }}>{formatMoney(it.qty * it.rate, inv.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTALS & CONVERSION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 60 }}>
        <div style={{ flex: 1, paddingRight: 40 }}>
          <div style={{ padding: 20, border: '1px dashed #E0DDD8', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Globe size={14} color={ac} />
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: ac }}>Multi-Currency Settlement</span>
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.6, opacity: 0.6 }}>
              This invoice is payable in <b>{inv.currency}</b>. For convenience, the equivalent amount in <b>{secondaryCurrency}</b> is provided at the prevailing exchange rate of 1 USD = {finSettings.exchangeRate} GHS.
            </p>
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800, color: '#16A34A' }}>
              Equivalent Total: {formatMoney(secondaryTotal, secondaryCurrency)}
            </div>
          </div>
        </div>
        <div style={{ width: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F0EBE5' }}>
            <span style={{ fontSize: 14, opacity: 0.6 }}>Subtotal</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{formatMoney(total, inv.currency)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 0', borderTop: `3px solid ${isCorporate ? ac : '#0D0B2E'}`, marginTop: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase' }}>Grand Total</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: ac }}>{formatMoney(total, inv.currency)}</span>
          </div>
        </div>
      </div>

      {/* BANKING & SIGNATURE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 60, borderTop: '1px solid #F0EBE5', paddingTop: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Landmark size={16} color={ac} />
            <span style={{ fontSize: 10, textTransform: 'uppercase', color: ac, fontWeight: 900, letterSpacing: 1 }}>Electronic Fund Transfer</span>
          </div>
          <div style={{ padding: 24, background: '#F4F4FA', borderRadius: 16, border: '1px solid #F0EBE5' }}>
            <p style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{inv.bankDetails || finSettings.bankDetails}</p>
          </div>
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', opacity: 0.5, fontWeight: 900, marginBottom: 8 }}>Contractual Conditions</div>
            <p style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{inv.terms || finSettings.terms}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
          <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 12, marginBottom: 20 }}>
            <QrCode size={100} style={{ opacity: 0.2 }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase', marginBottom: 24 }}>System Generated Verification Code: GS-992-LX</div>
            {finSettings.showStamp && (
              <div style={{
                width: 140, height: 140, borderRadius: '50%', border: `4px double ${ac}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: `${ac}60`,
                transform: 'rotate(-15deg)', margin: '0 0 20px auto'
              }}>
                <div style={{ textAlign: 'center', padding: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 900 }}>WESTLINE FUTURE</div>
                  <div style={{ fontSize: 16, fontWeight: 900, borderY: '2px solid' }}>CERTIFIED</div>
                  <div style={{ fontSize: 8 }}>OFFICIAL RELEASE</div>
                </div>
              </div>
            )}
            <div style={{ width: 180, borderBottom: '1px solid #0D0B2E', marginBottom: 8 }} />
            <div style={{ fontSize: 11, fontWeight: 800 }}>Finance Director</div>
            <div style={{ fontSize: 9, opacity: 0.5 }}>Westline Future Ltd.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
