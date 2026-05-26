import React, { useState, useEffect } from 'react';
import {
  Lock, FileText, Upload, Plus, AlertCircle, CheckCircle2, X,
  PlusCircle, Check, HelpCircle, Receipt, ShieldCheck, Clock
} from 'lucide-react';
import { db } from '../lib/firebase';
import {
  collection, addDoc, updateDoc, doc, onSnapshot, query,
  orderBy, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import blueprintImg from '../assets/architectural_blueprint.png';

export default function AdminRenderingManager({
  project,
  brand,
  renderingPackages = [],
  invoices = [],
  notify,
  createInvoice,
}) {
  const ac = brand?.color || 'var(--accent-secondary)';
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [confirmReceiptLoading, setConfirmReceiptLoading] = useState({});
  const [markCompleteLoading, setMarkCompleteLoading] = useState(false);

  // Upload form fields
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgUrl, setPkgUrl] = useState('');
  const [linkedInvoiceId, setLinkedInvoiceId] = useState('');
  const [includedRevisions, setIncludedRevisions] = useState(2);

  // Invoice auto-prompt modal
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState(project?.renderingFee || '');
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Phase 3 states
  const [markups, setMarkups] = useState([]);
  const [activePin, setActivePin] = useState(null);
  const [showAddPinModal, setShowAddPinModal] = useState(false);
  const [newPinText, setNewPinText] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [submittingPin, setSubmittingPin] = useState(false);

  const projectPackages = renderingPackages.filter(r => r.projectId === project?.id);
  const projectInvoices = invoices.filter(i => i.projectId === project?.id);

  // Real-time markups subscription
  useEffect(() => {
    if (!db || !project?.id) return;
    const q = query(
      collection(db, 'projects', project.id, 'markups'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMarkups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('[AdminRenderingManager] Sync markups failed:', err);
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
        readByAdmin: true,
        readByClient: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('[AdminRenderingManager] postSystemMessage failed:', err);
    }
  };

  // ── Attempt to upload — check if invoice is linked ────────────────────────
  const handleUploadAttempt = () => {
    if (!pkgTitle || !pkgUrl) return;
    if (!linkedInvoiceId) {
      // No invoice linked — prompt admin to create one
      setInvoiceAmount(project?.renderingFee || '');
      setShowInvoicePrompt(true);
    } else {
      handleUpload(linkedInvoiceId);
    }
  };

  const handleUpload = async (effectiveInvoiceId) => {
    if (!pkgTitle || !pkgUrl) return;
    setLoading(true);
    try {
      const invId = effectiveInvoiceId || null;
      await addDoc(collection(db, 'renderingPackages'), {
        projectId: project.id,
        clientId: project.clientId,
        title: pkgTitle,
        fileUrl: pkgUrl,
        linkedInvoiceId: invId,
        includedRevisions: parseInt(includedRevisions, 10) || 2,
        usedRevisions: 0,
        unlocked: !invId,
        status: invId ? 'Locked' : 'Unlocked',
        createdAt: serverTimestamp()
      });
      await postSystemMessage(
        `🎨 Admin uploaded a new design rendering package: "${pkgTitle}". ${invId ? 'A rendering fee invoice has been issued — please pay to unlock it.' : 'It is now available for review.'}`
      );
      setShowUpload(false);
      setPkgTitle('');
      setPkgUrl('');
      setLinkedInvoiceId('');
      notify?.('success', 'Rendering package published successfully');
    } catch (e) {
      console.error(e);
      notify?.('error', 'Failed to publish rendering package');
    } finally {
      setLoading(false);
    }
  };

  // ── Create invoice from auto-prompt + proceed to upload ───────────────────
  const handleCreateInvoiceAndUpload = async () => {
    if (!invoiceAmount || parseFloat(invoiceAmount) <= 0) {
      notify?.('error', 'Please enter a valid rendering fee amount');
      return;
    }
    setCreatingInvoice(true);
    try {
      let newInvoiceId = null;
      if (createInvoice) {
        const inv = await createInvoice({
          projectId: project.id,
          clientId: project.clientId,
          title: `Rendering Fee — ${pkgTitle}`,
          invoiceType: 'Rendering Fee',
          amount: parseFloat(invoiceAmount),
          currency: 'GHS',
          status: 'Pending',
          dueDate: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 3);
            return d.toISOString().split('T')[0];
          })(),
        });
        newInvoiceId = inv?.id || inv;
      }
      setShowInvoicePrompt(false);
      await handleUpload(newInvoiceId);
    } catch (err) {
      console.error('[AdminRenderingManager] Create invoice failed:', err);
      notify?.('error', 'Could not create invoice. Upload without invoice instead?');
    } finally {
      setCreatingInvoice(false);
    }
  };

  // ── Confirm Receipt (for non-Hubtel payments) ─────────────────────────────
  const handleConfirmReceipt = async (pkg, linkedInv) => {
    if (!linkedInv) return;
    setConfirmReceiptLoading(prev => ({ ...prev, [pkg.id]: true }));
    try {
      await updateDoc(doc(db, 'invoices', linkedInv.id), {
        status: 'Paid',
        awaitingConfirmation: false,
        confirmedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'renderingPackages', pkg.id), {
        unlocked: true,
        status: 'Unlocked',
      });
      await postSystemMessage(
        `✅ Admin confirmed receipt of payment for "${pkg.title}". Your rendering is now unlocked — please review your design.`
      );
      notify?.('success', `Payment confirmed — "${pkg.title}" unlocked`);
    } catch (err) {
      console.error('[AdminRenderingManager] Confirm receipt failed:', err);
      notify?.('error', 'Could not confirm receipt');
    } finally {
      setConfirmReceiptLoading(prev => ({ ...prev, [pkg.id]: false }));
    }
  };

  // ── Mark Change Complete ───────────────────────────────────────────────────
  const handleMarkChangeComplete = async (pkg) => {
    if (!window.confirm('Mark all changes as resolved and clear the project freeze?')) return;
    setMarkCompleteLoading(true);
    try {
      // Resolve all open pins for this package
      const openPins = markups.filter(m => m.packageId === pkg.id && m.status === 'Open');
      await Promise.all(openPins.map(pin =>
        updateDoc(doc(db, 'projects', project.id, 'markups', pin.id), { status: 'Resolved' })
      ));
      // Clear the change request freeze
      await updateDoc(doc(db, 'projects', project.id), {
        changeRequestPending: false,
      });
      // Update package status
      await updateDoc(doc(db, 'renderingPackages', pkg.id), {
        status: 'Revision Uploaded',
      });
      await postSystemMessage(
        `🔄 Admin has resolved the change request for "${pkg.title}" and uploaded a revision. Please review the updated rendering.`
      );
      notify?.('success', 'Change request resolved — project unfrozen');
    } catch (err) {
      console.error('[AdminRenderingManager] Mark change complete failed:', err);
      notify?.('error', 'Could not resolve change request');
    } finally {
      setMarkCompleteLoading(false);
    }
  };

  const handleImageClick = (e, pkg) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSelectedCoords({ x, y, packageId: pkg.id });
    setNewPinText('');
    setShowAddPinModal(true);
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    if (!newPinText.trim() || submittingPin || !selectedCoords) return;
    setSubmittingPin(true);
    try {
      await addDoc(collection(db, 'projects', project.id, 'markups'), {
        packageId: selectedCoords.packageId,
        x: selectedCoords.x,
        y: selectedCoords.y,
        note: newPinText.trim(),
        authorName: 'Designer (' + (brand?.name || 'Westline Future') + ')',
        authorRole: 'admin',
        status: 'Open',
        createdAt: serverTimestamp()
      });
      setShowAddPinModal(false);
      setSelectedCoords(null);
      setNewPinText('');
    } catch (err) {
      console.error('[AdminRenderingManager] Failed to save pin:', err);
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleResolvePin = async (pin) => {
    const nextStatus = pin.status === 'Resolved' ? 'Open' : 'Resolved';
    try {
      await updateDoc(doc(db, 'projects', project.id, 'markups', pin.id), { status: nextStatus });
      setActivePin({ ...pin, status: nextStatus });
    } catch (err) {
      console.error('[AdminRenderingManager] Failed to resolve pin:', err);
    }
  };

  const handleDeletePin = async (pinId) => {
    if (!window.confirm('Are you sure you want to delete this pin note?')) return;
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'markups', pinId));
      setActivePin(null);
    } catch (err) {
      console.error('[AdminRenderingManager] Failed to delete pin:', err);
    }
  };

  const isImageFile = (url) => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.webp') || cleanUrl.endsWith('.gif');
  };

  const handleManualUnlock = async (pkgId, forceUnlock) => {
    if (!window.confirm(forceUnlock ? 'Manually unlock this rendering package?' : 'Re-lock this package?')) return;
    try {
      await updateDoc(doc(db, 'renderingPackages', pkgId), {
        unlocked: forceUnlock,
        status: forceUnlock ? 'Unlocked' : 'Locked'
      });
    } catch (err) {
      console.error('[AdminRenderingManager] Failed to toggle unlock:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="lxfh" style={{ fontSize: 18, fontWeight: 800 }}>Design Vault</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Upload CAD/3D renderings and lock them behind rendering fee invoices.</div>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} style={{ background: ac, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <Plus size={16} /> New Rendering Package
        </button>
      </div>

      {/* Change Request Alert Banner */}
      {project.changeRequestPending && (
        <div style={{ padding: '16px 20px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#92400E', marginBottom: 4 }}>⚠ Open Change Request — Project Frozen</div>
            <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>
              The client has placed feedback pins on a rendering. The project is on hold and cannot advance to the next stage until you resolve all pins and mark the change as complete.
            </div>
          </div>
        </div>
      )}

      {/* Upload Box */}
      {showUpload && (
        <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.02)' }}>
          <div className="lxfh" style={{ fontSize: 16, marginBottom: 16 }}>Upload Locked Package</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="p-field">
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Package Title</label>
              <input className="p-inp" placeholder="e.g. Initial 3D Kitchen Rendering" value={pkgTitle} onChange={e => setPkgTitle(e.target.value)} />
            </div>
            <div className="p-field">
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>File URL (Drive / Figma / PDF)</label>
              <input className="p-inp" placeholder="https://..." value={pkgUrl} onChange={e => setPkgUrl(e.target.value)} />
            </div>
            <div className="p-field">
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Link to Existing Invoice (Optional)</label>
              <select className="p-inp" value={linkedInvoiceId} onChange={e => setLinkedInvoiceId(e.target.value)}>
                <option value="">-- Auto-Create Invoice on Upload --</option>
                {projectInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.invoiceNumber || 'INV'} — {inv.title} ({inv.status})</option>
                ))}
              </select>
            </div>
            <div className="p-field">
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Included Revisions</label>
              <input type="number" className="p-inp" value={includedRevisions} onChange={e => setIncludedRevisions(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button onClick={() => setShowUpload(false)} style={{ padding: '12px 24px', border: 'none', background: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleUploadAttempt} disabled={loading || !pkgTitle || !pkgUrl} style={{ background: 'var(--accent-secondary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', opacity: (loading || !pkgTitle || !pkgUrl) ? 0.5 : 1 }}>
              {loading ? 'Publishing…' : 'Publish Rendering Package'}
            </button>
          </div>
        </div>
      )}

      {/* Render Packages List */}
      {projectPackages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--bg-secondary)', borderRadius: 16 }}>
          <Lock size={40} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
          <div className="lxfh" style={{ fontSize: 16 }}>No Renderings Yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Upload a design package to share it with the client securely.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {projectPackages.map(pkg => {
            const linkedInv = invoices.find(i => i.id === pkg.linkedInvoiceId);
            const isUnlocked = pkg.unlocked || pkg.status === 'Paid / Unlocked' || (linkedInv && linkedInv.status === 'Paid');
            const isAwaitingConfirmation = linkedInv?.awaitingConfirmation === true;
            const statusColor = isUnlocked ? '#10B981' : isAwaitingConfirmation ? '#3B82F6' : '#F59E0B';
            const packageMarkups = markups.filter(m => m.packageId === pkg.id);
            const openPins = packageMarkups.filter(m => m.status === 'Open');
            const displayImage = isImageFile(pkg.fileUrl) ? pkg.fileUrl : blueprintImg;

            return (
              <div key={pkg.id} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16 }}>

                {/* Meta Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: isUnlocked ? '#F0FDF4' : isAwaitingConfirmation ? '#EFF6FF' : '#FFFBEB', color: statusColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isUnlocked ? <FileText size={20} /> : isAwaitingConfirmation ? <Clock size={20} /> : <Lock size={20} />}
                    </div>
                    <div>
                      <div className="lxfh" style={{ fontSize: 15, fontWeight: 700 }}>{pkg.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Revisions: {pkg.usedRevisions} / {pkg.includedRevisions} &middot; Invoice: {linkedInv?.invoiceNumber || '—'} ({linkedInv?.status || 'Not linked'})
                        {isAwaitingConfirmation && <span style={{ marginLeft: 8, color: '#3B82F6', fontWeight: 800 }}>• Awaiting Confirmation</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, background: `${statusColor}15`, color: statusColor, textTransform: 'uppercase' }}>
                      {isUnlocked ? (pkg.unlocked ? 'Manually Unlocked' : pkg.status) : isAwaitingConfirmation ? 'Awaiting Confirmation' : 'Locked'}
                    </div>
                    {/* Force Unlock Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Force Unlock</span>
                      <div
                        onClick={() => handleManualUnlock(pkg.id, !pkg.unlocked)}
                        style={{ width: 36, height: 20, borderRadius: 10, background: pkg.unlocked ? '#10B981' : 'var(--border-color)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                      >
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: pkg.unlocked ? 18 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,.15)' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── CONFIRM RECEIPT BUTTON — shown when client submitted offline payment ── */}
                {isAwaitingConfirmation && !isUnlocked && (
                  <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '1.5px solid #93C5FD', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1D4ED8', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Receipt size={16} /> Client Submitted Payment
                      </div>
                      <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.5 }}>
                        Method: <strong>{linkedInv?.paymentMethodSubmitted === 'bank' ? 'Bank Transfer' : 'Offline / In-Person'}</strong>
                        {linkedInv?.paymentSubmittedAt?.seconds && (
                          <> &middot; {new Date(linkedInv.paymentSubmittedAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleConfirmReceipt(pkg, linkedInv)}
                      disabled={confirmReceiptLoading[pkg.id]}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 24px', borderRadius: 12, border: 'none',
                        background: '#1D4ED8', color: '#fff',
                        fontSize: 13, fontWeight: 800,
                        cursor: confirmReceiptLoading[pkg.id] ? 'default' : 'pointer',
                        opacity: confirmReceiptLoading[pkg.id] ? 0.7 : 1,
                        flexShrink: 0, transition: 'all 0.2s',
                        boxShadow: '0 4px 14px rgba(29, 78, 216, 0.3)'
                      }}
                    >
                      <ShieldCheck size={16} />
                      {confirmReceiptLoading[pkg.id] ? 'Confirming…' : 'Confirm Receipt & Unlock'}
                    </button>
                  </div>
                )}

                {/* ── MARK CHANGE COMPLETE — shown when change request is pending ── */}
                {project.changeRequestPending && openPins.length > 0 && isUnlocked && (
                  <div style={{ padding: '16px 20px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E', marginBottom: 4 }}>
                        {openPins.length} Open Pin{openPins.length !== 1 ? 's' : ''} — Client Awaiting Revision
                      </div>
                      <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>
                        Address all client pins, upload your revised file URL, then click Mark Change Complete to unfreeze the project.
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkChangeComplete(pkg)}
                      disabled={markCompleteLoading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 20px', borderRadius: 12, border: 'none',
                        background: '#D97706', color: '#fff',
                        fontSize: 13, fontWeight: 800,
                        cursor: markCompleteLoading ? 'default' : 'pointer',
                        opacity: markCompleteLoading ? 0.7 : 1,
                        flexShrink: 0
                      }}
                    >
                      <CheckCircle2 size={15} />
                      {markCompleteLoading ? 'Resolving…' : 'Mark Change Complete'}
                    </button>
                  </div>
                )}

                {/* If unlocked — interactive markup visualizer */}
                {isUnlocked && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PlusCircle size={14} color={ac} /> Coordinate Review Board &middot; {packageMarkups.length} feedback note{packageMarkups.length !== 1 ? 's' : ''}
                    </div>

                    <div style={{
                      position: 'relative',
                      width: '100%',
                      borderRadius: 16,
                      border: '1px solid var(--border-color)',
                      overflow: 'hidden',
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
                          cursor: 'crosshair',
                          maxHeight: 520,
                          objectFit: 'contain'
                        }}
                      />

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
                              width: 26, height: 26,
                              borderRadius: '50%',
                              background: isResolved ? '#10B981' : isActive ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                              border: '2px solid #fff',
                              boxShadow: '0 4px 10px rgba(92,58,33,0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 900,
                              cursor: 'pointer',
                              zIndex: isActive ? 40 : 20,
                              transition: 'all 0.15s',
                              animation: isResolved ? 'none' : 'pingPulse 2s infinite'
                            }}
                          >
                            {index + 1}
                          </div>
                        );
                      })}
                    </div>

                    {/* Active Pin Detail Card */}
                    {activePin && activePin.packageId === pkg.id && (
                      <div style={{
                        padding: '16px 20px',
                        background: 'rgba(252, 250, 247, 0.9)',
                        border: '1.5px solid rgba(92, 58, 33, 0.15)',
                        borderRadius: 16,
                        boxShadow: '0 4px 16px rgba(92, 58, 33, 0.04)',
                        display: 'flex', flexDirection: 'column', gap: 12,
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
                            <button
                              onClick={() => handleDeletePin(activePin.id)}
                              style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                            >
                              Delete Note
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--accent-secondary)', fontWeight: 600, lineHeight: 1.4 }}>
                          "{activePin.note}"
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 4 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                            By {activePin.authorName} &middot; {activePin.createdAt?.seconds ? new Date(activePin.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                          <button
                            onClick={() => handleResolvePin(activePin)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 14px', borderRadius: 100, border: 'none',
                              background: activePin.status === 'Resolved' ? '#F4EFE6' : '#10B981',
                              color: activePin.status === 'Resolved' ? 'var(--accent-primary)' : '#fff',
                              fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                            }}
                          >
                            {activePin.status === 'Resolved' ? 'Re-open Feedback' : 'Mark as Resolved'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── INVOICE AUTO-PROMPT MODAL ── */}
      {showInvoicePrompt && (
        <div
          onClick={() => !creatingInvoice && setShowInvoicePrompt(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 24, padding: '32px 28px', width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-secondary)', marginBottom: 4 }}>Create Rendering Fee Invoice?</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  No invoice was linked. Auto-create one now so the client can see and pay it before viewing the rendering.
                </div>
              </div>
              {!creatingInvoice && (
                <button onClick={() => setShowInvoicePrompt(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: 8 }}>
                  <X size={20} />
                </button>
              )}
            </div>

            <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>Client</span><strong style={{ color: 'var(--accent-secondary)' }}>{project.clientName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>Project</span><strong style={{ color: 'var(--accent-secondary)' }}>{project.title}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>Invoice Title</span><strong style={{ color: 'var(--accent-secondary)' }}>Rendering Fee — {pkgTitle}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>Due Date</span><strong style={{ color: 'var(--accent-secondary)' }}>Today + 3 days</strong>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Amount (GHS)</label>
              <input
                className="p-inp"
                type="number"
                value={invoiceAmount}
                onChange={e => setInvoiceAmount(e.target.value)}
                placeholder="e.g. 500"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
              {!invoiceAmount && (
                <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Enter the rendering fee amount to continue</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setShowInvoicePrompt(false); handleUpload(null); }}
                disabled={creatingInvoice}
                style={{ flex: 1, padding: '12px', border: '1.5px solid var(--border-color)', borderRadius: 12, background: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                Upload Without Invoice
              </button>
              <button
                onClick={handleCreateInvoiceAndUpload}
                disabled={creatingInvoice || !invoiceAmount}
                style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 12, background: 'var(--accent-secondary)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: (creatingInvoice || !invoiceAmount) ? 'default' : 'pointer', opacity: (creatingInvoice || !invoiceAmount) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {creatingInvoice ? 'Creating…' : <><Receipt size={15} /> Create Invoice & Publish</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN ADD PIN MODAL ── */}
      {showAddPinModal && selectedCoords && (
        <div
          onClick={() => setShowAddPinModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(62, 36, 20, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease' }}
        >
          <form
            onSubmit={handleSavePin}
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#FFFDFB', borderRadius: 24, border: '1.5px solid rgba(92, 58, 33, 0.15)', padding: '28px 24px', width: '100%', maxWidth: 440, boxShadow: '0 20px 48px rgba(62, 36, 20, 0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-secondary)' }}>Add Designer Pin Comment</div>
              <button type="button" onClick={() => setShowAddPinModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Coordinate: <strong style={{ color: 'var(--accent-secondary)' }}>X: {Math.round(selectedCoords.x)}% &middot; Y: {Math.round(selectedCoords.y)}%</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Designer / Technical Note</label>
              <textarea
                required
                value={newPinText}
                onChange={(e) => setNewPinText(e.target.value)}
                placeholder="e.g. Please verify that base profile clearance fits standard glass anchors here..."
                rows={3}
                style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--border-color)', background: '#FCFAF7', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: 'var(--accent-secondary)', lineHeight: 1.5 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setShowAddPinModal(false)} style={{ flex: 1, padding: '10px 16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Cancel</button>
              <button type="submit" disabled={!newPinText.trim() || submittingPin} style={{ flex: 1, padding: '10px 20px', borderRadius: 100, border: 'none', background: 'var(--accent-secondary)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: (!newPinText.trim() || submittingPin) ? 'default' : 'pointer', opacity: (!newPinText.trim() || submittingPin) ? 0.5 : 1 }}>
                {submittingPin ? 'Saving…' : 'Save Pin Note'}
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
    </div>
  );
}
