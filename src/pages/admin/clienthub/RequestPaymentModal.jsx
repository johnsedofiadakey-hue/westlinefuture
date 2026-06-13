import React, { useState } from 'react';
import { X, Bell, Loader2 } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function RequestPaymentModal({ client, project, invoices, onClose, notify, ac }) {
  const unpaidInvoices = (invoices || []).filter(inv => inv.projectId === project?.id && ['Pending', 'Partially Paid', 'Sent'].includes(inv.status));
  const [selectedInvId, setSelectedInvId] = useState(unpaidInvoices.length > 0 ? unpaidInvoices[0].id : '');
  const [sending, setSending] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  const handleSendReminder = async () => {
    if (!selectedInvId && unpaidInvoices.length > 0) return;
    setSending(true);
    try {
      const inv = unpaidInvoices.find(i => i.id === selectedInvId);
      const amountDue = inv ? (Number(inv.total || 0) - Number(inv.paidAmount || 0)) : 0;
      
      const msgText = customMsg.trim() || 
        (inv ? `🔔 **Payment Reminder**\nThis is a friendly reminder that a payment of **GHS ${amountDue.toLocaleString()}** is due for Invoice WF-${(inv.id || '').slice(-8).toUpperCase()}. Please complete your payment via your client portal to avoid project delays.` 
             : `🔔 **Payment Reminder**\nPlease check your client portal for outstanding payments to ensure your project stays on schedule.`);

      await addDoc(collection(db, 'clients', client.id, 'messages'), {
        text: msgText,
        senderRole: 'system',
        senderName: 'Billing System',
        isInternal: false,
        createdAt: serverTimestamp(),
        projectId: project?.id || null,
        projectTitle: project?.title || null
      });

      // Notification
      await addDoc(collection(db, 'notifications'), {
        userId: client.id,
        title: 'Payment Reminder',
        message: 'A payment reminder was sent regarding your project.',
        type: 'payment_reminder',
        link: `/portal/financials`,
        read: false,
        createdAt: serverTimestamp()
      });

      notify?.('success', 'Payment reminder sent to client');
      onClose();
    } catch (err) {
      console.error(err);
      notify?.('error', 'Failed to send reminder');
    }
    setSending(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: '#fff', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', animation: 'scaleUp .3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)' }}>Request Payment</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Send a reminder to the client</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--bg-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {unpaidInvoices.length > 0 ? (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Select Unpaid Invoice</label>
              <select 
                value={selectedInvId} 
                onChange={e => setSelectedInvId(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 14, outline: 'none' }}
              >
                {unpaidInvoices.map(inv => {
                  const due = Number(inv.total || 0) - Number(inv.paidAmount || 0);
                  return (
                    <option key={inv.id} value={inv.id}>
                      {inv.title || inv.type} — GHS {due.toLocaleString()} Due (WF-{inv.id.slice(-8).toUpperCase()})
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div style={{ padding: 16, background: '#FEF3C7', color: '#92400E', borderRadius: 12, fontSize: 13, fontWeight: 500 }}>
              There are no unpaid invoices for this project. You can still send a general payment reminder.
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Custom Message (Optional)</label>
            <textarea
              value={customMsg}
              onChange={e => setCustomMsg(e.target.value)}
              placeholder="Add a personalized note to the reminder..."
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 14, minHeight: 100, outline: 'none', resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: 12, background: 'var(--bg-secondary)', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
          <button 
            onClick={handleSendReminder}
            disabled={sending}
            style={{ padding: '12px 24px', borderRadius: 12, background: ac, border: 'none', fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: sending ? 0.7 : 1 }}
          >
            {sending ? <Loader2 size={16} className="spin" /> : <Bell size={16} />}
            Send Reminder
          </button>
        </div>
      </div>
    </div>
  );
}
