import React, { useState, useRef } from 'react';
import { X, Check, DollarSign, SplitSquareHorizontal, Bell } from 'lucide-react';

const PRINT_CSS = `body{font-family:'DM Sans',sans-serif;color:#111;background:white;}
.ph{background:#0D0B2E;color:white;padding:36px 44px;display:flex;justify-content:space-between;align-items:flex-start;}
.ph-name{font-family:'Cormorant Garamond',serif;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.38);margin-bottom:4px;}
.ph-title{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:300;color:white;margin-top:6px;}
.gold-bar{height:3px;background:linear-gradient(90deg,var(--ac),#EDD59A);}
.body{padding:44px;} .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:36px;padding:24px;background:#F9F9F7;border-radius:6px;}
.lbl{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#999;margin-bottom:4px;} .val{font-size:15px;font-weight:500;color:#111;}
table{width:100%;border-collapse:collapse;margin-bottom:28px;} th{background:#F5F5F0;padding:9px 13px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#666;font-weight:600;text-align:left;} td{padding:11px 13px;font-size:13px;border-bottom:1px solid #EBEBEB;}
.tot td{font-weight:700;font-size:14px;background:#F9F9F7;} .terms{font-size:11px;color:#888;line-height:1.7;padding:18px;background:#F9F9F7;border-radius:6px;}
.foot{margin-top:40px;padding-top:20px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:11px;color:#AAA;}
.stamp{display:inline-block;border:3px solid #4ADE80;color:#16A34A;padding:5px 16px;border-radius:3px;font-size:18px;font-weight:800;transform:rotate(-8deg);opacity:.65;}`;

export const Av = ({ i, s = 36, c = '#231F78' }) => (
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
  const ac = brand.color || '#231F78';
  const items = doc.items || [];
  const isPaid = doc.status === 'Paid' || doc.status === 'Completed';
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${type} ${doc.id}</title>
  <style>:root{--ac:${ac};}@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500;600&display=swap');${PRINT_CSS}</style>
  </head><body>
  <div class="ph" style="display:flex;justify-content:space-between;align-items:center;">
    <div style="display:flex;align-items:center;gap:20px;">
      ${brand.logo ? `<img src="${brand.logo}" style="height:60px;object-fit:contain;" />` : ''}
      <div>
        <div class="ph-name">${brand.name}</div>
        <div class="ph-title">${type === 'proposal' ? 'Project Proposal' : 'Tax Invoice'}<br/><span style="font-size:18px;opacity:.5">${doc.title || ''}</span></div>
        ${isPaid ? '<div style="margin-top:12px"><span class="stamp">PAID</span></div>' : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-family:monospace;font-size:22px;color:var(--ac);font-weight:700">${doc.id}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.38);margin-top:4px">Date: ${doc.date || ''}</div>
    </div>
  </div>
  <div class="gold-bar"></div><div class="body">
  <div class="info-grid"><div><div class="lbl">From</div><div class="val" style="font-family:'Cormorant Garamond',serif;font-size:20px">${brand.name}</div><div style="font-size:12px;color:#888;margin-top:4px">${brand.email || ''}</div><div style="font-size:12px;color:#888">${brand.phone || ''}</div></div>
  <div><div class="lbl">Prepared For</div><div class="val" style="font-family:'Cormorant Garamond',serif;font-size:20px">${doc.client || ''}</div></div></div>
  ${items.length ? `<table><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Total</th></tr></thead><tbody>${items.map(i => `<tr><td>${i.desc}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">${i.rate}</td><td style="text-align:right;font-weight:600">${i.total}</td></tr>`).join('')}<tr class="tot"><td colspan="3">Total</td><td style="text-align:right;color:var(--ac)">${doc.amount || ''}</td></tr></tbody></table>` : ''}
  ${doc.notes ? `<div class="terms">${doc.notes}</div>` : ''}
  <div class="foot"><div>${brand.name}</div><div>${brand.email || ''}</div><div>${doc.id} · ${doc.date || ''}</div></div>
  </div><script>window.onload=()=>window.print();</script></body></html>`;
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
        <Bell size={18} color="#231F78" />
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
          zIndex: 1000, maxHeight: 400, overflowY: 'auto', padding: 12, border: '1px solid rgba(35,31,120,.2)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#231F78', textTransform: 'uppercase', letterSpacing: '.05em' }}>Notifications</span>
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
                    padding: 12, background: n.read ? 'rgba(255,255,255,.02)' : 'rgba(35,31,120,.08)', 
                    borderRadius: 8, cursor: 'pointer', border: n.read ? '1px solid transparent' : '1px solid rgba(35,31,120,.15)',
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
