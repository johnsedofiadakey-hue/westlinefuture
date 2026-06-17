import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Calendar, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';
import { PROJECT_TYPES } from '../../../data';
import { AC, SCHEDULE_CONFIGS, BD_ITEMS_CONFIG } from './config.jsx';

// ─── New Project Modal ────────────────────────────────────────────────────────
export function NewProjectModal({ client, teamMembers = [], onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    projectType: 'full-service',
    budget: '',
    renderingFee: '',
    description: '',
    paymentSchedule: 'standard',
    projectDate: '',
    estimatedStartDate: '',
    targetCompletionDate: '',
    assignedStaff: '',
    assignedWorker: '',
    kickoffMode: 'rendering-first',
    latitude: '',
    longitude: '',
    cat: '',
  });
  const [showBackdate, setShowBackdate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  // Custom payment milestone builder
  const [customMilestones, setCustomMilestones] = useState([
    { id: `cm_${Date.now()}`, label: '', pct: '' },
  ]);
  const addCustomMilestone = () => setCustomMilestones(p => [...p, { id: `cm_${Date.now()}`, label: '', pct: '' }]);
  const removeCustomMilestone = id => setCustomMilestones(p => p.filter(m => m.id !== id));
  const setCustomMilestoneField = (id, field, value) =>
    setCustomMilestones(p => p.map(m => m.id === id ? { ...m, [field]: value } : m));
  const customPctTotal = customMilestones.reduce((s, m) => s + (parseFloat(m.pct) || 0), 0);
  const customPctOk = Math.abs(customPctTotal - 100) < 0.01;
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
    // Include custom milestones when schedule is custom
    if (form.paymentSchedule === 'custom') {
      payload.customMilestones = customMilestones
        .filter(m => m.label.trim() && parseFloat(m.pct) > 0)
        .map((m, idx) => ({
          key: `custom-${idx + 1}`,
          label: m.label.trim(),
          pct: parseFloat(m.pct) / 100,
          cumPct: 0, // will be computed in App.jsx
        }));
    }
    await onCreate(payload);
    setSaving(false);
    onClose();
  };

  const lS = { fontSize: 11, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 };
  const iS = { width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const fmtTotal = v => `GHS ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  // All staff are selectable — no one is silently excluded by role mismatch.
  // Field/tech roles go into the installer dropdown; office/management go into the PM dropdown.
  // Anyone not captured by either filter still appears in both (fallback to all members).
  const FIELD_PATTERN = /worker|installer|field|tech|fabricat|welder|glazier|driver|logistic/i;
  const OFFICE_PATTERN = /manager|coordinator|admin|designer|architect|account|finance|sales|supervisor/i;
  const workerOptions = (teamMembers || []).filter(m => m.role === 'worker' || FIELD_PATTERN.test(m.jobRole || ''));
  const staffOptions  = (teamMembers || []).filter(m => m.role !== 'worker' && (OFFICE_PATTERN.test(m.jobRole || '') || ['admin', 'staff', 'project-manager'].includes(m.role)));
  // Catch-all: anyone not in either bucket shows in both
  const uncategorised = (teamMembers || []).filter(m => !workerOptions.includes(m) && !staffOptions.includes(m));
  const workerList = [...workerOptions, ...uncategorised];
  const staffList  = [...staffOptions,  ...uncategorised];

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 860, maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,.25)', overflow: 'hidden' }}>

        {/* ── Fixed header ── */}
        <div style={{ padding: '24px 32px 20px', borderBottom: '1.5px solid var(--border-color)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: AC, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 3 }}>New Project</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: `var(--accent-secondary)` }}>{client.name}</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={16} /></button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 256px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Title */}
          <div>
            <label style={lS}>Project Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. East Legon Villa — Curtain Wall" style={iS} />
          </div>

          {/* Work Category */}
          <div>
            <label style={lS}>Work Category *</label>
            <select value={form.cat} onChange={e => set('cat', e.target.value)} style={iS}>
              <option value="">— Select Category —</option>
              <option value="glass">Glass & Glazing</option>
              <option value="shower">Shower & Washroom</option>
              <option value="partition">Glass Partition & Balustrade</option>
              <option value="pergola">Pergola & Canopy</option>
              <option value="cladding">ACP Cladding & Facade</option>
              <option value="kitchen">Kitchen & Interiors</option>
              <option value="general">General / Other</option>
            </select>
          </div>

          <div>
            <label style={lS}>Launch Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { id: 'rendering-first', title: 'Standard Client Journey', desc: 'Rendering fee, scheduled site visit, measurements, 3D review, quotation negotiation, contract, payment, and deliverables approval.' },
                { id: 'direct-kickoff', title: 'No Rendering', desc: 'For simple supply-only work. Skip rendering and site-survey gates, then begin at quotation negotiation.' },
              ].map(mode => (
                <button key={mode.id} type="button" onClick={() => set('kickoffMode', mode.id)} style={{ padding: 14, borderRadius: 14, border: `2px solid ${form.kickoffMode === mode.id ? AC : `var(--border-color)`}`, background: form.kickoffMode === mode.id ? 'var(--bg-secondary)' : '#fff', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: form.kickoffMode === mode.id ? AC : `var(--accent-secondary)`, marginBottom: 4 }}>{mode.title}</div>
                  <div style={{ fontSize: 11, color: `var(--text-secondary)`, lineHeight: 1.45 }}>{mode.desc}</div>
                </button>
              ))}
            </div>
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

          <div style={{ display: 'grid', gridTemplateColumns: form.kickoffMode === 'rendering-first' ? '1fr 1fr' : '1fr', gap: 12 }}>
            {form.kickoffMode === 'rendering-first' && (
              <div>
                <label style={lS}>Separate Rendering / CAD Fee (GHS)</label>
                <input value={form.renderingFee} onChange={e => set('renderingFee', e.target.value)} placeholder="e.g. 1500" type="number" style={iS} />
              </div>
            )}
            <div>
              <label style={lS}>Target Completion</label>
              <input value={form.targetCompletionDate} onChange={e => set('targetCompletionDate', e.target.value)} type="date" style={iS} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lS}>Project Manager</label>
              <select value={form.assignedStaff} onChange={e => set('assignedStaff', e.target.value)} style={iS}>
                <option value="">Assign later</option>
                {staffList.map(m => <option key={m.uid || m.id} value={m.uid || m.id}>{m.name || m.email || m.id}{m.jobRole ? ` — ${m.jobRole}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={lS}>Lead Installer / Worker</label>
              <select value={form.assignedWorker} onChange={e => set('assignedWorker', e.target.value)} style={iS}>
                <option value="">Assign later</option>
                {workerList.map(m => <option key={m.uid || m.id} value={m.uid || m.id}>{m.name || m.email || m.id}{m.jobRole ? ` — ${m.jobRole}` : ''}</option>)}
              </select>
            </div>
          </div>

          {/* Payment Schedule */}
          <div>
            <label style={lS}>Payment Schedule</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {Object.entries(SCHEDULE_CONFIGS).map(([key, cfg]) => {
                const isActive = form.paymentSchedule === key;
                return (
                  <button key={key} type="button" onClick={() => set('paymentSchedule', key)} style={{ padding: '12px 10px', borderRadius: 12, border: `2px solid ${isActive ? AC : `var(--border-color)`}`, background: isActive ? `${AC}15` : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: isActive ? AC : `var(--accent-secondary)`, marginBottom: 3 }}>{cfg.label}</div>
                    <div style={{ fontSize: 10, color: `var(--text-secondary)`, lineHeight: 1.4 }}>{cfg.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom milestone builder — expands when Custom is selected */}
            {form.paymentSchedule === 'custom' && (
              <div style={{ marginTop: 12, padding: '14px 16px', background: '#FAFAF9', borderRadius: 14, border: '1.5px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: `var(--accent-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    Define Payment Milestones
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: customPctOk ? '#16A34A' : customPctTotal > 0 ? '#DC2626' : `var(--text-secondary)` }}>
                    {customPctTotal.toFixed(0)}% / 100%
                  </div>
                </div>

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 32px', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em' }}>Milestone Label</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: `var(--text-secondary)`, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center' }}>% of Total</div>
                  <div />
                </div>

                {customMilestones.map((m, idx) => (
                  <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 32px', gap: 8, marginBottom: 7, alignItems: 'center' }}>
                    <input
                      value={m.label}
                      onChange={e => setCustomMilestoneField(m.id, 'label', e.target.value)}
                      placeholder={`e.g. ${idx === 0 ? 'Deposit' : idx === 1 ? 'Mid-production' : 'Final delivery'}`}
                      style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 10, padding: '9px 10px', gap: 3 }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={m.pct}
                        onChange={e => setCustomMilestoneField(m.id, 'pct', e.target.value)}
                        placeholder="0"
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: `var(--accent-secondary)`, background: 'transparent', fontFamily: 'inherit', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: 11, color: `var(--text-secondary)`, fontWeight: 700 }}>%</span>
                    </div>
                    <button
                      onClick={() => removeCustomMilestone(m.id)}
                      disabled={customMilestones.length === 1}
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid var(--border-color)', background: `var(--bg-secondary)`, cursor: customMilestones.length === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: customMilestones.length === 1 ? 0.3 : 1 }}
                    >
                      <X size={12} color="var(--text-secondary)" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCustomMilestone}
                  style={{ fontSize: 11, fontWeight: 800, color: AC, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}
                >
                  <Plus size={12} /> Add milestone
                </button>

                {customPctTotal > 0 && !customPctOk && (
                  <div style={{ marginTop: 10, fontSize: 11, color: '#DC2626', fontWeight: 700, background: '#FEF2F2', borderRadius: 8, padding: '7px 11px' }}>
                    ⚠ Percentages must add up to exactly 100%. Currently at {customPctTotal.toFixed(1)}%.
                  </div>
                )}
                {customPctOk && (
                  <div style={{ marginTop: 10, fontSize: 11, color: '#16A34A', fontWeight: 700, background: '#F0FDF4', borderRadius: 8, padding: '7px 11px' }}>
                    ✓ Payment schedule totals 100% — {customMilestones.filter(m => m.label.trim()).length} milestone{customMilestones.filter(m => m.label.trim()).length !== 1 ? 's' : ''} will be invoiced automatically.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={lS}>Brief / Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the scope, site location, and any special requirements..." rows={3} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6 }} />
          </div>

          {/* Advanced Options (GPS + Backdate) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ChevronDown size={13} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              {showAdvanced ? 'Hide' : 'Show'} advanced options
            </button>
            {showAdvanced && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lS}>Site Latitude (GPS)</label>
                    <input value={form.latitude} onChange={e => set('latitude', e.target.value)} placeholder="e.g. 5.6037" style={iS} />
                  </div>
                  <div>
                    <label style={lS}>Site Longitude (GPS)</label>
                    <input value={form.longitude} onChange={e => set('longitude', e.target.value)} placeholder="e.g. -0.1870" style={iS} />
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setShowBackdate(p => !p)}
                    style={{ fontSize: 11, fontWeight: 800, color: showBackdate ? '#DC2626' : 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Calendar size={12} />
                    {showBackdate ? 'Remove backdate' : 'Backdate this project'}
                  </button>
                  {showBackdate && (
                    <div style={{ marginTop: 10, padding: '14px 16px', background: '#FEF2F2', borderRadius: 12, border: '1.5px solid #FCA5A530' }}>
                      <label style={{ fontSize: 10, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8 }}>Project Start Date</label>
                      <input type="date" value={form.projectDate} onChange={e => set('projectDate', e.target.value)} max={new Date().toISOString().slice(0, 10)} style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #FECACA', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }} />
                      <div style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>Use for historical projects only.</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky checklist sidebar ── */}
        <div style={{ position: 'sticky', top: 0 }}>
          <div style={{ padding: 18, borderRadius: 18, background: '#F8F8FD', border: '1.5px solid var(--border-color)' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: `var(--accent-secondary)`, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Launch Checklist</div>
            {[
              { ok: !!form.title.trim(), label: 'Project title captured' },
              { ok: !!(showBreakdown ? bdTotal : form.budget), label: 'Project value entered' },
              ...(form.kickoffMode === 'rendering-first' ? [{ ok: !!form.renderingFee, label: 'Rendering fee set' }] : []),
              { ok: !!form.assignedStaff, label: 'Project manager assigned' },
              { ok: !!form.targetCompletionDate, label: 'Estimated completion date set' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: item.ok ? '#16A34A' : 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .2s' }}>
                  {item.ok && <CheckCircle2 size={12} color="#fff" />}
                </div>
                <div style={{ fontSize: 12, color: item.ok ? `var(--accent-secondary)` : `var(--text-secondary)`, fontWeight: item.ok ? 700 : 500, lineHeight: 1.3 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        </div>{/* end 2-col grid */}
        </div>{/* end scrollable body */}

        {/* ── Fixed footer ── */}
        <div style={{ padding: '16px 32px 20px', borderTop: '1.5px solid var(--border-color)', flexShrink: 0, display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ flex: '0 0 120px', height: 48, borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !form.title.trim()}
            style={{ flex: 1, height: 48, borderRadius: 12, background: form.title.trim() ? `var(--accent-secondary)` : `var(--border-color)`, color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: form.title.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s', fontFamily: 'inherit' }}
          >
            {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : 'Create Project'}
          </button>
        </div>

      </div>
    </div>, document.body
  );
}
