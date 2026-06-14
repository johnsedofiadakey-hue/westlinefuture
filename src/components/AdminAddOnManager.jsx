import React, { useState } from 'react';
import { Plus, CheckCircle2, FileText, AlertCircle, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';

export default function AdminAddOnManager({ project, brand, addOns = [], invoices = [] }) {
  const ac = brand?.color || 'var(--accent-secondary)';
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('general');

  const projectAddOns = addOns.filter(a => a.projectId === project?.id);

  const handleCreateAddOn = async () => {
    if (!title || !amount) return;
    setLoading(true);
    try {
      const addOnRef = await addDoc(collection(db, 'addOns'), {
        projectId: project.id,
        clientId: project.clientId,
        title,
        description,
        amount: parseFloat(amount),
        category,
        isInstallationInvoice: category === 'installation',
        status: 'Pending Approval',
        createdAt: serverTimestamp()
      });

      const clientLink = `/portal?projectId=${encodeURIComponent(project.id)}&tab=financials&addOnId=${encodeURIComponent(addOnRef.id)}`;
      const notificationMessage = `A proposed add-on, "${title}", requires your approval. Review the scope and price of GH₵ ${parseFloat(amount).toLocaleString()}. An invoice is created only after approval.`;

      if (project.clientId) {
        await Promise.all([
          addDoc(collection(db, 'notifications'), {
            userId: project.clientId,
            clientId: project.clientId,
            title: 'Add-on approval required',
            message: notificationMessage,
            msg: notificationMessage,
            type: 'add_on_approval',
            link: clientLink,
            projectId: project.id,
            addOnId: addOnRef.id,
            read: false,
            createdAt: serverTimestamp(),
          }),
          addDoc(collection(db, 'clients', project.clientId, 'messages'), {
            text: `**Add-on approval required**\n${title} — **GH₵ ${parseFloat(amount).toLocaleString()}**\nReview the proposed scope in Financials. An invoice is issued only after you approve it.`,
            senderRole: 'system',
            senderId: 'system',
            senderName: 'Westline Future Billing',
            isInternal: false,
            readByAdmin: true,
            readByClient: false,
            projectId: project.id,
            addOnId: addOnRef.id,
            link: clientLink,
            createdAt: serverTimestamp(),
          }),
        ]);
      }

      setShowAdd(false);
      setTitle('');
      setDescription('');
      setAmount('');
      setCategory('general');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => setConfirmDeleteId(id);

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
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
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Add-On Type</label>
              <select className="p-inp" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="general">General Scope Add-On</option>
                <option value="installation">Installation Service</option>
              </select>
              {category === 'installation' && (
                <div style={{ marginTop: 7, fontSize: 11, lineHeight: 1.5, color: '#92400E' }}>
                  This creates the separate installation-service invoice. It must be approved and paid before installation can begin.
                </div>
              )}
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
            {loading ? 'Sending...' : 'Send Add-On for Approval'}
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
            const isPaid = linkedInv && ['paid', 'paid in full'].includes(String(linkedInv.status || '').toLowerCase().trim());
            const awaitingApproval = String(addon.status || '').toLowerCase() === 'pending approval';
            const statusColor = isPaid ? '#10B981' : awaitingApproval ? '#2563EB' : '#F59E0B';

            return (
              <div key={addon.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: isPaid ? '#F0FDF4' : '#FFFBEB', color: statusColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isPaid ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                  </div>
                  <div>
                    <div className="lxfh" style={{ fontSize: 15, fontWeight: 700 }}>{addon.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {addon.isInstallationInvoice || addon.category === 'installation' ? 'Installation service · ' : ''}
                      Amount: GHS {addon.amount?.toLocaleString()} &middot; {linkedInv ? `Invoice: ${linkedInv.invoiceNo || 'INV'} (${linkedInv.status})` : 'Invoice created after client approval'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, background: `${statusColor}15`, color: statusColor, textTransform: 'uppercase' }}>
                    {isPaid ? 'Paid & Approved' : awaitingApproval ? 'Awaiting Approval' : addon.status || 'Awaiting Payment'}
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
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Delete Add-On?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Make sure to also delete the associated invoice if it was already created.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, height: 44, borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
