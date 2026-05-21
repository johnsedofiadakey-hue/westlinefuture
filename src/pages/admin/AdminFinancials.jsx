import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { 
  DollarSign, Receipt, FileText, Download, Share2, 
  Plus, Search, Filter, Trash2, CheckCircle, 
  Printer, Send, Landmark, ShieldCheck, ArrowUpRight,
  TrendingUp, Wallet, ArrowDownRight, History, MoreVertical,
  Mail, MessageSquare, ExternalLink, QrCode, Globe, Settings,
  CreditCard, Layout, Eye, Save, X, Layers, Briefcase, Package
} from 'lucide-react';
import { PAv, PSBadge, SBadge, FF as PFormField, Modal, Av } from '../../components/Shared';
import EmptyState from '../../components/ui/EmptyState';
import PulseTargetCard from '../../components/PulseTargetCard';
import InvoiceDocument from '../../components/InvoiceDocument';
import { GLASS_CATALOG_DATA } from '../../data.jsx';

/**
 * WESTLINE FUTURE FINANCIAL ENGINE v3.0 - DUAL CURRENCY & UNIT INVOICING
 * The Absolute Gold Standard in Financial Management
 */

export default function AdminFinancials({ invoices = [], transactions = [], clients = [], dbClients = [], brand, ...props }) {
  const [tab, setTab] = useState('overview'); // overview, sales, quotations, banking, settings
  const [showAdd, setShowAdd] = useState(null); // 'invoice', 'quotation'
  const ac = brand.color || '#231F78';
  const notify = props.notify || ((type, msg) => alert(`${type.toUpperCase()}: ${msg}`));

  // --- FINANCIAL SETTINGS ---
  const [finSettings, setFinSettings] = useState(brand.finSettings || {
    baseCurrency: 'USD',
    secondaryCurrency: 'GHS',
    exchangeRate: 15.5,
    invoiceTheme: 'classic',
    taxRate: 0,
    showStamp: true,
    autoNumbering: true,
    bankDetails: 'EcoBank Ghana | Acct: 1441000928271 | Branch: Spintex Road',
    terms: '1. 50% deposit required for fabrication.\n2. Final payment due upon installation.\n3. This document is valid for 14 days.',
    kpiTargets: { revenue: 500000, pending: 100000, quotes: 20, conversion: 90 }
  });

  // --- DRAFT STATE ---
  const [draft, setDraft] = useState({
    projectId: '',
    clientName: '', clientEmail: '', clientPhone: '',
    title: '', currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    due: '', 
    invoiceType: 'project', // 'project' or 'unit'
    items: [{ id: Date.now(), desc: '', qty: 1, rate: 0, unit: 'pcs', total: 0 }],
    bankDetails: finSettings.bankDetails,
    terms: finSettings.terms,
    status: 'Pending'
  });

  const issueDocument = async () => {
    try {
      const isQuote = showAdd === 'quotation';
      const total = calculateTotal(draft.items);
      const payload = {
        ...draft,
        amount: formatMoney(total, draft.currency),
        total,
        client: draft.clientName,
        status: isQuote ? 'pending' : 'Pending',
        type: isQuote ? 'Quotation' : 'Invoice',
        parentId: draft.projectId // Linking to project
      };

      notify('pending', `Processing ${showAdd}...`);
      
      let docId;
      if (isQuote) {
        docId = await props.createProposal(payload);
      } else {
        docId = await props.createInvoice(payload);
      }

      if (docId) {
        setShowAdd(null);
        setDraft({
          projectId: '', clientName: '', clientEmail: '', clientPhone: '',
          title: '', currency: 'USD',
          date: new Date().toISOString().split('T')[0],
          due: '', invoiceType: 'project',
          items: [{ id: Date.now(), desc: '', qty: 1, rate: 0, unit: 'pcs', total: 0 }],
          bankDetails: finSettings.bankDetails, terms: finSettings.terms, status: 'Pending'
        });
      }
    } catch (e) {
      console.error(e);
      notify('error', 'Issuance failed');
    }
  };

  // --- CALCULATIONS ---
  const calculateTotal = (items, currency) => {
    const sum = items.reduce((a, b) => a + (parseFloat(b.qty) * parseFloat(b.rate) || 0), 0);
    return sum;
  };

  const formatMoney = (val, currency) => {
    const symbol = currency === 'GHS' ? 'GH₵' : '$';
    return `${symbol}${parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const getSecondaryValue = (val, fromCurrency) => {
    if (fromCurrency === 'USD') return val * finSettings.exchangeRate;
    return val / finSettings.exchangeRate;
  };

  const parseAmount = (val) => parseFloat(String(val || '0').replace(/[^0-9.]/g, '')) || 0;
  const stats = {
    revenue: (invoices || []).filter(i => i.status === 'Paid').reduce((a, b) => a + parseAmount(b.amount), 0),
    pending: (invoices || []).filter(i => i.status === 'Pending').reduce((a, b) => a + parseAmount(b.amount), 0),
    quotes: (props.proposals || []).filter(p => p.status === 'Pending').length,
    conversions: 84
  };

  // --- SUB-VIEWS ---
  const settingsView = (
    <div className="p-card fade-in" style={{ padding: 40 }}>
       <div style={{ display: 'flex', gap: 40 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
             <h3 className="lxfh" style={{ fontSize: 24, marginBottom: 8 }}>Financial Environment</h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <PFormField label="Base Currency">
                   <select className="p-inp" value={finSettings.baseCurrency} onChange={e => setFinSettings({...finSettings, baseCurrency: e.target.value})}>
                      <option value="USD">USD ($)</option>
                      <option value="GHS">GHS (GH₵)</option>
                   </select>
                </PFormField>
                <PFormField label="Secondary Currency">
                   <select className="p-inp" value={finSettings.secondaryCurrency} onChange={e => setFinSettings({...finSettings, secondaryCurrency: e.target.value})}>
                      <option value="GHS">GHS (GH₵)</option>
                      <option value="USD">USD ($)</option>
                   </select>
                </PFormField>
                <PFormField label="Exchange Rate (1 USD = X GHS)">
                   <input className="p-inp" type="number" step="0.01" value={finSettings.exchangeRate} onChange={e => setFinSettings({...finSettings, exchangeRate: parseFloat(e.target.value)})} />
                </PFormField>
                <PFormField label="Default Tax Rate (%)">
                   <input className="p-inp" type="number" value={finSettings.taxRate} onChange={e => setFinSettings({...finSettings, taxRate: parseInt(e.target.value)})} />
                </PFormField>
             </div>

             <h3 className="lxfh" style={{ fontSize: 20, marginTop: 20 }}>Document Aesthetic</h3>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { id: 'classic', n: 'Classic Heritage', icon: <Briefcase size={20}/> },
                  { id: 'minimal', n: 'Sharp Minimal', icon: <Layout size={20}/> },
                  { id: 'corporate', n: 'Global Corporate', icon: <Globe size={20}/> }
                ].map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setFinSettings({...finSettings, invoiceTheme: t.id})}
                    style={{ 
                      padding: 20, borderRadius: 16, border: finSettings.invoiceTheme === t.id ? `2px solid ${ac}` : '1px solid #eee',
                      background: finSettings.invoiceTheme === t.id ? `${ac}05` : '#fff', cursor: 'pointer', textAlign: 'center'
                    }}
                  >
                     <div style={{ marginBottom: 12, color: finSettings.invoiceTheme === t.id ? ac : '#9B99C8' }}>{t.icon}</div>
                     <div style={{ fontSize: 13, fontWeight: 700 }}>{t.n}</div>
                  </button>
                ))}
             </div>
             
             <h3 className="lxfh" style={{ fontSize: 20, marginTop: 20 }}>KPI Targets</h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <PFormField label="Revenue Target (USD)">
                   <input className="p-inp" type="number" value={finSettings.kpiTargets?.revenue ?? 500000} onChange={e => setFinSettings(s => ({ ...s, kpiTargets: { ...s.kpiTargets, revenue: parseFloat(e.target.value) } }))} />
                </PFormField>
                <PFormField label="Pending Ceiling (USD)">
                   <input className="p-inp" type="number" value={finSettings.kpiTargets?.pending ?? 100000} onChange={e => setFinSettings(s => ({ ...s, kpiTargets: { ...s.kpiTargets, pending: parseFloat(e.target.value) } }))} />
                </PFormField>
                <PFormField label="Open Tenders Target">
                   <input className="p-inp" type="number" value={finSettings.kpiTargets?.quotes ?? 20} onChange={e => setFinSettings(s => ({ ...s, kpiTargets: { ...s.kpiTargets, quotes: parseFloat(e.target.value) } }))} />
                </PFormField>
                <PFormField label="Conversion Rate Target (%)">
                   <input className="p-inp" type="number" value={finSettings.kpiTargets?.conversion ?? 90} onChange={e => setFinSettings(s => ({ ...s, kpiTargets: { ...s.kpiTargets, conversion: parseFloat(e.target.value) } }))} />
                </PFormField>
             </div>
             <button onClick={() => {
                if (props.syncCMS) props.syncCMS('finSettings', finSettings);
                if (typeof notify === 'function') notify('success', 'Financial settings optimized & synced');
              }} className="p-btn-dark" style={{ alignSelf: 'flex-start', padding: '12px 32px', marginTop: 20 }}>Apply System Configuration</button>
          </div>

          <div style={{ width: 350, display: 'flex', flexDirection: 'column', gap: 20 }}>
             <div className="p-card" style={{ padding: 24, background: '#0D0B2E', color: '#fff' }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Settlement & Legal Defaults</h4>
                <PFormField label="Banking Info (Invoice Footer)" nomargin>
                   <textarea className="p-inp" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} rows={4} value={finSettings.bankDetails} onChange={e => setFinSettings({...finSettings, bankDetails: e.target.value})} />
                </PFormField>
                <div style={{ height: 16 }} />
                <PFormField label="Standard Terms" nomargin>
                   <textarea className="p-inp" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} rows={6} value={finSettings.terms} onChange={e => setFinSettings({...finSettings, terms: e.target.value})} />
                </PFormField>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 10px' }}>
                <input type="checkbox" checked={finSettings.showStamp} onChange={e => setFinSettings({...finSettings, showStamp: e.target.checked})} />
                <span style={{ fontSize: 12 }}>Include Digital Certification Stamp</span>
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
       {/* HEADER */}
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
             <div className="lxf eyebrow" style={{ marginBottom: 4 }}>Treasury Management</div>
             <h2 className="lxfh" style={{ fontSize: 36, fontWeight: 400 }}>Financial Control Engine</h2>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
             <button onClick={() => setTab('settings')} className="p-btn-light" style={{ gap: 8, display: 'flex', alignItems: 'center' }}><Settings size={16}/> Config</button>
             <button onClick={() => setShowAdd('invoice')} className="p-btn-gold" style={{ gap: 8, display: 'flex', alignItems: 'center' }}><Plus size={16}/> New Document</button>
          </div>
       </div>

       {/* TABS */}
       <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.5)', padding: 6, borderRadius: 20, alignSelf: 'flex-start', border: '1px solid var(--border)' }}>
          {[
            { id: 'overview', label: 'Dashboard', icon: <Landmark size={14}/> },
            { id: 'sales', label: 'Sales Ledger', icon: <TrendingUp size={14}/> },
            { id: 'quotations', label: 'Quotations', icon: <FileText size={14}/> },
            { id: 'banking', label: 'Banking & Audit', icon: <ShieldCheck size={14}/> },
            { id: 'settings', label: 'Settings', icon: <Settings size={14}/> }
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)} 
              style={{ 
                padding: '10px 24px', borderRadius: 16, border: 'none', 
                background: tab === t.id ? '#0D0B2E' : 'none',
                color: tab === t.id ? '#fff' : '#0D0B2E',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.3s'
              }}
            >{t.icon} {t.label}</button>
          ))}
       </div>

       {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <PulseTargetCard label="VERIFIED CASH" value={formatMoney(stats.revenue, 'USD')} target={finSettings.kpiTargets?.revenue ?? 500000} icon={<TrendingUp size={20}/>} color="#16A34A" trend={18} sub="Settled payments" />
                <PulseTargetCard label="UNSETTLED CAPITAL" value={formatMoney(stats.pending, 'USD')} target={finSettings.kpiTargets?.pending ?? 100000} icon={<Wallet size={20}/>} color={ac} trend={-5} sub="Active invoices" />
                <PulseTargetCard label="OPEN TENDERS" value={stats.quotes} target={finSettings.kpiTargets?.quotes ?? 20} icon={<FileText size={20}/>} color="#0D0B2E" trend={12} sub="Value: $142.5k" />
                <PulseTargetCard label="CONVERSION RATE" value={`${stats.conversions}%`} target={finSettings.kpiTargets?.conversion ?? 90} icon={<ShieldCheck size={20}/>} color={ac} trend={4} sub="Quotation to Invoice" />
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 24 }}>
                <div className="p-card" style={{ padding: 24 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                      <h3 className="lxfh" style={{ fontSize: 18 }}>Verification Audit Log</h3>
                      <button onClick={() => setTab('banking')} className="p-btn-light" style={{ fontSize: 11 }}>Complete History</button>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {transactions.slice(0, 5).map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#F4F4FA', borderRadius: 16 }}>
                           <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                              <div style={{ width: 44, height: 44, borderRadius: 12, background: t.amount > 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 {t.amount > 0 ? <ArrowUpRight size={20} color="#16A34A" /> : <ArrowDownRight size={20} color="#EF4444" />}
                              </div>
                              <div>
                                 <div style={{ fontSize: 14, fontWeight: 700 }}>{t.method || 'Standard Wire'}</div>
                                 <div style={{ fontSize: 11, color: '#9B99C8' }}>{t.date} • Ref: {t.id}</div>
                              </div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 18, fontWeight: 900, color: t.amount > 0 ? '#16A34A' : '#EF4444' }}>{t.amount > 0 ? '+' : ''}{formatMoney(t.amount, 'USD')}</div>
                              <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}><ShieldCheck size={10}/> VERIFIED</div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="p-card" style={{ padding: 24, background: '#0D0B2E', color: '#fff' }}>
                   <h3 className="lxfh" style={{ fontSize: 18, marginBottom: 20 }}>Document Generation</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <button onClick={() => { setDraft({...draft, invoiceType: 'unit'}); setShowAdd('invoice'); }} className="p-btn-gold" style={{ width: '100%', padding: 20, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                         <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(13, 11, 46, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20}/></div>
                         <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>Unit Item Invoice</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>Products, glass units, accessories</div>
                         </div>
                      </button>
                      <button onClick={() => { setDraft({...draft, invoiceType: 'project'}); setShowAdd('invoice'); }} style={{ width: '100%', padding: 20, borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                         <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Briefcase size={20}/></div>
                         <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>Project Milestone</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>Facade, interior finishing phases</div>
                         </div>
                      </button>
                      <div style={{ marginTop: 24, padding: 24, borderRadius: 20, background: `${ac}15`, textAlign: 'center', border: `1px solid ${ac}30` }}>
                         <div style={{ fontSize: 11, color: ac, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>Internal Exchange Rate</div>
                         <div style={{ fontSize: 24, fontWeight: 900 }}>1 USD : {finSettings.exchangeRate} GHS</div>
                         <button onClick={() => setTab('settings')} style={{ background: 'none', border: 'none', color: ac, fontSize: 11, fontWeight: 700, marginTop: 12, cursor: 'pointer' }}>Update Rate</button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       )}

       {(tab === 'sales' || tab === 'quotations') && (
         <div className="p-card fade-in" style={{ overflow: 'hidden' }}>
            <div style={{ padding: 24, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 className="lxfh" style={{ fontSize: 18 }}>{tab === 'sales' ? 'Revenue Ledger' : 'Tender Pipeline'}</h3>
               <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ position: 'relative' }}>
                     <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9B99C8' }} />
                     <input className="p-inp" placeholder="Search accounts..." style={{ paddingLeft: 36, height: 40, fontSize: 12, width: 240 }} />
                  </div>
                  <button
                    onClick={() => {
                      const rows = (tab === 'sales' ? invoices : (props.proposals || []));
                      if (!rows.length) return;
                      const data = rows.map(r => ({ id: r.id||'', client: r.client||'', date: r.date||'', currency: r.currency||'USD', amount: r.amount||'', status: r.status||'' }));
                      const header = Object.keys(data[0]).join(',');
                      const body = data.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
                      const blob = new Blob([header+'\n'+body], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `${tab}_export.csv`; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ height: 40, padding: '0 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #F0EBE5', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}
                  >
                    <Download size={14} /> CSV
                  </button>
                  <button onClick={() => setShowAdd(tab === 'sales' ? 'invoice' : 'quotation')} className="p-btn-dark" style={{ height: 40, padding: '0 20px', fontSize: 12 }}>+ Create New</button>
               </div>
            </div>
            <div className="p-scroll" style={{ overflowX: 'auto' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                     <tr style={{ background: '#F4F4FA' }}>
                        {['Reference', 'Client Entity', 'Date Issued', 'Currency', 'Amount', 'Status', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '16px 24px', fontSize: 10, color: '#9B99C8', textTransform: 'uppercase', letterSpacing: '.1em' }}>{h}</th>)}
                     </tr>
                  </thead>
                  <tbody>
                     {(tab === 'sales' ? invoices : (props.proposals || [])).length === 0 && (
                       <tr><td colSpan={7}>
                         <EmptyState
                           icon={<Receipt size={28} />}
                           title={tab === 'sales' ? 'No invoices yet' : 'No quotations yet'}
                           description={tab === 'sales' ? 'Create your first invoice to start tracking revenue.' : 'Send a quotation to a client to begin a project.'}
                           action={{ label: `+ Create ${tab === 'sales' ? 'Invoice' : 'Quotation'}`, onClick: () => setShowAdd(tab === 'sales' ? 'invoice' : 'quotation') }}
                         />
                       </td></tr>
                     )}
                     {(tab === 'sales' ? invoices : (props.proposals || [])).map(item => (
                       <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '20px 24px', fontSize: 13, fontWeight: 800 }}>{item.id}</td>
                          <td style={{ padding: '20px 24px' }}>
                             <div style={{ fontSize: 14, fontWeight: 700 }}>{item.client}</div>
                             <div style={{ fontSize: 11, color: '#9B99C8' }}>{item.clientEmail}</div>
                          </td>
                          <td style={{ padding: '20px 24px', fontSize: 13 }}>{item.date}</td>
                          <td style={{ padding: '20px 24px' }}>
                             <span style={{ fontSize: 11, fontWeight: 900, background: '#eee', padding: '2px 6px', borderRadius: 4 }}>{item.currency || 'USD'}</span>
                          </td>
                          <td style={{ padding: '20px 24px', fontSize: 16, fontWeight: 900 }}>{item.amount}</td>
                          <td style={{ padding: '20px 24px' }}><SBadge s={item.status} /></td>
                          <td style={{ padding: '20px 24px' }}>
                             <div style={{ display: 'flex', gap: 10 }}>
                                <button className="p-btn-light" style={{ width: 36, height: 36, padding: 0 }}><Eye size={16}/></button>
                                <button className="p-btn-light" style={{ width: 36, height: 36, padding: 0 }}><Send size={16}/></button>
                             </div>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
       )}

       {tab === 'banking' && (
         <div className="p-card fade-in" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: `${ac}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
               <ShieldCheck size={48} color={ac} />
            </div>
            <h3 className="lxfh" style={{ fontSize: 32 }}>Official Audit Trail</h3>
            <p className="lxf" style={{ color: '#9B99C8', maxWidth: 600, margin: '16px auto 40px', fontSize: 16 }}>
               Synchronize your corporate bank accounts for real-time reconciliation and automated financial reporting across dual currencies.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 900, margin: '0 auto' }}>
               <div className="p-card" style={{ padding: 32, textAlign: 'left' }}>
                  <Landmark size={24} color={ac} style={{ marginBottom: 16 }} />
                  <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Settlement Accounts</h4>
                  <div style={{ fontSize: 12, color: '#9B99C8' }}>EcoBank, Zenith, & Stripe connected.</div>
               </div>
               <div className="p-card" style={{ padding: 32, textAlign: 'left' }}>
                  <CreditCard size={24} color="#16A34A" style={{ marginBottom: 16 }} />
                  <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>VAT & Tax Compliance</h4>
                  <div style={{ fontSize: 12, color: '#9B99C8' }}>Real-time export to Ghana Revenue Authority.</div>
               </div>
               <div className="p-card" style={{ padding: 32, textAlign: 'left' }}>
                  <History size={24} color="#0D0B2E" style={{ marginBottom: 16 }} />
                  <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Audit History</h4>
                  <div style={{ fontSize: 12, color: '#9B99C8' }}>Verified logs since inception.</div>
               </div>
            </div>
         </div>
       )}

       {tab === 'settings' && settingsView}

       {/* INVOICE PREVIEW MODAL */}
       {showAdd && (
         <Modal title={`Precision ${showAdd === 'invoice' ? 'Invoice' : 'Quotation'} Generation`} onClose={() => setShowAdd(null)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: 40 }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                     <button onClick={() => setDraft({...draft, invoiceType: 'project'})} style={{ flex: 1, padding: 16, borderRadius: 12, border: draft.invoiceType === 'project' ? `2px solid ${ac}` : '1px solid #eee', background: draft.invoiceType === 'project' ? `${ac}10` : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Briefcase size={16} /> <span style={{ fontSize: 13, fontWeight: 700 }}>Project Phase</span>
                     </button>
                     <button onClick={() => setDraft({...draft, invoiceType: 'unit'})} style={{ flex: 1, padding: 16, borderRadius: 12, border: draft.invoiceType === 'unit' ? `2px solid ${ac}` : '1px solid #eee', background: draft.invoiceType === 'unit' ? `${ac}10` : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Package size={16} /> <span style={{ fontSize: 13, fontWeight: 700 }}>Unit Items</span>
                     </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {draft.invoiceType === 'project' ? (
                        <PFormField label="Select Project Hub">
                           <select className="p-inp" value={draft.projectId} onChange={e => {
                              const p = clients.find(x => x.id === e.target.value);
                              setDraft({...draft, projectId: e.target.value, clientName: p?.name || '', clientEmail: p?.email || '', clientPhone: p?.phone || ''});
                           }}>
                              <option value="">Select an active project...</option>
                              {clients.map(p => <option key={p.id} value={p.id}>{p.project || p.title}</option>)}
                           </select>
                        </PFormField>
                      ) : (
                        <PFormField label="Client Entity Name"><input className="p-inp" placeholder="e.g. AFCFTA Secretariat" value={draft.clientName} onChange={e => setDraft({...draft, clientName: e.target.value})} /></PFormField>
                      )}
                      <PFormField label="Currency Selection">
                         <select className="p-inp" value={draft.currency} onChange={e => setDraft({...draft, currency: e.target.value})}>
                            <option value="USD">USD ($)</option>
                            <option value="GHS">GHS (GH₵)</option>
                         </select>
                      </PFormField>
                   </div>
                  
                  <PFormField label="Document Title"><input className="p-inp" placeholder="e.g. Phase 2: Structural Facade Glazing" value={draft.title} onChange={e => setDraft({...draft, title: e.target.value})} /></PFormField>
                  
                  <div style={{ border: '1px solid #F0EBE5', borderRadius: 20, padding: 24, background: '#F8F8FD' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h4 className="lxf" style={{ fontSize: 11, textTransform: 'uppercase', color: '#9B99C8', letterSpacing: 1 }}>Line Item Breakdown</h4>
                        <button onClick={() => setDraft({...draft, items: [...draft.items, {id: Date.now(), desc:'', qty:1, rate:0, unit: draft.invoiceType === 'unit' ? 'pcs' : 'job'}]})} style={{ background: ac, border: 'none', color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer', padding: '6px 14px', borderRadius: 20 }}>+ ADD BLANK</button>
                     </div>
                     
                     {draft.invoiceType === 'unit' && (
                       <div style={{ marginBottom: 20, padding: 12, background: '#fff', borderRadius: 12, border: '1px solid #eee' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: ac, marginBottom: 12, letterSpacing: 1 }}>SMART COMPONENT SELECTOR</div>
                          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10 }} className="no-scrollbar">
                             {GLASS_CATALOG_DATA.slice(0, 12).map(p => (
                               <button 
                                 key={p.id} 
                                 onClick={() => {
                                   const newItem = {
                                      id: Date.now(),
                                      desc: p.name,
                                      img: p.img,
                                      qty: 1,
                                      rate: p.price || 0,
                                      unit: 'pcs'
                                   };
                                   // If first item is empty, replace it
                                   if (draft.items.length === 1 && !draft.items[0].desc) {
                                      setDraft({...draft, items: [newItem]});
                                   } else {
                                      setDraft({...draft, items: [...draft.items, newItem]});
                                   }
                                 }}
                                 style={{ 
                                   flex: '0 0 120px', height: 140, background: '#F4F4FA', borderRadius: 12, border: 'none', 
                                   display: 'flex', flexDirection: 'column', padding: 10, cursor: 'pointer', transition: 'all 0.3s'
                                 }}
                                 className="hover-lift"
                               >
                                  <img src={p.img} style={{ width: '100%', height: 60, objectFit: 'contain', marginBottom: 8 }} alt={p.name} />
                                  <div style={{ fontSize: 9, fontWeight: 800, textAlign: 'left', lineHeight: 1.2, height: 22, overflow: 'hidden' }}>{p.name}</div>
                                  <div style={{ fontSize: 10, fontWeight: 900, color: ac, marginTop: 'auto', textAlign: 'left' }}>${p.price}</div>
                               </button>
                             ))}
                          </div>
                       </div>
                     )}

                     {draft.items.map((it, idx) => (
                       <div key={it.id} style={{ display: 'grid', gridTemplateColumns: `1fr 70px ${draft.invoiceType === 'unit' ? '70px' : ''} 120px 40px`, gap: 12, marginBottom: 12 }}>
                          <input className="p-inp" placeholder="Description" value={it.desc} onChange={e => { const ni = [...draft.items]; ni[idx].desc = e.target.value; setDraft({...draft, items: ni}); }} />
                          <input className="p-inp" type="number" placeholder="Qty" value={it.qty} onChange={e => { const ni = [...draft.items]; ni[idx].qty = parseFloat(e.target.value); setDraft({...draft, items: ni}); }} />
                          {draft.invoiceType === 'unit' && <input className="p-inp" placeholder="Unit" value={it.unit} onChange={e => { const ni = [...draft.items]; ni[idx].unit = e.target.value; setDraft({...draft, items: ni}); }} />}
                          <input className="p-inp" type="number" placeholder="Rate" value={it.rate} onChange={e => { const ni = [...draft.items]; ni[idx].rate = parseFloat(e.target.value); setDraft({...draft, items: ni}); }} />
                          <button onClick={() => setDraft({...draft, items: draft.items.filter(x => x.id !== it.id)})} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', opacity: draft.items.length > 1 ? 1 : 0.2 }} disabled={draft.items.length <= 1}><Trash2 size={16}/></button>
                       </div>
                     ))}
                     <div style={{ marginTop: 20, paddingTop: 20, borderTop: '2px solid #F0EBE5', textAlign: 'right' }}>
                        <span style={{ fontSize: 12, color: '#9B99C8', marginRight: 12 }}>Total billable ({draft.currency}):</span>
                        <span style={{ fontSize: 24, fontWeight: 900, color: '#0D0B2E' }}>{formatMoney(calculateTotal(draft.items), draft.currency)}</span>
                     </div>
                  </div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div className="p-card" style={{ padding: 24, background: '#F4F4FA', border: '1px solid #E0DDD8', position: 'sticky', top: 0 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 className="lxf" style={{ fontSize: 11, textTransform: 'uppercase', color: '#9B99C8' }}>Real-time Preview</h4>
                        <div style={{ fontSize: 9, background: '#0D0B2E', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>{finSettings.invoiceTheme.toUpperCase()}</div>
                     </div>
                     <div style={{ transform: 'scale(0.38)', transformOrigin: 'top left', width: '263%', border: '1px solid #ddd', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
                        <InvoiceDocument inv={draft} isQuote={showAdd === 'quotation'} finSettings={finSettings} ac={ac} brand={brand} />
                     </div>
                     <div style={{ marginTop: 420 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                           <button onClick={async () => {
                             try {
                               notify('pending', 'Sending via email...');
                               await Promise.resolve(); // placeholder until email fn is wired
                               notify('info', 'PDF Engine: Connecting to Firebase Functions...');
                             } catch (e) {
                               notify('error', 'Email delivery failed: ' + e.message);
                             }
                           }} className="p-btn-dark" style={{ padding: 16, borderRadius: 16, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Mail size={16} /> Email to Client</button>
                           <button onClick={async () => {
                             try {
                               const msg = `Hello, your ${showAdd} from Westline Future for ${draft.title} is ready. Total: ${formatMoney(calculateTotal(draft.items), draft.currency)}`;
                               if (props.sendWhatsAppUpdate) await props.sendWhatsAppUpdate(draft.clientPhone || draft.projectId, draft.projectId, msg);
                               notify('success', 'WhatsApp message sent');
                             } catch (e) {
                               notify('error', 'WhatsApp delivery failed: ' + e.message);
                             }
                           }} className="p-btn-gold" style={{ padding: 16, borderRadius: 16, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><MessageSquare size={16} /> Share WhatsApp</button>
                        </div>
                        <button 
                            onClick={() => {
                               const printContent = document.getElementById('printable-financial');
                               if (!printContent) return;
                               const safeTitle = (draft.title || '').replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' })[c]);
                               const safeMode = (showAdd || '').replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' })[c]);
                               const safeBody = DOMPurify.sanitize(printContent.innerHTML);
                               const win = window.open('', '_blank');
                               win.document.write(`
                                  <html>
                                     <head>
                                        <title>${safeTitle} - ${safeMode.toUpperCase()}</title>
                                        <style>
                                           @page { size: A4; margin: 0; }
                                           body { margin: 0; font-family: sans-serif; }
                                           #printable-financial { width: 210mm !important; min-height: 297mm !important; border: none !important; margin: 0 !important; box-shadow: none !important; padding: 40px !important; }
                                           @media print { button { display: none !important; } }
                                        </style>
                                     </head>
                                     <body>
                                        <div style="width: 210mm; margin: 0 auto;">${safeBody}</div>
                                        <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };<\/script>
                                     </body>
                                  </html>
                               `);
                               win.document.close();
                            }} 
                            className="p-btn-light" 
                            style={{ width: '100%', padding: 16, borderRadius: 16, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800 }}
                         >
                            <Download size={16} /> Premium PDF Export
                         </button>
                        <button onClick={issueDocument} className="p-btn-dark" style={{ width: '100%', padding: 18, background: '#16A34A', border: 'none', borderRadius: 16, fontSize: 14, fontWeight: 800 }}>Confirm & Issue Official {showAdd}</button>
                      </div>
                  </div>
               </div>
            </div>
         </Modal>
       )}
    </div>
  );
}
