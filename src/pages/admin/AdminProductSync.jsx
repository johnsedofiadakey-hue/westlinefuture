import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, CheckCircle2, Database, ExternalLink, Globe2,
  Loader2, PackageSearch, PauseCircle, PlayCircle, Plus, Save, Trash2
} from 'lucide-react';
import { db } from '../../lib/firebase';
import {
  addDoc, collection, deleteDoc, doc, getDoc, limit, onSnapshot,
  orderBy, query, serverTimestamp, setDoc
} from 'firebase/firestore';

const DEFAULT_SETTINGS = {
  profitMarginMultiplier: 1.35,
  forexConversionRate: 2.1,
  defaultCurrency: 'GHS',
  publishMode: 'draft',
  allowedDomains: ['meijiavip.com', 'www.meijiavip.com'],
  workerUrl: '',
};

const FURNITURE_CATEGORIES = [
  'Sofas',
  'Coffee Tables',
  'TV Cabinets',
  'Beds',
  'Mattresses',
  'Wardrobes',
  'Dining Tables',
  'Dining Chairs',
  'Sideboards',
  'Study Desks',
  'Bookshelves',
  'Lounge Chairs',
  'Decorative Cabinets',
];

function getDomain(value) {
  try {
    const normalized = value.startsWith('http') ? value : `https://${value}`;
    return new URL(normalized).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeDomains(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="lxf" style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{hint}</span>}
    </label>
  );
}

export default function AdminProductSync({ brand, notify, user }) {
  const ac = brand?.color || 'var(--accent-primary)';
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [sources, setSources] = useState([]);
  const [runs, setRuns] = useState([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmRemoveSource, setConfirmRemoveSource] = useState(null);
  const [newSource, setNewSource] = useState({
    name: 'Meijia VIP Furniture',
    url: 'https://www.meijiavip.com/',
    supplierDomain: 'meijiavip.com',
    category: 'Furniture',
    subcategory: 'Sofas',
    status: 'active',
    publishMode: 'draft',
  });

  useEffect(() => {
    if (!db) return;
    const unsubSources = onSnapshot(collection(db, 'product_sync_sources'), (snap) => {
      setSources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubRuns = onSnapshot(query(collection(db, 'sync_runs'), orderBy('startedAt', 'desc'), limit(8)), (snap) => {
      setRuns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    getDoc(doc(db, 'system_settings', 'product_sync')).then(snap => {
      if (snap.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
    }).catch(err => notify?.('error', `Could not load sync settings: ${err.message}`));
    return () => {
      unsubSources();
      unsubRuns();
    };
  }, [notify]);

  const sourceSummary = useMemo(() => {
    const active = sources.filter(s => s.status === 'active').length;
    return { active, paused: sources.length - active, total: sources.length };
  }, [sources]);

  const saveSettings = async () => {
    if (!db) return notify?.('error', 'Database offline.');
    if (Number(settings.profitMarginMultiplier) <= 1) return notify?.('error', 'Profit multiplier must be greater than 1.');
    if (Number(settings.forexConversionRate) <= 0) return notify?.('error', 'Forex conversion rate must be greater than 0.');
    setSaving(true);
    try {
      await setDoc(doc(db, 'system_settings', 'product_sync'), {
        ...settings,
        profitMarginMultiplier: Number(settings.profitMarginMultiplier),
        forexConversionRate: Number(settings.forexConversionRate),
        allowedDomains: normalizeDomains(settings.allowedDomains),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || user?.id || 'admin',
      }, { merge: true });
      notify?.('success', 'Product sync settings saved.');
    } catch (err) {
      notify?.('error', `Settings save failed: ${err.message}`);
    }
    setSaving(false);
  };

  const addSource = async () => {
    if (!db) return notify?.('error', 'Database offline.');
    const domain = getDomain(newSource.url);
    if (!domain) return notify?.('error', 'Enter a valid source URL.');
    const allowed = ['meijiavip.com', ...normalizeDomains(settings.allowedDomains)].map(d => d.replace(/^www\./, ''));
    if (!allowed.includes(domain)) return notify?.('error', `Domain ${domain} is not in allowed domains.`);

    try {
      await addDoc(collection(db, 'product_sync_sources'), {
        ...newSource,
        supplierDomain: domain,
        type: 'furniture',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid || user?.id || 'admin',
      });
      notify?.('success', 'Source link added.');
      setNewSource(prev => ({ ...prev, url: '', name: '', supplierDomain: '' }));
    } catch (err) {
      notify?.('error', `Source save failed: ${err.message}`);
    }
  };

  const updateSourceStatus = async (source, status) => {
    try {
      await setDoc(doc(db, 'product_sync_sources', source.id), { status, updatedAt: serverTimestamp() }, { merge: true });
      notify?.('success', `Source ${status === 'active' ? 'activated' : 'paused'}.`);
    } catch (err) {
      notify?.('error', `Could not update source: ${err.message}`);
    }
  };

  const removeSource = (source) => setConfirmRemoveSource(source);

  const confirmRemoveSourceAction = async () => {
    const source = confirmRemoveSource;
    setConfirmRemoveSource(null);
    try {
      await deleteDoc(doc(db, 'product_sync_sources', source.id));
      notify?.('success', 'Source removed.');
    } catch (err) {
      notify?.('error', `Could not remove source: ${err.message}`);
    }
  };

  const runSyncNow = async () => {
    if (!settings.workerUrl) return notify?.('error', 'Add the Cloud Run worker URL before running sync.');
    setRunning(true);
    try {
      const resp = await fetch(settings.workerUrl.replace(/\/$/, '') + '/run-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'admin', requestedBy: user?.uid || user?.id || 'admin' }),
      });
      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(payload.error || `Worker returned ${resp.status}`);
      notify?.('success', 'Product sync started.');
    } catch (err) {
      notify?.('error', `Sync run failed: ${err.message}`);
    }
    setRunning(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div className="lxf eyebrow" style={{ color: ac, fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Product Automation</div>
          <h2 className="lxfh" style={{ fontSize: 30, color: 'var(--accent-secondary)', margin: '8px 0 6px' }}>Product Sync Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 760, lineHeight: 1.7 }}>
            Add supplier links, assign Westline categories, translate Chinese furniture data, and price products with a global forex and margin rule.
          </p>
        </div>
        <button onClick={runSyncNow} disabled={running} className="p-btn-gold lxf" style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14 }}>
          {running ? <Loader2 size={16} className="spin" /> : <PlayCircle size={16} />} Run Sync Now
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { label: 'Active Sources', value: sourceSummary.active, icon: <Globe2 size={18} />, color: '#16A34A' },
          { label: 'Paused Sources', value: sourceSummary.paused, icon: <PauseCircle size={18} />, color: '#D97706' },
          { label: 'Margin Multiplier', value: `${settings.profitMarginMultiplier}x`, icon: <Activity size={18} />, color: ac },
          { label: 'CNY FX Rate', value: settings.forexConversionRate, icon: <Database size={18} />, color: 'var(--accent-secondary)' },
        ].map(card => (
          <div key={card.label} style={{ padding: 20, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 18 }}>
            <div style={{ color: card.color, marginBottom: 14 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-secondary)' }}>{card.value}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className="p-card" style={{ padding: 24, borderRadius: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <Database size={20} color={ac} />
          <h3 className="lxfh" style={{ fontSize: 20, color: 'var(--accent-secondary)' }}>Global Pricing Rules</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          <Field label="Global Profit Margin Multiplier" hint="Example: 1.35 adds a 35% markup after CNY conversion.">
            <input className="p-inp" type="number" step="0.01" value={settings.profitMarginMultiplier} onChange={e => setSettings(s => ({ ...s, profitMarginMultiplier: e.target.value }))} />
          </Field>
          <Field label="Forex Conversion Rate" hint="CNY to local storefront currency.">
            <input className="p-inp" type="number" step="0.01" value={settings.forexConversionRate} onChange={e => setSettings(s => ({ ...s, forexConversionRate: e.target.value }))} />
          </Field>
          <Field label="Default Currency">
            <select className="p-inp" value={settings.defaultCurrency} onChange={e => setSettings(s => ({ ...s, defaultCurrency: e.target.value }))}>
              <option value="GHS">GHS</option>
              <option value="USD">USD</option>
              <option value="CNY">CNY</option>
            </select>
          </Field>
          <Field label="Default Publish Mode">
            <select className="p-inp" value={settings.publishMode} onChange={e => setSettings(s => ({ ...s, publishMode: e.target.value }))}>
              <option value="draft">Draft Review</option>
              <option value="publish">Auto Publish</option>
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginTop: 18 }}>
          <Field label="Allowed Domains" hint="Comma-separated domains allowed for source links.">
            <input className="p-inp" value={normalizeDomains(settings.allowedDomains).join(', ')} onChange={e => setSettings(s => ({ ...s, allowedDomains: e.target.value }))} />
          </Field>
          <Field label="Cloud Run Worker URL" hint="Example: https://westline-product-sync-xxxxx.run.app">
            <input className="p-inp" value={settings.workerUrl || ''} onChange={e => setSettings(s => ({ ...s, workerUrl: e.target.value }))} placeholder="Cloud Run URL" />
          </Field>
        </div>
        <button onClick={saveSettings} disabled={saving} className="p-btn-gold lxf" style={{ marginTop: 22, padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
          {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save Settings
        </button>
      </div>

      <div className="p-card" style={{ padding: 24, borderRadius: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <PackageSearch size={20} color={ac} />
          <h3 className="lxfh" style={{ fontSize: 20, color: 'var(--accent-secondary)' }}>Source Links</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, alignItems: 'end' }}>
          <Field label="Source Name"><input className="p-inp" value={newSource.name} onChange={e => setNewSource(s => ({ ...s, name: e.target.value }))} /></Field>
          <Field label="Source URL"><input className="p-inp" value={newSource.url} onChange={e => setNewSource(s => ({ ...s, url: e.target.value, supplierDomain: getDomain(e.target.value) }))} /></Field>
          <Field label="Category"><input className="p-inp" value={newSource.category} onChange={e => setNewSource(s => ({ ...s, category: e.target.value }))} /></Field>
          <Field label="Subcategory">
            <select className="p-inp" value={newSource.subcategory} onChange={e => setNewSource(s => ({ ...s, subcategory: e.target.value }))}>
              {FURNITURE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="p-inp" value={newSource.status} onChange={e => setNewSource(s => ({ ...s, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </Field>
          <Field label="Publish Mode">
            <select className="p-inp" value={newSource.publishMode} onChange={e => setNewSource(s => ({ ...s, publishMode: e.target.value }))}>
              <option value="draft">Draft Review</option>
              <option value="publish">Auto Publish</option>
            </select>
          </Field>
          <button onClick={addSource} className="p-btn-light lxf" style={{ height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={16} /> Add Source
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 0.6fr)', gap: 20 }}>
        <div className="p-card" style={{ padding: 24, borderRadius: 24 }}>
          <h3 className="lxfh" style={{ fontSize: 20, color: 'var(--accent-secondary)', marginBottom: 18 }}>Configured Sources</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sources.length === 0 && (
              <div style={{ padding: 24, background: 'var(--bg-secondary)', borderRadius: 16, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={18} /> No source links yet. Add Meijia VIP or another supplier link above.
              </div>
            )}
            {sources.map(source => (
              <div key={source.id} style={{ padding: 16, border: '1px solid var(--border-color)', borderRadius: 16, background: '#fff', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--accent-secondary)' }}>{source.name || source.supplierDomain}</strong>
                    <span style={{ fontSize: 10, fontWeight: 900, padding: '4px 8px', borderRadius: 999, background: source.status === 'active' ? '#DCFCE7' : '#FEF3C7', color: source.status === 'active' ? '#166534' : '#92400E' }}>
                      {source.status || 'active'}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 900, padding: '4px 8px', borderRadius: 999, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {source.category} / {source.subcategory}
                    </span>
                  </div>
                  <a href={source.url} target="_blank" rel="noreferrer" style={{ marginTop: 8, color: ac, fontSize: 12, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    {source.url} <ExternalLink size={12} />
                  </a>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateSourceStatus(source, source.status === 'active' ? 'paused' : 'active')} className="p-btn-light" style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center' }}>
                    {source.status === 'active' ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                  </button>
                  <button onClick={() => removeSource(source)} className="p-btn-light" style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#DC2626' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-card" style={{ padding: 24, borderRadius: 24 }}>
          <h3 className="lxfh" style={{ fontSize: 20, color: 'var(--accent-secondary)', marginBottom: 18 }}>Recent Sync Runs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {runs.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No sync runs yet.</div>}
            {runs.map(run => (
              <div key={run.id} style={{ padding: 14, borderRadius: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {run.status === 'completed' ? <CheckCircle2 size={15} color="#16A34A" /> : <AlertCircle size={15} color="#D97706" />}
                  <strong style={{ fontSize: 12, color: 'var(--accent-secondary)' }}>{run.status || 'unknown'}</strong>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  Found {run.discovered || 0}, created {run.inserted || 0}, updated {run.updated || 0}, failed {run.failed || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {confirmRemoveSource && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Remove Source?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>"{confirmRemoveSource.name}" will be removed from the sync list. Products already scraped are not deleted.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmRemoveSource(null)} style={{ flex: 1, height: 44, borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmRemoveSourceAction} style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
