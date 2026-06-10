import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Download, X, Loader2, CheckCircle2, CreditCard, Trash2 } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { printInvoiceOrReceipt, printSignedContractDoc } from './print';

// ─── Project Invoices & Billing Ledger ───────────────────────────────────────
export function ProjectInvoicesLedger({ project, client, invoices, brand, updateInvoice, deleteInvoice, notify, user }) {
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [confirmDeleteInvId, setConfirmDeleteInvId] = useState(null);

  const projectInvoices = (invoices || []).filter(inv => inv.parentId === project.id);

  // Project-level financial totals for the "Project Financial Position" strip in the PDF
  const projBudget   = Number(project.budget || project.projectTotal || 0);
  const projBilled   = projectInvoices.reduce((s, i) => s + Number(i.amount || i.total || 0), 0);
  const projReceived = projectInvoices.reduce((s, i) => s + Number(i.paidAmount || i.amountPaid || 0), 0);

  const openPaymentModal = (inv) => {
    setPayingInvoice(inv);
    const balance = Math.max(0, Number(inv.amount || inv.total || 0) - Number(inv.paidAmount || 0));
    setPayAmt(balance.toString());
    setPayNote(`Payment received against Invoice WF-${(inv.id || '').slice(-8).toUpperCase()}`);
  };

  const handleRecordPayment = async () => {
    if (!payingInvoice || !payAmt || Number(payAmt) <= 0 || savingPayment) return;
    setSavingPayment(true);
    try {
      const amount = Number(payAmt);
      const fxRate = Number(brand?.exchangeRate) || 15.5;
      const amountInGhs = payingInvoice.currency === 'USD' ? amount * fxRate : amount;

      await addDoc(collection(db, 'projects', project.id, 'transactions'), {
        amount: amountInGhs,
        description: payNote.trim() || 'Payment received',
        date: payDate,
        projectId: project.id,
        type: 'payment',
        createdAt: serverTimestamp(),
      });

      const newPaid = Number(payingInvoice.paidAmount || 0) + amount;
      const newStatus = newPaid >= Number(payingInvoice.total || 0) ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Pending';

      await updateInvoice(payingInvoice.id, {
        paidAmount: newPaid,
        status: newStatus
      });

      await updateDoc(doc(db, 'projects', project.id), {
        paidAmount: (Number(project.paidAmount) || 0) + amountInGhs
      });

      notify?.('success', 'Payment logged and project economics reconciled successfully');
      setPayingInvoice(null);
    } catch (err) {
      console.error(err);
      notify?.('error', 'Failed to log payment');
    }
    setSavingPayment(false);
  };

  const handleDelete = (invId) => setConfirmDeleteInvId(invId);

  const confirmDeleteInvoice = async () => {
    const invId = confirmDeleteInvId;
    setConfirmDeleteInvId(null);
    try {
      await deleteInvoice(invId);
    } catch (err) {
      console.error(err);
      notify?.('error', 'Failed to delete invoice');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)', marginTop: 16 }}>

      {project.quoteApproved && (
        <div style={{
          display: 'flex', justifyItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: '#FDFBF7', border: '1px solid #C5A880', borderRadius: 12, marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, background: '#F4EFE6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={18} color="#C5A880" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#4A3B32' }}>Legally Executed E-Contract Vault</div>
              <div style={{ fontSize: 11, color: '#716259', fontWeight: 600 }}>Secured via Carrier SMS OTP Authentications</div>
            </div>
          </div>
          <button
            onClick={() => printSignedContractDoc(project, user, brand)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
              background: '#4A3B32', color: '#fff', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer'
            }}
          >
            <Download size={14} /> Download Signed Contract (PDF)
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent-secondary)' }}>Project Invoices & Billing Ledger</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Official historical logs of billing documents</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8 }}>
          {projectInvoices.length} billing records
        </div>
      </div>

      {projectInvoices.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ref Number</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Title</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Issue Date</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Due Date</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Outstanding</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projectInvoices.map((inv) => {
                const currency = inv.currency || 'GHS';
                const symbol = currency === 'USD' ? '$' : 'GH₵';
                const total = Number(inv.amount || inv.total || 0);
                const paid = Number(inv.paidAmount || inv.amountPaid || 0);
                const balance = Math.max(0, total - paid);

                const status = (inv.status || 'Pending').toLowerCase();
                const badgeStyle = status === 'paid'
                  ? { background: '#D1FAE5', color: '#065F46' }
                  : status === 'partially paid'
                    ? { background: '#FEF3C7', color: '#92400E' }
                    : { background: '#F3F4F6', color: '#374151' };

                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover-row">
                    <td style={{ padding: '14px 10px', fontSize: 12, fontWeight: 800, color: 'var(--accent-secondary)' }}>
                      WF-${(inv.id || '').slice(-8).toUpperCase()}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: 12, color: 'var(--accent-secondary)' }}>
                      {inv.title}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {inv.date}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {inv.due || '—'}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: 12, fontWeight: 800, color: 'var(--accent-secondary)', textAlign: 'right' }}>
                      {symbol} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 10px', fontSize: 12, fontWeight: 800, color: balance > 0 ? '#DC2626' : '#16A34A', textAlign: 'right' }}>
                      {symbol} {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, ...badgeStyle }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>

                        <button
                          onClick={() => printInvoiceOrReceipt({
                            ...inv,
                            // Client identity — invoice first → client object → project fallback
                            clientName:    inv.clientName    || client?.name          || project.clientName || project.client,
                            clientPhone:   inv.clientPhone   || client?.phone         || project.clientPhone   || '',
                            clientEmail:   inv.clientEmail   || client?.email         || client?.proxyEmail || project.clientEmail || '',
                            clientAddress: inv.clientAddress || client?.address       || client?.location   || project.clientAddress || '',
                            clientCompany: inv.clientCompany || client?.company       || project.clientCompany || '',
                            projectTitle:  inv.projectTitle  || project.title         || project.project,
                            amount: total,
                            total,
                            paidAmount: paid,
                            // Project-level financial position for the PDF summary strip
                            projectBudget:   projBudget,
                            projectBilled:   projBilled,
                            projectReceived: projReceived,
                          }, brand)}
                          title="Print / Export PDF"
                          style={{ border: 'none', background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Download size={13} color="var(--text-secondary)" />
                        </button>

                        {balance > 0 && (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            title="Quick Settle / Record Payment"
                            style={{ border: 'none', background: '#D1FAE5', padding: '6px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <CreditCard size={13} color="#065F46" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(inv.id)}
                          title="Delete Document"
                          style={{ border: 'none', background: '#FEE2E2', padding: '6px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={13} color="#DC2626" />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 12 }}>
          No invoices or billing records have been generated for this project yet.
        </div>
      )}

      {payingInvoice && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(24, 14, 6, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFF', borderRadius: 20, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 20px 45px rgba(0,0,0,0.15)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#4A3B32' }}>Quick Record Payment</div>
                <div style={{ fontSize: 11, color: '#8C6C52', fontWeight: 700 }}>Invoice: WF-${(payingInvoice.id || '').slice(-8).toUpperCase()}</div>
              </div>
              <button onClick={() => setPayingInvoice(null)} style={{ border: 'none', background: '#F4EFE6', padding: 6, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={15} color="#4A3B32" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Payment Amount ({payingInvoice.currency || 'GHS'})</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmt}
                  onChange={e => setPayAmt(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 13, background: '#FFF', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Payment Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 13, background: '#FFF', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#716259', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Description / Note</label>
                <input
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #F4EFE6', fontSize: 13, background: '#FFF', outline: 'none' }}
                  placeholder="e.g. Settle balance via bank transfer"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleRecordPayment}
                disabled={savingPayment || !payAmt}
                style={{ flex: 1, padding: '12px', borderRadius: 10, background: '#16A34A', color: '#fff', border: 'none', fontSize: 12, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {savingPayment ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />} Log Payment
              </button>
              <button onClick={() => setPayingInvoice(null)} style={{ padding: '12px 18px', borderRadius: 10, background: '#F4EFE6', color: '#4A3B32', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>

          </div>
        </div>, document.body
      )}

      {confirmDeleteInvId && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Delete Invoice?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>This will permanently remove it from the billing ledger. This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteInvId(null)} style={{ flex: 1, height: 44, borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteInvoice} style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
