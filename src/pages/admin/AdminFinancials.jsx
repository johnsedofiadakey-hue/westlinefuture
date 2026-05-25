import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import {
  DollarSign, Receipt, FileText, Download,
  Plus, Search, Trash2, CheckCircle,
  Printer, Landmark, ShieldCheck, ArrowUpRight,
  TrendingUp, Wallet, ArrowDownRight, History,
  Settings, CreditCard, Eye, Save, X, Layers, Briefcase, Package
} from 'lucide-react';
import { SBadge, FF as PFormField, Modal } from '../../components/Shared';
import EmptyState from '../../components/ui/EmptyState';
import PulseTargetCard from '../../components/PulseTargetCard';
import InvoiceDocument from '../../components/InvoiceDocument';
import { GLASS_CATALOG_DATA } from '../../data.jsx';

// A4 at 96dpi
const A4W = 794;
const A4H = 1123;
// Scale factor so A4 fits inside the 480px preview pane (480 - 48px padding = 432px usable)
const PREVIEW_SCALE = 0.54;

export default function AdminFinancials({ invoices = [], transactions = [], clients = [], dbClients = [], brand, deleteInvoice, deleteProposal, ...props }) {
  const [tab, setTab] = useState('overview');
  const [showAdd, setShowAdd] = useState(null); // 'invoice' | 'quotation' | 'receipt'
  const [viewInvoice, setViewInvoice] = useState(null);
  const ac = brand.color || 'var(--accent-secondary)';
  const notify = props.notify || ((type, msg) => { if (import.meta.env.DEV) console.warn(`[Financials] ${type}: ${msg}`); });

  // ─── Financial Settings ──────────────────────────────────────────────────
  const [finSettings, setFinSettings] = useState(brand.finSettings || {
    baseCurrency:      'GHS',
    secondaryCurrency: 'USD',
    exchangeRate:      15.5,
    taxEnabled:        false,
    taxRate:           0,
    taxName:           'VAT',
    taxInclusive:      false,
    discountEnabled:   true,
    invoicePrefix:     'INV-',
    quotePrefix:       'QUO-',
    receiptPrefix:     'RCP-',
    invoiceTheme:      'classic',
    showStamp:         false,
    autoNumbering:     true,
    bankDetails:       'Bank Name:\nAccount Name:\nAccount Number:\nSort Code / SWIFT:\nBranch:',
    terms:             '1. 50% deposit required before fabrication commences.\n2. Balance due upon delivery or installation.\n3. This document is valid for 14 days from date of issue.\n4. Goods remain property of Westline Future until full payment is received.',
    footerNote:        'Thank you for doing business with Westline Future.',
    signatureName:     'Finance Director',
    signatureTitle:    'Westline Future Global Trading Co, Ltd',
    companyTagline:    'Global Trading Co, Ltd',
    kpiTargets:        { revenue: 500000, pending: 100000, quotes: 20, conversion: 90 },
  });

  // ─── Draft State ─────────────────────────────────────────────────────────
  const blankDraft = (invoiceType = 'unit') => ({
    projectId: '', clientId: '',
    customerType: invoiceType === 'project' ? 'existing' : 'one-time',
    clientName: '', clientEmail: '', clientPhone: '',
    clientCompany: '', clientAddress: '', clientTaxId: '',
    title: '', currency: 'GHS',
    date: new Date().toISOString().split('T')[0],
    due: '',
    invoiceType,
    documentKind: 'invoice',
    items: [{ id: Date.now(), desc: '', qty: 1, rate: 0, unit: 'pcs', discount: 0, total: 0 }],
    bankDetails: finSettings.bankDetails,
    terms: finSettings.terms,
    status: 'Pending',
  });
  const [draft, setDraft] = useState(blankDraft());

  // Derive which doc-type button is active from draft state
  const activeDocType =
    draft.invoiceType === 'receipt'    ? 'receipt'
    : draft.documentKind === 'quotation' ? 'quotation'
    : draft.invoiceType  === 'project'   ? 'project'
    : 'invoice';

  // ─── Doc-type manifest (merged single selector) ───────────────────────────
  const DOC_TYPES = [
    { id: 'invoice',   kind: 'invoice',    invType: 'unit',    label: 'Invoice',       sub: 'Ad-hoc / unit sale',        icon: <Receipt size={16}/>,    status: 'Pending' },
    { id: 'quotation', kind: 'quotation',  invType: 'unit',    label: 'Quotation',     sub: 'Price offer / tender',       icon: <FileText size={16}/>,   status: 'Pending' },
    { id: 'receipt',   kind: 'receipt',    invType: 'receipt', label: 'Sales Receipt', sub: 'Paid counter / direct',      icon: <CheckCircle size={16}/>, status: 'Paid'    },
    { id: 'project',   kind: 'invoice',    invType: 'project', label: 'Project Phase', sub: 'Milestone / project billing',icon: <Briefcase size={16}/>,  status: 'Pending' },
  ];

  const selectDocType = (d) => {
    setDraft(prev => ({
      ...prev,
      documentKind: d.kind,
      invoiceType:  d.invType,
      status:       d.status,
      customerType: d.invType === 'project' ? 'existing' : prev.customerType === 'existing' ? 'one-time' : prev.customerType,
    }));
    setShowAdd(d.kind === 'quotation' ? 'quotation' : d.kind === 'receipt' ? 'receipt' : 'invoice');
  };

  // ─── Calculations ─────────────────────────────────────────────────────────
  const lineTotal = (item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const discount = parseFloat(item.discount) || 0;
    return Math.max(0, qty * rate - discount);
  };
  const calculateTotal = (items) => items.reduce((a, b) => a + lineTotal(b), 0);
  const formatMoney = (val, currency = 'GHS') => {
    const symbol = currency === 'GHS' ? 'GH₵' : '$';
    return `${symbol}${parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };
  const parseAmount = (val) => parseFloat(String(val || '0').replace(/[^0-9.]/g, '')) || 0;

  const stats = {
    revenue:      (invoices || []).filter(i => i.status === 'Paid').reduce((a, b) => a + parseAmount(b.amount), 0),
    pending:      (invoices || []).filter(i => i.status === 'Pending').reduce((a, b) => a + parseAmount(b.amount), 0),
    oneTimeSales: (invoices || []).filter(i => i.oneTimeClient || i.customerType === 'one-time').reduce((a, b) => a + parseAmount(b.amount), 0),
    receipts:     (invoices || []).filter(i => i.type === 'Receipt' || i.documentKind === 'receipt').length,
  };
  const quoteInvoices  = (invoices || []).filter(i => i.documentKind === 'quotation' || i.type === 'Quotation' || i.type === 'quote').map(i => ({ ...i, _sourceCollection: 'invoices' }));
  const quoteProposals = (props.proposals || []).filter(p => !quoteInvoices.some(i => i.invoiceId === p.id || i.id === p.invoiceId)).map(p => ({ ...p, _sourceCollection: 'proposals' }));
  const quoteRows      = [...quoteInvoices, ...quoteProposals].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
  stats.quotes = quoteRows.filter(p => ['pending', 'Pending'].includes(p.status)).length;

  const startDocument = (kind, invoiceType = 'unit') => {
    const d = DOC_TYPES.find(x => x.kind === kind && (kind !== 'invoice' || x.invType === invoiceType)) || DOC_TYPES[0];
    setDraft({ ...blankDraft(d.invType), documentKind: d.kind, invoiceType: d.invType, status: d.status });
    setShowAdd(d.kind === 'quotation' ? 'quotation' : d.kind === 'receipt' ? 'receipt' : 'invoice');
  };

  // ─── Issue Document ────────────────────────────────────────────────────────
  const issueDocument = async () => {
    try {
      if (!draft.clientName.trim()) { notify('error', 'Client name is required'); return; }
      if (draft.invoiceType === 'project' && !draft.projectId) { notify('error', 'Please select a project'); return; }
      if (!draft.items.some(i => i.desc && i.rate > 0)) { notify('error', 'Add at least one line item with a description and rate'); return; }
      const isQuote   = showAdd === 'quotation' || draft.documentKind === 'quotation';
      const isReceipt = showAdd === 'receipt'   || draft.invoiceType === 'receipt' || draft.documentKind === 'receipt';
      const total     = calculateTotal(draft.items);
      const docType   = isQuote ? 'Quotation' : isReceipt ? 'Receipt' : 'Invoice';
      const payload = {
        ...draft,
        clientId:      draft.clientId,
        customerType:  draft.customerType || (draft.clientId ? 'existing' : 'one-time'),
        oneTimeClient: (draft.customerType || '') === 'one-time' || !draft.clientId,
        documentKind:  isQuote ? 'quotation' : isReceipt ? 'receipt' : 'invoice',
        items:         draft.items.map(item => ({ ...item, total: lineTotal(item) })),
        amount:        formatMoney(total, draft.currency),
        total,
        client:        draft.clientName,
        status:        isQuote ? 'pending' : isReceipt ? 'Paid' : 'Pending',
        type:          docType,
        parentId:      draft.projectId || null,
        version:       draft.version || 1,
        previousVersionId: draft.previousVersionId || null,
      };
      notify('pending', `Processing ${docType.toLowerCase()}...`);
      const docId = await props.createInvoice(payload);
      if (isQuote && props.createProposal) {
        Promise.resolve(props.createProposal({ ...payload, invoiceId: docId })).catch(() => {});
      }
      if (docId) {
        const printContent = document.getElementById('invoice-studio-preview');
        if (printContent) {
          const safeTitle = DOMPurify.sanitize(draft.title || docType);
          const safeBody  = DOMPurify.sanitize(printContent.innerHTML, { ADD_ATTR: ['style', 'class', 'target'], ADD_TAGS: ['img', 'style'] });
          const html = `<!DOCTYPE html><html><head><base href="${window.location.origin}/" /><meta charset="UTF-8"><title>${safeTitle}</title><style>@page{size:A4;margin:0}body{margin:0;background:#f0f0f0;font-family:sans-serif}#invoice-studio-preview{width:210mm!important;min-height:297mm!important;border:none!important;margin:40px auto!important;padding:40px!important;box-shadow:0 0 60px rgba(0,0,0,0.12);background:#fff}@media print{body{background:#fff}#invoice-studio-preview{margin:0 auto!important;box-shadow:none!important}button{display:none!important}}</style></head><body><div id="invoice-studio-preview">${safeBody}</div><script>window.onload=()=>{setTimeout(()=>{window.print();},600);};</script></body></html>`;
          const iframe = document.createElement('iframe');
          Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
          document.body.appendChild(iframe);
          iframe.contentWindow.document.open();
          iframe.contentWindow.document.write(html);
          iframe.contentWindow.document.close();
          iframe.onload = () => {
            setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 500);
          };
        }
        setShowAdd(null);
        setDraft(blankDraft());
      }
    } catch (e) {
      console.error(e);
      notify('error', 'Issuance failed');
    }
  };

  // ─── Settings helpers ──────────────────────────────────────────────────────
  const SectionHead = ({ title, sub }) => (
    <div style={{ marginBottom: 4 }}>
      <div className="lxfh" style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const ToggleRow = ({ label, sub, checked, onChange }) => (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: 10, border: '1px solid var(--border-color)', background: checked ? `${ac}08` : 'var(--bg-primary)', cursor: 'pointer', transition: 'all 0.2s' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ width: 42, height: 24, borderRadius: 12, position: 'relative', transition: 'all 0.2s', background: checked ? ac : '#D1D5DB', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
        <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      </div>
    </label>
  );

  // ─── TABS manifest ─────────────────────────────────────────────────────────
  const TABS = [
    { id: 'overview',   label: 'Dashboard',      icon: <Landmark   size={14}/> },
    { id: 'sales',      label: 'Sales Ledger',   icon: <TrendingUp size={14}/> },
    { id: 'quotations', label: 'Quotations',      icon: <FileText   size={14}/> },
    { id: 'margins',    label: 'Margins & P&L',  icon: <ArrowUpRight size={14}/> },
    { id: 'banking',    label: 'Banking & Audit', icon: <ShieldCheck size={14}/> },
    { id: 'settings',   label: 'Settings',        icon: <Settings   size={14}/> },
  ];

  // ─── Settings View ─────────────────────────────────────────────────────────
  const settingsView = (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="p-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHead title="Currency & Exchange" sub="Set default currencies and live exchange rate" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <PFormField label="Base Currency">
              <select className="p-inp" value={finSettings.baseCurrency} onChange={e => setFinSettings({ ...finSettings, baseCurrency: e.target.value })}>
                {['GHS — GH₵','USD — $','EUR — €','CNY — ¥','GBP — £'].map(o => <option key={o} value={o.split(' ')[0]}>{o}</option>)}
              </select>
            </PFormField>
            <PFormField label="Secondary Currency">
              <select className="p-inp" value={finSettings.secondaryCurrency} onChange={e => setFinSettings({ ...finSettings, secondaryCurrency: e.target.value })}>
                {['USD — $','GHS — GH₵','EUR — €','CNY — ¥','GBP — £'].map(o => <option key={o} value={o.split(' ')[0]}>{o}</option>)}
              </select>
            </PFormField>
          </div>
          <PFormField label="Exchange Rate (1 USD = X base currency)">
            <input className="p-inp" type="number" step="0.01" min="0" value={finSettings.exchangeRate} onChange={e => setFinSettings({ ...finSettings, exchangeRate: parseFloat(e.target.value) || 0 })} />
          </PFormField>
        </div>
        <div className="p-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHead title="Tax Configuration" sub="VAT, GST, or any applicable tax on documents" />
          <ToggleRow label="Enable Tax on Documents" sub="Applies tax row to all invoices, quotes and receipts" checked={finSettings.taxEnabled ?? false} onChange={e => setFinSettings({ ...finSettings, taxEnabled: e.target.checked })} />
          {finSettings.taxEnabled && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <PFormField label="Tax Label (e.g. VAT, GST)">
                  <input className="p-inp" value={finSettings.taxName || 'VAT'} onChange={e => setFinSettings({ ...finSettings, taxName: e.target.value })} />
                </PFormField>
                <PFormField label="Tax Rate (%)">
                  <input className="p-inp" type="number" min="0" max="100" step="0.1" value={finSettings.taxRate || 0} onChange={e => setFinSettings({ ...finSettings, taxRate: parseFloat(e.target.value) || 0 })} />
                </PFormField>
              </div>
              <ToggleRow label="Tax Inclusive Pricing" sub="Prices already include tax — extracted from subtotal" checked={finSettings.taxInclusive ?? false} onChange={e => setFinSettings({ ...finSettings, taxInclusive: e.target.checked })} />
            </>
          )}
        </div>
      </div>

      <div className="p-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionHead title="Document Numbering" sub="Prefix codes that appear before document reference numbers" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <PFormField label="Invoice Prefix"><input className="p-inp" value={finSettings.invoicePrefix || 'INV-'} onChange={e => setFinSettings({ ...finSettings, invoicePrefix: e.target.value })} /></PFormField>
          <PFormField label="Quotation Prefix"><input className="p-inp" value={finSettings.quotePrefix || 'QUO-'} onChange={e => setFinSettings({ ...finSettings, quotePrefix: e.target.value })} /></PFormField>
          <PFormField label="Receipt Prefix"><input className="p-inp" value={finSettings.receiptPrefix || 'RCP-'} onChange={e => setFinSettings({ ...finSettings, receiptPrefix: e.target.value })} /></PFormField>
        </div>
        <ToggleRow label="Auto Document Numbering" sub="Automatically increment reference numbers for each new document" checked={finSettings.autoNumbering ?? true} onChange={e => setFinSettings({ ...finSettings, autoNumbering: e.target.checked })} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="p-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionHead title="Bank Details" sub="Appears on every invoice, quote and receipt" />
          <textarea className="p-inp" rows={7} placeholder={'Bank Name:\nAccount Name:\nAccount Number:\nSort Code / SWIFT:\nBranch:'} value={finSettings.bankDetails || ''} onChange={e => setFinSettings({ ...finSettings, bankDetails: e.target.value })} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8 }} />
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Each line appears as a separate row in the Bank Details block.</div>
        </div>
        <div className="p-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionHead title="Terms & Conditions" sub="Standard terms printed at the foot of every document" />
          <textarea className="p-inp" rows={7} placeholder={'1. 50% deposit required before fabrication.\n2. Balance due on delivery.\n3. Valid for 14 days.'} value={finSettings.terms || ''} onChange={e => setFinSettings({ ...finSettings, terms: e.target.value })} style={{ resize: 'vertical', fontSize: 12, lineHeight: 1.8 }} />
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Use numbered lines for clarity. Each line break is preserved.</div>
        </div>
      </div>

      <div className="p-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionHead title="Document Footer & Signature" sub="Text and signatory name shown at the bottom of all documents" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <PFormField label="Footer Note"><input className="p-inp" placeholder="Thank you for your business." value={finSettings.footerNote || ''} onChange={e => setFinSettings({ ...finSettings, footerNote: e.target.value })} /></PFormField>
          <PFormField label="Signatory Name"><input className="p-inp" placeholder="Finance Director" value={finSettings.signatureName || ''} onChange={e => setFinSettings({ ...finSettings, signatureName: e.target.value })} /></PFormField>
          <PFormField label="Signatory Title / Company"><input className="p-inp" placeholder="Westline Future Ltd." value={finSettings.signatureTitle || ''} onChange={e => setFinSettings({ ...finSettings, signatureTitle: e.target.value })} /></PFormField>
        </div>
      </div>

      <div className="p-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionHead title="Dashboard KPI Targets" sub="Benchmarks used for the financial overview pulse cards" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <PFormField label="Revenue Target"><input className="p-inp" type="number" value={finSettings.kpiTargets?.revenue ?? 500000} onChange={e => setFinSettings(s => ({ ...s, kpiTargets: { ...s.kpiTargets, revenue: parseFloat(e.target.value) } }))} /></PFormField>
          <PFormField label="Pending Ceiling"><input className="p-inp" type="number" value={finSettings.kpiTargets?.pending ?? 100000} onChange={e => setFinSettings(s => ({ ...s, kpiTargets: { ...s.kpiTargets, pending: parseFloat(e.target.value) } }))} /></PFormField>
          <PFormField label="Open Tenders Target"><input className="p-inp" type="number" value={finSettings.kpiTargets?.quotes ?? 20} onChange={e => setFinSettings(s => ({ ...s, kpiTargets: { ...s.kpiTargets, quotes: parseFloat(e.target.value) } }))} /></PFormField>
          <PFormField label="Conversion Target (%)"><input className="p-inp" type="number" value={finSettings.kpiTargets?.conversion ?? 90} onChange={e => setFinSettings(s => ({ ...s, kpiTargets: { ...s.kpiTargets, conversion: parseFloat(e.target.value) } }))} /></PFormField>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => { if (props.syncCMS) props.syncCMS('finSettings', finSettings); notify('success', 'Settings saved and synced to all documents'); }} className="p-btn-dark" style={{ padding: '14px 36px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
          <Save size={16} /> Save Settings
        </button>
      </div>
    </div>
  );

  // ─── Margins View ──────────────────────────────────────────────────────────
  const marginsView = (() => {
    const jobs = props.jobs || [];
    const fmt  = v => `GHS ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const rows = jobs.map(j => {
      const c           = j.costs || {};
      const product      = c.product?.enabled      ? (Number(c.product?.amount)      || 0) : 0;
      const shipping     = c.shipping?.enabled     ? (Number(c.shipping?.amount)     || 0) : 0;
      const installation = c.installation?.enabled ? (Number(c.installation?.amount) || 0) : 0;
      const totalCOGS    = product + shipping + installation;
      const salePrice    = Number(j.budget) || 0;
      const grossProfit  = salePrice - totalCOGS;
      const margin       = salePrice > 0 ? (grossProfit / salePrice) * 100 : null;
      return { ...j, product, shipping, installation, totalCOGS, salePrice, grossProfit, margin };
    }).filter(r => r.salePrice > 0 || r.totalCOGS > 0);

    const totalRevenue = rows.reduce((s, r) => s + r.salePrice,   0);
    const totalCOGSAll = rows.reduce((s, r) => s + r.totalCOGS,   0);
    const totalProfit  = rows.reduce((s, r) => s + r.grossProfit,  0);
    const avgMargin    = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const exportCSV = () => {
      if (!rows.length) return;
      const header = 'Project,Client,Sale Price (GHS),Product Cost,Shipping,Installation,Total COGS,Gross Profit,Margin %';
      const body   = rows.map(r => [r.title||r.name, r.clientId||'', r.salePrice, r.product, r.shipping, r.installation, r.totalCOGS, r.grossProfit, r.margin !== null ? r.margin.toFixed(1) : '—'].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([header+'\n'+body], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'margins_export.csv'; a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Total Revenue',  value: fmt(totalRevenue), color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Total COGS',     value: fmt(totalCOGSAll), color: '#DC2626', bg: '#FEF2F2' },
            { label: 'Gross Profit',   value: fmt(totalProfit),  color: totalProfit >= 0 ? '#16A34A' : '#DC2626', bg: 'var(--bg-secondary)' },
            { label: 'Avg Net Margin', value: `${avgMargin.toFixed(1)}%`, color: avgMargin >= 20 ? '#16A34A' : avgMargin >= 10 ? '#D97706' : '#DC2626', bg: 'var(--bg-secondary)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="p-card" style={{ padding: '20px 24px', background: bg }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="p-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>Project P&L Breakdown</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Cost data entered via the Economics panel in each project.</div>
            </div>
            <button onClick={exportCSV} style={{ height: 38, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              <Download size={13} /> Export CSV
            </button>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center' }}>
              <TrendingUp size={40} color="var(--border-color)" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>No cost data yet</div>
              <div style={{ fontSize: 12, color: '#DFD9D1' }}>Open a project in the Operations tab and fill in the Project Economics panel.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {['Project','Sale Price','Product Cost','Shipping','Installation','COGS','Gross Profit','Margin'].map(h => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const mc = r.margin !== null ? (r.margin >= 20 ? '#16A34A' : r.margin >= 10 ? '#D97706' : '#DC2626') : 'var(--text-secondary)';
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)' }}>{r.title || r.name || 'Untitled'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{r.id?.slice(0, 8).toUpperCase()}</div>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 800, color: 'var(--accent-secondary)', whiteSpace: 'nowrap' }}>{fmt(r.salePrice)}</td>
                        <td style={{ padding: '14px 20px', fontSize: 12, color: r.product > 0 ? 'var(--accent-secondary)' : '#DFD9D1', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.product > 0 ? fmt(r.product) : '—'}</td>
                        <td style={{ padding: '14px 20px', fontSize: 12, color: r.shipping > 0 ? 'var(--text-secondary)' : '#DFD9D1', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.shipping > 0 ? fmt(r.shipping) : '—'}</td>
                        <td style={{ padding: '14px 20px', fontSize: 12, color: r.installation > 0 ? '#D97706' : '#DFD9D1', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.installation > 0 ? fmt(r.installation) : '—'}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 800, color: '#DC2626', whiteSpace: 'nowrap' }}>{r.totalCOGS > 0 ? fmt(r.totalCOGS) : '—'}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 900, color: r.grossProfit >= 0 ? '#16A34A' : '#DC2626', whiteSpace: 'nowrap' }}>{r.totalCOGS > 0 ? fmt(r.grossProfit) : '—'}</td>
                        <td style={{ padding: '14px 20px' }}>
                          {r.margin !== null && r.totalCOGS > 0
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, background: `${mc}15`, fontSize: 12, fontWeight: 900, color: mc }}>{r.margin.toFixed(1)}%</span>
                            : <span style={{ color: '#DFD9D1', fontSize: 12 }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  })();

  // ─── Item table columns (responsive, no overflow) ─────────────────────────
  const itemCols = draft.invoiceType === 'unit'
    ? 'minmax(0,1fr) 68px 68px 108px 90px 108px 36px'
    : 'minmax(0,1fr) 68px 108px 90px 108px 36px';

  // ─── Subtotals ─────────────────────────────────────────────────────────────
  const subtotal   = calculateTotal(draft.items);
  const taxRate    = finSettings.taxEnabled ? (finSettings.taxRate || 0) : 0;
  const taxAmount  = finSettings.taxEnabled
    ? (finSettings.taxInclusive ? subtotal - subtotal / (1 + taxRate / 100) : subtotal * taxRate / 100)
    : 0;
  const grandTotal = finSettings.taxEnabled && !finSettings.taxInclusive ? subtotal + taxAmount : subtotal;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="lxf eyebrow" style={{ marginBottom: 4 }}>Treasury Management</div>
          <h2 className="lxfh" style={{ fontSize: 32, fontWeight: 400, margin: 0 }}>Financial Control Engine</h2>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setTab('settings')} className="p-btn-light" style={{ gap: 7, display: 'flex', alignItems: 'center', fontSize: 13 }}><Settings size={15}/> Settings</button>
          <button onClick={() => startDocument('quotation')} className="p-btn-light" style={{ gap: 7, display: 'flex', alignItems: 'center', fontSize: 13 }}><FileText size={15}/> Quote</button>
          <button onClick={() => startDocument('receipt')} className="p-btn-light" style={{ gap: 7, display: 'flex', alignItems: 'center', fontSize: 13 }}><Receipt size={15}/> Receipt</button>
          <button onClick={() => startDocument('invoice')} className="p-btn-gold" style={{ gap: 7, display: 'flex', alignItems: 'center', fontSize: 13 }}><Plus size={15}/> New Invoice</button>
        </div>
      </div>

      {/* ── TAB NAV ── */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', padding: 5, borderRadius: 16, alignSelf: 'flex-start', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '9px 20px', borderRadius: 12, border: 'none',
              background: tab === t.id ? 'var(--accent-secondary)' : 'transparent',
              color: tab === t.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <PulseTargetCard label="VERIFIED CASH"     value={formatMoney(stats.revenue)}      target={finSettings.kpiTargets?.revenue ?? 500000}  icon={<TrendingUp size={20}/>} color="#16A34A"               trend={18} sub="Settled payments" />
            <PulseTargetCard label="UNSETTLED CAPITAL" value={formatMoney(stats.pending)}       target={finSettings.kpiTargets?.pending ?? 100000}  icon={<Wallet size={20}/>}     color={ac}                    trend={-5} sub="Active invoices" />
            <PulseTargetCard label="OPEN TENDERS"      value={stats.quotes}                     target={finSettings.kpiTargets?.quotes ?? 20}       icon={<FileText size={20}/>}   color="var(--accent-secondary)" trend={12} sub={`Value: ${formatMoney(quoteRows.filter(p => ['Pending','pending'].includes(p.status)).reduce((a,b) => a + (parseAmount(b.amount)||0), 0))}`} />
            <PulseTargetCard label="ONE-TIME SALES"    value={formatMoney(stats.oneTimeSales)}  target={finSettings.kpiTargets?.conversion ?? 90}   icon={<ShieldCheck size={20}/>} color={ac}                   trend={4}  sub={`${stats.receipts} receipts issued`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Audit Log */}
            <div className="p-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="lxfh" style={{ fontSize: 17, margin: 0 }}>Verification Audit Log</h3>
                <button onClick={() => setTab('banking')} className="p-btn-light" style={{ fontSize: 11 }}>Complete History</button>
              </div>
              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: 13 }}>No transactions yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {transactions.slice(0, 5).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--bg-secondary)', borderRadius: 14 }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: t.amount > 0 ? '#DCFCE7' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {t.amount > 0 ? <ArrowUpRight size={18} color="#16A34A" /> : <ArrowDownRight size={18} color="#EF4444" />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{t.method || 'Standard Wire'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.date} · Ref: {t.id?.slice(0,8)}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: t.amount > 0 ? '#16A34A' : '#EF4444' }}>{t.amount > 0 ? '+' : ''}{formatMoney(t.amount)}</div>
                        <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}><ShieldCheck size={10}/> VERIFIED</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions panel — warm brand palette */}
            <div className="p-card" style={{ padding: 24, background: '#F8F5F0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 className="lxfh" style={{ fontSize: 17, margin: '0 0 4px', color: '#1A1410' }}>Create Document</h3>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Issue a new financial document instantly.</div>

              {DOC_TYPES.map(d => (
                <button
                  key={d.id}
                  onClick={() => startDocument(d.kind, d.invType)}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 14, background: '#fff', border: '1.5px solid var(--border-color)', color: '#1A1410', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                  className="hover-lift"
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F4EFE6', color: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{d.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{d.sub}</div>
                  </div>
                </button>
              ))}

              {/* Exchange Rate pill */}
              <div style={{ marginTop: 6, padding: '14px 18px', borderRadius: 14, background: `${ac}12`, border: `1px solid ${ac}25`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: ac, fontWeight: 700 }}>USD Reference Rate</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#1A1410' }}>1 USD = GH₵{finSettings.exchangeRate}</div>
              </div>
              <button onClick={() => setTab('settings')} style={{ background: 'none', border: 'none', color: ac, fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'right', padding: '2px 0' }}>Edit rate in Settings →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SALES / QUOTATIONS TAB ── */}
      {(tab === 'sales' || tab === 'quotations') && (
        <div className="p-card fade-in" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <h3 className="lxfh" style={{ fontSize: 17, margin: 0 }}>{tab === 'sales' ? 'Revenue Ledger' : 'Tender Pipeline'}</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input className="p-inp" placeholder="Search…" style={{ paddingLeft: 34, height: 38, fontSize: 12, width: 200 }} />
              </div>
              <button
                onClick={() => {
                  const rows = tab === 'sales' ? invoices : quoteRows;
                  if (!rows.length) return;
                  const data = rows.map(r => ({ id: r.id||'', client: r.client||'', date: r.date||'', currency: r.currency||'GHS', amount: r.amount||'', status: r.status||'' }));
                  const header = Object.keys(data[0]).join(',');
                  const body   = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
                  const blob = new Blob([header+'\n'+body], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `${tab}_export.csv`; a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{ height: 38, padding: '0 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}
              ><Download size={13}/> CSV</button>
              <button onClick={() => startDocument(tab === 'sales' ? 'invoice' : 'quotation')} className="p-btn-dark" style={{ height: 38, padding: '0 18px', fontSize: 12 }}>+ Create New</button>
            </div>
          </div>
          <div className="p-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Reference','Client Entity','Date Issued','Currency','Amount','Status','Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '14px 20px', fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.1em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(tab === 'sales' ? invoices : quoteRows).length === 0 && (
                  <tr><td colSpan={7}>
                    <EmptyState
                      icon={<Receipt size={28}/>}
                      title={tab === 'sales' ? 'No invoices yet' : 'No quotations yet'}
                      description={tab === 'sales' ? 'Create your first invoice to start tracking revenue.' : 'Send a quotation to a client to begin a project.'}
                      action={{ label: `+ Create ${tab === 'sales' ? 'Invoice' : 'Quotation'}`, onClick: () => startDocument(tab === 'sales' ? 'invoice' : 'quotation') }}
                    />
                  </td></tr>
                )}
                {(tab === 'sales' ? invoices : quoteRows).map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 20px', fontSize: 11, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{(item.id || '').slice(0, 12).toUpperCase()}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.client || item.clientName}
                        {item.version > 1 && <span style={{ fontSize: 10, background: 'var(--accent-secondary)', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>v{item.version}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{item.clientEmail || item.title || '—'}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 12 }}>{item.date}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 900, background: '#F4EFE6', color: ac, padding: '3px 8px', borderRadius: 6 }}>{item.currency || 'GHS'}</span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 15, fontWeight: 900 }}>{item.amount}</td>
                    <td style={{ padding: '16px 20px' }}><SBadge s={item.status}/></td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button onClick={() => setViewInvoice(item)} className="p-btn-light" style={{ width: 34, height: 34, padding: 0 }} title="View"><Eye size={15}/></button>
                        {tab !== 'sales' && (
                          <button
                            onClick={() => {
                              const newDraft = { ...item, id: undefined, version: (item.version || 1) + 1, previousVersionId: item.id, date: new Date().toISOString().slice(0,10), status: 'pending' };
                              setDraft(newDraft);
                              setShowAdd('quotation');
                            }}
                            className="p-btn-light" style={{ width: 34, height: 34, padding: 0 }} title="New Version"
                          ><Layers size={14}/></button>
                        )}
                        {tab === 'sales' && props.updateInvoice && (
                          <button
                            onClick={() => {
                              const curAmt   = item.amountPaid || 0;
                              const totalAmt = parseFloat(String(item.amount || '0').replace(/[^0-9.]/g, '')) || 0;
                              const res = prompt(`Enter Total Amount Paid (GHS)\n\nTotal Invoice: ${totalAmt}`, curAmt);
                              if (res !== null) {
                                const newPaid  = Number(res.replace(/[^0-9.]/g, ''));
                                if (!isNaN(newPaid)) {
                                  let newStatus = item.status;
                                  if (newPaid >= totalAmt && totalAmt > 0) newStatus = 'Paid';
                                  else if (newPaid > 0) newStatus = 'Partially Paid';
                                  else newStatus = 'Pending';
                                  props.updateInvoice(item.id, { amountPaid: newPaid, status: newStatus });
                                }
                              }
                            }}
                            style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', cursor: 'pointer', color: '#059669', transition: 'background .15s' }} title="Update Payment"
                          ><DollarSign size={14}/></button>
                        )}
                        <button
                          onClick={() => {
                            if (!window.confirm(`Delete this ${tab === 'sales' ? 'invoice' : 'quotation'}? This cannot be undone.`)) return;
                            if (tab === 'sales') deleteInvoice?.(item.id);
                            else if (item._sourceCollection === 'invoices') deleteInvoice?.(item.id);
                            else deleteProposal?.(item.id);
                          }}
                          style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer', color: '#DC2626', transition: 'background .15s' }} title="Delete"
                        ><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MARGINS TAB ── */}
      {tab === 'margins' && marginsView}

      {/* ── BANKING TAB ── */}
      {tab === 'banking' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="p-card" style={{ padding: '48px 60px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${ac}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <ShieldCheck size={40} color={ac} />
            </div>
            <h3 className="lxfh" style={{ fontSize: 28, marginBottom: 12 }}>Official Audit Trail</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 40px', fontSize: 14, lineHeight: 1.7 }}>
              Synchronize your corporate bank accounts for real-time reconciliation and automated financial reporting across dual currencies.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 800, margin: '0 auto' }}>
              {[
                { icon: <Landmark size={22} color={ac}/>, title: 'Settlement Accounts', sub: 'EcoBank, Zenith, & Stripe connected.' },
                { icon: <CreditCard size={22} color="#16A34A"/>, title: 'VAT & Tax Compliance', sub: 'Real-time export to Tax Authority.' },
                { icon: <History size={22} color="var(--accent-secondary)"/>, title: 'Audit History', sub: 'Verified logs since inception.' },
              ].map(card => (
                <div key={card.title} className="p-card" style={{ padding: 28, textAlign: 'left' }}>
                  <div style={{ marginBottom: 14 }}>{card.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{card.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{card.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && settingsView}

      {/* ══════════════════════════════════════════════════════════════════════
          INVOICE STUDIO — Full-screen overlay
      ══════════════════════════════════════════════════════════════════════ */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#F4F2EF', display: 'flex', flexDirection: 'column' }}>

          {/* Studio Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 28px', height: 60, background: '#fff', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setShowAdd(null)} style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><X size={18}/></button>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>Invoice Studio</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                  {activeDocType === 'receipt' ? 'Sales Receipt' : activeDocType === 'quotation' ? 'Quotation' : activeDocType === 'project' ? 'Project Phase Invoice' : 'Invoice'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAdd(null)} className="p-btn-light" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8 }}>Cancel</button>
              <button onClick={issueDocument} style={{ padding: '8px 24px', fontSize: 13, background: '#16A34A', border: 'none', color: '#fff', borderRadius: 8, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={15}/> Confirm & Issue
              </button>
            </div>
          </div>

          {/* Studio Body: Editor (flex 1) + Preview (fixed 480px) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 480px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* ── LEFT: FORM EDITOR ── */}
            <div style={{ overflowY: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 24 }} className="no-scrollbar">

              {/* Document type selector — SINGLE merged row */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Document Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {DOC_TYPES.map(d => (
                    <button
                      key={d.id}
                      onClick={() => selectDocType(d)}
                      style={{
                        padding: '14px 12px', borderRadius: 14,
                        border: activeDocType === d.id ? `2px solid ${ac}` : '1.5px solid var(--border-color)',
                        background: activeDocType === d.id ? `${ac}0D` : '#fff',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6,
                        transition: 'all 0.2s', textAlign: 'left',
                      }}
                    >
                      <div style={{ color: activeDocType === d.id ? ac : 'var(--text-secondary)', transition: 'color 0.2s' }}>{d.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#1A1410' }}>{d.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{d.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Client Details */}
              <div style={{ display: 'grid', gridTemplateColumns: draft.invoiceType === 'project' ? '1fr 1fr' : '1fr', gap: 16 }}>
                {draft.invoiceType === 'project' ? (
                  <PFormField label="Select Project">
                    <select className="p-inp" value={draft.projectId} onChange={e => {
                      const p = clients.find(x => x.id === e.target.value);
                      setDraft({ ...draft, projectId: e.target.value, clientId: p?.clientId || p?.id || '', clientName: p?.name || p?.title || '', clientEmail: p?.email || '', clientPhone: p?.phone || '' });
                    }}>
                      <option value="">Select a project…</option>
                      {clients.map(p => <option key={p.id} value={p.id}>{p.project || p.title}</option>)}
                    </select>
                  </PFormField>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 2 }}>Client Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <select className="p-inp" value={draft.clientId} onChange={e => {
                          const c = dbClients.find(x => x.id === e.target.value);
                          if (c) setDraft({ ...draft, customerType: 'existing', clientId: c.id, clientName: c.name || c.title || '', clientEmail: c.email || '', clientPhone: c.phone || '', clientCompany: c.company || '' });
                          else setDraft({ ...draft, customerType: 'one-time', clientId: '' });
                        }}>
                          <option value="">Walk-in / New client</option>
                          {(dbClients || []).map(c => <option key={c.id} value={c.id}>{c.name || c.title}</option>)}
                        </select>
                        <input className="p-inp" placeholder="Full name *" value={draft.clientName} onChange={e => setDraft({ ...draft, clientName: e.target.value })} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input className="p-inp" placeholder="Phone / WhatsApp" value={draft.clientPhone} onChange={e => setDraft({ ...draft, clientPhone: e.target.value })} />
                        <input className="p-inp" placeholder="Email (optional)" value={draft.clientEmail} onChange={e => setDraft({ ...draft, clientEmail: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <input className="p-inp" placeholder="Company (optional)" value={draft.clientCompany} onChange={e => setDraft({ ...draft, clientCompany: e.target.value })} />
                      <input className="p-inp" placeholder="Tax ID / VAT (optional)" value={draft.clientTaxId} onChange={e => setDraft({ ...draft, clientTaxId: e.target.value })} />
                      <input className="p-inp" placeholder="Billing address (optional)" value={draft.clientAddress} onChange={e => setDraft({ ...draft, clientAddress: e.target.value })} />
                    </div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <PFormField label="Currency">
                    <select className="p-inp" value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })}>
                      <option value="GHS">GHS (GH₵)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </PFormField>
                  <PFormField label="Issue Date"><input type="date" className="p-inp" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></PFormField>
                  <PFormField label="Due Date"><input type="date" className="p-inp" value={draft.due || ''} onChange={e => setDraft({ ...draft, due: e.target.value })} /></PFormField>
                </div>
              </div>

              {/* Document Title */}
              <PFormField label="Document Subject / Title">
                <input className="p-inp" placeholder="e.g. Phase 2 — Structural Facade Glazing" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
              </PFormField>

              {/* Line Items */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>Line Items</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {draft.invoiceType === 'unit' && (
                      <button onClick={() => document.getElementById('smart-catalog-scroll')?.scrollIntoView({ behavior: 'smooth' })} className="p-btn-light" style={{ padding: '5px 12px', fontSize: 11 }}>Catalog</button>
                    )}
                    <button
                      onClick={() => setDraft({ ...draft, items: [...draft.items, { id: Date.now(), desc: '', qty: 1, rate: 0, unit: draft.invoiceType === 'unit' ? 'pcs' : 'job', discount: 0, total: 0 }] })}
                      style={{ background: ac, border: 'none', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: '5px 14px', borderRadius: 8 }}
                    >+ Row</button>
                  </div>
                </div>

                <div style={{ padding: '16px 20px' }}>
                  {/* Smart Catalog (unit only) */}
                  {draft.invoiceType === 'unit' && (
                    <div id="smart-catalog-scroll" style={{ marginBottom: 20, padding: 14, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: ac, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Smart Component Selector</div>
                      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }} className="no-scrollbar">
                        {GLASS_CATALOG_DATA.slice(0, 12).map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              const newItem = { id: Date.now(), desc: p.name, img: p.img, qty: 1, rate: p.price || 0, unit: 'pcs', discount: 0, total: p.price || 0 };
                              if (draft.items.length === 1 && !draft.items[0].desc) setDraft({ ...draft, items: [newItem] });
                              else setDraft({ ...draft, items: [...draft.items, newItem] });
                            }}
                            style={{ flex: '0 0 110px', height: 130, background: 'var(--bg-secondary)', borderRadius: 12, border: 'none', display: 'flex', flexDirection: 'column', padding: 10, cursor: 'pointer', transition: 'all 0.2s' }}
                            className="hover-lift"
                          >
                            <img src={p.img} style={{ width: '100%', height: 54, objectFit: 'contain', marginBottom: 8 }} alt={p.name} />
                            <div style={{ fontSize: 9, fontWeight: 800, textAlign: 'left', lineHeight: 1.3, flex: 1, overflow: 'hidden' }}>{p.name}</div>
                            <div style={{ fontSize: 10, fontWeight: 900, color: ac, marginTop: 4, textAlign: 'left' }}>${p.price}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: itemCols, gap: 8, marginBottom: 8, padding: '0 4px' }}>
                    {['Item / Description','Qty', ...(draft.invoiceType === 'unit' ? ['Unit'] : []),'Rate','Discount','Amount',''].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</div>
                    ))}
                  </div>

                  {/* Item rows */}
                  {draft.items.map((it, idx) => (
                    <div key={it.id} style={{ display: 'grid', gridTemplateColumns: itemCols, gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <textarea className="p-inp" rows={1} placeholder="Item description…" value={it.desc} onChange={e => { const ni = [...draft.items]; ni[idx].desc = e.target.value; setDraft({ ...draft, items: ni }); }} style={{ resize: 'vertical', minHeight: 40, padding: '8px 12px', fontSize: 12 }} />
                      <input className="p-inp" type="number" placeholder="1" value={it.qty} onChange={e => { const ni = [...draft.items]; ni[idx].qty = parseFloat(e.target.value); setDraft({ ...draft, items: ni }); }} style={{ padding: '0 10px', textAlign: 'center' }} />
                      {draft.invoiceType === 'unit' && <input className="p-inp" placeholder="pcs" value={it.unit} onChange={e => { const ni = [...draft.items]; ni[idx].unit = e.target.value; setDraft({ ...draft, items: ni }); }} style={{ padding: '0 10px' }} />}
                      <input className="p-inp" type="number" placeholder="0.00" value={it.rate} onChange={e => { const ni = [...draft.items]; ni[idx].rate = parseFloat(e.target.value); setDraft({ ...draft, items: ni }); }} style={{ padding: '0 10px' }} />
                      <input className="p-inp" type="number" placeholder="0.00" value={it.discount || ''} onChange={e => { const ni = [...draft.items]; ni[idx].discount = parseFloat(e.target.value) || 0; setDraft({ ...draft, items: ni }); }} style={{ padding: '0 10px' }} />
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-secondary)', textAlign: 'right', paddingRight: 4 }}>{formatMoney(lineTotal(it), draft.currency)}</div>
                      <button onClick={() => setDraft({ ...draft, items: draft.items.filter(x => x.id !== it.id) })} disabled={draft.items.length <= 1} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: draft.items.length > 1 ? 'pointer' : 'default', opacity: draft.items.length > 1 ? 1 : 0.2, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  ))}

                  {/* Totals + Notes */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginTop: 24, paddingTop: 20, borderTop: '1.5px solid var(--border-color)' }}>
                    <PFormField label="Customer Notes / Instructions">
                      <textarea className="p-inp" rows={3} placeholder="Thanks for your business!" value={draft.notes || ''} onChange={e => setDraft({ ...draft, notes: e.target.value })} style={{ resize: 'vertical', fontSize: 12 }} />
                    </PFormField>
                    <div style={{ background: '#F8F5F0', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span>Subtotal</span>
                        <span style={{ fontWeight: 700 }}>{formatMoney(subtotal, draft.currency)}</span>
                      </div>
                      {finSettings.taxEnabled && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                          <span>{finSettings.taxName} ({finSettings.taxRate}%){finSettings.taxInclusive ? ' incl.' : ''}</span>
                          <span style={{ fontWeight: 700 }}>{finSettings.taxInclusive ? `(incl.)` : formatMoney(taxAmount, draft.currency)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid var(--border-color)', fontSize: 17, fontWeight: 900, color: 'var(--accent-secondary)' }}>
                        <span>Total</span>
                        <span>{formatMoney(grandTotal, draft.currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: SCALED A4 LIVE PREVIEW ── */}
            <div style={{ background: '#1A1814', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 24, gap: 16, alignItems: 'center' }} className="no-scrollbar">
              {/* Preview toolbar */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={13}/> Live Preview
                </div>
                <span style={{ fontSize: 10, color: '#555', background: '#2A2520', padding: '3px 8px', borderRadius: 6 }}>
                  A4 · {Math.round(PREVIEW_SCALE * 100)}%
                </span>
              </div>

              {/* Scaled A4 container */}
              <div style={{
                width:    Math.round(A4W * PREVIEW_SCALE),
                height:   Math.round(A4H * PREVIEW_SCALE),
                overflow: 'hidden',
                position: 'relative',
                borderRadius: 3,
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                flexShrink: 0,
              }}>
                <div
                  id="invoice-studio-preview"
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width:  A4W,
                    height: A4H,
                    transformOrigin: 'top left',
                    transform: `scale(${PREVIEW_SCALE})`,
                    background: '#fff',
                  }}
                >
                  <InvoiceDocument inv={draft} isQuote={showAdd === 'quotation'} finSettings={finSettings} ac={ac} brand={brand} />
                </div>
              </div>

              <div style={{ fontSize: 10, color: '#555', textAlign: 'center', lineHeight: 1.6 }}>
                Full-resolution PDF on "Confirm & Issue".<br/>Changes reflect instantly.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW INVOICE MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {viewInvoice && (
        <Modal open={true} w={900} title={`${viewInvoice.type || 'Invoice'} — ${viewInvoice.id?.slice(0, 8).toUpperCase()}`} onClose={() => setViewInvoice(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ border: '1px solid #ddd', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div id="printable-financial-view" style={{ overflow: 'auto', maxHeight: '62vh', padding: 24, zoom: 0.7 }}>
                <InvoiceDocument inv={viewInvoice} isQuote={viewInvoice.type === 'Quotation' || viewInvoice.type === 'pending'} finSettings={finSettings} ac={ac} brand={brand} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  const printContent = document.getElementById('printable-financial-view');
                  if (!printContent) return;
                  const safeTitle = DOMPurify.sanitize(viewInvoice.title || viewInvoice.type || 'Invoice');
                  const safeBody  = DOMPurify.sanitize(printContent.innerHTML, { ADD_ATTR: ['style', 'class', 'target'], ADD_TAGS: ['img', 'style'] });
                  const html = `<html><head><base href="${window.location.origin}/" /><title>${safeTitle}</title><style>@page{size:A4;margin:0}body{margin:0;font-family:sans-serif}#printable-financial-view{width:210mm!important;min-height:297mm!important;border:none!important;margin:0!important;box-shadow:none!important;padding:40px!important;zoom:1!important}@media print{button{display:none!important}}</style></head><body><div id="printable-financial-view" style="width:210mm;margin:0 auto">${safeBody}</div></body></html>`;
                  const iframe = document.createElement('iframe');
                  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
                  document.body.appendChild(iframe);
                  iframe.contentWindow.document.open();
                  iframe.contentWindow.document.write(html);
                  iframe.contentWindow.document.close();
                  iframe.onload = () => {
                    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => document.body.removeChild(iframe), 1000); }, 500);
                  };
                }}
                className="p-btn-dark"
                style={{ padding: '12px 24px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
              ><Printer size={16}/> Download PDF / Print</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
