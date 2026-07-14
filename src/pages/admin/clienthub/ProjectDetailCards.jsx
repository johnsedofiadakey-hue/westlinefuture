import React, { useState, useEffect, useRef } from 'react';
import { Anchor, Loader2, TrendingUp, Plus, X, FileText, Download, Upload, Camera, Trash2 } from 'lucide-react';
import { db, functions } from '../../../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { AC, BD_ITEMS_CONFIG } from './config.jsx';

// ─── Shipping Details Form ────────────────────────────────────────────────────
export function ShippingDetailsCard({ project, invoices = [], updateShippingDetails, notify }) {
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
  const [confirmingArrival, setConfirmingArrival] = useState(false);
  const projectInvoices = invoices.filter(inv => inv.projectId === project.id || inv.parentId === project.id);
  const goodsBalanceInvoice = projectInvoices.find(inv => {
    const key = String(inv.milestoneKey || '').toLowerCase();
    const descriptor = `${inv.title || ''} ${inv.type || ''}`.toLowerCase();
    return key === 'pre-installation-balance' || descriptor.includes('goods balance') || descriptor.includes('ghana arrival');
  });
  const goodsBalancePaid = project.goodsBalancePaid === true || project.postProductionPaid === true ||
    ['paid', 'paid in full'].includes(String(goodsBalanceInvoice?.status || '').toLowerCase());
  const paymentAwaitingVerification = goodsBalanceInvoice?.awaitingConfirmation === true ||
    String(goodsBalanceInvoice?.status || '').toLowerCase() === 'verification pending';
  const shippingStageReached = Number(project.stageId || 1) >= 5;

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

  const handleConfirmArrival = async () => {
    if (!functions || confirmingArrival) return;
    setConfirmingArrival(true);
    try {
      const confirmArrival = httpsCallable(functions, 'markGoodsArrivedInGhana');
      const response = await confirmArrival({ projectId: project.id, arrivalNote: form.notes });
      notify?.('success', `Goods arrival confirmed. Final goods balance invoice ${response.data?.invoiceId || ''} is now due.`);
    } catch (error) {
      notify?.('error', error?.message || 'Could not confirm goods arrival.');
    } finally {
      setConfirmingArrival(false);
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        padding: '16px 18px',
        borderRadius: 16,
        background: project.goodsArrivedInGhana ? (goodsBalancePaid ? '#F0FDF4' : paymentAwaitingVerification ? '#EFF6FF' : '#FFFBEB') : '#F8FAFC',
        border: `1.5px solid ${project.goodsArrivedInGhana ? (goodsBalancePaid ? '#86EFAC' : paymentAwaitingVerification ? '#93C5FD' : '#FDE68A') : '#CBD5E1'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ fontSize: 20 }}>{project.goodsArrivedInGhana ? (goodsBalancePaid ? '✅' : paymentAwaitingVerification ? '🔎' : '💳') : '🚢'}</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 900,
              color: goodsBalancePaid ? '#15803D' : paymentAwaitingVerification ? '#1D4ED8' : '#B45309',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              marginBottom: 4,
            }}>
              Shipping and Ghana arrival
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 4 }}>
              {goodsBalancePaid
                ? 'Final goods balance verified — installation payment is next'
                : paymentAwaitingVerification
                  ? 'Client payment submitted — admin verification required'
                  : project.goodsArrivedInGhana
                    ? 'Goods are in Ghana — final goods balance is due'
                    : shippingStageReached
                      ? 'Publish tracking details, then confirm arrival in Ghana'
                      : 'Prepare shipping details before dispatch'}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              {goodsBalancePaid
                ? 'The core project balance is cleared. Create and collect the separate installation-service add-on before moving goods to site.'
                : paymentAwaitingVerification
                  ? 'Open Payments, match the transfer or receipt against company records, and confirm it.'
                  : project.goodsArrivedInGhana
                    ? `The ${goodsBalanceInvoice?.title || 'final goods balance'} invoice is outstanding. Installation remains blocked until it is paid.`
                    : 'Shipping details are client-visible during the shipping stage. Confirm Ghana arrival only after the goods physically arrive; that action issues the final goods balance automatically.'}
            </div>
          </div>
          <div style={{
            padding: '5px 10px',
            borderRadius: 20,
            background: '#fff',
            fontSize: 10,
            fontWeight: 900,
            color: goodsBalancePaid ? '#15803D' : '#B45309',
            whiteSpace: 'nowrap',
          }}>
            {project.goodsArrivedInGhana ? (goodsBalancePaid ? 'BALANCE PAID' : 'PAYMENT DUE') : 'TRACKING VISIBLE'}
          </div>
        </div>
      </div>

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
        {shippingStageReached && (
          <button
            onClick={handleConfirmArrival}
            disabled={confirmingArrival || project.goodsArrivedInGhana}
            style={{
              height: 34, padding: '0 14px', borderRadius: 10,
              background: project.goodsArrivedInGhana ? '#F0FDF4' : '#B45309',
              color: project.goodsArrivedInGhana ? '#15803D' : '#fff',
              border: project.goodsArrivedInGhana ? '1px solid #86EFAC' : 'none',
              fontSize: 11, fontWeight: 800, cursor: project.goodsArrivedInGhana ? 'default' : 'pointer',
              marginLeft: 8,
            }}
          >
            {confirmingArrival ? 'Confirming...' : project.goodsArrivedInGhana ? 'Goods Arrival Confirmed' : 'Mark Arrived in Ghana'}
          </button>
        )}
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
    </div>
  );
}

// ─── Project Economics ────────────────────────────────────────────────────────
export function ProjectEconomics({ project, notify: _notify }) {
  const notify = _notify || ((type, msg) => { if (import.meta.env.DEV) console.warn(`[ProjectEconomics] ${type}: ${msg}`); });
  const costs = project.costs || {};
  const [form, setForm] = useState({
    product:      { enabled: costs.product?.enabled      ?? true,  amount: costs.product?.amount      || '' },
    shipping:     { enabled: costs.shipping?.enabled     ?? false, amount: costs.shipping?.amount     || '' },
    installation: { enabled: costs.installation?.enabled ?? false, amount: costs.installation?.amount || '' },
    extras: costs.extras || [],
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    const c = project.costs || {};
    setForm({
      product:      { enabled: c.product?.enabled      ?? true,  amount: c.product?.amount      || '' },
      shipping:     { enabled: c.shipping?.enabled     ?? false, amount: c.shipping?.amount     || '' },
      installation: { enabled: c.installation?.enabled ?? false, amount: c.installation?.amount || '' },
      extras: c.extras || [],
    });
    setSaved(false);
  }, [project.id]);

  const toggle   = key => { setForm(f => ({ ...f, [key]: { ...f[key], enabled: !f[key].enabled } })); setSaved(false); };
  const setAmt   = (key, v) => { setForm(f => ({ ...f, [key]: { ...f[key], amount: v } })); setSaved(false); };
  const addExtra = () => { setForm(f => ({ ...f, extras: [...f.extras, { id: `ext_${Date.now()}`, label: '', amount: '' }] })); setSaved(false); };
  const rmExtra  = id => { setForm(f => ({ ...f, extras: f.extras.filter(e => e.id !== id) })); setSaved(false); };
  const setEx    = (id, field, v) => { setForm(f => ({ ...f, extras: f.extras.map(e => e.id === id ? { ...e, [field]: v } : e) })); setSaved(false); };

  const totalCOGS = BD_ITEMS_CONFIG.filter(i => form[i.key].enabled).reduce((s, i) => s + (Number(form[i.key].amount) || 0), 0)
    + form.extras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
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
      notify('error', e.message || 'Failed to save project economics');
    }
    setSaving(false);
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
        <div style={{ background: `var(--accent-secondary)`, borderRadius: 14, padding: '16px 20px', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
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
    </div>
  );
}

// ─── Document Vault ───────────────────────────────────────────────────────────
export function DocumentVault({ project, addProjectDocument, user }) {
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

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    await deleteDoc(doc(db, 'projects', project.id, 'documents', docId));
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
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: 30, height: 30, borderRadius: 8, background: '#fff', border: '1px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: `var(--text-secondary)`, textDecoration: 'none',
                      }}
                      title={isPhoto ? 'View photo' : 'Download'}
                    >
                      <Download size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    style={{
                      width: 30, height: 30, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      color: '#DC2626',
                    }}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
