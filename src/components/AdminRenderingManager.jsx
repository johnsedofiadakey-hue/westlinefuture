import React, { useState, useEffect } from 'react';
import { Lock, FileText, Upload, Plus, AlertCircle, CheckCircle2, X, PlusCircle, Check, HelpCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import blueprintImg from '../assets/architectural_blueprint.png';

export default function AdminRenderingManager({ project, brand, renderingPackages = [], invoices = [] }) {
  const ac = brand?.color || 'var(--accent-secondary)';
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgUrl, setPkgUrl] = useState('');
  const [linkedInvoiceId, setLinkedInvoiceId] = useState('');
  const [includedRevisions, setIncludedRevisions] = useState(2);

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
      console.error("[AdminRenderingManager] Sync markups failed:", err);
    });
    return unsub;
  }, [project?.id]);

  const handleUpload = async () => {
    if (!pkgTitle || !pkgUrl || !linkedInvoiceId) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'renderingPackages'), {
        projectId: project.id,
        clientId: project.clientId,
        title: pkgTitle,
        fileUrl: pkgUrl,
        linkedInvoiceId,
        includedRevisions: parseInt(includedRevisions, 10) || 2,
        usedRevisions: 0,
        status: 'Locked', // Locked, Unlocked, Under Review, Changes Requested, Approved
        createdAt: serverTimestamp()
      });
      setShowUpload(false);
      setPkgTitle('');
      setPkgUrl('');
      setLinkedInvoiceId('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (e, pkg) => {
    // Admin can also place pinning notes (designer comments)
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
      console.error("[AdminRenderingManager] Failed to save pin:", err);
    } finally {
      setSubmittingPin(false);
    }
  };

  const handleResolvePin = async (pin) => {
    const nextStatus = pin.status === 'Resolved' ? 'Open' : 'Resolved';
    try {
      await updateDoc(doc(db, 'projects', project.id, 'markups', pin.id), {
        status: nextStatus
      });
      // Toggle local active pin status too
      setActivePin({ ...pin, status: nextStatus });
    } catch (err) {
      console.error("[AdminRenderingManager] Failed to resolve pin:", err);
    }
  };

  const handleDeletePin = async (pinId) => {
    if (!window.confirm("Are you sure you want to delete this pin note?")) return;
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'markups', pinId));
      setActivePin(null);
    } catch (err) {
      console.error("[AdminRenderingManager] Failed to delete pin:", err);
    }
  };

  const isImageFile = (url) => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.webp') || cleanUrl.endsWith('.gif');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="lxfh" style={{ fontSize: 18, fontWeight: 800 }}>Design Vault</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Upload CAD/3D renderings and lock them behind rendering invoices.</div>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} style={{ background: ac, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <Plus size={16} /> New Rendering Package
        </button>
      </div>

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
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>File URL (Drive/Figma/PDF)</label>
              <input className="p-inp" placeholder="https://..." value={pkgUrl} onChange={e => setPkgUrl(e.target.value)} />
            </div>
            <div className="p-field">
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Link to Fee Invoice</label>
              <select className="p-inp" value={linkedInvoiceId} onChange={e => setLinkedInvoiceId(e.target.value)}>
                <option value="">-- Select an Invoice --</option>
                {projectInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.invoiceNumber || 'INV'} - {inv.title} ({inv.status})</option>
                ))}
              </select>
            </div>
            <div className="p-field">
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Included Revisions</label>
              <input type="number" className="p-inp" value={includedRevisions} onChange={e => setIncludedRevisions(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button onClick={() => setShowUpload(false)} className="p-btn-light" style={{ padding: '12px 24px', border: 'none', background: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleUpload} disabled={loading || !pkgTitle || !pkgUrl || !linkedInvoiceId} style={{ background: 'var(--accent-secondary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', opacity: (loading || !pkgTitle || !pkgUrl || !linkedInvoiceId) ? 0.5 : 1 }}>
              {loading ? 'Uploading...' : 'Save & Lock Package'}
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
            const isUnlocked = linkedInv && linkedInv.status === 'Paid';
            const statusColor = isUnlocked ? '#10B981' : '#F59E0B';
            const packageMarkups = markups.filter(m => m.packageId === pkg.id);
            const displayImage = isImageFile(pkg.fileUrl) ? pkg.fileUrl : blueprintImg;

            return (
              <div key={pkg.id} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16 }}>
                
                {/* Meta Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: isUnlocked ? '#F0FDF4' : '#FFFBEB', color: statusColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isUnlocked ? <FileText size={20} /> : <Lock size={20} />}
                    </div>
                    <div>
                      <div className="lxfh" style={{ fontSize: 15, fontWeight: 700 }}>{pkg.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Revisions: {pkg.usedRevisions} / {pkg.includedRevisions} used &middot; Invoice: {linkedInv?.invoiceNumber || 'Unknown'} ({linkedInv?.status})
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, background: `${statusColor}15`, color: statusColor, textTransform: 'uppercase' }}>
                      {isUnlocked ? pkg.status : 'Locked (Awaiting Payment)'}
                    </div>
                  </div>
                </div>

                {/* If unlocked, mirror the interactive coordinate pinnings markup visualizer */}
                {isUnlocked && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PlusCircle size={14} color={ac} /> Coordinate Review Board &middot; {packageMarkups.length} client feedback note{packageMarkups.length !== 1 ? 's' : ''}
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

                      {/* MIRRORED Client Coordinate Pins */}
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

                    {/* Active Pin Detail Card & Resolution Trigger */}
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
                            {activePin.status === 'Resolved' ? "Re-open Feedback" : "Mark as Resolved"}
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

      {/* ── PHASE 3: ADMIN ADD PIN MODAL ── */}
      {showAddPinModal && selectedCoords && (
        <div
          onClick={() => setShowAddPinModal(false)}
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
                Add Designer Pin Comment
              </div>
              <button 
                type="button"
                onClick={() => setShowAddPinModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Coordinate placement locked at: <strong style={{ color: 'var(--accent-secondary)' }}>X: {Math.round(selectedCoords.x)}% &middot; Y: {Math.round(selectedCoords.y)}%</strong> on drawing.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Designer / Technical Note
              </label>
              <textarea
                required
                value={newPinText}
                onChange={(e) => setNewPinText(e.target.value)}
                placeholder="e.g. Please verify that base profile clearance fits standard glass anchors here..."
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
                onClick={() => setShowAddPinModal(false)}
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
