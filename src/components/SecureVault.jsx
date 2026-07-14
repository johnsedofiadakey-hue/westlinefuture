import React, { useRef, useState, useEffect } from 'react';
import { FileText, Download, PenTool, CheckCircle, X, ShieldCheck, Trash2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { deleteDoc, doc } from 'firebase/firestore';
import { functions, db } from '../lib/firebase';

const formatDate = (ts, includeTime = false) => {
  if (!ts) return 'Unknown Date';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...(includeTime && { hour: 'numeric', minute: '2-digit' })
  }).replace(',', '');
};

function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [legalConsent, setLegalConsent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1F2937';
  }, []);

  const getCoordinates = (e) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasSignature(true);
    e.preventDefault();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.closePath();
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!hasSignature || !legalConsent) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl, legalConsent);
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 20, border: '1px solid var(--border-color)', width: '100%', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="lxfh" style={{ fontSize: 18, margin: 0 }}>Sign Document</h3>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Review the complete document before signing. Your electronic signature is legally binding and cannot be revoked after submission.
      </p>
      
      <div style={{ border: '2px dashed var(--border-color)', borderRadius: 12, overflow: 'hidden', background: '#F9FAFB', marginBottom: 16, touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={450}
          height={200}
          style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
        <input type="checkbox" checked={legalConsent} onChange={e => setLegalConsent(e.target.checked)} style={{ marginTop: 3 }} />
        I have reviewed this document and consent to use this electronic signature as my legally binding approval.
      </label>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={clearCanvas} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, border: '1px solid var(--border-color)', background: '#fff', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          Clear Signature
        </button>
        <button disabled={!hasSignature || !legalConsent} onClick={handleSave} style={{ padding: '10px 20px', fontSize: 12, fontWeight: 700, border: 'none', background: 'var(--accent-secondary)', color: '#fff', borderRadius: 8, cursor: hasSignature && legalConsent ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, opacity: hasSignature && legalConsent ? 1 : 0.45 }}>
          <ShieldCheck size={16} /> Submit Signature
        </button>
      </div>
    </div>
  );
}

export default function SecureVault({ projectId, user, readOnly = false, onAdminUploadVault }) {
  const [signingDoc, setSigningDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!projectId) return;
    let unsubscribe = () => {};
    let cancelled = false;
    Promise.all([
      import('firebase/firestore'),
      import('../lib/firebase'),
    ]).then(([{ collection, query, orderBy, onSnapshot }, { db }]) => {
      if (cancelled || !db) return;
        const q = query(
          collection(db, 'projects', projectId, 'vault'),
          orderBy('uploadedAt', 'desc')
        );
        unsubscribe = onSnapshot(q, snap => {
          setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [projectId]);

  const pendingDocs = documents.filter(d => d.requiresSignature && !d.signatureData);
  const otherDocs = documents.filter(d => !d.requiresSignature || d.signatureData);

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this vault document? This cannot be undone.')) return;
    await deleteDoc(doc(db, 'projects', projectId, 'vault', docId));
  };

  const handleAdminUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onAdminUploadVault) return;
    setUploading(true);
    await onAdminUploadVault(file);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (signingDoc) {
    return (
      <div className="fade-in">
        <SignaturePad 
          onCancel={() => setSigningDoc(null)} 
          onSave={async (dataUrl, legalConsent) => {
            try {
              const signDocument = httpsCallable(functions, 'signVaultDocument');
              await signDocument({
                projectId,
                documentId: signingDoc.id,
                signatureData: dataUrl,
                signerName: user?.name || user?.displayName || signingDoc.clientName || 'Client',
                legalConsent,
              });
              setSigningDoc(null);
            } catch (e) {
              console.error('Sign error:', e);
              alert('Failed to save signature.');
            }
          }} 
        />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {onAdminUploadVault && (
        <div style={{ padding: 16, border: '1px dashed var(--border-color)', borderRadius: 16, background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-secondary)' }}>Admin Vault Upload</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Upload a contract or legally binding document. Clients will be prompted to E-Sign it.</div>
          </div>
          <label style={{
            height: 34, padding: '0 16px', borderRadius: 10,
            background: `var(--accent-secondary)`, color: '#fff',
            fontSize: 12, fontWeight: 800, cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: uploading ? 0.6 : 1, transition: 'opacity .2s',
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.png,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleAdminUpload}
              disabled={uploading}
            />
            {uploading ? 'Uploading...' : 'Upload & Require Signature'}
          </label>
        </div>
      )}

      {pendingDocs.length > 0 && (
        <div>
          <h3 className="lxfh" style={{ fontSize: 14, color: '#CA8A04', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>Requires Signature</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {pendingDocs.map(doc => (
              <div key={doc.id} style={{ padding: 16, border: '1px solid #FEF08A', background: '#FEFCE8', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: 10, background: '#FEF08A', borderRadius: 10, color: '#A16207' }}>
                    <PenTool size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#854D0E', marginBottom: 2 }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: '#A16207' }}>Uploaded {formatDate(doc.uploadedAt)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 12px', background: '#fff', border: '1px solid #FDE047', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#A16207', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={14} /> Review
                    </a>
                  )}
                  {!readOnly && (
                    <button onClick={() => setSigningDoc(doc)} style={{ padding: '8px 16px', background: '#CA8A04', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PenTool size={14} /> Sign Now
                    </button>
                  )}
                  {onAdminUploadVault && (
                    <button onClick={() => handleDelete(doc.id)} style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#DC2626', flexShrink: 0 }} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="lxfh" style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>Secure Vault</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {otherDocs.length > 0 ? otherDocs.map(doc => (
            <div key={doc.id} style={{ padding: 16, border: '1px solid var(--border-color)', background: '#fff', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ padding: 8, background: 'var(--bg-secondary)', borderRadius: 8, color: 'var(--accent-secondary)' }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-secondary)' }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {formatDate(doc.uploadedAt)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', padding: 4 }}>
                      <Download size={16} />
                    </a>
                  )}
                  {onAdminUploadVault && (
                    <button onClick={() => handleDelete(doc.id)} style={{ width: 28, height: 28, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#DC2626', flexShrink: 0 }} title="Delete">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              {doc.requiresSignature && doc.signatureData && (
                <div style={{ padding: 12, background: '#F0FDF4', borderRadius: 8, border: '1px dashed #BBF7D0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#16A34A' }}>
                    <CheckCircle size={14} /> Electronically Signed
                  </div>
                  <img src={doc.signatureData} style={{ height: 40, objectFit: 'contain', background: '#fff', border: '1px solid #BBF7D0', borderRadius: 4 }} alt="Signature" />
                  <div style={{ fontSize: 10, color: '#15803D' }}>{doc.signedAt ? formatDate(doc.signedAt, true) : ''}</div>
                </div>
              )}
            </div>
          )) : (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 16, color: 'var(--text-secondary)' }}>
              <ShieldCheck size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Vault is empty</div>
              <div style={{ fontSize: 12 }}>No secure documents have been uploaded yet.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
