import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Download, X, Loader2, CheckCircle2, CreditCard, Trash2 } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { printInvoiceOrReceipt, printSignedContractDoc } from './print';

// ─── Project Invoices & Billing Ledger ───────────────────────────────────────
export function ProjectInvoicesLedger({ project, client, invoices, brand, updateInvoice, deleteInvoice, notify, user, updateProjectStage, updateProject }) {
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [confirmDeleteInvId, setConfirmDeleteInvId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const projectInvoices = (invoices || []).filter(inv => inv.parentId === project.id || inv.projectId === project.id);
  const verificationPendingInvoices = projectInvoices.filter(inv =>
    inv.awaitingConfirmation === true ||
    String(inv.status || '').toLowerCase() === 'verification pending'
  );

  // Project-level financial totals for the "Project Financial Position" strip in the PDF
  const projBudget   = Number(project.budget || project.projectTotal || 0);
  const projBilled   = projectInvoices.reduce((s, i) => s + Number(i.amount || i.total || 0), 0);
  const projReceived = projectInvoices.reduce((s, i) => s + Number(i.paidAmount || i.amountPaid || 0), 0);

  const openPaymentModal = (inv) => {
    setPayingInvoice(inv);
    const balance = Math.max(0, Number(inv.amount || inv.total || 0) - Number(inv.amountPaid || inv.paidAmount || 0));
    setPayAmt(balance.toString());
    if (inv.awaitingConfirmation === true || inv.status === 'Verification Pending') {
      const methodStr = inv.paymentMethodSubmitted ? `via ${inv.paymentMethodSubmitted}` : '';
      setPayNote(`Verified offline payment ${methodStr}`);
    } else {
      setPayNote(`Payment received against Invoice WF-${(inv.id || '').slice(-8).toUpperCase()}`);
    }
  };

  const handleRecordPayment = async () => {
    if (!payingInvoice || !payAmt || Number(payAmt) <= 0 || savingPayment) return;
    setSavingPayment(true);
    try {
      const amount = Number(payAmt);
      const fxRate = Number(brand?.exchangeRate) || 15.5;
      const amountInGhs = payingInvoice.currency === 'USD' ? amount * fxRate : amount;

      const invoiceRef = doc(db, 'invoices', payingInvoice.id);
      const projectRef = doc(db, 'projects', project.id);
      const transactionRef = doc(collection(db, 'projects', project.id, 'transactions'));
      const globalTransactionRef = doc(db, 'transactions', transactionRef.id);
      const result = await runTransaction(db, async transaction => {
        const [invoiceSnapshot, projectSnapshot] = await Promise.all([
          transaction.get(invoiceRef),
          transaction.get(projectRef),
        ]);
        if (!invoiceSnapshot.exists()) throw new Error('Invoice no longer exists.');
        if (!projectSnapshot.exists()) throw new Error('Project no longer exists.');

        const invoiceData = invoiceSnapshot.data();
        const projectData = projectSnapshot.data();
        const currentPaid = Number(invoiceData.amountPaid || invoiceData.paidAmount || 0);
        const invoiceTotal = Number(invoiceData.amount || invoiceData.total || 0);
        const outstanding = Math.max(0, invoiceTotal - currentPaid);
        if (invoiceTotal > 0 && amount > outstanding + 0.01) {
          throw new Error(`Payment exceeds the remaining invoice balance of ${outstanding.toFixed(2)}.`);
        }
        const newPaid = currentPaid + amount;
        const newStatus = invoiceTotal <= 0 || newPaid >= invoiceTotal - 0.01
          ? 'Paid'
          : 'Partially Paid';
        const description = `${invoiceData.milestoneKey || ''} ${invoiceData.title || ''} ${invoiceData.type || ''}`.toLowerCase();
        const projectFlags = {};
        if (newStatus === 'Paid') {
          if (
            projectData.renderingFeeInvoiceId === payingInvoice.id ||
            description.includes('rendering') ||
            description.includes('design')
          ) {
            projectFlags.renderingFeePaid = true;
            projectFlags.renderingFeePaidAt = serverTimestamp();
            projectFlags.workflowStep = 'site-visit-scheduling';
            projectFlags.nextAction = 'Client or project manager schedules the technical site visit';
          } else if (
            description.includes('initial-deposit') ||
            description.includes('post-rendering') ||
            description.includes('deposit') ||
            description.includes('first instal')
          ) {
            projectFlags.depositPaid = true;
            projectFlags.initialDepositPaid = true;
            projectFlags.depositPaidAt = serverTimestamp();
            projectFlags.initialDepositInvoiceId = payingInvoice.id;
            projectFlags.workflowStep = 'deliverables-approval';
            projectFlags.nextAction = 'Upload the final project deliverables document for client review and signature';
          } else if (
            description.includes('pre-installation-balance') ||
            description.includes('goods balance') ||
            description.includes('ghana arrival') ||
            description.includes('final goods') ||
            description.includes('post-production') ||
            description.includes('production milestone') ||
            description.includes('second instal')
          ) {
            projectFlags.postProductionPaid = true;
            projectFlags.goodsBalancePaid = true;
            projectFlags.postProductionPaidAt = serverTimestamp();
          } else if (
            description.includes('post-shipping') ||
            description.includes('completion') ||
            description.includes('final') ||
            description.includes('settlement')
          ) {
            projectFlags.finalSettlementPaid = true;
            projectFlags.finalSettlementPaidAt = serverTimestamp();
          }
          if (
            invoiceData.isInstallationInvoice === true ||
            invoiceData.paymentPurpose === 'installation' ||
            description.includes('installation service') ||
            description.includes('installation add-on')
          ) {
            projectFlags.installationFeePaid = true;
            projectFlags.installationFeePaidAt = serverTimestamp();
          }
        }

        const transactionData = {
          amount: amountInGhs,
          description: payNote.trim() || 'Payment received',
          date: payDate,
          projectId: project.id,
          parentId: project.id,
          clientId: project.clientId,
          projectManagerId: project.projectManagerId || null,
          invoiceId: payingInvoice.id,
          method: invoiceData.paymentMethodSubmitted || 'Offline',
          status: 'verified',
          type: 'payment',
          verifiedBy: user?.uid || user?.id || 'admin',
          createdAt: serverTimestamp(),
        };

        transaction.set(transactionRef, transactionData);
        transaction.set(globalTransactionRef, {
          ...transactionData,
          projectTransactionId: transactionRef.id,
        });
        transaction.update(invoiceRef, {
          amountPaid: newPaid,
          paidAmount: newPaid,
          status: newStatus,
          awaitingConfirmation: false,
          paymentConfirmedAt: serverTimestamp(),
          paymentConfirmedBy: user?.uid || user?.id || 'admin',
          updatedAt: serverTimestamp(),
        });
        transaction.update(projectRef, {
          paidAmount: Number(projectData.paidAmount || 0) + amountInGhs,
          ...projectFlags,
          updatedAt: serverTimestamp(),
        });
        return { newStatus, projectFlags };
      });

      // Notify client via bell
      await addDoc(collection(db, 'notifications'), {
        userId: project.clientId,
        title: 'Payment Received',
        message: `We've successfully recorded your payment of GHS ${amountInGhs.toLocaleString()} against Invoice WF-${(payingInvoice.id || '').slice(-8).toUpperCase()}.`,
        type: 'payment_received',
        link: `/portal`,
        read: false,
        createdAt: serverTimestamp()
      });

      // System message in chat
      await addDoc(collection(db, 'clients', project.clientId, 'messages'), {
        text: `💰 **Payment Received**\nWe have recorded your payment of **GHS ${amountInGhs.toLocaleString()}** against Invoice WF-${(payingInvoice.id || '').slice(-8).toUpperCase()}. Thank you!`,
        senderRole: 'system',
        senderName: 'Billing System',
        isInternal: false,
        createdAt: serverTimestamp(),
        projectId: project.id,
        projectTitle: project.title
      });

      // Admin notification if large amount or final
      if (amountInGhs > 10000 || (payingInvoice.type || '').toLowerCase().includes('final')) {
        await addDoc(collection(db, 'notifications'), {
          userId: 'admin',
          title: `Large/Final Payment Recorded`,
          message: `GHS ${amountInGhs.toLocaleString()} recorded for ${project.title}`,
          type: 'payment_received',
          link: `/admin/clients?id=${project.clientId}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

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
    <div style={{ padding: isMobile ? 16 : 24, background: '#fff', borderRadius: 18, border: '1px solid var(--border-color)', marginTop: 16 }}>

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

      {verificationPendingInvoices.length > 0 && (() => {
        const pending = verificationPendingInvoices[0];
        const amount = Number(pending.amount || pending.total || 0);
        const method = pending.paymentMethodSubmitted || 'offline payment';
        return (
          <div style={{ marginBottom: 18, padding: 16, borderRadius: 14, background: '#EFF6FF', border: '1.5px solid #93C5FD' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Admin action required</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#1E3A8A', marginBottom: 4 }}>Verify client payment before confirming</div>
                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                  {pending.title || 'Invoice'} · {pending.currency || 'GHS'} {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} · Reported via {method}
                </div>
              </div>
              <button onClick={() => openPaymentModal(pending)} style={{ flexShrink: 0, border: 'none', borderRadius: 10, padding: '9px 14px', background: '#1D4ED8', color: '#fff', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
                Review Payment
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 8 }}>
              {[
                'Check the bank, MoMo, cash receipt, or transfer evidence outside the portal.',
                'Match the payer, amount, reference, payment date, and invoice.',
                'Open Review Payment and record only the amount actually received.',
                'Confirming updates the invoice, ledger, project gate, and client notification.',
              ].map((step, index) => (
                <div key={step} style={{ display: 'flex', gap: 8, padding: 10, borderRadius: 10, background: '#fff', border: '1px solid #DBEAFE' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>{index + 1}</div>
                  <div style={{ fontSize: 10, lineHeight: 1.45, color: '#475569' }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {projectInvoices.length > 0 ? (
        isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projectInvoices.map((inv) => {
              const currency = inv.currency || 'GHS';
              const symbol = currency === 'USD' ? '$' : 'GH₵';
              const total = Number(inv.amount || inv.total || 0);
              const paid = Number(inv.paidAmount || inv.amountPaid || 0);
              const balance = Math.max(0, total - paid);
              const status = (inv.awaitingConfirmation ? 'Verification Pending' : inv.status || 'Pending').toLowerCase();
              const badgeStyle = status === 'paid'
                ? { background: '#D1FAE5', color: '#065F46' }
                : status === 'partially paid'
                  ? { background: '#FEF3C7', color: '#92400E' }
                : status === 'verification pending'
                  ? { background: '#DBEAFE', color: '#1E3A8A', border: '1px solid #93C5FD' }
                  : { background: '#F3F4F6', color: '#374151' };
              return (
                <div key={inv.id} style={{ padding: 14, borderRadius: 14, border: '1px solid var(--border-color)', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-secondary)' }}>WF-${(inv.id || '').slice(-8).toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.title}</div>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, ...badgeStyle }}>{status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <div>Issued {inv.date}</div>
                    <div>Due {inv.due || '—'}</div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-secondary)' }}>{symbol} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ fontWeight: 800, color: balance > 0 ? '#DC2626' : '#16A34A' }}>Bal: {symbol} {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => printInvoiceOrReceipt({
                        ...inv,
                        clientName:    inv.clientName    || client?.name          || project.clientName || project.client,
                        clientPhone:   inv.clientPhone   || client?.phone         || project.clientPhone   || '',
                        clientEmail:   inv.clientEmail   || client?.email         || client?.proxyEmail || project.clientEmail || '',
                        clientAddress: inv.clientAddress || client?.address       || client?.location   || project.clientAddress || '',
                        clientCompany: inv.clientCompany || client?.company       || project.clientCompany || '',
                        projectTitle:  inv.projectTitle  || project.title         || project.project,
                        amount: total,
                        total,
                        paidAmount: paid,
                        projectBudget:   projBudget,
                        projectBilled:   projBilled,
                        projectReceived: projReceived,
                      }, brand)}
                      style={{ flex: 1, border: 'none', background: 'var(--bg-secondary)', padding: '9px 0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}
                    >
                      <Download size={13} /> PDF
                    </button>
                    {balance > 0 && (
                      <button
                        onClick={() => openPaymentModal(inv)}
                        style={{ flex: 1, border: 'none', background: status === 'verification pending' ? '#2563EB' : '#D1FAE5', padding: '9px 0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: status === 'verification pending' ? '#fff' : '#065F46' }}
                      >
                        {status === 'verification pending' ? <CheckCircle2 size={13} /> : <CreditCard size={13} />} {status === 'verification pending' ? 'Verify' : 'Settle'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inv.id)}
                      style={{ border: 'none', background: '#FEE2E2', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={13} color="#DC2626" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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

                const status = (inv.awaitingConfirmation ? 'Verification Pending' : inv.status || 'Pending').toLowerCase();
                const badgeStyle = status === 'paid'
                  ? { background: '#D1FAE5', color: '#065F46' }
                  : status === 'partially paid'
                    ? { background: '#FEF3C7', color: '#92400E' }
                  : status === 'verification pending'
                    ? { background: '#DBEAFE', color: '#1E3A8A', border: '1px solid #93C5FD' }
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
                            title={status === 'verification pending' ? "Verify & Log Payment" : "Quick Settle / Record Payment"}
                            style={{
                              border: 'none',
                              background: status === 'verification pending' ? '#2563EB' : '#D1FAE5',
                              padding: '6px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              animation: status === 'verification pending' ? 'pulse 2s infinite' : 'none'
                            }}
                          >
                            {status === 'verification pending' ? <CheckCircle2 size={13} color="#FFF" /> : <CreditCard size={13} color="#065F46" />}
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
        )
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
                <div style={{ fontSize: 14, fontWeight: 900, color: '#4A3B32' }}>
                  {payingInvoice.awaitingConfirmation === true || payingInvoice.status === 'Verification Pending' ? 'Verify Client Payment' : 'Record Payment'}
                </div>
                <div style={{ fontSize: 11, color: '#8C6C52', fontWeight: 700 }}>Invoice: WF-${(payingInvoice.id || '').slice(-8).toUpperCase()}</div>
              </div>
              <button onClick={() => setPayingInvoice(null)} style={{ border: 'none', background: '#F4EFE6', padding: 6, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={15} color="#4A3B32" />
              </button>
            </div>

            {(payingInvoice.awaitingConfirmation === true || payingInvoice.status === 'Verification Pending') && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: '#FFF7ED', border: '1px solid #FDBA74', color: '#9A3412', fontSize: 11, lineHeight: 1.5, fontWeight: 700 }}>
                Confirm only after matching the payment against your bank, MoMo, cash receipt, or transfer records. The client submission alone is not proof of cleared funds.
              </div>
            )}

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
                {savingPayment ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />}
                {payingInvoice.awaitingConfirmation === true || payingInvoice.status === 'Verification Pending' ? 'Confirm & Record' : 'Record Payment'}
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
