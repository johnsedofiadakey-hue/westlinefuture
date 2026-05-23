import React, { useState, useRef, useEffect } from 'react';
import { X, Check, DollarSign, SplitSquareHorizontal, Bell, Search } from 'lucide-react';

const PRINT_CSS = `body{font-family:'DM Sans',sans-serif;color:#111;background:white;}
.ph{background:var(--accent-secondary);color:white;padding:36px 44px;display:flex;justify-content:space-between;align-items:flex-start;}
.ph-name{font-family:'Cormorant Garamond',serif;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.38);margin-bottom:4px;}
.ph-title{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:300;color:white;margin-top:6px;}
.gold-bar{height:3px;background:linear-gradient(90deg,var(--ac),#EDD59A);}
.body{padding:44px;} .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:36px;padding:24px;background:#F9F9F7;border-radius:6px;}
.lbl{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#999;margin-bottom:4px;} .val{font-size:15px;font-weight:500;color:#111;}
table{width:100%;border-collapse:collapse;margin-bottom:28px;} th{background:#F5F5F0;padding:9px 13px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#666;font-weight:600;text-align:left;} td{padding:11px 13px;font-size:13px;border-bottom:1px solid #EBEBEB;}
.tot td{font-weight:700;font-size:14px;background:#F9F9F7;} .terms{font-size:11px;color:#888;line-height:1.7;padding:18px;background:#F9F9F7;border-radius:6px;}
.foot{margin-top:40px;padding-top:20px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:11px;color:#AAA;}
.stamp{display:inline-block;border:3px solid #4ADE80;color:#16A34A;padding:5px 16px;border-radius:3px;font-size:18px;font-weight:800;transform:rotate(-8deg);opacity:.65;}`;

export const Av = ({ i, s = 36, c = `var(--accent-secondary)` }) => (
  <div style={{
    width: s,
    height: s,
    borderRadius: '50%',
    background: `${c}18`,
    border: `1px solid ${c}32`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: s * .32,
    fontWeight: 600,
    color: c,
    fontFamily: "'DM Sans',sans-serif",
    flexShrink: 0
  }}>{i}</div>
);

export const SBadge = ({ s }) => <span className={`sb s-${(s || '').toLowerCase().replace(/\s/g, '')}`}>{s}</span>;

export function Modal({ open, onClose, title, children, w = 520 }) {
  if (!open) return null;
  return (
    <div className="overlay-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lxf" style={{ maxWidth: w }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#DDD' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 4, display: 'flex' }}><X size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FF({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, color: '#484848', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{label}</label>
      {children}
    </div>
  );
}

// BEFORE/AFTER SLIDER
export function BA({ before, after, h = 340 }) {
  const [pos, setPos] = useState(50);
  const ref = useRef();
  const drag = useRef(false);
  const move = cx => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((cx - r.left) / r.width) * 100)));
  };
  return (
    <div ref={ref} style={{
      height: h, position: 'relative', overflow: 'hidden', background: '#EEE', cursor: 'col-resize', userSelect: 'none'
    }}
      onMouseDown={() => drag.current = true} onMouseUp={() => drag.current = false} onMouseLeave={() => drag.current = false}
      onMouseMove={e => drag.current && move(e.clientX)} onTouchMove={e => move(e.touches[0].clientX)}>
      <img src={after} alt="after" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${pos}%` }}>
        <img src={before} alt="before" style={{ width: ref.current?.offsetWidth || '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} />
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, transform: 'translateX(-50%)', width: 2, background: 'white', zIndex: 4 }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 36, height: 36, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,.2)' }}>
          <SplitSquareHorizontal size={15} color="#888" />
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,.55)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 3, letterSpacing: '.1em', opacity: pos > 15 ? 1 : 0, transition: 'opacity .3s' }}>BEFORE</div>
      <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,.55)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 3, letterSpacing: '.1em', opacity: pos < 85 ? 1 : 0, transition: 'opacity .3s' }}>AFTER</div>
    </div>
  );
}

export function printDoc(doc, type, brand) {
  const ac = brand.color || `var(--accent-secondary)`;
  const co = brand.name || 'Westline Future Ltd.';
  const isPaid = doc.status === 'Paid' || doc.status === 'Completed';
  const isProposal = type === 'proposal';
  const docLabel = isProposal ? 'QUOTATION / PROPOSAL' : 'INVOICE';
  const logoHtml = brand.logo
    ? `<img src="${brand.logo}" style="height:52px;object-fit:contain;display:block;filter:brightness(0);" alt="${co}" />`
    : `<div style="font-size:28px;font-weight:900;color:${ac};">${co.split(' ').map(w => w[0]).join('').slice(0,3)}</div>`;
  const items = doc.items || [];
  const itemsHtml = items.length ? `
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px;font-size:13px;">
      <thead><tr style="background:var(--accent-secondary);color:#fff;">
        <th style="padding:12px 16px;text-align:left;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Description</th>
        <th style="padding:12px 16px;text-align:center;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Qty</th>
        <th style="padding:12px 16px;text-align:right;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Rate</th>
        <th style="padding:12px 16px;text-align:right;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Total</th>
      </tr></thead>
      <tbody>${items.map((i, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#FAFAF9' : '#fff'};">
          <td style="padding:14px 16px;font-weight:600;">${i.desc || i.description || '—'}</td>
          <td style="padding:14px 16px;text-align:center;color:var(--text-secondary);">${i.qty ?? 1}</td>
          <td style="padding:14px 16px;text-align:right;color:var(--text-secondary);">${i.rate || '—'}</td>
          <td style="padding:14px 16px;text-align:right;font-weight:700;">${i.total || i.amount || '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '';

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${docLabel} — ${co}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
  html,body{font-family:'Inter',-apple-system,sans-serif;color:var(--accent-secondary);-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:72px;position:relative;background:#fff;}
  .wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-40deg);font-size:100px;font-weight:900;opacity:.025;white-space:nowrap;pointer-events:none;color:var(--accent-secondary);z-index:0;}
  .c{position:relative;z-index:1;}
  @page{size:A4;margin:0;}
  @media print{.page{box-shadow:none!important;}button{display:none!important;}}
  @media screen{.page{box-shadow:0 0 60px rgba(0,0,0,.12);margin:40px auto;border-radius:4px;}body{background:var(--border-color);}}
</style></head><body>
<div class="page">
  <div style="height:6px;background:linear-gradient(90deg,${ac},${ac}aa);margin:-72px -72px 0 -72px;"></div>
  <div class="wm">${docLabel}</div>
  <div class="c">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:40px;margin-bottom:48px;padding-bottom:32px;border-bottom:1.5px solid var(--border-color);">
      <div style="display:flex;align-items:center;gap:18px;">
        ${logoHtml}
        <div>
          <div style="font-size:15px;font-weight:800;letter-spacing:-.3px;">${co}</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${brand.address || brand.location || 'International'}</div>
          <div style="font-size:11px;color:var(--text-secondary);">${brand.phone || ''}${brand.email ? ' · ' + brand.email : ''}</div>
          ${brand.website ? `<div style="font-size:11px;color:${ac};">${brand.website}</div>` : ''}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${ac};margin-bottom:6px;">${docLabel}</div>
        <div style="font-size:28px;font-weight:900;letter-spacing:-1px;">#${doc.id || 'DRAFT'}</div>
        ${isPaid ? `<div style="margin-top:10px;display:inline-block;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:800;background:#D1FAE5;color:#065F46;border:1px solid #16A34A40;">PAID</div>` : isProposal ? `<div style="margin-top:10px;display:inline-block;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:800;background:#FEF3C7;color:#92400E;border:1px solid #D9770640;">PENDING APPROVAL</div>` : ''}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:36px;">
      <div style="padding:16px 20px;background:var(--bg-secondary);border-radius:12px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:6px;">Date Issued</div>
        <div style="font-size:14px;font-weight:700;">${doc.date || new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      <div style="padding:16px 20px;background:var(--accent-secondary);border-radius:12px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:6px;">Reference</div>
        <div style="font-size:13px;font-weight:700;color:#fff;font-family:monospace;">${doc.id || 'GT-DRAFT'}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:36px;">
      <div style="padding:20px 24px;border:1.5px solid var(--border-color);border-radius:14px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:10px;">Prepared For</div>
        <div style="font-size:15px;font-weight:800;margin-bottom:4px;">${doc.client || doc.clientName || '—'}</div>
        <div style="font-size:12px;color:var(--text-secondary);">${doc.clientEmail || ''}</div>
        <div style="font-size:12px;color:var(--text-secondary);">${doc.clientPhone || ''}</div>
      </div>
      <div style="padding:20px 24px;border:1.5px solid var(--border-color);border-radius:14px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:10px;">From</div>
        <div style="font-size:15px;font-weight:800;margin-bottom:4px;">${co}</div>
        <div style="font-size:12px;color:var(--text-secondary);">${brand.address || brand.location || 'International'}</div>
        <div style="font-size:12px;color:var(--text-secondary);">${brand.phone || ''}</div>
        <div style="font-size:12px;color:var(--text-secondary);">${brand.email || ''}</div>
      </div>
    </div>

    ${doc.title ? `<div style="margin-bottom:24px;padding:14px 20px;background:${ac}0f;border-left:4px solid ${ac};border-radius:0 10px 10px 0;"><span style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:${ac};font-weight:800;">Subject: </span><span style="font-size:14px;font-weight:700;">${doc.title}</span></div>` : ''}

    ${itemsHtml}

    <div style="display:flex;justify-content:flex-end;margin-bottom:32px;">
      <div style="min-width:260px;background:var(--accent-secondary);border-radius:16px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.5);">${isPaid ? 'TOTAL PAID' : 'TOTAL DUE'}</span>
        <span style="font-size:22px;font-weight:900;color:${ac};letter-spacing:-.5px;">${doc.amount || '—'}</span>
      </div>
    </div>

    ${doc.notes ? `<div style="margin-bottom:24px;padding:16px 20px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border-color);"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:8px;">Notes</div><div style="font-size:12px;color:var(--text-secondary);line-height:1.7;">${doc.notes}</div></div>` : ''}
    ${brand.bankDetails ? `<div style="margin-bottom:24px;padding:16px 20px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border-color);"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:${ac};font-weight:800;margin-bottom:8px;">Payment Details</div><div style="font-size:12px;color:var(--text-secondary);line-height:1.7;">${brand.bankDetails}</div></div>` : ''}

    <div style="margin-top:40px;padding-top:20px;border-top:1.5px solid var(--border-color);display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="font-size:11px;color:var(--text-secondary);line-height:1.7;">Thank you for your business.<br/>${co} — ${brand.website || 'www.westlinefuture.com'}</div>
      <div style="text-align:right;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:var(--text-secondary);font-weight:700;margin-bottom:28px;">Authorised Signature</div>
        <div style="width:120px;height:1px;background:var(--text-secondary);margin-left:auto;"></div>
        <div style="font-size:10px;color:var(--text-secondary);margin-top:4px;">${co}</div>
      </div>
    </div>
  </div>
</div>
<script>window.onload=()=>setTimeout(()=>window.print(),800);</script>
</body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) { w.document.write(html); w.document.close(); }
}

export const PAv = Av;
export const PSBadge = SBadge;
export const PModal = Modal;

export const Spinner = () => <div style={{ width: 15, height: 15, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} className="spin" />;

export function NotificationBell({ notifications = [], onMarkRead }) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setOpen(!open)}
        className="glass-btn" 
        style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}
      >
        <Bell size={18} color="var(--accent-secondary)" />
        {unread > 0 && (
          <span style={{ 
            position: 'absolute', top: 4, right: 4, background: '#EF4444', color: 'white', 
            fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 10, minWidth: 16, textAlign: 'center' 
          }}>{unread}</span>
        )}
      </button>

      {open && (
        <div className="glass-panel" style={{ 
          position: 'absolute', top: '100%', right: 0, width: 320, marginTop: 12, 
          zIndex: 1000, maxHeight: 400, overflowY: 'auto', padding: 12, border: '1px solid rgba(92, 58, 33,.2)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: `var(--accent-secondary)`, textTransform: 'uppercase', letterSpacing: '.05em' }}>Notifications</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#666' }}><X size={14} /></button>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#666', fontSize: 13 }}>No notifications</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => { onMarkRead(n.id); if (!n.read) setOpen(false); }}
                  style={{ 
                    padding: 12, background: n.read ? 'rgba(255,255,255,.02)' : 'rgba(92, 58, 33,.08)', 
                    borderRadius: 8, cursor: 'pointer', border: n.read ? '1px solid transparent' : '1px solid rgba(92, 58, 33,.15)',
                    transition: 'all .2s'
                  }}
                >
                  <div style={{ fontSize: 13, color: '#DDD', marginBottom: 4, lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 10, color: '#666' }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const COUNTRIES = [
  { name: 'Ghana',                   code: '+233', flag: '🇬🇭' },
  { name: 'Nigeria',                 code: '+234', flag: '🇳🇬' },
  { name: 'United States',           code: '+1',   flag: '🇺🇸' },
  { name: 'United Kingdom',          code: '+44',  flag: '🇬🇧' },
  { name: 'China',                   code: '+86',  flag: '🇨🇳' },
  { name: 'Canada',                  code: '+1',   flag: '🇨🇦' },
  { name: 'South Africa',            code: '+27',  flag: '🇿🇦' },
  { name: 'Kenya',                   code: '+254', flag: '🇰🇪' },
  { name: 'Germany',                 code: '+49',  flag: '🇩🇪' },
  { name: 'France',                  code: '+33',  flag: '🇫🇷' },
  { name: 'India',                   code: '+91',  flag: '🇮🇳' },
  { name: 'United Arab Emirates',    code: '+971', flag: '🇦🇪' },
  { name: 'Saudi Arabia',            code: '+966', flag: '🇸🇦' },
  { name: 'Qatar',                   code: '+974', flag: '🇶🇦' },
  { name: 'Australia',               code: '+61',  flag: '🇦🇺' },
  { name: 'Singapore',               code: '+65',  flag: '🇸🇬' },
  { name: 'Japan',                   code: '+81',  flag: '🇯🇵' },
  { name: 'South Korea',             code: '+82',  flag: '🇰🇷' },
  { name: 'Brazil',                  code: '+55',  flag: '🇧🇷' },
  { name: 'Mexico',                  code: '+52',  flag: '🇲🇽' },
  { name: 'Netherlands',             code: '+31',  flag: '🇳🇱' },
  { name: 'Spain',                   code: '+34',  flag: '🇪🇸' },
  { name: 'Italy',                   code: '+39',  flag: '🇮🇹' },
  { name: 'Portugal',                code: '+351', flag: '🇵🇹' },
  { name: 'Sweden',                  code: '+46',  flag: '🇸🇪' },
  { name: 'Norway',                  code: '+47',  flag: '🇳🇴' },
  { name: 'Denmark',                 code: '+45',  flag: '🇩🇰' },
  { name: 'Switzerland',             code: '+41',  flag: '🇨🇭' },
  { name: 'Belgium',                 code: '+32',  flag: '🇧🇪' },
  { name: 'Turkey',                  code: '+90',  flag: '🇹🇷' },
  { name: 'Russia',                  code: '+7',   flag: '🇷🇺' },
  { name: 'Poland',                  code: '+48',  flag: '🇵🇱' },
  { name: 'Egypt',                   code: '+20',  flag: '🇪🇬' },
  { name: 'Morocco',                 code: '+212', flag: '🇲🇦' },
  { name: 'Ethiopia',                code: '+251', flag: '🇪🇹' },
  { name: 'Tanzania',                code: '+255', flag: '🇹🇿' },
  { name: 'Uganda',                  code: '+256', flag: '🇺🇬' },
  { name: 'Ivory Coast',             code: '+225', flag: '🇨🇮' },
  { name: 'Senegal',                 code: '+221', flag: '🇸🇳' },
  { name: 'Cameroon',                code: '+237', flag: '🇨🇲' },
  { name: 'Angola',                  code: '+244', flag: '🇦🇴' },
  { name: 'Mozambique',              code: '+258', flag: '🇲🇿' },
  { name: 'Zambia',                  code: '+260', flag: '🇿🇲' },
  { name: 'Zimbabwe',                code: '+263', flag: '🇿🇼' },
  { name: 'Rwanda',                  code: '+250', flag: '🇷🇼' },
  { name: 'Botswana',                code: '+267', flag: '🇧🇼' },
  { name: 'Namibia',                 code: '+264', flag: '🇳🇦' },
  { name: 'Togo',                    code: '+228', flag: '🇹🇬' },
  { name: 'Benin',                   code: '+229', flag: '🇧🇯' },
  { name: 'Burkina Faso',            code: '+226', flag: '🇧🇫' },
  { name: 'Mali',                    code: '+223', flag: '🇲🇱' },
  { name: 'Guinea',                  code: '+224', flag: '🇬🇳' },
  { name: 'Sierra Leone',            code: '+232', flag: '🇸🇱' },
  { name: 'Liberia',                 code: '+231', flag: '🇱🇷' },
  { name: 'Gabon',                   code: '+241', flag: '🇬🇦' },
  { name: 'Congo',                   code: '+242', flag: '🇨🇬' },
  { name: 'DR Congo',                code: '+243', flag: '🇨🇩' },
  { name: 'Sudan',                   code: '+249', flag: '🇸🇩' },
  { name: 'Libya',                   code: '+218', flag: '🇱🇾' },
  { name: 'Tunisia',                 code: '+216', flag: '🇹🇳' },
  { name: 'Algeria',                 code: '+213', flag: '🇩🇿' },
  { name: 'Kuwait',                  code: '+965', flag: '🇰🇼' },
  { name: 'Bahrain',                 code: '+973', flag: '🇧🇭' },
  { name: 'Oman',                    code: '+968', flag: '🇴🇲' },
  { name: 'Jordan',                  code: '+962', flag: '🇯🇴' },
  { name: 'Lebanon',                 code: '+961', flag: '🇱🇧' },
  { name: 'Pakistan',                code: '+92',  flag: '🇵🇰' },
  { name: 'Bangladesh',              code: '+880', flag: '🇧🇩' },
  { name: 'Sri Lanka',               code: '+94',  flag: '🇱🇰' },
  { name: 'Malaysia',                code: '+60',  flag: '🇲🇾' },
  { name: 'Indonesia',               code: '+62',  flag: '🇮🇩' },
  { name: 'Philippines',             code: '+63',  flag: '🇵🇭' },
  { name: 'Thailand',                code: '+66',  flag: '🇹🇭' },
  { name: 'Vietnam',                 code: '+84',  flag: '🇻🇳' },
  { name: 'Hong Kong',               code: '+852', flag: '🇭🇰' },
  { name: 'Taiwan',                  code: '+886', flag: '🇹🇼' },
  { name: 'New Zealand',             code: '+64',  flag: '🇳🇿' },
  { name: 'Argentina',               code: '+54',  flag: '🇦🇷' },
  { name: 'Colombia',                code: '+57',  flag: '🇨🇴' },
  { name: 'Chile',                   code: '+56',  flag: '🇨🇱' },
  { name: 'Peru',                    code: '+51',  flag: '🇵🇪' },
  { name: 'Venezuela',               code: '+58',  flag: '🇻🇪' },
  { name: 'Ecuador',                 code: '+593', flag: '🇪🇨' },
  { name: 'Greece',                  code: '+30',  flag: '🇬🇷' },
  { name: 'Czech Republic',          code: '+420', flag: '🇨🇿' },
  { name: 'Hungary',                 code: '+36',  flag: '🇭🇺' },
  { name: 'Romania',                 code: '+40',  flag: '🇷🇴' },
  { name: 'Ukraine',                 code: '+380', flag: '🇺🇦' },
  { name: 'Israel',                  code: '+972', flag: '🇮🇱' },
  { name: 'Iran',                    code: '+98',  flag: '🇮🇷' },
  { name: 'Iraq',                    code: '+964', flag: '🇮🇶' },
  { name: 'Afghanistan',             code: '+93',  flag: '🇦🇫' },
  { name: 'Nepal',                   code: '+977', flag: '🇳🇵' },
  { name: 'Myanmar',                 code: '+95',  flag: '🇲🇲' },
  { name: 'Cambodia',                code: '+855', flag: '🇰🇭' },
  { name: 'Finland',                 code: '+358', flag: '🇫🇮' },
  { name: 'Austria',                 code: '+43',  flag: '🇦🇹' },
  { name: 'Ireland',                 code: '+353', flag: '🇮🇪' },
  { name: 'Cuba',                    code: '+53',  flag: '🇨🇺' },
  { name: 'Jamaica',                 code: '+1876',flag: '🇯🇲' },
];

export // ─── Country Picker ───────────────────────────────────────────────────────────
function CountryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isMob, setIsMob] = useState(window.innerWidth < 600);
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const h = () => setIsMob(window.innerWidth < 600);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const filtered = search.trim()
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search))
    : COUNTRIES;

  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 80); }, [open]);

  useEffect(() => {
    if (isMob) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isMob]);

  const close = () => { setOpen(false); setSearch(''); };

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          height: 52, padding: '0 12px', borderRadius: 14,
          border: '1.5px solid var(--border-color)', background: `var(--bg-secondary)`,
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', fontSize: 15, fontFamily: 'inherit',
          whiteSpace: 'nowrap', minWidth: 88, touchAction: 'manipulation',
        }}
      >
        <span style={{ fontSize: 20 }}>{value.flag}</span>
        <span style={{ fontWeight: 700, color: `var(--accent-secondary)` }}>{value.code}</span>
        <span style={{ fontSize: 10, color: `var(--text-secondary)` }}>▾</span>
      </button>

      {/* Desktop dropdown */}
      {open && !isMob && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000,
          background: '#fff', borderRadius: 16, border: '1.5px solid var(--border-color)',
          boxShadow: '0 16px 40px rgba(92, 58, 33,.12)', width: 280, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} color="var(--text-secondary)" />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search country or code..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: `var(--accent-secondary)`, fontFamily: 'inherit', background: 'transparent' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={13} color="var(--text-secondary)" /></button>}
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '20px 16px', textAlign: 'center', color: `var(--text-secondary)`, fontSize: 13 }}>No results</div>
              : filtered.map(c => (
                <button key={c.code + c.name} type="button" onClick={() => { onChange(c); close(); }}
                  style={{ width: '100%', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, background: c.code === value.code && c.name === value.name ? `var(--bg-secondary)` : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{c.flag}</span>
                  <span style={{ flex: 1, fontSize: 13, color: `var(--accent-secondary)`, fontWeight: 500 }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 700 }}>{c.code}</span>
                </button>
              ))
            }
          </div>
        </div>
      )}

      {/* Mobile bottom sheet */}
      {open && isMob && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(92, 58, 33,.55)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001,
            background: '#fff', borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 40px rgba(0,0,0,.2)',
            display: 'flex', flexDirection: 'column', maxHeight: '72vh',
            paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: `var(--border-color)` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 12px' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: `var(--accent-secondary)` }}>Select Country</div>
              <button onClick={close} style={{ width: 36, height: 36, borderRadius: 10, background: `var(--border-color)`, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `var(--bg-secondary)`, borderRadius: 14, padding: '12px 16px', border: '1.5px solid var(--border-color)' }}>
                <Search size={16} color="var(--text-secondary)" />
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search country or code..."
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, color: `var(--accent-secondary)`, fontFamily: 'inherit', background: 'transparent' }} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', touchAction: 'manipulation' }}><X size={14} color="var(--text-secondary)" /></button>}
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0
                ? <div style={{ padding: '32px 16px', textAlign: 'center', color: `var(--text-secondary)`, fontSize: 14 }}>No results</div>
                : filtered.map(c => (
                  <button key={c.code + c.name} type="button" onClick={() => { onChange(c); close(); }}
                    style={{ width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, background: c.code === value.code && c.name === value.name ? `var(--bg-secondary)` : 'none', border: 'none', borderBottom: '1px solid var(--bg-secondary)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', touchAction: 'manipulation' }}>
                    <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{c.flag}</span>
                    <span style={{ flex: 1, fontSize: 15, color: `var(--accent-secondary)`, fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: 13, color: `var(--text-secondary)`, fontWeight: 700 }}>{c.code}</span>
                  </button>
                ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}
