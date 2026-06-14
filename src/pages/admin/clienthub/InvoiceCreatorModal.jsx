import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Search, CheckCircle2, Trash2 } from 'lucide-react';
import { PREMIUM_CATALOG } from './config.jsx';
import { printInvoiceOrReceipt } from './print';

// ─── Itemized Invoice Creator Modal ──────────────────────────────────────────
export function InvoiceCreatorModal({ project, brand, createInvoice, onClose, notify }) {
  const [docTitle, setDocTitle] = useState(`Invoice — ${project.title || project.name}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [due, setDue] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('GHS');
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('Please pay all balances within the specified period. Sourcing and production timelines are contingent on cleared deposits. For international payments, contact accounts.');
  const [items, setItems] = useState([{ id: Date.now(), desc: '', qty: 1, rate: 0, unit: 'sqm' }]);
  const [catSearch, setCatSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const addItem = () => {
    setItems([...items, { id: Date.now(), desc: '', qty: 1, rate: 0, unit: 'sqm' }]);
  };

  const removeItem = (id) => {
    if (items.length === 1) {
      setItems([{ id: Date.now(), desc: '', qty: 1, rate: 0, unit: 'sqm' }]);
    } else {
      setItems(items.filter(it => it.id !== id));
    }
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(it => {
      if (it.id === id) {
        return { ...it, [field]: value };
      }
      return it;
    }));
  };

  const addCatalogItem = (catItem) => {
    const newItem = {
      id: Date.now(),
      desc: catItem.name,
      qty: 1,
      rate: catItem.price,
      unit: catItem.unit
    };
    if (items.length === 1 && !items[0].desc.trim()) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
    notify?.('success', `Added ${catItem.name} to invoice`);
  };

  const subtotal = items.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.rate || 0)), 0);
  const taxAmount = (subtotal * Number(taxRate || 0)) / 100;
  const totalAmount = subtotal + taxAmount;

  const handleIssue = async () => {
    if (!project?.clientId) { notify?.('error', 'Project must have a client set'); return; }
    const validItems = items.filter(it => it.desc.trim() && Number(it.qty) > 0);
    if (validItems.length === 0) {
      notify?.('error', 'Please enter at least one valid line item');
      return;
    }

    try {
      const invoiceData = {
        projectId: project.id,
        clientId: project.clientId,
        clientName: project.name || project.title || 'Client',
        clientEmail: project.email || '',
        clientPhone: project.phone || '',
        title: docTitle.trim(),
        currency,
        date,
        due,
        items: validItems.map(it => ({
          desc: it.desc.trim(),
          qty: Number(it.qty) || 1,
          rate: Number(it.rate) || 0,
          unit: it.unit || 'pcs'
        })),
        taxRate: Number(taxRate) || 0,
        total: totalAmount,
        paidAmount: 0,
        status: 'Pending',
        type: 'Invoice',
        notes: notes.trim(),
        parentId: project.id,
      };

      const invId = await createInvoice(invoiceData);

      printInvoiceOrReceipt({ ...invoiceData, id: invId }, brand);
      onClose();
    } catch (err) {
      console.error(err);
      notify?.('error', 'Failed to generate invoice');
    }
  };

  const filteredCatalog = PREMIUM_CATALOG.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(catSearch.toLowerCase()) || p.category.toLowerCase().includes(catSearch.toLowerCase());
    const matchesFilter = catFilter === 'All' || p.category === catFilter;
    return matchesSearch && matchesFilter;
  });

  const categories = ['All', 'Glass', 'Profiles', 'Washrooms', 'Kitchens', 'Doors'];

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(24, 14, 6, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#FFF', borderRadius: 24, width: '95vw', maxWidth: 1100, height: '90vh', display: 'flex', flexDirection: 'row', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>

        {/* Workspace */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 32, overflowY: 'auto' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#4A3B32' }}>Create New Official Invoice</div>
              <div style={{ fontSize: 11, color: '#8C6C52', fontWeight: 600 }}>Project: {project.title || project.name}</div>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: '#F4EFE6', padding: 8, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#4A3B32" />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Document Title</label>
              <input value={docTitle} onChange={e => setDocTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 12, background: '#FFF', outline: 'none' }} placeholder="e.g. Deposit Payment" />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Issue Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 12, background: '#FFF', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Due Date</label>
              <input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 12, background: '#FFF', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Billing Currency</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['GHS', 'USD'].map(curr => (
                  <button key={curr} type="button" onClick={() => setCurrency(curr)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${currency === curr ? '#4A3B32' : '#F4EFE6'}`, background: currency === curr ? '#4A3B32' : '#FFF', color: currency === curr ? '#FFF' : '#4A3B32', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                    {curr === 'GHS' ? 'GH₵ (GHS)' : '$ (USD)'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Tax Rate (%)</label>
              <input type="number" min="0" max="100" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 12, background: '#FFF', outline: 'none' }} placeholder="e.g. 15" />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#4A3B32', textTransform: 'uppercase', letterSpacing: 0.5 }}>Billable Line Items</div>
              <button type="button" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: '#F4EFE6', color: '#4A3B32', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                <Plus size={14} /> Add Custom Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((it, idx) => (
                <div key={it.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 24, fontSize: 11, fontWeight: 800, color: '#8C6C52', textAlign: 'center' }}>{idx + 1}</div>
                  <input value={it.desc} onChange={e => updateItem(it.id, 'desc', e.target.value)} style={{ flex: 3, padding: '9px 12px', borderRadius: 8, border: '1px solid #F4EFE6', fontSize: 12, outline: 'none' }} placeholder="Item description" />
                  <input type="number" min="1" value={it.qty} onChange={e => updateItem(it.id, 'qty', Number(e.target.value))} style={{ flex: 0.8, padding: '9px 12px', borderRadius: 8, border: '1px solid #F4EFE6', fontSize: 12, outline: 'none', textAlign: 'center' }} placeholder="Qty" />
                  <input value={it.unit} onChange={e => updateItem(it.id, 'unit', e.target.value)} style={{ flex: 0.8, padding: '9px 12px', borderRadius: 8, border: '1px solid #F4EFE6', fontSize: 12, outline: 'none', textAlign: 'center' }} placeholder="Unit" />
                  <input type="number" min="0" value={it.rate} onChange={e => updateItem(it.id, 'rate', Number(e.target.value))} style={{ flex: 1.5, padding: '9px 12px', borderRadius: 8, border: '1px solid #F4EFE6', fontSize: 12, outline: 'none', textAlign: 'right' }} placeholder="Rate" />
                  <div style={{ flex: 1.2, padding: '9px 12px', background: '#F4EFE650', borderRadius: 8, fontSize: 12, fontWeight: 800, color: '#4A3B32', textAlign: 'right' }}>
                    {(currency === 'USD' ? '$' : 'GH₵') + ' ' + (Number(it.qty || 0) * Number(it.rate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <button type="button" onClick={() => removeItem(it.id)} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={15} color="#DC2626" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F4EFE6', paddingTop: 24, marginTop: 'auto' }}>
            <div style={{ width: '50%' }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Invoice Terms & Instructions</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', height: 80, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 11, background: '#FFF', outline: 'none', resize: 'none', lineHeight: 1.5 }} />
            </div>
            <div style={{ width: '40%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F4EFE6', fontSize: 12 }}>
                <span style={{ color: '#716259' }}>Subtotal</span>
                <span style={{ fontWeight: 700, color: '#4A3B32' }}>{currency === 'USD' ? '$' : 'GH₵'} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {taxRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F4EFE6', fontSize: 12 }}>
                  <span style={{ color: '#716259' }}>Taxes ({taxRate}%)</span>
                  <span style={{ fontWeight: 700, color: '#4A3B32' }}>{currency === 'USD' ? '$' : 'GH₵'} {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '2px solid #C5A880', fontSize: 14, fontWeight: 900, marginBottom: 20 }}>
                <span style={{ color: '#4A3B32' }}>Total Amount</span>
                <span style={{ color: '#4A3B32' }}>{currency === 'USD' ? '$' : 'GH₵'} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <button type="button" onClick={handleIssue} style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#16A34A', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> Issue & Print Official Invoice
              </button>
            </div>
          </div>

        </div>

        {/* Catalog Sidebar */}
        <div style={{ width: 320, borderLeft: '1px solid #E5E5E5', background: '#FDFBF7', padding: 24, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#4A3B32', marginBottom: 14, letterSpacing: 0.5, textTransform: 'uppercase' }}>Materials Catalog</div>

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8C6C52' }} />
            <input value={catSearch} onChange={e => setCatSearch(e.target.value)} placeholder="Search catalog..." style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid #F4EFE6', fontSize: 12, outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{ padding: '4px 10px', borderRadius: 100, border: 'none', fontSize: 10, fontWeight: 800, cursor: 'pointer', background: catFilter === cat ? '#4A3B32' : '#F4EFE6', color: catFilter === cat ? '#FFF' : '#4A3B32' }}>
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredCatalog.map(p => (
              <button key={p.id} onClick={() => addCatalogItem(p)} style={{ width: '100%', padding: 12, background: '#FFF', border: '1px solid #F4EFE6', borderRadius: 12, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, transition: 'all 0.2s' }} className="hover-lift">
                <div style={{ fontSize: 11, fontWeight: 800, color: '#4A3B32' }}>{p.name}</div>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: '#8C6C52', background: '#F4EFE6', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{p.category.toUpperCase()}</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#C5A880' }}>${p.price} <span style={{ fontSize: 8, color: '#716259', fontWeight: 600 }}>/{p.unit}</span></span>
                </div>
              </button>
            ))}
            {filteredCatalog.length === 0 && (
              <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 11, color: '#8C6C52', fontStyle: 'italic' }}>No catalog items found.</div>
            )}
          </div>
        </div>

      </div>
    </div>, document.body
  );
}
