import React, { useState, useEffect, useRef } from 'react';
import {
  Lock, FileText, Download, CheckCircle2, AlertCircle, Send, X,
  PlusCircle, Trash2, Check, Banknote, Building2, Smartphone, Clock, Info
} from 'lucide-react';
import { db, functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  updateDoc, doc, collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, deleteDoc, writeBatch
} from 'firebase/firestore';
import UnifiedPaymentGateway from './UnifiedPaymentGateway';
import blueprintImg from '../assets/architectural_blueprint.png';

export default function ClientRenderingVault({
  project,
  brand,
  renderingPackages = [],
  invoices = [],
  finSettings = {},
}) {
  const ac = brand?.color || 'var(--accent-secondary)';
  const projectPackages = renderingPackages.filter(r => r.projectId === project?.id);
  const parseAmount = (value) => parseFloat(String(value || '0').replace(/[^0-9.]/g, '')) || 0;

  // Phase 3 states
  const [markups, setMarkups] = useState([]);
  const [activePin, setActivePin] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPinText, setNewPinText] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [submittingPin, setSubmittingPin] = useState(false);

  // Simple "Request Changes" modal state
  const [changeRequestPkg, setChangeRequestPkg] = useState(null); // pkg being requested
  const [changeRequestNote, setChangeRequestNote] = useState('');
  const [changeRequestBusy, setChangeRequestBusy] = useState(false);

  // Payment method selection per package: { [pkgId]: 'hubtel' | 'bank' | 'offline' | null }
  const [payMethodMap, setPayMethodMap] = useState({});
  // Offline/bank transfer submitting state per package
  const [paySubmitting, setPaySubmitting] = useState({});
  const [confirmDeletePin, setConfirmDeletePin] = useState(null); // pinId to confirm-delete

  // Sync markups in real-time
  useEffect(() => {
    if (!db || !project?.id) return;
    const q = query(
      collection(db, 'projects', project.id, 'markups'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMarkups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('[ClientRenderingVault] Sync markups failed:', err);
    });
    return unsub;
  }, [project?.id]);

  // ── Post a system message to the client chat thread ──────────────────────
  const postSystemMessage = async (text) => {
    if (!db || !project?.clientId) return;
    try {
      await addDoc(collection(db, 'clients', project.clientId, 'messages'), {
        text,
        senderRole: 'system',
        isInternal: false,
        readByAdmin: false,
        readByClient: true,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[ClientRenderingVault] postSystemMessage failed:', err);
    }
  };

  const handleApprove = async (pkg) => {
    try {
      const submitRenderingDecision = httpsCallable(functions, 'submitRenderingDecision');
      await submitRenderingDecision({
        projectId: project.id,
        packageId: pkg.id,
        action: 'approve',
      });
    } catch (err) {
      console.error('[ClientRenderingVault] Rendering approval failed:', err);
    }
  };

  // ── Simple change request (no pin required) ──────────────────────────────
  const handleChangeRequest = async () => {
    if (!changeRequestPkg || !changeRequestNote.trim() || changeRequestBusy) return;
    setChangeRequestBusy(true);
    try {
      const pkg = changeRequestPkg;
      const submitRenderingDecision = httpsCallable(functions, 'submitRenderingDecision');
      await submitRenderingDecision({
        projectId: project.id,
        packageId: pkg.id,
        action: 'request_changes',
        note: changeRequestNote.trim(),
      });
      setChangeRequestPkg(null);
      setChangeRequestNote('');
    } catch (err) {
      console.error('[ClientRenderingVault] Change request failed:', err);
    } finally {
      setChangeRequestBusy(false);
    }
  };

  // ── Non-Hubtel payment submission ──────────────────────────────────────────
  const handleOfflinePaymentSubmit = async (pkg, linkedInv, method) => {
    if (!linkedInv) return;
    setPaySubmitting(prev => ({ ...prev, [pkg.id]: true }));
    try {
      const submitOfflinePayment = httpsCallable(functions, 'submitOfflinePayment');
      await submitOfflinePayment({
        projectId: project.id,
        invoiceId: linkedInv.id,
        amount: parseAmount(linkedInv.amount || linkedInv.total),
        method: method === 'bank' ? 'bank' : 'cash',
        reference: '',
      });
      const methodLabel = method === 'bank' ? 'bank transfer' : 'offline/in-person payment';
      await postSystemMessage(
        `💳 ${project.clientName || 'Client'} submitted a ${methodLabel} for the rendering fee invoice "${linkedInv.invoiceNumber || 'INV'}" — ${linkedInv.currency || 'GHS'} ${parseAmount(linkedInv.amount || linkedInv.total).toLocaleString()}. Awaiting admin confirmation.`
      );

    } catch (err) {
      console.error('[ClientRenderingVault] Offline payment submit failed:', err);
    } finally {
      setPaySubmitting(prev => ({ ...prev, [pkg.id]: false }));
    }
  };

  const handleImageClick = (e, pkg) => {
    const included = pkg.includedRevisions ?? 3;
    const used = pkg.usedRevisions ?? 0;
    if (used >= included) return; // hard limit — banner already shown
    if (project.changeRequestPending) return; // already on hold
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSelectedCoords({ x, y, packageId: pkg.id });
    setNewPinText('');
    setShowPinModal(true);
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    if (!newPinText.trim() || submittingPin || !selectedCoords) return;
    setSubmittingPin(true);
    try {
      const submitRenderingDecision = httpsCallable(functions, 'submitRenderingDecision');
      await submitRenderingDecision({
        projectId: project.id,
        packageId: selectedCoords.packageId,
        action: 'request_changes',
        note: newPinText.trim(),
        coordinates: {
          x: selectedCoords.x,
          y: selectedCoords.y,
        },
      });

      setShowPinModal(false);
      setSelectedCoords(null);
      setNewPinText('');
    } catch (err) {
      console.error('[ClientRenderingVault] Failed to save pin:', err);
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleDeletePin = async (pinId) => {
    setConfirmDeletePin(pinId);
  };

  const confirmDeletePinAction = async () => {
    const pinId = confirmDeletePin;
    setConfirmDeletePin(null);
    try {
      const deletedPin = markups.find(m => m.id === pinId);
      await deleteDoc(doc(db, 'projects', project.id, 'markups', pinId));
      setActivePin(null);

      // If no open pins remain, lift the project freeze
      const remainingOpen = markups.filter(m => m.id !== pinId && m.status === 'Open');
      if (remainingOpen.length === 0 && project.changeRequestPending) {
        const batch = writeBatch(db);
        batch.update(doc(db, 'projects', project.id), { changeRequestPending: false });
        if (deletedPin?.packageId) {
          batch.update(doc(db, 'renderingPackages', deletedPin.packageId), { status: 'Pending' });
        }
        await batch.commit();
      }
    } catch (err) {
      console.error('[ClientRenderingVault] Delete pin failed:', err);
    }
  };

  const isImageFile = (url) => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.webp') || cleanUrl.endsWith('.gif');
  };

  if (projectPackages.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#fff', borderRadius: 16 }}>
        <FileText size={40} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
        <div className="lxfh" style={{ fontSize: 16 }}>No Design Packages Yet</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Your dedicated design and rendering files will appear here once they are ready.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="lxfh" style={{ fontSize: 18, marginBottom: 8 }}>Design Vault</div>

      {projectPackages.map(pkg => {
        const linkedInv = invoices.find(i => i.id === pkg.linkedInvoiceId || i.renderingPackageId === pkg.id);
        const invPaid = linkedInv && ['paid', 'paid in full'].includes(String(linkedInv.status || '').toLowerCase().trim());
        const isUnlocked = pkg.unlocked || pkg.status === 'Paid / Unlocked' || invPaid;
        const isAwaitingConfirmation = linkedInv?.awaitingConfirmation === true;
        const selectedMethod = payMethodMap[pkg.id] || null;

        // ── LOCKED SCREEN ───────────────────────────────────────────────────
        if (!isUnlocked) {
          const invAmount = parseAmount(linkedInv?.amount || linkedInv?.total);
          const invCurrency = linkedInv?.currency || 'GHS';

          return (
            <div key={pkg.id} style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 20, overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FFFBEB', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Lock size={26} />
                </div>
                <div>
                  <div className="lxfh" style={{ fontSize: 16, fontWeight: 800 }}>{pkg.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                    This design package is locked. Pay the rendering fee to instantly unlock your 3D/CAD files.
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '24px 28px' }}>
                {!linkedInv ? (
                  // No invoice yet — admin hasn't created it
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <Clock size={32} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: 6 }}>Invoice Not Yet Issued</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>The team is preparing your rendering fee invoice. You'll be notified once it's ready to pay.</div>
                  </div>

                ) : isAwaitingConfirmation ? (
                  // Payment submitted — waiting for admin confirmation
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '20px 0', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={28} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: 6 }}>Payment Submitted</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 360 }}>
                        Your payment has been submitted and is awaiting confirmation from the team. Your rendering will unlock automatically once confirmed.
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, padding: '8px 20px', borderRadius: 20, background: '#EFF6FF', color: '#3B82F6' }}>
                      Awaiting Admin Confirmation
                    </div>
                  </div>

                ) : !selectedMethod ? (
                  // Payment method selector
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>Select Payment Method</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: ac, background: `${ac}15`, padding: '4px 12px', borderRadius: 20 }}>
                        {invCurrency} {invAmount.toLocaleString()}
                      </div>
                    </div>

                    {/* Hubtel / Mobile Money */}
                    <button
                      onClick={() => setPayMethodMap(prev => ({ ...prev, [pkg.id]: 'hubtel' }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', border: '1.5px solid var(--border-color)', borderRadius: 14, background: '#FCFAF7', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ac; e.currentTarget.style.background = `${ac}08`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = '#FCFAF7'; }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF3E0', color: '#F57C00', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Smartphone size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>Mobile Money (Hubtel)</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Instant payment via MTN MoMo, Vodafone, or AirtelTigo</div>
                      </div>
                    </button>

                    {/* Bank Transfer */}
                    <button
                      onClick={() => setPayMethodMap(prev => ({ ...prev, [pkg.id]: 'bank' }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', border: '1.5px solid var(--border-color)', borderRadius: 14, background: '#FCFAF7', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ac; e.currentTarget.style.background = `${ac}08`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = '#FCFAF7'; }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E8F5E9', color: '#2E7D32', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>Bank Transfer</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Pay directly to our bank account and notify us</div>
                      </div>
                    </button>

                    {/* Offline / Cash */}
                    <button
                      onClick={() => setPayMethodMap(prev => ({ ...prev, [pkg.id]: 'offline' }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', border: '1.5px solid var(--border-color)', borderRadius: 14, background: '#FCFAF7', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ac; e.currentTarget.style.background = `${ac}08`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = '#FCFAF7'; }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F3E5F5', color: '#7B1FA2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Banknote size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-secondary)' }}>Cash / In-Person</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Pay at our office or through a courier</div>
                      </div>
                    </button>
                  </div>

                ) : selectedMethod === 'hubtel' ? (
                  // Hubtel / mobile money flow
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <button
                      onClick={() => setPayMethodMap(prev => ({ ...prev, [pkg.id]: null }))}
                      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                    >
                      ← Back
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <UnifiedPaymentGateway
                        label={`Pay ${invCurrency} ${invAmount.toLocaleString()} via MoMo`}
                        amountGHS={invAmount}
                        email={project.clientEmail || 'client@clients.westlinefuture.com'}
                        projectId={project.id}
                        invoiceId={linkedInv.id}
                        paymentType="invoice"
                      />
                    </div>
                  </div>

                ) : selectedMethod === 'bank' ? (
                  // Bank transfer flow
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <button
                      onClick={() => setPayMethodMap(prev => ({ ...prev, [pkg.id]: null }))}
                      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                    >
                      ← Back
                    </button>
                    <div style={{ padding: '20px 24px', background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#15803D', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Building2 size={15} /> Bank Account Details
                      </div>
                      {finSettings.bankDetails ? (
                        <div style={{ fontSize: 13, color: '#166534', lineHeight: 2, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                          {finSettings.bankDetails}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: '#166534' }}>
                          <div>Contact the team for bank account details.</div>
                        </div>
                      )}
                      <div style={{ marginTop: 12, padding: '10px 14px', background: '#DCFCE7', borderRadius: 10, fontSize: 12, color: '#166534' }}>
                        <strong>Reference:</strong> {linkedInv?.invoiceNumber || pkg.title} / {project.title}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12 }}>
                      <Info size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                        Once you have made the transfer, click the button below. The team will verify and unlock your rendering within 1 business day.
                      </div>
                    </div>
                    <button
                      onClick={() => handleOfflinePaymentSubmit(pkg, linkedInv, 'bank')}
                      disabled={paySubmitting[pkg.id]}
                      style={{ width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none', background: '#16A34A', color: '#fff', fontSize: 14, fontWeight: 800, cursor: paySubmitting[pkg.id] ? 'default' : 'pointer', opacity: paySubmitting[pkg.id] ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <Check size={16} /> {paySubmitting[pkg.id] ? 'Submitting…' : "I've Made the Transfer"}
                    </button>
                  </div>

                ) : selectedMethod === 'offline' ? (
                  // Offline / cash flow
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <button
                      onClick={() => setPayMethodMap(prev => ({ ...prev, [pkg.id]: null }))}
                      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                    >
                      ← Back
                    </button>
                    <div style={{ padding: '20px 24px', background: '#FAF5FF', border: '1.5px solid #E9D5FF', borderRadius: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#6D28D9', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Banknote size={15} /> In-Person Payment
                      </div>
                      <div style={{ fontSize: 13, color: '#5B21B6', lineHeight: 1.6 }}>
                        Visit our office or arrange a courier. Please reference your invoice number when paying.
                      </div>
                      {finSettings.officeAddress && (
                        <div style={{ marginTop: 10, fontSize: 12, color: '#7C3AED', fontWeight: 700 }}>
                          📍 {finSettings.officeAddress}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12 }}>
                      <Info size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                        Click below to notify the team that you'll be paying in person. The team will confirm receipt and unlock your rendering.
                      </div>
                    </div>
                    <button
                      onClick={() => handleOfflinePaymentSubmit(pkg, linkedInv, 'offline')}
                      disabled={paySubmitting[pkg.id]}
                      style={{ width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 14, fontWeight: 800, cursor: paySubmitting[pkg.id] ? 'default' : 'pointer', opacity: paySubmitting[pkg.id] ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <Check size={16} /> {paySubmitting[pkg.id] ? 'Submitting…' : "Notify Team — I'll Pay In Person"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        }

        // ── UNLOCKED PACKAGE ─────────────────────────────────────────────────
        const packageMarkups = markups.filter(m => m.packageId === pkg.id);
        const displayImage = isImageFile(pkg.fileUrl) ? pkg.fileUrl : blueprintImg;

        return (
          <div key={pkg.id} style={{ padding: 24, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F0FDF4', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={24} />
                </div>
                <div>
                  <div className="lxfh" style={{ fontSize: 16, fontWeight: 800 }}>{pkg.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Revisions: {pkg.usedRevisions} / {pkg.includedRevisions} used &middot; Status: <strong style={{ color: pkg.status === 'Approved' ? '#10B981' : '#F59E0B' }}>{pkg.status}</strong>
                  </div>
                </div>
              </div>
              <a href={pkg.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', textDecoration: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
                <Download size={16} /> Open Files
              </a>
            </div>

            {/* Change Request Banner */}
            {project.changeRequestPending && (
              <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={15} color="#D97706" /> Your change request is being reviewed. The project is on hold until the team uploads a revision.
              </div>
            )}

            {/* Interactive Blueprint / Drawing Area */}
            {(() => {
              const included = pkg.includedRevisions ?? 3;
              const used = pkg.usedRevisions ?? 0;
              const revLimitReached = used >= included;
              return (
            <div>
              {revLimitReached ? (
                <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertCircle size={15} color="#DC2626" /> Revision limit reached ({used}/{included}). Contact the team to purchase additional revisions.
                </div>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PlusCircle size={14} color={ac} /> Click anywhere on the drawing layout to place a feedback pin &middot; <span style={{ color: used >= included - 1 ? '#D97706' : '#10B981', fontWeight: 800 }}>{used}/{included} revisions used</span>
                </div>
              )}

              <div style={{
                position: 'relative',
                width: '100%',
                borderRadius: 16,
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)',
                background: '#FCFAF7'
              }}>
                <img
                  src={displayImage}
                  alt={pkg.title}
                  onClick={(e) => handleImageClick(e, pkg)}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    cursor: revLimitReached || project.changeRequestPending ? 'not-allowed' : 'crosshair',
                    maxHeight: 520,
                    objectFit: 'contain',
                    opacity: revLimitReached ? 0.7 : 1,
                  }}
                />

                {/* Overlaid pins */}
                {packageMarkups.map((pin, index) => {
                  const isActive = activePin?.id === pin.id;
                  const isResolved = pin.status === 'Resolved';
                  return (
                    <div
                      key={pin.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePin(isActive ? null : pin);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${pin.x}%`,
                        top: `${pin.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isResolved ? '#10B981' : isActive ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                        border: '2.5px solid #fff',
                        boxShadow: '0 4px 12px rgba(92,58,33,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 900,
                        cursor: 'pointer',
                        zIndex: isActive ? 40 : 20,
                        transition: 'all 0.2s',
                        animation: isResolved ? 'none' : 'pingPulse 2s infinite'
                      }}
                    >
                      {index + 1}
                    </div>
                  );
                })}
              </div>
            </div>
            );
            })()}

            {/* Active Pin Detail Card */}
            {activePin && activePin.packageId === pkg.id && (
              <div style={{
                padding: '16px 20px',
                background: 'rgba(252, 250, 247, 0.85)',
                border: '1.5px solid rgba(92, 58, 33, 0.15)',
                borderRadius: 16,
                boxShadow: '0 8px 24px rgba(92, 58, 33, 0.04)',
                display: 'flex', flexDirection: 'column', gap: 10,
                position: 'relative',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <button
                  onClick={() => setActivePin(null)}
                  style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    Pin #{packageMarkups.findIndex(m => m.id === activePin.id) + 1} &middot; {activePin.authorRole === 'client' ? 'Client Request' : 'Designer Comment'}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                      background: activePin.status === 'Resolved' ? '#D1FAE5' : '#FFFBEB',
                      color: activePin.status === 'Resolved' ? '#065F46' : '#92400E'
                    }}>
                      {activePin.status}
                    </span>
                    {activePin.authorRole === 'client' && (
                      <button
                        onClick={() => handleDeletePin(activePin.id)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: 0 }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: 'var(--accent-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
                  "{activePin.note}"
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Placed by {activePin.authorName} &middot; {activePin.createdAt?.seconds ? new Date(activePin.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            )}

            {/* Approval Action Panel */}
            {pkg.status === 'Approved' ? (
              <div style={{ padding: '12px 16px', background: '#F0FDF4', color: '#10B981', borderRadius: 12, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} /> Design Approved
              </div>
            ) : project.changeRequestPending ? (
              <div style={{ padding: '12px 16px', background: '#FEF3C7', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={15} /> Changes requested — waiting for the team to revise
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
                <button
                  onClick={() => handleApprove(pkg)}
                  style={{ flex: 1, padding: '12px 18px', background: 'var(--accent-secondary)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
                >
                  <CheckCircle2 size={15} /> Approve
                </button>
                <button
                  onClick={() => { setChangeRequestPkg(pkg); setChangeRequestNote(''); }}
                  style={{ flex: 1, padding: '12px 18px', background: '#fff', color: '#92400E', border: '1.5px solid #F59E0B', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}
                >
                  Request Changes
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* ── PIN COMMENT OVERLAY MODAL ── */}
      {showPinModal && selectedCoords && (
        <div
          onClick={() => setShowPinModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(62, 36, 20, 0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <form
            onSubmit={handleSavePin}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFDFB', borderRadius: 24,
              border: '1.5px solid rgba(92, 58, 33, 0.15)',
              padding: '28px 24px', width: '100%', maxWidth: 440,
              boxShadow: '0 20px 48px rgba(62, 36, 20, 0.2)',
              display: 'flex', flexDirection: 'column', gap: 16
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>
                Add Coordinate Feedback Note
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Coordinate locked at: <strong style={{ color: 'var(--accent-secondary)' }}>X: {Math.round(selectedCoords.x)}% &middot; Y: {Math.round(selectedCoords.y)}%</strong>
            </div>

            <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                <strong>⚠ Note:</strong> Placing a pin will put the project on hold until the team addresses your revision.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Revision Comment
              </label>
              <textarea
                required
                value={newPinText}
                onChange={(e) => setNewPinText(e.target.value)}
                placeholder="e.g. Please reduce the width of the stainless steel base profile here by 10mm..."
                rows={3}
                style={{
                  padding: '12px 16px', borderRadius: 12,
                  border: '1.5px solid var(--border-color)',
                  background: '#FCFAF7', fontSize: 13, outline: 'none',
                  resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  color: 'var(--accent-secondary)', lineHeight: 1.5
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                style={{ flex: 1, padding: '10px 16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPinText.trim() || submittingPin}
                style={{
                  flex: 1, padding: '10px 20px', borderRadius: 100, border: 'none',
                  background: 'var(--accent-secondary)', color: '#fff', fontSize: 13,
                  fontWeight: 800, cursor: (!newPinText.trim() || submittingPin) ? 'default' : 'pointer',
                  opacity: (!newPinText.trim() || submittingPin) ? 0.5 : 1
                }}
              >
                {submittingPin ? 'Saving Pin…' : 'Save Pin Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes pingPulse {
          0% { box-shadow: 0 0 0 0 rgba(197, 160, 89, 0.75); }
          70% { box-shadow: 0 0 0 8px rgba(197, 160, 89, 0); }
          100% { box-shadow: 0 0 0 0 rgba(197, 160, 89, 0); }
        }
      `}</style>

      {/* ── REQUEST CHANGES MODAL ── */}
      {changeRequestPkg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFDFB', borderRadius: 24, padding: '32px 28px', maxWidth: 440, width: '100%', boxShadow: '0 24px 64px rgba(62,36,20,0.2)', border: '1.5px solid rgba(92,58,33,0.12)' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 6 }}>Request Changes</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
              Tell the team what you'd like changed on <strong>{changeRequestPkg.title}</strong>. Be as specific as possible.
            </div>
            <textarea
              autoFocus
              value={changeRequestNote}
              onChange={e => setChangeRequestNote(e.target.value)}
              placeholder="e.g. Please change the wall colour to a warmer beige, and move the sofa to face the window…"
              rows={4}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border-color)', fontSize: 13, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => { setChangeRequestPkg(null); setChangeRequestNote(''); }}
                style={{ flex: 1, height: 46, borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleChangeRequest}
                disabled={!changeRequestNote.trim() || changeRequestBusy}
                style={{ flex: 2, height: 46, borderRadius: 12, border: 'none', background: changeRequestNote.trim() ? '#92400E' : 'var(--border-color)', color: changeRequestNote.trim() ? '#fff' : 'var(--text-secondary)', fontSize: 13, fontWeight: 800, cursor: changeRequestNote.trim() ? 'pointer' : 'default' }}
              >
                {changeRequestBusy ? 'Sending…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pin delete confirmation */}
      {confirmDeletePin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Remove Pin?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>This feedback pin and its note will be permanently removed.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeletePin(null)} style={{ flex: 1, height: 44, borderRadius: 12, border: '1.5px solid var(--border-color)', background: 'transparent', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeletePinAction} style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Remove Pin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
