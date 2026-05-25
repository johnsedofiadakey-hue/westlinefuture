import React, { useState, useEffect, useRef } from 'react';
import { Lock, FileText, Download, CheckCircle2, AlertCircle, Send, X, PlusCircle, Trash2, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { updateDoc, doc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import UnifiedPaymentGateway from './UnifiedPaymentGateway';
import blueprintImg from '../assets/architectural_blueprint.png';

export default function ClientRenderingVault({ project, brand, renderingPackages = [], invoices = [] }) {
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
      console.error("[ClientRenderingVault] Sync markups failed:", err);
    });
    return unsub;
  }, [project?.id]);

  const handleApprove = async (pkg) => {
    try {
      await updateDoc(doc(db, 'renderingPackages', pkg.id), { status: 'Approved' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageClick = (e, pkg) => {
    // Only allow pinning if the drawing is unlocked/active
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
      await addDoc(collection(db, 'projects', project.id, 'markups'), {
        packageId: selectedCoords.packageId,
        x: selectedCoords.x,
        y: selectedCoords.y,
        note: newPinText.trim(),
        authorName: project.clientName || 'Client',
        authorRole: 'client',
        status: 'Open',
        createdAt: serverTimestamp()
      });

      // Update package revision log
      const pkg = projectPackages.find(p => p.id === selectedCoords.packageId);
      if (pkg) {
        await updateDoc(doc(db, 'renderingPackages', pkg.id), {
          status: 'Changes Requested',
          usedRevisions: (pkg.usedRevisions || 0) + 1
        });
      }

      setShowPinModal(false);
      setSelectedCoords(null);
      setNewPinText('');
    } catch (err) {
      console.error("[ClientRenderingVault] Failed to save pin:", err);
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleDeletePin = async (pinId) => {
    if (!window.confirm("Are you sure you want to remove this feedback pin?")) return;
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'markups', pinId));
      setActivePin(null);
    } catch (err) {
      console.error("[ClientRenderingVault] Delete pin failed:", err);
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
        const isUnlocked = pkg.unlocked || pkg.status === 'Paid / Unlocked' || (linkedInv && linkedInv.status === 'Paid');
        
        if (!isUnlocked) {
          return (
            <div key={pkg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: '#FFFBEB', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Lock size={32} />
              </div>
              <div className="lxfh" style={{ fontSize: 16, fontWeight: 800 }}>{pkg.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, marginTop: 8, lineHeight: 1.5 }}>
                This design package is securely locked. Please settle the associated rendering fee invoice to instantly unlock your 3D/CAD files.
              </div>
              {linkedInv && (
                <div style={{ marginTop: 20, width: '100%', maxWidth: 280 }}>
                  <UnifiedPaymentGateway
                    label={`Pay ${linkedInv.currency || 'GHS'} ${parseAmount(linkedInv.amount || linkedInv.total).toLocaleString()}`}
                    amountGHS={parseAmount(linkedInv.amount || linkedInv.total)}
                    email={project.clientEmail || 'client@clients.westlinefuture.com'}
                    projectId={project.id}
                    invoiceId={linkedInv.id}
                    paymentType="invoice"
                  />
                </div>
              )}
            </div>
          );
        }

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

            {/* Interactive Blueprint / Drawing Area */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PlusCircle size={14} color={ac} /> Click anywhere on the drawing layout to place a feedback pin
              </div>
              
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
                    cursor: 'crosshair',
                    maxHeight: 520,
                    objectFit: 'contain'
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
                <CheckCircle2 size={16} /> Design Approved. The final project quote has been verified and issued.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
                <button onClick={() => handleApprove(pkg)} style={{ flex: 1, padding: '12px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} /> Approve Design
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* ── PHASE 3: ADD PIN COMMENT OVERLAY MODAL ── */}
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
                Add Coordinate feedback note
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
              Coordinate placement locked at: <strong style={{ color: 'var(--accent-secondary)' }}>X: {Math.round(selectedCoords.x)}% &middot; Y: {Math.round(selectedCoords.y)}%</strong> on drawing template.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Revision Comment
              </label>
              <textarea
                required
                value={newPinText}
                onChange={(e) => setNewPinText(e.target.value)}
                placeholder="e.g. Please reduce the width of the stainless steel base profile profile here by 10mm..."
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
                className="p-btn-light"
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
                {submittingPin ? "Saving Pin..." : "Save Pin Note"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pulsing visual CSS */}
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

function isMobileImage(url) {
  return false;
}
