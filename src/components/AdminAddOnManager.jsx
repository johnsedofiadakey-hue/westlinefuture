import React, { useState } from 'react';
import { Plus, CheckCircle2, FileText, AlertCircle, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';

export default function AdminAddOnManager({ project, brand, addOns = [], invoices = [], createInvoice }) {
  const ac = brand?.color || 'var(--accent-secondary)';
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const projectAddOns = addOns.filter(a => a.projectId === project?.id);

  const handleCreateAddOn = async () => {
    if (!title || !amount) return;
    setLoading(true);
    try {
      // 1. Create the Invoice for the Add-on
      const invoicePayload = {
        title: `Add-On: ${title}`,
        clientId: project.clientId,
        client: project.clientName || 'Client',
        projectId: project.id,
        amount: parseFloat(amount),
        total: parseFloat(amount),
        status: 'Pending',
        type: 'Invoice',
        currency: 'GHS',
        items: [{ desc: title, qty: 1, rate: parseFloat(amount), total: parseFloat(amount) }],
        date: new Date().toISOString().slice(0, 10),
      };
      const invId = await createInvoice(invoicePayload);

      // 2. Add to addOns collection
      await addDoc(collection(db, 'addOns'), {
        projectId: project.id,
        clientId: project.clientId,
        title,
        description,
        amount: parseFloat(amount),
        linkedInvoiceId: invId,
        status: 'Pending Payment',
        createdAt: serverTimestamp()
      });

      setShowAdd(false);
      setTitle('');
      setDescription('');
      setAmount('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this add-on? Make sure to also delete the associated invoice if needed.")) return;
    try {
      await deleteDoc(doc(db, 'addOns', id));
    } catch(e) { console.error(e); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="lxfh" style={{ fontSize: 18, fontWeight: 800 }}>Project Add-Ons</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Track scope expansions and extra billing outside the original quote.</div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ background: ac, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <Plus size={16} /> New Add-On
        </button>
      </div>

      {showAdd && (
        <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
          <div className="lxfh" style={{ fontSize: 16, marginBottom: 16 }}>Create Project Add-On</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <div className="p-field">
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Add-On Title</label>
              <input className="p-inp" placeholder="e.g. Extra Glass Panel" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="p-field">
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount (GHS)</label>
              <input type="number" className="p-inp" placeholder="e.g. 1500" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="p-field">
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Notes / Description</label>
              <textarea className="p-inp" placeholder="Details about this extra requirement..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <button onClick={handleCreateAddOn} disabled={loading || !title || !amount} style={{ marginTop: 20, background: '#111', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', opacity: (loading || !title || !amount) ? 0.5 : 1 }}>
            {loading ? 'Processing...' : 'Create Invoice & Add-On'}
          </button>
        </div>
      )}

      {projectAddOns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: 'var(--bg-secondary)', borderRadius: 16, border: '1px dashed var(--border-color)' }}>
          <div className="lxfh" style={{ fontSize: 15 }}>No Add-Ons</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No extra scope additions have been recorded for this project.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projectAddOns.map(addon => {
            const linkedInv = invoices.find(i => i.id === addon.linkedInvoiceId);
            const isPaid = linkedInv && linkedInv.status === 'Paid';
            const statusColor = isPaid ? '#10B981' : '#F59E0B';

            return (
              <div key={addon.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: isPaid ? '#F0FDF4' : '#FFFBEB', color: statusColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isPaid ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                  </div>
                  <div>
                    <div className="lxfh" style={{ fontSize: 15, fontWeight: 700 }}>{addon.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Amount: GHS {addon.amount?.toLocaleString()} &middot; Invoice: {linkedInv?.invoiceNo || 'INV'} ({linkedInv?.status})
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, background: `${statusColor}15`, color: statusColor, textTransform: 'uppercase' }}>
                    {isPaid ? 'Paid & Approved' : 'Awaiting Payment'}
                  </div>
                  <button onClick={() => handleDelete(addon.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 8 }}>
                    <Trash2 size={16} />
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
