import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Plus, Send, CheckCircle2, Circle, ChevronRight,
  User, Briefcase, DollarSign, Phone, Calendar, X, Loader2,
  Lock, MessageSquare, AlertCircle, Star, Truck, ShoppingCart,
  Factory, Package, Wrench, Search, CreditCard,
  Users, UserCheck, MoreVertical, Clock,
  Globe, Upload, FileText, Download, ScanSearch, StickyNote, Anchor,
  TrendingUp, Camera, PenTool
} from 'lucide-react';
import { PAv, PSBadge } from '../../components/Shared';
import { CLIENT_PROJECT_STAGES, PROJECT_TYPES } from '../../data';
import { db } from '../../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, doc, updateDoc
} from 'firebase/firestore';

const AC = `var(--accent-secondary)`;

// ─── Stage Icon Map ───────────────────────────────────────────────────────────
const STAGE_ICONS = {
  1: <Search size={15} />,
  2: <PenTool size={15} />,
  3: <CreditCard size={15} />,
  4: <Factory size={15} />,
  5: <Truck size={15} />,
  6: <Wrench size={15} />,
  7: <ScanSearch size={15} />,
  8: <Star size={15} />,
};

// ─── Payment Schedule Configs ─────────────────────────────────────────────────
const SCHEDULE_CONFIGS = {
  standard: {
    label: 'Standard',
    sub: '10% → 40% → 40% → 10%',
    milestones: [
      { key: 'deposit',      label: '10% Deposit',         pct: 0.10, cumPct: 0.10 },
      { key: 'pre-prod',     label: '40% Pre-production',  pct: 0.40, cumPct: 0.50 },
      { key: 'pre-delivery', label: '40% Pre-delivery',    pct: 0.40, cumPct: 0.90 },
      { key: 'completion',   label: '10% Completion',      pct: 0.10, cumPct: 1.00 },
    ],
  },
  '70-30': {
    label: '70/30',
    sub: '70% before delivery · 30% after',
    milestones: [
      { key: 'pre-delivery', label: '70% Before Delivery', pct: 0.70, cumPct: 0.70 },
      { key: 'completion',   label: '30% After Delivery',  pct: 0.30, cumPct: 1.00 },
    ],
  },
  custom: {
    label: 'Custom',
    sub: 'Flexible batch payments',
    milestones: [],
  },
};

// ─── Payment Schedule Card (admin) ───────────────────────────────────────────
function PaymentScheduleCard({ project, createInvoice, notify }) {
  const budget = Number(project.budget) || 0;
  const scheduleType = project.paymentSchedule || 'standard';
  const config = SCHEDULE_CONFIGS[scheduleType] || SCHEDULE_CONFIGS.standard;
  const [changing, setChanging] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logForm, setLogForm] = useState({ amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const [payments, setPayments] = useState([]);
  useEffect(() => {
    if (!db || !project?.id) return;
    const q = query(collection(db, 'projects', project.id, 'transactions'), orderBy('date', 'desc'));
    return onSnapshot(q, snap => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setPayments([]));
  }, [project?.id]);

  const totalPaid = payments.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const paidPct = budget > 0 ? Math.min(100, (totalPaid / budget) * 100) : 0;
  const remaining = Math.max(0, budget - totalPaid);

  const fmt = v => `GHS ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getMilestoneStatus = (m) => {
    if (budget <= 0) return 'upcoming';
    if (totalPaid >= budget * m.cumPct) return 'paid';
    if (totalPaid >= budget * (m.cumPct - m.pct)) return 'due';
    return 'upcoming';
  };

  const changeSchedule = async (type) => {
    if (!db || !project?.id) return;
    await updateDoc(doc(db, 'projects', project.id), { paymentSchedule: type });
    setChanging(false);
  };

  const logPayment = async () => {
    if (!logForm.amount || Number(logForm.amount) <= 0 || saving) return;
    setSaving(true);
    try {
      const amount = Number(logForm.amount);
      await addDoc(collection(db, 'projects', project.id, 'transactions'), {
        amount,
        description: logForm.description.trim() || 'Payment received',
        date: logForm.date,
        projectId: project.id,
        type: 'payment',
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'projects', project.id), { paidAmount: totalPaid + amount });
      setLogForm({ amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
      setLogging(false);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[logPayment]', e);
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 2 }}>Payment Schedule</div>
          <div style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 600 }}>{config.label} · {config.sub}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {scheduleType === 'custom' && (
            <button
              onClick={() => setLogging(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
            >
              <Plus size={13} /> Log Payment
            </button>
          )}
          {createInvoice && (
            <button
              onClick={async () => {
                if (!project?.clientId) { notify?.('error', 'Project must have a client set'); return; }
                const amtStr = prompt('Enter one-off invoice amount (GHS):', project.budget || '0');
                if (!amtStr) return;
                const amount = Number(amtStr.replace(/[^0-9.]/g, ''));
                if (amount <= 0) { notify?.('error', 'Invalid amount'); return; }
                await createInvoice({
                  projectId: project.id, clientId: project.clientId,
                  clientName: project.name || project.title,
                  clientEmail: project.email || '', clientPhone: project.phone || '',
                  title: `Invoice — ${project.title || project.name}`,
                  currency: 'GHS',
                  date: new Date().toISOString().split('T')[0],
                  due: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                  items: [{ id: Date.now(), desc: 'Custom Invoice - ' + (project.title || 'Service'), qty: 1, rate: amount, unit: 'job' }],
                  amount: `GHS ${amount.toLocaleString()}`, total: amount,
                  status: 'Pending', type: 'Invoice', parentId: project.id,
                });
                notify?.('success', 'Invoice generated for client');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: '#16A34A', color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
            >
              <FileText size={13} /> Generate Invoice
            </button>
          )}
          <button
            onClick={() => setChanging(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 10, background: changing ? `var(--accent-secondary)` : `var(--bg-secondary)`, color: changing ? '#fff' : `var(--text-secondary)`, border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            {changing ? 'Done' : 'Change'}
          </button>
        </div>
      </div>

      {/* Schedule picker */}
      {changing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16, padding: '14px', background: `var(--bg-secondary)`, borderRadius: 14 }}>
          {Object.entries(SCHEDULE_CONFIGS).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => changeSchedule(key)}
              style={{
                padding: '12px 10px', borderRadius: 12, border: `2px solid ${scheduleType === key ? `var(--accent-secondary)` : `var(--border-color)`}`,
                background: scheduleType === key ? `var(--accent-secondary)` : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: scheduleType === key ? `var(--accent-secondary)` : `var(--accent-secondary)`, marginBottom: 3 }}>{cfg.label}</div>
              <div style={{ fontSize: 10, color: scheduleType === key ? 'rgba(255,255,255,.6)' : `var(--text-secondary)`, lineHeight: 1.4 }}>{cfg.sub}</div>
            </button>
          ))}
        </div>
      )}

      {/* Log Payment form */}
      {logging && (
        <div style={{ marginBottom: 16, padding: '16px', background: `var(--bg-secondary)`, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: `var(--accent-secondary)` }}>Record a Payment</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Amount (GHS) *</label>
              <input
                type="number"
                value={logForm.amount}
                onChange={e => setLogForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="e.g. 15000"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Date</label>
              <input
                type="date"
                value={logForm.date}
                onChange={e => setLogForm(p => ({ ...p, date: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 4 }}>Note</label>
            <input
              value={logForm.description}
              onChange={e => setLogForm(p => ({ ...p, description: e.target.value }))}
              placeholder="e.g. Second batch payment — wire transfer"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={logPayment}
              disabled={saving || !logForm.amount}
              style={{ flex: 1, padding: '10px', borderRadius: 10, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !logForm.amount ? 0.5 : 1 }}
            >
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Record Payment'}
            </button>
            <button onClick={() => setLogging(false)} style={{ padding: '10px 16px', borderRadius: 10, background: `var(--bg-secondary)`, color: `var(--text-secondary)`, border: '1px solid var(--border-color)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {budget > 0 && (
        <div style={{ marginBottom: config.milestones.length > 0 ? 14 : 0 }}>
          <div style={{ height: 7, background: `var(--border-color)`, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${paidPct}%`, background: 'linear-gradient(90deg, #16A34A80, #16A34A)', borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: `var(--text-secondary)` }}>
            <span><strong style={{ color: '#16A34A' }}>{fmt(totalPaid)}</strong> paid · {paidPct.toFixed(1)}%</span>
            <span>{fmt(remaining)} remaining · {fmt(budget)}</span>
          </div>
        </div>
      )}

      {/* Custom: recent payments mini-list */}
      {scheduleType === 'custom' && payments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {payments.slice(0, 5).map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: `var(--bg-secondary)`, borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: `var(--accent-secondary)` }}>{p.description || 'Payment'}</div>
                <div style={{ fontSize: 10, color: `var(--text-secondary)` }}>{p.date || '—'}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#16A34A' }}>{fmt(p.amount)}</div>
            </div>
          ))}
          {payments.length > 5 && (
            <div style={{ fontSize: 11, color: `var(--text-secondary)`, textAlign: 'center', paddingTop: 4 }}>+{payments.length - 5} more payments</div>
          )}
        </div>
      )}

      {/* Milestone rows */}
      {config.milestones.length > 0 && budget > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {config.milestones.map((m, idx) => {
            const status = getMilestoneStatus(m);
            const isPaid = status === 'paid';
            const isDue = status === 'due';
            return (
              <div key={m.key} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                background: isDue ? '#F0FDF4' : '#FAFAF9',
                border: `1.5px solid ${isDue ? '#16A34A40' : isPaid ? '#16A34A20' : `var(--border-color)`}`,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPaid ? '#16A34A' : isDue ? '#F0FDF4' : `var(--border-color)`, border: isDue ? '2px solid #16A34A' : 'none' }}>
                  {isPaid ? <CheckCircle2 size={13} color="#fff" /> : <span style={{ fontSize: 10, fontWeight: 900, color: isDue ? '#16A34A' : `var(--text-secondary)` }}>{idx + 1}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: `var(--accent-secondary)` }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isPaid ? '#16A34A' : isDue ? '#16A34A' : `var(--text-secondary)` }}>{fmt(budget * m.pct)}</div>
                </div>
                <div>
                  {isPaid && <span style={{ fontSize: 10, fontWeight: 800, color: '#065F46', background: '#D1FAE5', padding: '3px 9px', borderRadius: 20 }}>Paid ✓</span>}
                  {isDue && <span style={{ fontSize: 10, fontWeight: 800, color: '#92400E', background: '#FEF3C7', padding: '3px 9px', borderRadius: 20 }}>Due</span>}
                  {status === 'upcoming' && <span style={{ fontSize: 10, color: `var(--text-secondary)`, background: `var(--border-color)`, padding: '3px 9px', borderRadius: 20 }}>Upcoming</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── New Project Modal ────────────────────────────────────────────────────────
const BD_ITEMS_CONFIG = [
  { key: 'product',      label: 'Product / Materials', color: `var(--accent-secondary)`, icon: <Package size={13} /> },
  { key: 'shipping',     label: 'Shipping & Freight',  color: `var(--text-secondary)`, icon: <Truck size={13} /> },
  { key: 'installation', label: 'Installation Labour', color: '#D97706', icon: <Wrench size={13} /> },
];

function NewProjectModal({ client, onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', projectType: 'full-service', budget: '', description: '', paymentSchedule: 'standard', projectDate: '' });
  const [showBackdate, setShowBackdate] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [bd, setBd] = useState({
    product:      { enabled: true,  amount: '' },
    shipping:     { enabled: false, amount: '' },
    installation: { enabled: false, amount: '' },
    extras: [],
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const bdTotal = showBreakdown
    ? BD_ITEMS_CONFIG.filter(i => bd[i.key].enabled).reduce((s, i) => s + (Number(bd[i.key].amount) || 0), 0)
      + bd.extras.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    : null;

  const toggleBd  = key => setBd(p => ({ ...p, [key]: { ...p[key], enabled: !p[key].enabled } }));
  const setBdAmt  = (key, v) => setBd(p => ({ ...p, [key]: { ...p[key], amount: v } }));
  const addExtra  = () => setBd(p => ({ ...p, extras: [...p.extras, { id: `ext_${Date.now()}`, label: '', amount: '' }] }));
  const rmExtra   = id => setBd(p => ({ ...p, extras: p.extras.filter(e => e.id !== id) }));
  const setExtra  = (id, f, v) => setBd(p => ({ ...p, extras: p.extras.map(e => e.id === id ? { ...e, [f]: v } : e) }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = { ...form, clientId: client.id };
    if (showBreakdown && bdTotal > 0) {
      payload.breakdown = {
        product:      { enabled: bd.product.enabled,      amount: Number(bd.product.amount)      || 0 },
        shipping:     { enabled: bd.shipping.enabled,     amount: Number(bd.shipping.amount)     || 0 },
        installation: { enabled: bd.installation.enabled, amount: Number(bd.installation.amount) || 0 },
        extras: bd.extras.filter(e => e.label.trim()).map(e => ({ id: e.id, label: e.label.trim(), amount: Number(e.amount) || 0 })),
      };
      payload.budget = String(bdTotal);
    }
    await onCreate(payload);
    setSaving(false);
    onClose();
  };

  const lS = { fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 };
  const iS = { width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const fmtTotal = v => `GHS ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 560, padding: 40, position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,.2)', margin: '20px auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        <div style={{ fontSize: 11, fontWeight: 800, color: AC, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>New Project</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 28 }}>{client.name}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Title */}
          <div>
            <label style={lS}>Project Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. East Legon Villa — Curtain Wall" style={iS} />
          </div>

          {/* Project Type */}
          <div>
            <label style={lS}>Project Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(PROJECT_TYPES).map(([key, pt]) => (
                <button key={key} onClick={() => set('projectType', key)} style={{ padding: '14px 16px', borderRadius: 14, border: `2px solid ${form.projectType === key ? pt.color : `var(--border-color)`}`, background: form.projectType === key ? `${pt.color}10` : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .2s' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: form.projectType === key ? pt.color : `var(--accent-secondary)`, marginBottom: 4 }}>{pt.label}</div>
                  <div style={{ fontSize: 11, color: `var(--text-secondary)`, lineHeight: 1.4 }}>{pt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Budget / Breakdown */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ ...lS, marginBottom: 0 }}>Project Value (GHS)</label>
              <button
                type="button"
                onClick={() => setShowBreakdown(p => !p)}
                style={{ fontSize: 11, fontWeight: 800, color: showBreakdown ? AC : `var(--text-secondary)`, background: showBreakdown ? '#FFF7ED' : `var(--bg-secondary)`, border: `1.5px solid ${showBreakdown ? 'var(--accent-secondary)50' : `var(--border-color)`}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' }}
              >
                {showBreakdown ? '− Simple total' : '+ Add cost breakdown'}
              </button>
            </div>

            {!showBreakdown ? (
              <input value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="e.g. 75000" type="number" style={iS} />
            ) : (
              <div style={{ background: '#FAFAF9', borderRadius: 16, border: '1.5px solid var(--border-color)', padding: '14px 14px 10px' }}>

                {/* Core cost rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
                  {BD_ITEMS_CONFIG.map(({ key, label, color, icon }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: bd[key].enabled ? '#fff' : '#F5F3F0', border: `1.5px solid ${bd[key].enabled ? `var(--border-color)` : `var(--border-color)`}`, opacity: bd[key].enabled ? 1 : 0.55, transition: 'all .2s' }}>
                      <button onClick={() => toggleBd(key)} style={{ width: 32, height: 18, borderRadius: 9, background: bd[key].enabled ? color : '#E0DAD4', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                        <div style={{ position: 'absolute', top: 1, left: bd[key].enabled ? 15 : 1, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
                      </button>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: `var(--accent-secondary)` }}>{label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 9, padding: '5px 9px', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700 }}>GHS</span>
                        <input type="number" min="0" value={bd[key].amount} onChange={e => setBdAmt(key, e.target.value)} disabled={!bd[key].enabled} placeholder="0" style={{ width: 80, border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, background: 'transparent', fontFamily: 'inherit', textAlign: 'right' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Extras */}
                {bd.extras.map(extra => (
                  <div key={extra.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: `var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={11} color="var(--text-secondary)" /></div>
                    <input value={extra.label} onChange={e => setExtra(extra.id, 'label', e.target.value)} placeholder="Extra item description" style={{ flex: 1, padding: '8px 11px', borderRadius: 9, border: '1.5px solid var(--border-color)', fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 9, padding: '5px 9px', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700 }}>GHS</span>
                      <input type="number" min="0" value={extra.amount} onChange={e => setExtra(extra.id, 'amount', e.target.value)} placeholder="0" style={{ width: 70, border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, background: 'transparent', fontFamily: 'inherit', textAlign: 'right' }} />
                    </div>
                    <button onClick={() => rmExtra(extra.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={12} color="var(--text-secondary)" /></button>
                  </div>
                ))}

                <button onClick={addExtra} style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={12} /> Add extra line
                </button>

                {bdTotal > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1.5px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.04em' }}>Total Project Value</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: `var(--accent-secondary)` }}>{fmtTotal(bdTotal)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Schedule */}
          <div>
            <label style={lS}>Payment Schedule</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {Object.entries(SCHEDULE_CONFIGS).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => set('paymentSchedule', key)} style={{ padding: '12px 10px', borderRadius: 12, border: `2px solid ${form.paymentSchedule === key ? `var(--accent-secondary)` : `var(--border-color)`}`, background: form.paymentSchedule === key ? `var(--accent-secondary)` : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: form.paymentSchedule === key ? `var(--accent-secondary)` : `var(--accent-secondary)`, marginBottom: 3 }}>{cfg.label}</div>
                  <div style={{ fontSize: 10, color: form.paymentSchedule === key ? 'rgba(255,255,255,.6)' : `var(--text-secondary)`, lineHeight: 1.4 }}>{cfg.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={lS}>Brief / Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the scope, site location, and any special requirements..." rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
          </div>

          {/* Backdate */}
          <div>
            <button
              type="button"
              onClick={() => setShowBackdate(p => !p)}
              style={{ fontSize: 11, fontWeight: 800, color: showBackdate ? '#DC2626' : `var(--text-secondary)`, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Calendar size={12} />
              {showBackdate ? 'Remove backdate' : 'Backdate this project'}
            </button>
            {showBackdate && (
              <div style={{ marginTop: 10, padding: '14px 16px', background: '#FEF2F2', borderRadius: 12, border: '1.5px solid #FCA5A530' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Project Start Date</div>
                <input
                  type="date"
                  value={form.projectDate}
                  onChange={e => set('projectDate', e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #FECACA', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
                />
                <div style={{ fontSize: 11, color: '#DC2626', marginTop: 6, lineHeight: 1.5 }}>
                  Sets the project creation date. Use for historical projects only.
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={saving || !form.title.trim()}
          style={{ marginTop: 28, width: '100%', height: 52, borderRadius: 14, background: form.title.trim() ? `var(--accent-secondary)` : `var(--border-color)`, color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: form.title.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s' }}
        >
          {saving ? <><Loader2 size={16} className="spin" /> Creating...</> : 'Create Project'}
        </button>
      </div>
    </div>
  );
}

// ─── Stage Advance Modal ──────────────────────────────────────────────────────
function AdvanceModal({ project, stage, nextStage, onClose, onAdvance }) {
  const [note, setNote] = useState('');
  const [overrideDate, setOverrideDate] = useState('');
  const [approvalOverride, setApprovalOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const needsApproval = stage?.needsClientApproval || stage?.whoActs === 'client';

  const submit = async () => {
    setSaving(true);
    const fullNote = [
      note,
      approvalOverride ? 'Client approval confirmed verbally / informally — proceeding by admin override.' : '',
    ].filter(Boolean).join(' ');
    await onAdvance(project.id, nextStage.id, fullNote, { overrideDate: overrideDate || null });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480, padding: 36, position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,.2)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Advance Stage</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 4 }}>{project.title}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: `var(--bg-secondary)`, borderRadius: 14, margin: '20px 0', border: `1px solid ${nextStage.color}30` }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${nextStage.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {STAGE_ICONS[nextStage.id]}
          </div>
          <div>
            <div style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700 }}>Moving to</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: nextStage.color }}>{nextStage.name}</div>
            <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 2 }}>{nextStage.adminPrompt}</div>
          </div>
        </div>

        {/* Client approval override (shown when current stage requires client action) */}
        {needsApproval && (
          <div style={{ marginBottom: 18, padding: '14px 16px', background: '#FFFBEB', borderRadius: 12, border: '1.5px solid #FDE68A' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#92400E', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              ⚠ This stage normally requires client approval
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={approvalOverride}
                onChange={e => setApprovalOverride(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>
                Client has already approved (verbally or informally). Proceed by admin override and log this in the project record.
              </span>
            </label>
          </div>
        )}

        {/* Internal note */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Internal Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add context for your team about this stage transition..." rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
        </div>

        {/* Backdate this stage transition */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>
            <Calendar size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            Backdate transition (optional)
          </label>
          <input
            type="date"
            value={overrideDate}
            onChange={e => setOverrideDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: overrideDate ? `var(--accent-secondary)` : `var(--text-secondary)` }}
          />
          {overrideDate && (
            <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 5 }}>Stage will be recorded as occurring on {overrideDate}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={submit}
            disabled={saving || (needsApproval && !approvalOverride)}
            style={{ flex: 2, height: 48, borderRadius: 12, background: (needsApproval && !approvalOverride) ? `var(--border-color)` : nextStage.color, color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: (needsApproval && !approvalOverride) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s' }}
          >
            {saving ? <><Loader2 size={15} className="spin" /> Advancing...</> : `Advance → ${nextStage.short}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shipping Details Form ────────────────────────────────────────────────────
function ShippingDetailsCard({ project, updateShippingDetails }) {
  const init = {
    vesselName: project.shippingDetails?.vesselName || '',
    blNumber: project.shippingDetails?.blNumber || '',
    containerNumber: project.shippingDetails?.containerNumber || '',
    eta: project.shippingDetails?.eta || '',
    notes: project.shippingDetails?.notes || '',
  };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Re-sync if project changes
  useEffect(() => {
    setForm({
      vesselName: project.shippingDetails?.vesselName || '',
      blNumber: project.shippingDetails?.blNumber || '',
      containerNumber: project.shippingDetails?.containerNumber || '',
      eta: project.shippingDetails?.eta || '',
      notes: project.shippingDetails?.notes || '',
    });
    setSaved(false);
  }, [project.id]);

  const setF = (k, v) => { setForm(p => ({ ...p, [k]: v })); setSaved(false); };

  const handleSave = async () => {
    if (!updateShippingDetails) return;
    setSaving(true);
    await updateShippingDetails(project.id, form);
    setSaving(false);
    setSaved(true);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    border: '1.5px solid var(--border-color)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 800,
    color: `var(--text-secondary)`,
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    display: 'block',
    marginBottom: 6,
  };

  return (
    <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 20, border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Anchor size={15} color="var(--text-secondary)" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Shipping Details</div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            height: 34, padding: '0 16px', borderRadius: 10,
            background: saved ? '#F0FDF4' : `var(--accent-secondary)`,
            color: saved ? '#16A34A' : '#fff',
            border: saved ? '1.5px solid #16A34A40' : 'none',
            fontSize: 12, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
          }}
        >
          {saving ? <><Loader2 size={13} className="spin" /> Saving...</> : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Vessel Name</label>
          <input
            value={form.vesselName}
            onChange={e => setF('vesselName', e.target.value)}
            placeholder="e.g. MSC Eleonora"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Bill of Lading Number</label>
          <input
            value={form.blNumber}
            onChange={e => setF('blNumber', e.target.value)}
            placeholder="e.g. MSCUAA123456"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Container Number</label>
          <input
            value={form.containerNumber}
            onChange={e => setF('containerNumber', e.target.value)}
            placeholder="e.g. MSCU1234567"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>ETA</label>
          <input
            type="date"
            value={form.eta}
            onChange={e => setF('eta', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={labelStyle}>Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={e => setF('notes', e.target.value)}
          placeholder="Port of discharge, customs notes, special instructions..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>
    </div>
  );
}

// ─── Project Economics ────────────────────────────────────────────────────────
function ProjectEconomics({ project, user }) {
  const costs = project.costs || {};
  const [form, setForm] = useState({
    product:      { enabled: costs.product?.enabled      ?? true,  amount: costs.product?.amount      || '' },
    shipping:     { enabled: costs.shipping?.enabled     ?? false, amount: costs.shipping?.amount     || '' },
    installation: { enabled: costs.installation?.enabled ?? false, amount: costs.installation?.amount || '' },
    extras: costs.extras || [],
  });
  const [surcharges, setSurcharges] = useState(project.surcharges || []);
  const [newSC, setNewSC] = useState({ label: '', amount: '', reason: '', date: new Date().toISOString().slice(0, 10) });
  const [showAddSC, setShowAddSC] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [savingSC, setSavingSC] = useState(false);

  useEffect(() => {
    const c = project.costs || {};
    setForm({
      product:      { enabled: c.product?.enabled      ?? true,  amount: c.product?.amount      || '' },
      shipping:     { enabled: c.shipping?.enabled     ?? false, amount: c.shipping?.amount     || '' },
      installation: { enabled: c.installation?.enabled ?? false, amount: c.installation?.amount || '' },
      extras: c.extras || [],
    });
    setSurcharges(project.surcharges || []);
    setSaved(false);
  }, [project.id]);

  const toggle   = key => { setForm(f => ({ ...f, [key]: { ...f[key], enabled: !f[key].enabled } })); setSaved(false); };
  const setAmt   = (key, v) => { setForm(f => ({ ...f, [key]: { ...f[key], amount: v } })); setSaved(false); };
  const addExtra = () => { setForm(f => ({ ...f, extras: [...f.extras, { id: `ext_${Date.now()}`, label: '', amount: '' }] })); setSaved(false); };
  const rmExtra  = id => { setForm(f => ({ ...f, extras: f.extras.filter(e => e.id !== id) })); setSaved(false); };
  const setEx    = (id, field, v) => { setForm(f => ({ ...f, extras: f.extras.map(e => e.id === id ? { ...e, [field]: v } : e) })); setSaved(false); };

  const totalCOGS = BD_ITEMS_CONFIG.filter(i => form[i.key].enabled).reduce((s, i) => s + (Number(form[i.key].amount) || 0), 0)
    + form.extras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalSurcharges = surcharges.reduce((s, sc) => s + (Number(sc.amount) || 0), 0);
  const salePrice   = Number(project.budget) || 0;
  const grossProfit = salePrice - totalCOGS;
  const margin      = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;

  const handleSave = async () => {
    if (!db || !project?.id || saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        costs: {
          product:      { enabled: form.product.enabled,      amount: Number(form.product.amount)      || 0 },
          shipping:     { enabled: form.shipping.enabled,     amount: Number(form.shipping.amount)     || 0 },
          installation: { enabled: form.installation.enabled, amount: Number(form.installation.amount) || 0 },
          extras: form.extras.filter(e => e.label?.trim()).map(e => ({ id: e.id, label: e.label.trim(), amount: Number(e.amount) || 0 })),
        },
      });
      setSaved(true);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[ProjectEconomics save]', e);
    }
    setSaving(false);
  };

  const handleAddSurcharge = async () => {
    if (!newSC.label.trim() || !newSC.amount || !newSC.reason.trim()) return;
    setSavingSC(true);
    try {
      const entry = {
        id: `sc_${Date.now()}`,
        label: newSC.label.trim(),
        amount: Number(newSC.amount) || 0,
        reason: newSC.reason.trim(),
        date: newSC.date,
        addedBy: user?.name || user?.displayName || 'Admin',
        addedAt: new Date().toISOString(),
      };
      const updated = [...surcharges, entry];
      const newBudget = salePrice + entry.amount;
      await updateDoc(doc(db, 'projects', project.id), { surcharges: updated, budget: String(newBudget) });
      setSurcharges(updated);
      setNewSC({ label: '', amount: '', reason: '', date: new Date().toISOString().slice(0, 10) });
      setShowAddSC(false);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Surcharge save]', e);
    }
    setSavingSC(false);
  };

  const removeSurcharge = async (id) => {
    const sc = surcharges.find(s => s.id === id);
    const updated = surcharges.filter(s => s.id !== id);
    const newBudget = Math.max(0, salePrice - (sc?.amount || 0));
    try {
      await updateDoc(doc(db, 'projects', project.id), { surcharges: updated, budget: String(newBudget) });
      setSurcharges(updated);
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Surcharge remove]', e);
    }
  };

  const fmt = v => `GHS ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Internal Cost Breakdown (COGS) ── */}
      <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Internal Cost Breakdown</div>
              <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>Your costs vs sale price — not visible to client</div>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} style={{ height: 34, padding: '0 16px', borderRadius: 10, background: saved ? '#F0FDF4' : `var(--accent-secondary)`, color: saved ? '#16A34A' : '#fff', border: saved ? '1.5px solid #16A34A40' : 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
            {saving ? <><Loader2 size={13} className="spin" /> Saving...</> : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>

        {/* Core cost rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {BD_ITEMS_CONFIG.map(({ key, label, icon, color }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: form[key].enabled ? '#FAFAF9' : `var(--bg-secondary)`, border: `1.5px solid ${form[key].enabled ? `var(--border-color)` : `var(--border-color)`}`, opacity: form[key].enabled ? 1 : 0.55, transition: 'all .2s' }}>
              <button onClick={() => toggle(key)} style={{ width: 36, height: 20, borderRadius: 10, background: form[key].enabled ? color : `var(--border-color)`, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                <div style={{ position: 'absolute', top: 2, left: form[key].enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
              </button>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
              <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: `var(--accent-secondary)` }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 10, padding: '6px 10px' }}>
                <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700, flexShrink: 0 }}>GHS</span>
                <input type="number" min="0" value={form[key].amount} onChange={e => setAmt(key, e.target.value)} disabled={!form[key].enabled} placeholder="0.00" style={{ width: 90, border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, background: 'transparent', fontFamily: 'inherit', textAlign: 'right' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Extras */}
        {form.extras.map(extra => (
          <div key={extra.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={12} color="var(--text-secondary)" /></div>
            <input value={extra.label} onChange={e => setEx(extra.id, 'label', e.target.value)} placeholder="Extra cost description" style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: '1.5px solid var(--border-color)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 9, padding: '5px 9px', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700 }}>GHS</span>
              <input type="number" min="0" value={extra.amount} onChange={e => setEx(extra.id, 'amount', e.target.value)} placeholder="0" style={{ width: 80, border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, background: 'transparent', fontFamily: 'inherit', textAlign: 'right' }} />
            </div>
            <button onClick={() => rmExtra(extra.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={12} color="var(--text-secondary)" /></button>
          </div>
        ))}
        <button onClick={addExtra} style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={12} /> Add extra cost
        </button>

        {/* Summary strip */}
        <div style={{ background: `var(--accent-secondary)`, borderRadius: 14, padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Total COGS',   value: fmt(totalCOGS),   color: '#fff' },
            { label: 'Sale Price',   value: fmt(salePrice),   color: AC },
            { label: 'Gross Profit', value: fmt(grossProfit), color: grossProfit >= 0 ? '#4ADE80' : '#F87171' },
            { label: 'Margin',       value: `${margin.toFixed(1)}%`, color: margin >= 20 ? '#4ADE80' : margin >= 10 ? '#FBBF24' : '#F87171' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Price Adjustments / Surcharges ── */}
      <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (surcharges.length > 0 || showAddSC) ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={15} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Price Adjustments</div>
              <div style={{ fontSize: 11, color: `var(--text-secondary)` }}>Documented surcharges — visible to client with full reason</div>
            </div>
          </div>
          <button onClick={() => setShowAddSC(p => !p)} style={{ height: 32, padding: '0 14px', borderRadius: 9, background: showAddSC ? `var(--bg-secondary)` : `var(--accent-secondary)`, color: showAddSC ? `var(--text-secondary)` : '#fff', border: showAddSC ? '1.5px solid var(--border-color)' : 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
            {showAddSC ? 'Cancel' : <><Plus size={13} /> Add Surcharge</>}
          </button>
        </div>

        {surcharges.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: showAddSC ? 16 : 0 }}>
            {surcharges.map(sc => (
              <div key={sc.id} style={{ padding: '14px 16px', borderRadius: 14, background: '#FEF2F2', border: '1.5px solid #FCA5A520' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{sc.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 900, color: '#DC2626' }}>+{fmt(sc.amount)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: `var(--text-secondary)`, lineHeight: 1.5, marginBottom: 6 }}>{sc.reason}</div>
                    <div style={{ fontSize: 10, color: `var(--text-secondary)`, fontWeight: 600 }}>{sc.date} · Added by {sc.addedBy}</div>
                  </div>
                  <button onClick={() => removeSurcharge(sc.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #FECACA', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={12} color="#DC2626" /></button>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 800, color: `var(--text-secondary)`, textAlign: 'right' }}>
              Total adjustments: <span style={{ color: '#DC2626' }}>+{fmt(totalSurcharges)}</span>
            </div>
          </div>
        )}

        {surcharges.length === 0 && !showAddSC && (
          <div style={{ fontSize: 12, color: `var(--text-secondary)`, padding: '6px 0' }}>No price adjustments on this project.</div>
        )}

        {showAddSC && (
          <div style={{ background: '#FAFAF9', borderRadius: 14, border: '1.5px solid var(--border-color)', padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Adjustment Label *</div>
                  <input value={newSC.label} onChange={e => setNewSC(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Material price increase" style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Amount (GHS) *</div>
                  <input type="number" min="0" value={newSC.amount} onChange={e => setNewSC(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Reason / Explanation * (visible to client)</div>
                <textarea value={newSC.reason} onChange={e => setNewSC(p => ({ ...p, reason: e.target.value }))} placeholder="Explain why this adjustment was necessary — the client will see this..." rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Effective Date</div>
                <input type="date" value={newSC.date} onChange={e => setNewSC(p => ({ ...p, date: e.target.value }))} style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <button onClick={handleAddSurcharge} disabled={savingSC || !newSC.label.trim() || !newSC.amount || !newSC.reason.trim()} style={{ height: 42, borderRadius: 11, background: (newSC.label.trim() && newSC.amount && newSC.reason.trim()) ? '#DC2626' : `var(--border-color)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'background .2s' }}>
                {savingSC ? <><Loader2 size={14} className="spin" /> Saving...</> : 'Add Price Adjustment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Document Vault ───────────────────────────────────────────────────────────
function DocumentVault({ project, addProjectDocument, user }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (!db || !project?.id) { setDocs([]); return; }
    const q = query(
      collection(db, 'projects', project.id, 'documents'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [project?.id]);

  const uploaderName = user?.name || user?.displayName || 'Staff';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !addProjectDocument) return;
    setUploading(true);
    await addProjectDocument(project.id, file, {
      uploadedBy: uploaderName,
      uploadedById: user?.uid || user?.id,
      stageId: project.stageId,
      docType: 'document',
    });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !addProjectDocument) return;
    setUploadingPhoto(true);
    await addProjectDocument(project.id, file, {
      uploadedBy: uploaderName,
      uploadedById: user?.uid || user?.id,
      stageId: project.stageId,
      docType: 'progress_photo',
      name: `Progress photo — Stage ${project.stageId} · ${new Date().toLocaleDateString('en-GB')}`,
    });
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const fileIcon = (fileType) => {
    if (!fileType) return <FileText size={14} color="var(--text-secondary)" />;
    if (fileType.includes('pdf')) return <FileText size={14} color="#DC2626" />;
    if (fileType.includes('image') || fileType.includes('jpg') || fileType.includes('png')) return <FileText size={14} color="var(--accent-secondary)" />;
    return <FileText size={14} color="var(--text-secondary)" />;
  };

  return (
    <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>Documents & Progress Photos</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Progress photo button */}
          <label style={{
            height: 34, padding: '0 14px', borderRadius: 10,
            background: 'var(--accent-secondary)15', color: `var(--accent-secondary)`, border: '1px solid var(--accent-secondary)30',
            fontSize: 12, fontWeight: 800, cursor: uploadingPhoto ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: uploadingPhoto ? 0.6 : 1, transition: 'opacity .2s',
          }}>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
              disabled={uploadingPhoto}
            />
            {uploadingPhoto ? <><Loader2 size={13} className="spin" /> Uploading...</> : <><Camera size={13} /> Progress Photo</>}
          </label>
          {/* Document upload button */}
          <label style={{
            height: 34, padding: '0 14px', borderRadius: 10,
            background: `var(--accent-secondary)`, color: '#fff',
            fontSize: 12, fontWeight: 800, cursor: uploading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: uploading ? 0.6 : 1, transition: 'opacity .2s',
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.png,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading ? <><Loader2 size={13} className="spin" /> Uploading...</> : <><Upload size={13} /> Upload Document</>}
          </label>
        </div>
      </div>

      {docs.length === 0 ? (
        <div style={{ padding: '28px 0', textAlign: 'center', border: '1.5px dashed var(--border-color)', borderRadius: 12 }}>
          <FileText size={28} color="var(--border-color)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 600 }}>No documents yet</div>
          <div style={{ fontSize: 11, color: '#DFD9D1', marginTop: 4, lineHeight: 1.5 }}>Upload quotes, BOLs, and certificates here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map(doc => {
            const isPhoto = doc.docType === 'progress_photo' || (doc.fileType || '').includes('image');
            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: isPhoto ? '#FAF5FF' : `var(--bg-secondary)`, borderRadius: 12, border: `1px solid ${isPhoto ? '#E9D5FF' : `var(--border-color)`}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: isPhoto ? 'var(--accent-secondary)15' : '#fff', border: `1px solid ${isPhoto ? '#E9D5FF' : `var(--border-color)`}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isPhoto ? <Camera size={14} color="var(--accent-secondary)" /> : fileIcon(doc.fileType)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: `var(--accent-secondary)`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                  <div style={{ fontSize: 10, color: `var(--text-secondary)`, marginTop: 2 }}>
                    {doc.uploadedBy && <span style={{ color: isPhoto ? `var(--accent-secondary)` : undefined }}>{doc.uploadedBy} · </span>}
                    {formatDate(doc.createdAt)}{doc.size ? ` · ${formatSize(doc.size)}` : ''}
                  </div>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: 30, height: 30, borderRadius: 8, background: '#fff', border: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      color: `var(--text-secondary)`, textDecoration: 'none', transition: 'background .15s',
                    }}
                    title={isPhoto ? 'View photo' : 'Download'}
                  >
                    <Download size={13} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Project Conversation (Right Panel) ──────────────────────────────────────
function ProjectConversation({ project, user, addProjectMessage }) {
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState('client');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!db || !project?.id) { setMessages([]); return; }
    const q = query(collection(db, 'projects', project.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [project?.id]);

  const visible = messages.filter(m => tab === 'client' ? !m.isInternal : m.isInternal || m.senderRole === 'system');

  const send = async () => {
    if (!text.trim() || sending) return;
    const isInternal = tab === 'internal';
    setSending(true);
    await addProjectMessage(project.id, text.trim(), 'admin', isInternal);
    setText('');
    setSending(false);
  };

  const roleColor = (role) => {
    if (role === 'system') return `var(--text-secondary)`;
    if (role === 'admin') return `var(--accent-secondary)`;
    if (role === 'client') return `var(--accent-primary)`;
    return '#059669';
  };

  const roleName = (role, name) => {
    if (role === 'system') return 'System';
    if (role === 'admin') return name || 'Westline Future Team';
    if (role === 'client') return name || 'Client';
    return name || 'Worker';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '0 0 16px 0', flexShrink: 0 }}>
        {[
          { id: 'client', label: 'Client Chat', icon: <MessageSquare size={13} /> },
          { id: 'internal', label: 'Internal Notes', icon: <StickyNote size={13} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, height: 36, borderRadius: 10, border: `1.5px solid ${tab === t.id ? `var(--accent-secondary)` : `var(--border-color)`}`, background: tab === t.id ? `var(--accent-secondary)` : '#fff', color: tab === t.id ? '#fff' : `var(--text-secondary)`, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .2s' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4, marginBottom: 16 }}>
        {visible.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
            <MessageSquare size={36} color="var(--border-color)" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 13, color: `var(--text-secondary)`, fontWeight: 600 }}>{tab === 'client' ? 'No client messages yet' : 'No internal notes yet'}</div>
            <div style={{ fontSize: 11, color: '#DFD9D1', marginTop: 4 }}>{tab === 'client' ? 'Start the conversation below.' : 'Add notes for your team.'}</div>
          </div>
        )}
        {visible.map(m => {
          const isAdmin = m.senderRole === 'admin';
          const isSystem = m.senderRole === 'system';
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
              {!isSystem && (
                <div style={{ fontSize: 10, fontWeight: 700, color: roleColor(m.senderRole), marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {roleName(m.senderRole, m.senderName)}
                </div>
              )}
              <div style={{
                maxWidth: '88%', padding: isSystem ? '10px 16px' : '12px 16px',
                borderRadius: isAdmin ? '18px 18px 4px 18px' : isSystem ? 12 : '18px 18px 18px 4px',
                background: isAdmin ? `var(--accent-secondary)` : isSystem ? `var(--bg-secondary)` : '#fff',
                color: isAdmin ? '#fff' : isSystem ? `var(--text-secondary)` : `var(--accent-secondary)`,
                fontSize: isSystem ? 11 : 13,
                border: isSystem ? '1px dashed var(--border-color)' : isAdmin ? 'none' : '1px solid var(--border-color)',
                fontStyle: isSystem ? 'italic' : 'normal',
                lineHeight: 1.5,
              }}>
                {m.text}
              </div>
              <div style={{ fontSize: 10, color: '#DFD9D1', marginTop: 4 }}>
                {m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={tab === 'client' ? 'Message client...' : 'Internal note (team only)...'}
          rows={2}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5, background: tab === 'internal' ? '#FEFDF5' : '#fff' }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{ width: 44, height: 44, borderRadius: 12, background: text.trim() ? `var(--accent-secondary)` : `var(--border-color)`, color: '#fff', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', flexShrink: 0, transition: 'background .2s' }}
        >
          {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

// ─── Main ClientHub ───────────────────────────────────────────────────────────
export default function ClientHub({ clientId, dbClients = [], onBack, ...props }) {
  const brand = props.brand || {};
  const ac = brand.color || AC;

  const client = dbClients.find(c => c.id === clientId) || dbClients.find(c => c.phone === clientId);
  const teamMembers = props.teamMembers || [];

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [settingDate, setSettingDate] = useState(false);
  const [estDate, setEstDate] = useState('');

  useEffect(() => {
    if (!db || !client) { setLoadingProjects(false); return; }
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mine = all.filter(p =>
        p.clientId === client.id || p.clientId === client.phone ||
        (p.clientIds || []).includes(client.id) || (p.clientIds || []).includes(client.phone)
      );
      setProjects(mine);
      if (mine.length > 0 && !selectedId) setSelectedId(mine[0].id);
      setLoadingProjects(false);
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  const selected = projects.find(p => p.id === selectedId);

  useEffect(() => {
    if (selected?.estimatedCompletion) {
      const d = selected.estimatedCompletion?.toDate
        ? selected.estimatedCompletion.toDate()
        : new Date(selected.estimatedCompletion);
      if (!isNaN(d)) setEstDate(d.toISOString().slice(0, 10));
    } else {
      setEstDate('');
    }
  }, [selected?.id, selected?.estimatedCompletion]);

  const saveEstDate = async () => {
    if (!db || !selected || !estDate) return;
    setSettingDate(true);
    await updateDoc(doc(db, 'projects', selected.id), { estimatedCompletion: new Date(estDate).toISOString() });
    setSettingDate(false);
  };

  const applicableStages = selected
    ? CLIENT_PROJECT_STAGES.filter(s => {
        const typeStages = PROJECT_TYPES[selected.projectType]?.stages || CLIENT_PROJECT_STAGES.map(s => s.id);
        return typeStages.includes(s.id);
      })
    : [];

  const currentStageObj = applicableStages.find(s => s.id === selected?.stageId);
  const currentIdx = applicableStages.findIndex(s => s.id === selected?.stageId);
  const nextStage = applicableStages[currentIdx + 1];

  const fmt = v => `GH\u20B5 ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const TABS = [
    { id: 'overview',   label: 'Overview',   icon: <Briefcase size={14} /> },
    { id: 'timeline',   label: 'Timeline',   icon: <Calendar size={14} /> },
    { id: 'financials', label: 'Financials', icon: <DollarSign size={14} /> },
    { id: 'documents',  label: 'Documents',  icon: <FileText size={14} /> },
    { id: 'team',       label: 'Team',       icon: <Users size={14} /> },
    { id: 'chat',       label: 'Chat',       icon: <MessageSquare size={14} /> },
  ];

  if (!client) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <AlertCircle size={40} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
      <div style={{ fontSize: 18, fontWeight: 800, color: `var(--accent-secondary)` }}>Client not found</div>
      <button onClick={onBack} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 12, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Go Back</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 16px 0', flexShrink: 0, borderBottom: '1px solid var(--border-color)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: `var(--bg-secondary)`, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: `var(--accent-secondary)`, flexShrink: 0 }}>
            {(client.name || 'C').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, lineHeight: 1.2 }}>{client.name}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 2 }}>
              {client.phone && <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 600 }}>{client.phone}</span>}
              <PSBadge s={client.status || 'Active'} />
              <span style={{ fontSize: 11, color: `var(--text-secondary)` }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700 }}>{projects.filter(p => p.status !== 'Completed').length} active</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowNewModal(true)} style={{ height: 40, padding: '0 20px', borderRadius: 12, background: `var(--accent-secondary)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={15} /> New Project
        </button>
      </div>

      {/* 2-PANEL BODY */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          <div style={{ padding: '16px 18px', background: `var(--accent-secondary)`, borderRadius: 16, color: '#fff', marginBottom: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: ac, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Client Summary</div>
            {[
              { label: 'Total Projects', value: projects.length },
              { label: 'Active', value: projects.filter(p => p.status !== 'Completed').length },
              { label: 'Completed', value: projects.filter(p => p.status === 'Completed').length },
              { label: 'Since', value: client.joined ? new Date(client.joined).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 11 }}>
                <span style={{ opacity: 0.55 }}>{row.label}</span>
                <span style={{ fontWeight: 800 }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.1em', paddingLeft: 2, paddingBottom: 4 }}>Projects</div>

          {loadingProjects ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: `var(--bg-secondary)`, animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : projects.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', border: '1.5px dashed var(--border-color)', borderRadius: 14 }}>
              <Briefcase size={24} color="var(--border-color)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: `var(--text-secondary)`, fontWeight: 600 }}>No projects yet</div>
              <button onClick={() => setShowNewModal(true)} style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: ac, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Create first project</button>
            </div>
          ) : projects.map(p => {
            const stg = CLIENT_PROJECT_STAGES.find(s => s.id === p.stageId);
            const isActive = p.id === selectedId;
            return (
              <button key={p.id} onClick={() => { setSelectedId(p.id); setActiveTab('overview'); }}
                style={{ width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: 13, border: `2px solid ${isActive ? ac : 'transparent'}`, background: isActive ? `${ac}10` : `var(--bg-secondary)`, cursor: 'pointer', transition: 'all .2s' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 3, lineHeight: 1.3 }}>{p.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: stg?.color || `var(--text-secondary)`, background: `${stg?.color || `var(--text-secondary)`}18`, padding: '2px 7px', borderRadius: 20 }}>{stg?.short || 'Stage 1'}</span>
                  <span style={{ fontSize: 9, color: `var(--text-secondary)` }}>{p.status === 'Completed' ? '✓ Done' : 'Active'}</span>
                </div>
                <div style={{ height: 3, background: `var(--border-color)`, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${stg?.pct || 5}%`, background: stg?.color || ac, borderRadius: 2 }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT — Tabbed Main */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
              <Briefcase size={48} color="var(--border-color)" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 18, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 8 }}>Select a project</div>
              <div style={{ fontSize: 13, color: `var(--text-secondary)` }}>Choose a project from the sidebar or create a new one.</div>
            </div>
          ) : (
            <>
              {/* Project Title Bar */}
              <div style={{ padding: '14px 20px', background: `var(--bg-secondary)`, borderRadius: 16, border: '1px solid var(--border-color)', marginBottom: 14, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                      {PROJECT_TYPES[selected.projectType]?.label || 'Full Service'} &middot; ID {selected.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)`, lineHeight: 1.2 }}>{selected.title}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, whiteSpace: 'nowrap' }}>Est. Completion</label>
                      <input type="date" value={estDate} onChange={e => setEstDate(e.target.value)} onBlur={saveEstDate}
                        style={{ padding: '5px 10px', borderRadius: 9, border: '1.5px solid var(--border-color)', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: `var(--accent-secondary)`, background: '#fff', cursor: 'pointer' }} />
                      {settingDate && <Loader2 size={12} color="var(--text-secondary)" style={{ animation: 'spin 1s linear infinite' }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: currentStageObj?.color || ac, background: `${currentStageObj?.color || ac}15`, padding: '5px 12px', borderRadius: 20 }}>
                        {currentStageObj?.pct || 5}% complete
                      </div>
                      {nextStage && (
                        <button onClick={() => setShowAdvanceModal(true)}
                          style={{ height: 34, padding: '0 14px', borderRadius: 10, background: currentStageObj?.color || ac, color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          Advance <ChevronRight size={13} />
                        </button>
                      )}
                      {!nextStage && <div style={{ fontSize: 11, fontWeight: 800, color: '#16A34A', background: '#F0FDF4', padding: '5px 12px', borderRadius: 20 }}>✓ All Done</div>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', alignItems: 'center' }}>
                  {selected.budget && (
                    <div>
                      <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Budget</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: `var(--accent-secondary)` }}>{fmt(selected.budget)}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Current Stage</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: currentStageObj?.color || ac }}>{currentStageObj?.name || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Created</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>
                      {selected.createdAt?.seconds ? new Date(selected.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: `var(--text-secondary)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Duration</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>~{applicableStages.reduce((s, st) => s + (st.days || 0), 0)} days</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, height: 5, background: `var(--border-color)`, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${currentStageObj?.pct || 5}%`, background: currentStageObj?.color || ac, borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
              </div>

              {/* Tab Bar */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexShrink: 0, background: `var(--bg-secondary)`, padding: 4, borderRadius: 13, border: '1px solid var(--border-color)' }}>
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    style={{ flex: 1, height: 34, borderRadius: 10, background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? `var(--accent-secondary)` : `var(--text-secondary)`, border: activeTab === tab.id ? '1px solid var(--border-color)' : '1px solid transparent', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .18s', boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,.07)' : 'none' }}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {currentStageObj && selected.status !== 'Completed' && (
                      <div style={{ padding: '18px 22px', background: '#fff', borderRadius: 16, border: `2px solid ${currentStageObj.color}30` }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${currentStageObj.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: currentStageObj.color, fontSize: 22 }}>
                            {STAGE_ICONS[currentStageObj.id]}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: currentStageObj.color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                              Active Stage {currentStageObj.id} of {applicableStages.length} &middot; ~{currentStageObj.days} days for this stage
                            </div>
                            <div style={{ fontSize: 17, fontWeight: 900, color: `var(--accent-secondary)`, marginBottom: 6 }}>{currentStageObj.name}</div>
                            <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.5 }}>{currentStageObj.adminPrompt}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                              {currentStageObj.whoActs === 'client' && <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E', background: '#FFFBEB', padding: '4px 12px', borderRadius: 20, border: '1px solid #FDE68A' }}>⏳ Waiting on client</span>}
                              {currentStageObj.whoActs === 'worker' && <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#F0FDF4', padding: '4px 12px', borderRadius: 20, border: '1px solid #A7F3D0' }}>🔧 Field team task</span>}
                              {currentStageObj.whoActs === 'admin' && <span style={{ fontSize: 11, fontWeight: 700, color: `var(--accent-secondary)`, background: `var(--bg-secondary)`, padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border-color)' }}>👤 Admin action needed</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selected.stageId === 4 && <ShippingDetailsCard project={selected} updateShippingDetails={props.updateShippingDetails} />}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Project Type', value: PROJECT_TYPES[selected.projectType]?.label || 'Full Service', icon: '📋' },
                        { label: 'Quote Status', value: selected.quoteApproved ? '✅ Approved' : '⏳ Pending', icon: '💳' },
                        { label: 'Team Assigned', value: `${(selected.assignedWorkers || []).length} member${(selected.assignedWorkers || []).length !== 1 ? 's' : ''}`, icon: '👥' },
                      ].map(item => (
                        <div key={item.label} style={{ padding: '14px 16px', background: '#fff', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: `var(--accent-secondary)` }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {selected.description && (
                      <div style={{ padding: '16px 20px', background: '#fff', borderRadius: 14, border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Description</div>
                        <div style={{ fontSize: 13, color: `var(--text-secondary)`, lineHeight: 1.6 }}>{selected.description}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TIMELINE */}
                {activeTab === 'timeline' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
                    <div style={{ padding: '14px 20px', background: `var(--bg-secondary)`, borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Total Project Duration</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: `var(--accent-secondary)` }}>~{applicableStages.reduce((s, st) => s + (st.days || 0), 0)} days</div>
                      </div>
                      {estDate && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Est. Completion</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: ac }}>{new Date(estDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'relative', paddingLeft: 44 }}>
                      <div style={{ position: 'absolute', left: 16, top: 8, bottom: 8, width: 2, background: `var(--border-color)`, zIndex: 0 }} />
                      {applicableStages.map((s, idx) => {
                        const isCurrent = s.id === selected.stageId;
                        const isPast = (selected.stageId || 1) > s.id;
                        const stageHistEntry = (selected.stageHistory || []).find(h => h.stageId === s.id);
                        return (
                          <div key={s.id} style={{ position: 'relative', display: 'flex', gap: 16, marginBottom: idx < applicableStages.length - 1 ? 24 : 0, zIndex: 1 }}>
                            <div style={{ position: 'absolute', left: -44, top: 0, width: 34, height: 34, borderRadius: '50%', background: isPast ? s.color : isCurrent ? '#fff' : `var(--bg-secondary)`, border: isPast ? `2px solid ${s.color}` : isCurrent ? `2.5px solid ${s.color}` : '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: isCurrent ? `0 0 0 4px ${s.color}20` : 'none', color: isPast ? '#fff' : s.color, transition: 'all .3s' }}>
                              {isPast ? <CheckCircle2 size={14} /> : STAGE_ICONS[s.id]}
                            </div>
                            <div style={{ flex: 1, padding: '12px 16px', borderRadius: 13, background: isCurrent ? `${s.color}06` : isPast ? `var(--bg-secondary)` : '#fff', border: isCurrent ? `1.5px solid ${s.color}30` : '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 14, fontWeight: isCurrent ? 900 : isPast ? 700 : 500, color: isPast ? `var(--accent-secondary)` : isCurrent ? `var(--accent-secondary)` : `var(--text-secondary)` }}>{s.name}</span>
                                  {s.days && <span style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? s.color : '#C4B9AE', background: isCurrent ? `${s.color}12` : `var(--bg-secondary)`, padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border-color)' }}>~{s.days} days</span>}
                                  {isCurrent && <span style={{ fontSize: 9, fontWeight: 800, color: s.color, background: `${s.color}15`, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>Active</span>}
                                  {isPast && <span style={{ fontSize: 9, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 20 }}>Done</span>}
                                </div>
                                {stageHistEntry?.timestamp && (
                                  <span style={{ fontSize: 10, color: `var(--text-secondary)`, fontWeight: 600 }}>
                                    {(() => { const d = stageHistEntry.timestamp?.toDate ? stageHistEntry.timestamp.toDate() : new Date(stageHistEntry.timestamp); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); })()}
                                    {isCurrent && (() => { const d = stageHistEntry.timestamp?.toDate ? stageHistEntry.timestamp.toDate() : new Date(stageHistEntry.timestamp); const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)); return <span style={{ fontWeight: 700, marginLeft: 6 }}>&middot; {days}d so far</span>; })()}
                                  </span>
                                )}
                              </div>
                              {isCurrent && <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginTop: 6, lineHeight: 1.5 }}>{s.adminPrompt}</div>}
                              {s.id === 2 && (isPast || isCurrent) && (
                                 <div style={{ marginTop: 8 }}>
                                   {selected.quoteApproved
                                     ? <span style={{ fontSize: 10, fontWeight: 800, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '3px 10px', borderRadius: 20, display: 'inline-block' }}>✓ Client approved quote</span>
                                     : isCurrent ? <span style={{ fontSize: 10, fontWeight: 800, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '3px 10px', borderRadius: 20, display: 'inline-block' }}>⏳ Awaiting client approval</span>
                                     : null}
                                 </div>
                               )}
                               {s.id === 4 && (isPast || isCurrent) && (
                                 <div style={{ marginTop: 12, padding: '12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                   <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>Shipping & Logistics Details</div>
                                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                     <input type="text" placeholder="Vessel Name" defaultValue={selected.shippingDetails?.vesselName || ''} onBlur={e => {
                                       if(e.target.value !== (selected.shippingDetails?.vesselName || '')) props.updateProject(selected.id, { shippingDetails: { ...(selected.shippingDetails || {}), vesselName: e.target.value } });
                                     }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12 }} />
                                     <input type="text" placeholder="BL Number" defaultValue={selected.shippingDetails?.blNumber || ''} onBlur={e => {
                                       if(e.target.value !== (selected.shippingDetails?.blNumber || '')) props.updateProject(selected.id, { shippingDetails: { ...(selected.shippingDetails || {}), blNumber: e.target.value } });
                                     }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12 }} />
                                     <input type="text" placeholder="Container Number" defaultValue={selected.shippingDetails?.containerNumber || ''} onBlur={e => {
                                       if(e.target.value !== (selected.shippingDetails?.containerNumber || '')) props.updateProject(selected.id, { shippingDetails: { ...(selected.shippingDetails || {}), containerNumber: e.target.value } });
                                     }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12 }} />
                                     <input type="date" placeholder="ETA" defaultValue={selected.shippingDetails?.eta || ''} onBlur={e => {
                                       if(e.target.value !== (selected.shippingDetails?.eta || '')) props.updateProject(selected.id, { shippingDetails: { ...(selected.shippingDetails || {}), eta: e.target.value } });
                                     }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 12 }} />
                                   </div>
                                 </div>
                               )}
                              {isPast && stageHistEntry?.note && stageHistEntry.note !== 'Stage advanced' && stageHistEntry.note !== 'Project created' && (
                                <div style={{ fontSize: 11, color: `var(--text-secondary)`, marginTop: 4, fontStyle: 'italic' }}>{stageHistEntry.note}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* FINANCIALS */}
                {activeTab === 'financials' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <PaymentScheduleCard project={selected} createInvoice={props.createInvoice} notify={props.notify} />
                    <ProjectEconomics project={selected} user={props.user} />
                  </div>
                )}

                {/* DOCUMENTS */}
                {activeTab === 'documents' && (
                  <DocumentVault project={selected} addProjectDocument={props.addProjectDocument} user={props.user} />
                )}

                {/* TEAM */}
                {activeTab === 'team' && (
                  <div style={{ paddingBottom: 24 }}>
                    <div style={{ padding: '20px 22px', background: '#fff', borderRadius: 16, border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: `var(--accent-secondary)`, marginBottom: 4 }}>Assign Team Members</div>
                      <div style={{ fontSize: 12, color: `var(--text-secondary)`, marginBottom: 18, lineHeight: 1.5 }}>Click a member to toggle their assignment. Assigned staff can see this project in their portal.</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {teamMembers.map(m => {
                          const assigned = (selected.assignedWorkers || []).includes(m.id?.toString() || m.email);
                          return (
                            <button key={m.id} onClick={() => props.assignWorkerToProject && props.assignWorkerToProject(selected.id, m.id?.toString() || m.email)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 13, border: `2px solid ${assigned ? `var(--accent-secondary)` : `var(--border-color)`}`, background: assigned ? `var(--accent-secondary)` : `var(--bg-secondary)`, color: assigned ? '#fff' : `var(--text-secondary)`, cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all .2s' }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: assigned ? 'rgba(255,255,255,0.2)' : `var(--border-color)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                                {(m.name || m.email || '?').slice(0, 1).toUpperCase()}
                              </div>
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name || m.email || 'Staff'}</div>
                                <div style={{ fontSize: 10, opacity: 0.7 }}>{m.jobRole || m.role || 'Team Member'}</div>
                              </div>
                              {assigned && <UserCheck size={14} style={{ marginLeft: 'auto' }} />}
                            </button>
                          );
                        })}
                        {teamMembers.length === 0 && <div style={{ fontSize: 12, color: `var(--text-secondary)` }}>No team members configured. Add staff from the Staff section.</div>}
                      </div>
                    </div>
                  </div>
                )}

                {/* CHAT */}
                {activeTab === 'chat' && (
                  <div style={{ height: 'calc(100vh - 340px)', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 16, border: '1px solid var(--border-color)', padding: '16px 20px' }}>
                    <ProjectConversation project={selected} user={props.user} addProjectMessage={props.addProjectMessage} />
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewProjectModal client={client} teamMembers={teamMembers} onClose={() => setShowNewModal(false)} onCreate={props.createClientProject} />
      )}
      {showAdvanceModal && selected && nextStage && (
        <AdvanceModal project={selected} stage={currentStageObj} nextStage={nextStage} onClose={() => setShowAdvanceModal(false)} onAdvance={props.updateProjectStage} />
      )}
    </div>
  );
}
